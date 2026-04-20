import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { logActivity } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'KITCHEN', 'CASHIER']);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')) : null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')) : null;
    const skip = page && limit ? (page - 1) * limit : undefined;
    const take = limit ? limit : undefined;

    const menus = await prisma.menu.findMany({
      where: { is_active: true },
      include: {
        category: true,
        prices: true,
        consignment: true,
      },
      orderBy: { name: 'asc' },
      skip,
      take
    });

    const total = page ? await prisma.menu.count({ where: { is_active: true } }) : menus.length;

    const normalized = menus.map(m => {
      const mPrices = {};
      m.prices.forEach(p => {
        mPrices[p.platform_id] = p.price;
      });
      
      let consignmentValue = null;
      if (m.productType === 'CONSIGNMENT' && m.consignment) {
        if (m.consignment.modelType === 'FIXED_DAILY') {
            consignmentValue = `Rp ${new Intl.NumberFormat('id-ID').format(m.consignment.fixedDailyFee || 0)} / Day`;
        } else if (m.consignment.modelType === 'REVENUE_SHARE') {
            consignmentValue = `${m.consignment.revenueSharePercent || 0}% Share`;
        }
      }

      return {
        id: m.id,
        name: m.name,
        price: m.price,
        cost: m.cost,
        categoryId: m.categoryId,
        is_active: m.is_active,
        productType: m.productType || 'OWN_PRODUCT',
        category: m.category ? { name: m.category.name, color: m.category.color } : null,
        prices: mPrices,
        profit: (m.productType === 'CONSIGNMENT') ? 0 : (m.price || 0) - (m.cost || 0),
        consignmentValue,
        consignment: m.consignment ? {
            partnerName: m.consignment.partnerName,
            modelType: m.consignment.modelType,
            fixedDailyFee: m.consignment.fixedDailyFee,
            revenueSharePercent: m.consignment.revenueSharePercent
        } : null
      };
    });

    if (page) {
      return NextResponse.json({
        data: normalized,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      });
    }
    return NextResponse.json(normalized);
  } catch (error) {
    console.error('FATAL GET ERROR:', error);
    return NextResponse.json({ error: 'Database Failure', details: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    const { name, price, cost, categoryId, productType, prices, consignment, recipeId } = body;

    const result = await prisma.$transaction(async (tx) => {
      const newItem = await tx.menu.create({
        data: {
          name,
          price: Math.round(Number(price) || 0),
          cost: Math.round(Number(cost) || 0),
          categoryId: categoryId ? Number(categoryId) : null,
          productType: productType || 'OWN_PRODUCT',
          is_active: true,
        }
      });

      if (recipeId) {
        await tx.recipe.update({
          where: { id: Number(recipeId) },
          data: { menu_id: newItem.id }
        });
      }

      if (prices) {
        const priceData = Object.entries(prices)
          .filter(([_, pval]) => pval !== "" && pval !== null)
          .map(([pid, pval]) => ({
            menu_id: newItem.id,
            platform_id: Number(pid),
            price: Math.round(Number(pval))
          }));
        
        if (priceData.length > 0) {
          await tx.menuPrice.createMany({
            data: priceData
          });
        }
      }

      if (productType === 'CONSIGNMENT' && consignment) {
        await tx.consignment.create({
          data: {
            productId: newItem.id,
            partnerName: consignment.partnerName,
            modelType: consignment.modelType,
            fixedDailyFee: Math.round(Number(consignment.fixedDailyFee) || 0),
            revenueSharePercent: parseFloat(consignment.revenueSharePercent) || 0,
            startDate: new Date(consignment.startDate || new Date()),
            isActive: true
          }
        });
      }

      return newItem;
    });

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip;
    await logActivity({
      userId: user.id,
      action: 'CREATE',
      entity: 'MENU',
      entityId: result.id,
      ipAddress,
      details: body
    });

    return NextResponse.json({ id: result.id, ok: true }, { status: 201 });
  } catch (error) {
    console.error('FATAL POST ERROR:', error);
    return NextResponse.json({ error: 'Creation failed', details: error.message }, { status: 500 });
  }
}
