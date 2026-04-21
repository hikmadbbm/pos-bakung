import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from './prisma';
import { hasPermission, PERMISSIONS } from './permissions';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-only';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('---------------------------------------------------------');
  console.error('FATAL CLOUD-AUTH ERROR: JWT_SECRET is not set.');
  console.error('Sistem terpaksa menggunakan kunci fallback standar.');
  console.error('SEGERA ATUR di: Vercel Settings > Environment Variables.');
  console.error('---------------------------------------------------------');
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

/**
 * Higher-level auth check that also validates specific action permissions
 * @param {Request} req 
 * @param {string} permission - e.g. 'finance:confirm'
 * @returns {Promise<{user: any, response: NextResponse | null}>}
 */
export async function verifyPermission(req, permission) {
  const { user, response } = await verifyAuth(req);
  if (response) return { user, response };

  if (!hasPermission(user, permission)) {
    console.warn(`Permission Denied: User ${user.username} (Role: ${user.role}) attempted ${permission}`);
    return { 
      user, 
      response: NextResponse.json(
        { error: `Forbidden: You do not have permission to ${permission}` }, 
        { status: 403 }
      ) 
    };
  }

  return { user, response: null };
}

/**
 * Generates a JWT token for a user.
 * @param {object} user - User object containing id, name, username, role, status.
 * @returns {string} - The generated JWT token.
 */
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      name: user.name, 
      username: user.username, 
      role: user.role, 
      status: user.status,
      permissions: PERMISSIONS[user.role] || []
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
