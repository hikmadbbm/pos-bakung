import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: {
          include: { ingredient: true }
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
      menu_id, 
      base_quantity, 
      ingredients, // Array of { ingredient_id, manual_name, manual_unit, manual_cost, quantity, source }
      monthly_fixed_cost,
      monthly_production_volume
    } = body;

    if (!name || !ingredients || !Array.isArray(ingredients)) {
      return NextResponse.json({ error: 'Name and ingredients are required' }, { status: 400 });
    }

    // 1. Fetch live costs for database ingredients
    const dbIngredientIds = ingredients
      .filter(i => i.source === 'DATABASE' && i.ingredient_id)
      .map(i => i.ingredient_id);
    
    const dbIngredients = await prisma.ingredient.findMany({
      where: { id: { in: dbIngredientIds } }
    });
    const dbIngredMap = new Map(dbIngredients.map(i => [i.id, i]));

    // 2. Calculate Total Variable Cost
    let totalVariableCost = 0;
    const ingredientsToCreate = ingredients.map(i => {
      let costPerUnit = 0;
      if (i.source === 'DATABASE' && i.ingredient_id) {
        const dbIng = dbIngredMap.get(i.ingredient_id);
        costPerUnit = dbIng ? dbIng.cost_per_unit : 0;
      } else {
        costPerUnit = Number(i.manual_cost) || 0;
      }
      
      const itemTotal = (Number(i.quantity) || 0) * costPerUnit;
      totalVariableCost += itemTotal;

      return {
        ingredient_id: i.source === 'DATABASE' ? i.ingredient_id : null,
        manual_name: i.source === 'MANUAL' ? i.manual_name : null,
        manual_unit: i.source === 'MANUAL' ? i.manual_unit : null,
        manual_cost: i.source === 'MANUAL' ? Number(i.manual_cost) : null,
        quantity: Number(i.quantity) || 0,
        source: i.source || 'DATABASE'
      };
    });

    // 3. Calculate Fixed Cost Allocation
    let fixedCostPerUnit = 0;
    if (monthly_fixed_cost && monthly_production_volume > 0) {
      fixedCostPerUnit = Math.round(Number(monthly_fixed_cost) / Number(monthly_production_volume));
    }

    const totalHpp = Math.round(totalVariableCost + fixedCostPerUnit);

    // 4. Create Recipe and Ingredients in Transaction
    const recipe = await prisma.$transaction(async (tx) => {
      const created = await tx.recipe.create({
        data: {
          name,
          menu_id: menu_id ? Number(menu_id) : null,
          base_quantity: Number(base_quantity) || 1,
          monthly_fixed_cost: Number(monthly_fixed_cost) || 0,
          monthly_production_volume: Number(monthly_production_volume) || 0,
          total_variable_cost: Math.round(totalVariableCost),
          fixed_cost_allocation: fixedCostPerUnit,
          total_hpp: totalHpp,
          ingredients: {
            create: ingredientsToCreate
          }
        },
        include: {
          ingredients: {
            include: { ingredient: true }
          }
        }
      });

      // 5. Update Menu cost if linked
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
