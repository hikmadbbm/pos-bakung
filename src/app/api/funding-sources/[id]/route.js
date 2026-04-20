import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

async function getFundingSources() {
  const result = await prisma.$queryRaw`SELECT funding_sources FROM storeconfig ORDER BY id ASC LIMIT 1`;
  return result?.[0]?.funding_sources || [];
}

export async function PUT(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    
    // Ensure we await params properly like in Next.js 14+ best practices
    const resolvedParams = await params;
    const idParam = resolvedParams?.id;
    const id = parseInt(idParam);
    if (!id) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    const body = await req.json();
    const { name, color, is_cash } = body;
    
    const sources = await getFundingSources();
    const index = sources.findIndex(c => c.id === id);
    if (index === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const newSource = { ...sources[index] };
    if (name) newSource.name = name;
    if (color) newSource.color = color;
    if (is_cash !== undefined) newSource.is_cash = !!is_cash;

    sources[index] = newSource;
    const jsonStr = JSON.stringify(sources);
    
    await prisma.$executeRaw`UPDATE storeconfig SET funding_sources = ${jsonStr}::jsonb`;
    return NextResponse.json(newSource);
  } catch (error) {
    console.error('Failed to update funding source:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    
    // Ensure we await params properly
    const resolvedParams = await params;
    const idParam = resolvedParams?.id;
    const id = parseInt(idParam);
    
    const sources = await getFundingSources();
    const updated = sources.filter(c => c.id !== id);
    
    if (updated.length === sources.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    
    const jsonStr = JSON.stringify(updated);
    await prisma.$executeRaw`UPDATE storeconfig SET funding_sources = ${jsonStr}::jsonb`;
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete funding source:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
