import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

async function getExpenseCategories() {
  // Use queryRaw to bypass client schema limitations if generate failed
  const result = await prisma.$queryRaw`SELECT expense_categories FROM storeconfig ORDER BY id ASC LIMIT 1`;
  if (!result || result.length === 0) {
    // If no config, create one (this might still need client but let's see)
    await prisma.$executeRaw`INSERT INTO storeconfig (expense_categories, updated_at) VALUES ('[]'::jsonb, NOW())`;
    return [];
  }
  return result[0].expense_categories || [];
}

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;
    
    const categories = await getExpenseCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Failed to fetch expense categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    
    const body = await req.json();
    const { name, color } = body;
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const categories = await getExpenseCategories();
    const id = Date.now();
    const newCategory = { id, name, color: color || '#0f172a' };
    
    const updated = [...categories, newCategory];
    const jsonStr = JSON.stringify(updated);
    
    await prisma.$executeRaw`UPDATE storeconfig SET expense_categories = ${jsonStr}::jsonb`;

    return NextResponse.json(newCategory, { status: 201 });
  } catch (error) {
    console.error('Failed to create expense category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
