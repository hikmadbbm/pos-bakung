import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;
    
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const range = searchParams.get('range');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where = {};
    if (range === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.date = { gte: today };
    } else if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
    }

    const [expenses, total, stats] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { name: true } }
        }
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true }
      })
    ]);

    return NextResponse.json({
      expenses,
      stats: {
        total_amount: stats._sum.amount || 0
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;
    const body = await req.json();
    const { item, category, amount, description } = body;

    if (!item || typeof item !== 'string') {
      return NextResponse.json({ error: 'item is required' }, { status: 400 });
    }
    if (!category || typeof category !== 'string') {
      return NextResponse.json({ error: 'category is required' }, { status: 400 });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    // Try to find an active shift for this user OR any open shift
    const activeShift = await prisma.userShift.findFirst({
      where: { status: 'OPEN' },
      orderBy: { id: 'desc' }
    });

    const data = {
      item,
      amount: Math.round(amt),
      description: description || null,
      date: body.date ? new Date(body.date) : new Date(),
      user_id: user.id,
      shift_id: activeShift?.id || null,
      funding_source: body.funding_source || "Kasir / Tunai",
      is_cash: body.is_cash !== undefined ? body.is_cash : true,
    };

    if (body.category !== undefined) {
      data.category = body.category || "OTHERS";
    }

    try {
      const created = await prisma.expense.create({
        data,
        include: {
          user: { select: { name: true } }
        }
      });
      return NextResponse.json(created, { status: 201 });
    } catch (createError) {
      console.error('Prisma Create Expense Error, trying raw fallback:', createError);
      
      try {
        // Hotpatch fallback if Prisma Client is out of sync (EPERM issue)
        const result = await prisma.$executeRaw`
          INSERT INTO expense (item, amount, description, date, user_id, shift_id, funding_source, is_cash, category)
          VALUES (${data.item}, ${data.amount}, ${data.description}, ${data.date}, ${data.user_id}, ${data.shift_id}, ${data.funding_source}, ${data.is_cash}, ${data.category})
        `;
        
        // Return a mocked success response since raw insert doesn't return the full object easily
        return NextResponse.json({ success: true, message: 'Created via raw fallback' }, { status: 201 });
      } catch (rawError) {
        console.error('Raw Fallback Failed:', rawError);
        return NextResponse.json({ 
          error: 'Database creation failed', 
          details: rawError.message 
        }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('Failed to create expense (outer):', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

