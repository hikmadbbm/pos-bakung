import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const runtime = 'nodejs';

async function getFundingSources() {
  const result = await prisma.$queryRaw`SELECT funding_sources FROM storeconfig ORDER BY id ASC LIMIT 1`;
  if (!result || result.length === 0) {
    await prisma.$executeRaw`INSERT INTO storeconfig (funding_sources, updated_at) VALUES ('[{"id":1,"name":"Kasir / Tunai","is_cash":true,"color":"#10b981"}]'::jsonb, NOW())`;
    return [{ id: 1, name: "Kasir / Tunai", is_cash: true, color: "#10b981" }];
  }
  const sources = result[0].funding_sources || [];
  if (sources.length === 0) {
      // return default
      return [{ id: 1, name: "Kasir / Tunai", is_cash: true, color: "#10b981" }];
  }
  return sources;
}

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;
    
    const sources = await getFundingSources();
    return NextResponse.json(sources);
  } catch (error) {
    console.error('Failed to fetch funding sources:', error);
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    
    const body = await req.json();
    const { name, color, is_cash } = body;
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const sources = await getFundingSources();
    const id = Date.now();
    const newSource = { id, name, color: color || '#3b82f6', is_cash: !!is_cash };
    
    // In case there was no sources originally, let's just make sure we merge properly
    const updated = [...sources, newSource];
    const jsonStr = JSON.stringify(updated);
    
    await prisma.$executeRaw`UPDATE storeconfig SET funding_sources = ${jsonStr}::jsonb`;

    return NextResponse.json(newSource, { status: 201 });
  } catch (error) {
    console.error('Failed to create funding source:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
