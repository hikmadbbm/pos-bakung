import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req) {
  try {
    const { user, response } = await verifyAuth(req);
    if (response) return response;

    const authenticators = await prisma.authenticator.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        credentialID: true,
        credentialDeviceType: true,
        created_at: true,
      }
    });

    return NextResponse.json(authenticators);
  } catch (error) {
    console.error('List authenticators error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
