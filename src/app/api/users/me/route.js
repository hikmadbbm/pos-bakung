import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { user, response } = await verifyAuth(req);
    if (response) return response;
    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to fetch current user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
