import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { logActivity } from '@/lib/audit';

export async function POST(req) {
  try {
    const { username, otp, newPassword } = await req.json();

    if (!username || !otp || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const users = await prisma.$queryRawUnsafe(
      `SELECT * FROM "user" WHERE "username" = $1 LIMIT 1`,
      username
    );
    const user = users[0];

    if (!user || user.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP' }, { status: 400 });
    }

    if (user.otp_expiry < new Date()) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Use raw SQL to update password and clear OTP
    await prisma.$executeRawUnsafe(
      `UPDATE "user" SET "password" = $1, "otp" = NULL, "otp_expiry" = NULL WHERE "id" = $2`,
      hashedPassword,
      user.id
    );

    await logActivity({
      userId: user.id,
      action: 'PASSWORD_RESET',
      entity: 'USER',
      entityId: user.id,
      details: { method: 'WA_OTP' }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Password has been reset successfully' 
    });

  } catch (err) {
    console.error('Password Reset Error:', err);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
