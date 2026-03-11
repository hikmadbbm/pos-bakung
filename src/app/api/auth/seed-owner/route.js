import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'owner' },
          { role: 'OWNER' }
        ]
      },
      select: { id: true, username: true, role: true }
    });

    if (existing) {
      return NextResponse.json({ message: 'Owner already exists', user: existing }, { status: 200 });
    }

    const passwordHash = await bcrypt.hash('owner', 10);

    const user = await prisma.user.create({
      data: {
        name: 'Owner',
        username: 'owner',
        password: passwordHash,
        role: 'OWNER',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
      }
    });

    return NextResponse.json({ message: 'Owner created', user }, { status: 201 });
  } catch (error) {
    console.error('Seed owner failed:', error);
    return NextResponse.json({ error: 'Failed to create owner' }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
