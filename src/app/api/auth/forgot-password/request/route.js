import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const FONNTE_TOKEN = 'VsS87c5kAF1RdUvrMkzfS';

function formatToWA(phone) {
  if (!phone) return null;
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  return clean;
}

export async function POST(req) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const users = await prisma.$queryRawUnsafe(
      `SELECT * FROM "user" WHERE "username" = $1 LIMIT 1`,
      username
    );
    const user = users[0];

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.phone_number) {
      return NextResponse.json({ 
        error: 'No phone number registered. Please contact Admin.' 
      }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Use raw SQL to avoid issues if Prisma Client hasn't been regenerated yet
    await prisma.$executeRawUnsafe(
      `UPDATE "user" SET "otp" = $1, "otp_expiry" = $2 WHERE "id" = $3`,
      otp,
      expiry,
      user.id
    );

    // --- Real WhatsApp Integration with Fonnte ---
    const waTarget = formatToWA(user.phone_number);
    const message = `Halo ${user.name},\n\nKode verifikasi (OTP) untuk reset password POS Bakung Anda adalah: *${otp}*.\n\nKode ini berlaku selama 10 menit. Jangan berikan kode ini kepada siapapun.`;

    try {
      await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
          'Authorization': FONNTE_TOKEN
        },
        body: new URLSearchParams({
          'target': waTarget,
          'message': message,
          'countryCode': '62'
        })
      });
      console.log(`[WA-REAL] Sent to: ${waTarget}`);
    } catch (waErr) {
      console.error('Fonnte Send Error:', waErr);
    }
    
    // For now, we return it in dev mode response or just success
    return NextResponse.json({ 
      success: true, 
      message: 'OTP has been sent to your WhatsApp',
      phone_masked: user.phone_number.replace(/(\d{4})\d+(\d{2})/, "$1****$2")
    });

  } catch (err) {
    console.error('OTP Request Error:', err);
    return NextResponse.json({ error: 'Failed to request OTP' }, { status: 500 });
  }
}
