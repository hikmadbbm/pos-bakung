import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { logActivity } from '@/lib/audit';

export async function POST(req) {
  try {
    const { user, response } = await verifyAuth(req);
    if (response) return response;

    await logActivity({
      userId: user.id,
      action: 'LOGOUT',
      entity: 'USER',
      entityId: user.id,
      ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      details: { timestamp: new Date().toISOString() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout logging failed:', error);
    return NextResponse.json({ error: 'Failed to log logout' }, { status: 500 });
  }
}
