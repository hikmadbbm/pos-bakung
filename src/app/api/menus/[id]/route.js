import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalizePrices(prices) {
  if (!prices) return [];
  let rows = [];
  if (Array.isArray(prices)) {
    rows = prices;
  } else if (typeof prices === 'object') {
    rows = Object.entries(prices).map(([platform_id, v]) => ({
      platform_id: Number(platform_id),
      price: Number(v),
    }));
  } else {
    return null;
  }
  return rows
    .filter((r) => Number.isFinite(Number(r.platform_id)) && Number.isFinite(Number(r.price)))
    .map((r) => ({ platform_id: Number(r.platform_id), price: Math.round(Number(r.price)) }));
}

export async function PUT(req, { params }) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'KITCHEN']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json();

    // If Kitchen, restrict what can be updated
    if (user.role === 'KITCHEN') {
      const allowedKeys = ['is_active'];
      const bodyKeys = Object.keys(body);
      const invalidKeys = bodyKeys.filter(k => !allowedKeys.includes(k) && body[k] !== undefined);
      
      if (invalidKeys.length > 0) {
        return NextResponse.json({ 
          error: 'Kitchen role can only update availability (is_active)' 
        }, { status: 403 });
      }
    }

    const data = {};
    if (body.is_active !== undefined) data.is_active = !!body.is_active;

    if (body.name !== undefined) {
      if (!body.name || typeof body.name !== 'string') {
        return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
      }
      data.name = body.name;
    }
    if (body.price !== undefined) {
      const p0 = Number(body.price);
      if (!Number.isFinite(p0)) return NextResponse.json({ error: 'price must be a number' }, { status: 400 });
      data.price = Math.round(p0);
    }
    if (body.cost !== undefined) {
      const c0 = Number(body.cost);
      if (!Number.isFinite(c0)) return NextResponse.json({ error: 'cost must be a number' }, { status: 400 });
      data.cost = Math.round(c0);
    }
    if (body.categoryId !== undefined) {
      data.categoryId = body.categoryId ? Number(body.categoryId) : null;
    }

    const priceRows = body.prices !== undefined ? normalizePrices(body.prices) : undefined;
    if (body.prices !== undefined && priceRows === null) {
      return NextResponse.json({ error: 'prices must be object or array' }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (priceRows !== undefined) {
        await tx.menuPrice.deleteMany({ where: { menu_id: id } });
      }

      const m = await tx.menu.update({
        where: { id },
        data: {
          ...data,
          ...(priceRows !== undefined
            ? {
                prices: {
                  create: priceRows,
                },
              }
            : {}),
        },
        include: {
          category: true,
          prices: { select: { platform_id: true, price: true } },
        },
      });
      return m;
    });

    const prices = {};
    for (const p of updated.prices || []) {
      prices[p.platform_id] = p.price;
    }
    return NextResponse.json({ ...updated, prices, profit: (updated.price || 0) - (updated.cost || 0) });
  } catch (error) {
    console.error('Failed to update menu:', error);
    return NextResponse.json({ error: 'Failed to update menu' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    try {
      await prisma.menu.delete({ 
        where: { id }
      });
      return NextResponse.json({ ok: true });
    } catch (e) {
      // Prisma error for foreign key constraint fail
      if (e.code === 'P2003') {
        return NextResponse.json({ 
          error: 'This item cannot be deleted because it is part of existing Order History or Recipes. You can deactivate it instead.' 
        }, { status: 400 });
      }
      throw e;
    }
  } catch (error) {
    console.error('Failed to delete menu:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete menu' }, { status: 500 });
  }
}

