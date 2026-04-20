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

    console.log("POS Init: DB Queries Starting...");
    
    let menus, categories, platforms, paymentMethods, currentShift, storeConfig;

    try {
      console.log("POS Init: Fetching menus...");
      menus = await prisma.menu.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          price: true,
          categoryId: true,
          category: { select: { id: true, name: true, color: true, type: true } },
          prices: { select: { platform_id: true, price: true } }
        },
        orderBy: { name: 'asc' }
      });
      
      console.log("POS Init: Fetching categories...");
      categories = await prisma.menuCategory.findMany({ orderBy: { id: 'asc' } });
      
      console.log("POS Init: Fetching platforms...");
      platforms = await prisma.platform.findMany({ orderBy: { id: 'asc' } });
      
      console.log("POS Init: Fetching payment methods...");
      paymentMethods = await prisma.paymentMethod.findMany({
        where: { is_active: true },
        orderBy: { display_order: 'asc' }
      });
      
      console.log("POS Init: Fetching current shift...");
      currentShift = await prisma.userShift.findFirst({
        where: { status: 'OPEN' }, 
        orderBy: { start_time: 'desc' }
      });
      
      console.log("POS Init: Fetching store config...");
      storeConfig = await prisma.storeConfig.findFirst();
      
      console.log("POS Init: All DB queries successful");
    } catch (dbError) {
      console.error("POS Init: DB Query Failed!", dbError);
      throw dbError; // rethrow to be caught by the main catch block
    }

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
      storeConfig,
      user: { id: user.id, name: user.name, role: user.role },
      processing_time_ms: duration
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0' // POS data should be fresh but we might consider revalidate if needed
      }
    });

  } catch (error) {
    console.error('Failed to initialize POS data ERROR:', error);
    // Log the actual error message and stack to the console
    console.error('Error Details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    return NextResponse.json({ 
      error: 'Failed to initialize POS data',
      details: error.message
    }, { status: 500 });
  }
}
