import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const essential = searchParams.get('essential') === 'true';

    if (essential) {
      const ingredients = await prisma.ingredient.findMany({
        select: {
          id: true,
          item_name: true,
          category: true,
          unit: true,
          cost_per_unit: true,
          is_generic: true,
          subItems: {
            select: {
              id: true,
              item_name: true,
              unit: true,
              cost_per_unit: true,
              is_active_brand: true
            }
          }
        },
        orderBy: { item_name: 'asc' },
      });
      return NextResponse.json(ingredients);
    }

    const ingredients = await prisma.ingredient.findMany({
      include: {
        subItems: true,
        parent: { select: { item_name: true } }
      },
      orderBy: { item_name: 'asc' },
    });
    return NextResponse.json(ingredients);
  } catch (error) {
    console.error('Failed to fetch ingredients:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    let { 
      category, item_name, brand, volume, unit, price, 
      purchase_location, purchase_link, notes,
      is_generic, parentId, is_active_brand
    } = body;

    if (!item_name || !unit || !category || volume === undefined || volume === "" || price === undefined || price === "") {
      return NextResponse.json({ error: 'Category, Item Name, Volume, Unit, and Price are required' }, { status: 400 });
    }

    // Normalization
    category = category.trim();
    item_name = item_name.trim();

    const vol = parseFloat(volume);
    const prc = parseInt(price);
    const cpu = vol > 0 ? prc / vol : 0;

    const ingredient = await prisma.ingredient.create({
      data: {
        category,
        item_name,
        brand: brand || (is_generic ? 'GENERIC' : 'Local'),
        volume: vol,
        unit,
        price: prc,
        cost_per_unit: cpu,
        purchase_location,
        purchase_link,
        notes,
        is_generic: !!is_generic,
        parentId: parentId ? Number(parentId) : null,
        is_active_brand: !!is_active_brand,
        price_history: {
          create: { price: prc }
        }
      },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    console.error('CRITICAL: Failed to create ingredient. Error details:', error);
    return NextResponse.json({ 
      error: 'Failed to create ingredient',
      details: error.message 
    }, { status: 500 });
  }
}
