import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req) {
  try {
    const { user, response } = await verifyAuth(req);
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Ensure it belongs to the user
    const authenticator = await prisma.authenticator.findFirst({
      where: { id, user_id: user.id }
    });

    if (!authenticator) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.authenticator.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Remove authenticator error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
