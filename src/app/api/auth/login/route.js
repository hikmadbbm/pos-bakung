import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import { logActivity } from '@/lib/audit';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, password, pin } = body;
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip;

    // PIN Login
    if (pin) {
      let user = null;
      try {
      const users = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
      });

      for (const u of users) {
        if (u.pin) {
          const isMatch = u.pin.startsWith('$2') 
            ? await bcrypt.compare(pin, u.pin)
            : u.pin === pin;
            
          if (isMatch) {
            user = u;
            break;
          }
        }
      }
      } catch {
        const sql = neon(
          process.env.POSTGRES_URL_NON_POOLING ||
            process.env.DATABASE_URL_UNPOOLED ||
            process.env.DATABASE_URL ||
            ''
        );
        const rows = await sql(
          'SELECT id, username, role, name, status FROM "user" WHERE pin = $1 AND status = $2 LIMIT 1',
          [pin, 'ACTIVE']
        );
        user = rows?.[0] || null;
      }
      if (!user || user.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'PIN salah atau akun tidak aktif' }, { status: 401 });
      }
      
      const token = generateToken(user);
      
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { last_login: new Date() },
        });
        
        await logActivity({
          userId: user.id,
          action: 'LOGIN',
          entity: 'USER',
          entityId: user.id,
          ipAddress,
          details: { method: 'PIN' }
        });
      } catch (err) {
        console.error("Login logging failed:", err);
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

    const token = generateToken(user);

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { last_login: new Date() },
      });
      
      await logActivity({
        userId: user.id,
        action: 'LOGIN',
        entity: 'USER',
        entityId: user.id,
        ipAddress,
        details: { method: 'PASSWORD' }
      });
    } catch (err) {
       console.error("Login logging failed:", err);
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
