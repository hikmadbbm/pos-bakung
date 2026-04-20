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

    const users = await prisma.user.findMany({
      where: { 
        status: 'ACTIVE',
        role: { in: ['MANAGER', 'OWNER'] }
      }
    });

    let authorizedUser = null;
    for (const u of users) {
      if (u.pin) {
        // Support both hashed and plain text (for safety/migration)
        const isMatch = u.pin.startsWith('$2') 
          ? await bcrypt.compare(pin, u.pin)
          : u.pin === pin;
          
        if (isMatch) {
          authorizedUser = u;
          break;
        }
      }
    }

    if (!authorizedUser) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    return NextResponse.json({ 
      manager: { 
        id: authorizedUser.id, 
        name: authorizedUser.name, 
        username: authorizedUser.username, 
        role: authorizedUser.role 
      } 
    });
  } catch (error) {
    console.error('Failed to verify manager:', error);
    return NextResponse.json({ error: 'Failed to verify manager' }, { status: 500 });
  }
}

