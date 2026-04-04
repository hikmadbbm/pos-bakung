import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { neon } from '@neondatabase/serverless';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password, pin } = body;

    // PIN Login
    if (pin) {
      let user = null;
      try {
        user = await prisma.user.findFirst({
          where: { pin, status: 'ACTIVE' },
        });
      } catch {
        const sql = neon(
          process.env.POSTGRES_URL_NON_POOLING ||
            process.env.DATABASE_URL_UNPOOLED ||
            process.env.DATABASE_URL ||
            ''
        );
        const rows = await sql(
          'SELECT id, username, role, name FROM "user" WHERE pin = $1 AND status = $2 LIMIT 1',
          [pin, 'ACTIVE']
        );
        user = rows?.[0] || null;
      }
      if (!user) {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
      }
      
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, name: user.name, status: user.status },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      try {
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
      } catch {
        const sql = neon(
          process.env.POSTGRES_URL_NON_POOLING ||
            process.env.DATABASE_URL_UNPOOLED ||
            process.env.DATABASE_URL ||
            ''
        );
        await sql('UPDATE "user" SET last_login = NOW() WHERE id = $1', [user.id]);
        await sql(
          'INSERT INTO "user_activity_log"(user_id, action_type, description) VALUES ($1, $2, $3)',
          [user.id, 'LOGIN', 'Logged in via PIN']
        );
      }

      return NextResponse.json({
        token,
        user: { id: user.id, username: user.username, role: user.role, name: user.name },
      });
    }

    // Standard Login
    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    let user = null;
    try {
      user = await prisma.user.findUnique({
        where: { username },
      });
    } catch {
      const sql = neon(
        process.env.POSTGRES_URL_NON_POOLING ||
          process.env.DATABASE_URL_UNPOOLED ||
          process.env.DATABASE_URL ||
          ''
      );
      const rows = await sql(
        'SELECT id, username, role, name, password, status FROM "user" WHERE username = $1 LIMIT 1',
        [username]
      );
      user = rows?.[0] || null;
    }

    if (!user || user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Invalid credentials or inactive user' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name, status: user.status },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    try {
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
    } catch {
      const sql = neon(
        process.env.POSTGRES_URL_NON_POOLING ||
          process.env.DATABASE_URL_UNPOOLED ||
          process.env.DATABASE_URL ||
          ''
      );
      await sql('UPDATE "user" SET last_login = NOW() WHERE id = $1', [user.id]);
      await sql(
        'INSERT INTO "user_activity_log"(user_id, action_type, description) VALUES ($1, $2, $3)',
        [user.id, 'LOGIN', 'Logged in via Password']
      );
    }

    return NextResponse.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, name: user.name },
    });

  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
