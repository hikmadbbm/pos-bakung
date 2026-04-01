import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    // Get all menus with recipes and ingredients
    const menus = await prisma.menu.findMany({
      where: { active: true },
      include: {
        recipes: {
          include: {
            items: {
              include: {
                ingredient: true,
                component_recipe: true
              }
            }
          }
        }
      }
    });

    // Get material price history for trends
    const materials = await prisma.ingredient.findMany({
      take: 10,
      orderBy: { updated_at: 'desc' },
      include: {
        price_history: {
          take: 10,
          orderBy: { date: 'desc' }
        }
      }
    });

    return NextResponse.json({
      menus: menus.map(m => ({
        id: m.id,
        name: m.name,
        price: m.price,
        hpp: m.cost || 0,
        margin: m.price > 0 ? ((m.price - (m.cost || 0)) / m.price) * 100 : 0,
        recipe: m.recipes[0] ? {
            id: m.recipes[0].id,
            total_hpp: m.recipes[0].total_hpp,
            items: m.recipes[0].items.map(it => ({
                id: it.id,
                name: it.ingredient?.item_name || it.component_recipe?.name,
                quantity: it.quantity,
                cost_per_unit: it.ingredient?.cost_per_unit || (it.component_recipe?.total_hpp / (it.component_recipe?.base_quantity || 1)) || 0,
                type: it.item_type
            }))
        } : null
      })),
      materials: materials.map(mat => ({
         id: mat.id,
         name: mat.item_name,
         brand: mat.brand,
         current_price: mat.cost_per_unit,
         history: mat.price_history.map(h => ({
            date: h.date,
            price: h.cost_per_unit || (h.price / (mat.volume || 1))
         })).reverse()
      }))
    });
  } catch (error) {
    console.error('HPP Analytics API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch HPP analytics' }, { status: 500 });
  }
}
