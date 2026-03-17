import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

/**
 * Verifies JWT and checks if the user has the required role.
 * @param {Request} req - The incoming request object.
 * @param {string[]} allowedRoles - List of roles that can access this endpoint.
 * @returns {Promise<{user: any, response: NextResponse | null}>}
 */
export async function verifyAuth(req, allowedRoles = []) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Auth: Missing or invalid Authorization header');
      return { user: null, response: NextResponse.json({ error: 'Unauthorized: Missing or invalid Authorization header' }, { status: 401 }) };
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      console.error('Auth: Token verification failed', e.message);
      return { user: null, response: NextResponse.json({ error: `Invalid token: ${e.message}` }, { status: 401 }) };
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return { user: null, response: NextResponse.json({ error: 'User not found or inactive' }, { status: 404 }) };
    }

    // Role check
    // OWNER always has access
    if (user.role === 'OWNER') {
      return { user, response: null };
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return { user, response: NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 }) };
    }

    return { user, response: null };
  } catch (error) {
    console.error('Auth verification failed:', error);
    return { user: null, response: NextResponse.json({ error: 'Internal server error' }, { status: 500 }) };
  }
}
