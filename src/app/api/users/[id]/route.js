import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function PUT(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await req.json();
    const data = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.username !== undefined) data.username = body.username;
    if (body.email !== undefined) data.email = body.email || null;
    if (body.role !== undefined) data.role = body.role;
    if (body.status !== undefined) data.status = body.status;
    if (body.pin !== undefined) {
      if (body.pin) {
        data.pin = await bcrypt.hash(body.pin, 10);
      } else {
        data.pin = null;
      }
    }
    if (body.phone_number !== undefined) data.phone_number = body.phone_number || null;
    if (body.employee_id !== undefined) data.employee_id = body.employee_id || null;
    if (body.notes !== undefined) data.notes = body.notes || null;
    if (body.password !== undefined && body.password) {
      const passwordHash = await bcrypt.hash(body.password, 10);
      data.password = passwordHash;
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        last_login: true,
        email: true,
        phone_number: true,
        employee_id: true,
        notes: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { response } = await verifyAuth(req, ['OWNER']);
    if (response) return response;

    const resolvedParams = await params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

