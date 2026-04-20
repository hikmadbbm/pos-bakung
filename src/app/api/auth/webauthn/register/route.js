import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req) {
  try {
    const { user, response } = await verifyAuth(req);
    if (response) return response;

    const body = await req.json();
    const { id, rawId, response: attestationResponse, type } = body;

    // In a production app, verify the attestation signature here using @simplewebauthn/server
    // For this POS environment, we'll store the credential ID and public key
    
    // We expect the client to send the public key (exported from the credential)
    // or we'll store a placeholder if we just want "Device ID" security
    
    await prisma.authenticator.create({
      data: {
        user_id: user.id,
        credentialID: id,
        credentialPublicKey: body.publicKey || "placeholder", // In real app, must be actual public key
        counter: 0,
        credentialDeviceType: "single-device",
        credentialBackedUp: false,
        transports: "",
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('WebAuthn register error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Device already registered' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
