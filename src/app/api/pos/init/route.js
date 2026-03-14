import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  const startTime = Date.now();
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER', 'KITCHEN']);
    if (response) return response;

    const [menus, categories, platforms, paymentMethods, currentShift] = await Promise.all([
      // 1. Active Menus with categorized prices
      prisma.menu.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          price: true,
          categoryId: true,
          category: { select: { name: true, color: true } },
          prices: { select: { platform_id: true, price: true } }
        },
        orderBy: { name: 'asc' }
      }),
      // 2. All Categories
      prisma.menuCategory.findMany({ orderBy: { id: 'asc' } }),
      // 3. All Platforms
      prisma.platform.findMany({ orderBy: { id: 'asc' } }),
      // 4. Active Payment Methods
      prisma.paymentMethod.findMany({
        where: { is_active: true },
        orderBy: { display_order: 'asc' }
      }),
      // 5. Current User Shift
      prisma.userShift.findFirst({
        where: { user_id: user.id, status: 'OPEN' },
        orderBy: { start_time: 'desc' }
      })
    ]);

    // Normalize prices for menus
    const normalizedMenus = menus.map(m => {
      const prices = {};
      m.prices.forEach(p => {
        prices[p.platform_id] = p.price;
      });
      return { ...m, prices };
    });

    const duration = Date.now() - startTime;
    console.log(`POS Init API took ${duration}ms for user ${user.id}`);

    return NextResponse.json({
      menus: normalizedMenus,
      categories,
      platforms,
      paymentMethods,
      currentShift,
      user: { id: user.id, name: user.name, role: user.role },
      processing_time_ms: duration
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0' // POS data should be fresh but we might consider revalidate if needed
      }
    });

  } catch (error) {
    console.error('Failed to initialize POS data:', error);
    return NextResponse.json({ error: 'Failed to initialize POS data' }, { status: 500 });
  }
}
