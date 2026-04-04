import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('[auth.js] FATAL: JWT_SECRET environment variable is not set. Application cannot start securely.');
}

/**
 * Verifies JWT and checks if the user has the required role.
 * Optimized: Uses JWT payload data to avoid redundant database queries.
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

    // Optimization: Trust JWT payload for performance if it contains necessary data.
    // This avoids one DB query per API request.
    let user = null;

    if (decoded.id && decoded.role && decoded.status) {
      // Use data from token — faster for serverless
      user = {
        id: decoded.id,
        name: decoded.name,
        username: decoded.username,
        role: decoded.role,
        status: decoded.status
      };
    } else {
      // Fallback for older tokens or incomplete payloads
      user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          status: true,
        },
      });
    }

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
