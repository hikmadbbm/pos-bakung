import { NextResponse } from 'next/server';
import { evaluatePromotions } from '@/lib/promo-engine';
import { verifyAuth } from '@/lib/auth';

export async function POST(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const orderData = await req.json();
    
    // items, platform_id, payment_method, customer_type, order_type, subtotal
    const result = await evaluatePromotions(orderData);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to evaluate promotions:', error);
    return NextResponse.json({ error: 'Failed to evaluate promotions' }, { status: 500 });
  }
}
