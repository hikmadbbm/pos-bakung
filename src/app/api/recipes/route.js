import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper for recursive HPP calculation
async function calculateDeepHpp(items) {
  let totalVariable = 0;
  
  for (const item of items) {
    if (item.item_type === 'INGREDIENT' && item.ingredient_id) {
      const ing = await prisma.ingredient.findUnique({ where: { id: Number(item.ingredient_id) } });
      if (ing) {
        totalVariable += (ing.cost_per_unit || 0) * (Number(item.quantity) || 0);
      }
    } else if (item.item_type === 'COMPONENT' && item.component_recipe_id) {
      const comp = await prisma.recipe.findUnique({ where: { id: Number(item.component_recipe_id) } });
      if (comp) {
        const costPerPortion = (comp.total_hpp || 0) / (comp.base_quantity || 1);
        totalVariable += costPerPortion * (Number(item.quantity) || 0);
      }
    }
  }
  return Math.round(totalVariable);
}

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const recipes = await prisma.recipe.findMany({
      include: {
        items: {
          include: { 
            ingredient: true,
            component_recipe: true
          }
        },
        menu: true
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Failed to fetch recipes:', error);
    return NextResponse.json({ error: 'Failed to fetch recipes' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    const { 
      name, 
      type, // STANDARD, COMPONENT
      menu_id, 
      base_quantity, 
      items, // Array of { item_type, ingredient_id, component_recipe_id, quantity, unit }
      monthly_fixed_cost,
      monthly_production_volume
    } = body;

    if (!name || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Name and items are required' }, { status: 400 });
    }

    // 1. Calculate Total Variable Cost
    const totalVariableCost = await calculateDeepHpp(items);

    // 2. Calculate Fixed Cost Allocation
    let fixedCostPerUnit = 0;
    if (monthly_fixed_cost && monthly_production_volume > 0) {
      fixedCostPerUnit = Math.round(Number(monthly_fixed_cost) / Number(monthly_production_volume));
    }

    const totalHpp = Math.round(totalVariableCost + fixedCostPerUnit);

    // 3. Create Recipe and Items in Transaction
    const recipe = await prisma.$transaction(async (tx) => {
      const created = await tx.recipe.create({
        data: {
          name,
          type: type || 'STANDARD',
          menu_id: menu_id ? Number(menu_id) : null,
          base_quantity: Number(base_quantity) || 1,
          monthly_fixed_cost: Number(monthly_fixed_cost) || 0,
          monthly_production_volume: Number(monthly_production_volume) || 0,
          total_variable_cost: totalVariableCost,
          fixed_cost_allocation: fixedCostPerUnit,
          total_hpp: totalHpp,
          items: {
            create: items.map(item => ({
              item_type: item.item_type,
              ingredient_id: item.ingredient_id ? Number(item.ingredient_id) : null,
              component_recipe_id: item.component_recipe_id ? Number(item.component_recipe_id) : null,
              quantity: Number(item.quantity) || 0,
              unit: item.unit || ""
            }))
          }
        },
        include: {
          items: {
            include: { 
              ingredient: true,
              component_recipe: true
            }
          }
        }
      });

      // 4. Update Menu cost if linked
      if (menu_id) {
        await tx.menu.update({
          where: { id: Number(menu_id) },
          data: { cost: totalHpp }
        });
      }

      return created;
    });

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    console.error('Failed to create recipe:', error);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
