import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { syncDailySummary } from '@/lib/aggregation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    const { csvData } = body;

    if (!csvData) {
      return NextResponse.json({ error: 'No CSV data provided' }, { status: 400 });
    }

    // Simple CSV parser
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1);

    const ordersMap = new Map();

    for (const row of dataRows) {
      if (!row.trim()) continue;
      const values = row.split(',').map(v => v.trim());
      const entry = {};
      headers.forEach((h, i) => {
        entry[h] = values[i];
      });

      const {
        order_number,
        transaction_date,
        menu_name,
        quantity,
        price,
        payment_method,
        notes
      } = entry;

      // Basic validation
      if (!order_number || !transaction_date || !menu_name || !quantity || !price || !payment_method) {
        return NextResponse.json({ error: `Missing required fields in row: ${row}` }, { status: 400 });
      }

      const qty = parseInt(quantity);
      const prc = parseInt(price);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json({ error: `Invalid quantity in row: ${row}` }, { status: 400 });
      }
      if (isNaN(prc)) {
        return NextResponse.json({ error: `Invalid price in row: ${row}` }, { status: 400 });
      }

      if (!ordersMap.has(order_number)) {
        ordersMap.set(order_number, {
          order_number,
          transaction_date,
          payment_method,
          notes,
          items: []
        });
      }

      const order = ordersMap.get(order_number);
      // Validate consistency for the same order_number
      if (order.transaction_date !== transaction_date || order.payment_method !== payment_method) {
        return NextResponse.json({ 
          error: `Inconsistent date or payment method for order ${order_number}` 
        }, { status: 400 });
      }

      order.items.push({
        menu_name,
        qty,
        price: prc
      });
    }

    // Pre-fetch all necessary data to minimize DB calls inside transaction
    const [allMenus, allPaymentMethods] = await Promise.all([
      prisma.menu.findMany(),
      prisma.paymentMethod.findMany()
    ]);

    const menuMap = new Map(allMenus.map(m => [m.name.toLowerCase(), m]));
    const pmMap = new Map(allPaymentMethods.map(pm => [pm.name.toLowerCase(), pm]));

    const results = await prisma.$transaction(async (tx) => {
      const importedOrders = [];

      for (const [orderNumber, orderData] of ordersMap.entries()) {
        // 1. Check uniqueness
        const existing = await tx.order.findUnique({
          where: { order_number: orderNumber }
        });
        if (existing) {
          throw new Error(`Order number ${orderNumber} already exists`);
        }

        // 2. Resolve Payment Method
        const paymentMethod = pmMap.get(orderData.payment_method.toLowerCase());
        if (!paymentMethod) {
          throw new Error(`Payment method "${orderData.payment_method}" not found for order ${orderNumber}. Available: ${allPaymentMethods.map(p => p.name).join(', ')}`);
        }

        // 3. Process Items
        let total = 0;
        const itemsToCreate = [];

        for (const item of orderData.items) {
          const menu = menuMap.get(item.menu_name.toLowerCase());
          if (!menu) {
            throw new Error(`Menu item "${item.menu_name}" not found for order ${orderNumber}`);
          }

          total += item.price * item.qty;
          itemsToCreate.push({
            menu_id: menu.id,
            qty: item.qty,
            price: item.price,
            cost: menu.cost
          });
        }

        // 4. Create Order
        const newOrder = await tx.order.create({
          data: {
            order_number: orderNumber,
            date: new Date(orderData.transaction_date),
            total: total,
            net_revenue: total, 
            payment_method: paymentMethod.name,
            payment_method_id: paymentMethod.id,
            status: 'COMPLETED',
            note: orderData.notes || null,
            created_by_user_id: user.id,
            processed_by_user_id: user.id,
            orderItems: {
              create: itemsToCreate
            }
          }
        });

        importedOrders.push(newOrder);
      }
      return importedOrders;
    }, {
      timeout: 60000 // 60 seconds timeout
    });

    // 5. Backfill DailySummary for all unique dates in the CSV
    const uniqueDates = new Set();
    for (const orderData of ordersMap.values()) {
      const date = new Date(orderData.transaction_date);
      date.setHours(0, 0, 0, 0);
      uniqueDates.add(date.getTime());
    }

    // Sync in background or sequentially
    // For small number of days, sequential is fine.
    for (const timestamp of uniqueDates) {
      try {
        await syncDailySummary(new Date(timestamp));
      } catch (err) {
        logger.error(`Failed to sync summary for ${new Date(timestamp).toISOString()}:`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: results.length,
      orders: results.map(o => o.order_number)
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to import CSV:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to import CSV data' 
    }, { status: 500 });
  }
}
