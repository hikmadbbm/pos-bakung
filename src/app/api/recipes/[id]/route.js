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

export async function GET(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        items: {
          include: { 
            ingredient: true,
            component_recipe: true
          }
        },
        menu: true
      }
    });

    if (!recipe) return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });

    return NextResponse.json(recipe);
  } catch (error) {
    console.error('Failed to fetch recipe:', error);
    return NextResponse.json({ error: 'Failed to fetch recipe' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    const body = await req.json();
    const { 
      name, 
      type,
      menu_id, 
      base_quantity, 
      items, 
      monthly_fixed_cost,
      monthly_production_volume
    } = body;

    // Calculate Total Variable Cost recursively
    const totalVariableCost = await calculateDeepHpp(items);

    let fixedCostPerUnit = 0;
    if (monthly_fixed_cost && monthly_production_volume > 0) {
      fixedCostPerUnit = Math.round(Number(monthly_fixed_cost) / Number(monthly_production_volume));
    }

    const totalHpp = Math.round(totalVariableCost + fixedCostPerUnit);

    const updated = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.recipeItem.deleteMany({ where: { recipe_id: id } });

      const recipe = await tx.recipe.update({
        where: { id },
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

      if (menu_id) {
        await tx.menu.update({
          where: { id: Number(menu_id) },
          data: { cost: totalHpp }
        });
      }

      return recipe;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update recipe:', error);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);

    await prisma.recipe.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
