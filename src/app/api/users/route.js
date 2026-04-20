import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER']);
    if (response) return response;
    const searchParams = req.nextUrl.searchParams;
    const role = searchParams.get('role');

    const where = {};
    if (role) {
      where.role = role.toUpperCase();
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone_number: true,
        role: true,
        status: true,
        last_login: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER']);
    if (response) return response;

    const body = await req.json();
    const { name, username, email, password, role, pin, phone_number, employee_id, notes } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: 'username is required' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json({ error: 'password must be at least 4 characters' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    let pinHash = null;
    if (pin) {
      pinHash = await bcrypt.hash(pin, 10);
    }

    const created = await prisma.user.create({
      data: {
        name,
        username,
        email: email || null,
        password: passwordHash,
        role: role || 'CASHIER',
        pin: pinHash,
        phone_number: phone_number || null,
        employee_id: employee_id || null,
        notes: notes || null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone_number: true,
        role: true,
        status: true,
        last_login: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
