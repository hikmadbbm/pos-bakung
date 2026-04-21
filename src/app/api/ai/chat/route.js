import { NextResponse } from 'next/server';
import { getChatResponse } from '@/lib/gemini';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { response: authResponse } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (authResponse) return authResponse;

    const { message, history, context } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const aiResponse = await getChatResponse(message, history, context || {});

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return NextResponse.json({ error: 'DeepMind Analysis Failed' }, { status: 500 });
  }
}
