import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    jwt_secret_set: !!process.env.JWT_SECRET,
    db_url_set: !!process.env.DATABASE_URL,
    timestamp: new Date().toISOString()
  });
}
