import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

async function getExpenseCategories() {
  const result = await prisma.$queryRaw`SELECT expense_categories FROM storeconfig ORDER BY id ASC LIMIT 1`;
  if (!result || result.length === 0) return [];
  return result[0].expense_categories || [];
}

export async function PUT(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    
    const id = parseInt(params.id);
    const body = await req.json();
    const { name, color } = body;

    const categories = await getExpenseCategories();
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const oldName = categories[idx].name;
    categories[idx] = { ...categories[idx], name, color };

    const jsonStr = JSON.stringify(categories);
    await prisma.$executeRaw`UPDATE storeconfig SET expense_categories = ${jsonStr}::jsonb`;
    
    // Update existing expenses to match new name
    if (oldName !== name) {
      await prisma.$executeRaw`UPDATE expense SET category = ${name} WHERE category = ${oldName}`;
    }

    return NextResponse.json(categories[idx]);
  } catch (error) {
    console.error('Failed to update expense category:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    
    const id = parseInt(params.id);
    const categories = await getExpenseCategories();
    
    const cat = categories.find(c => c.id === id);
    if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Check if used
    const countArr = await prisma.$queryRaw`SELECT count(*)::int as cnt FROM expense WHERE category = ${cat.name}`;
    const count = countArr[0]?.cnt || 0;
    if (count > 0) return NextResponse.json({ error: 'Category in use' }, { status: 400 });

    const newCategories = categories.filter(c => c.id !== id);
    const jsonStr = JSON.stringify(newCategories);
    await prisma.$executeRaw`UPDATE storeconfig SET expense_categories = ${jsonStr}::jsonb`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete expense category:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
