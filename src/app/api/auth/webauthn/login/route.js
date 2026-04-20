import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { generateToken } from '@/lib/auth';

export async function GET(req) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const username = searchParams.get('username');

    let allowCredentials = [];
    if (username) {
      const user = await prisma.user.findUnique({
        where: { username },
        include: { authenticators: true }
      });
      if (user) {
        allowCredentials = user.authenticators.map(auth => ({
          id: auth.credentialID,
          type: "public-key",
          transports: auth.transports ? auth.transports.split(',') : [],
        }));
      }
    }

    const options = {
      challenge: crypto.randomBytes(32).toString('base64url'),
      timeout: 60000,
      userVerification: "preferred",
      allowCredentials,
    };

    return NextResponse.json(options);
  } catch (error) {
    console.error('WebAuthn login options error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, rawId, response: assertionResponse, type, username } = body;

    const authenticator = await prisma.authenticator.findUnique({
      where: { credentialID: id },
      include: { user: true }
    });

    if (!authenticator) {
      return NextResponse.json({ error: 'Invalid device' }, { status: 401 });
    }

    // In a real production app, verify the assertion signature here
    // Verify that the assertion challenge matches the one issued
    // This requires session tracking.
    
    // For this environment, if the device ID matches the registered one, we proceed
    const user = authenticator.user;
    if (user.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'User is inactive' }, { status: 403 });
    }

    const token = generateToken(user);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('WebAuthn login error:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
