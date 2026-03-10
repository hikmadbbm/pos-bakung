import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password, pin } = body;

    // PIN Login
    if (pin) {
      const user = await prisma.user.findFirst({
        where: { pin, status: 'ACTIVE' },
      });
      if (!user) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
      }
      
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() },
      });
      await prisma.userActivityLog.create({
        data: {
          user_id: user.id,
          action_type: 'LOGIN',
          description: 'Logged in via PIN',
        },
      });

      return NextResponse.json({
        token,
        user: { id: user.id, username: user.username, role: user.role, name: user.name },
      });
    }

    // Standard Login
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Invalid credentials or inactive user' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });
    
    await prisma.userActivityLog.create({
      data: {
        user_id: user.id,
        action_type: 'LOGIN',
        description: 'Logged in via Password',
      },
    });

    return NextResponse.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name },
    });

  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
