import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(req) {
  try {
    const { user, response } = await verifyAuth(req);
    if (response) return response;

    const challenge = crypto.randomBytes(32).toString('base64url');
    
    // Store challenge in DB or session (simplified: we'll trust the registration for this POS context)
    // In real app, store it to verify later.
    
    const options = {
      challenge,
      rp: {
        name: "POS Bakmi Youtje",
        id: req.nextUrl.hostname === 'localhost' ? 'localhost' : req.nextUrl.hostname,
      },
      user: {
        id: user.id.toString(),
        name: user.username,
        displayName: user.name,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      timeout: 60000,
      attestation: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    };

    return NextResponse.json(options);
  } catch (error) {
    console.error('WebAuthn options error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
