import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const { pin } = body;
    if (!pin) {
      return NextResponse.json({ error: 'PIN required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { pin, status: 'ACTIVE' }
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    if (user.role !== 'MANAGER' && user.role !== 'OWNER') {
      return NextResponse.json({ error: 'Manager authorization required' }, { status: 403 });
    }

    return NextResponse.json({ manager: { id: user.id, name: user.name, username: user.username, role: user.role } });
  } catch (error) {
    console.error('Failed to verify manager:', error);
    return NextResponse.json({ error: 'Failed to verify manager' }, { status: 500 });
  }
}

