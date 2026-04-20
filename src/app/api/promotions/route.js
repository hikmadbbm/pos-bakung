import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER', 'CASHIER']);
    if (response) return response;

    const promos = await prisma.promotion.findMany({
      include: {
        conditions: true,
        actions: true,
        constraints: true
      },
      orderBy: { created_at: 'desc' }
    });

    return NextResponse.json(promos);
  } catch (error) {
    console.error('Failed to fetch promotions:', error);
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { user, response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;

    const body = await req.json();
    const {
      name,
      description,
      type,
      status,
      startDate,
      endDate,
      daysActive,
      timeStart,
      timeEnd,
      priority,
      stackable,
      source,
      maxUsagePerDay,
      maxUsagePerCustomer,
      conditions, // Array of condition objects
      actions,    // Array of action objects
      constraints // Array of constraint objects
    } = body;

    const result = await prisma.promotion.create({
      data: {
        name,
        description,
        type,
        status: status || 'ACTIVE',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        daysActive,
        timeStart,
        timeEnd,
        priority: priority || 0,
        stackable: stackable || false,
        source: source || 'POS',
        maxUsagePerDay,
        maxUsagePerCustomer,
        conditions: {
          create: conditions || []
        },
        actions: {
          create: actions || []
        },
        constraints: {
          create: constraints || []
        }
      },
      include: {
        conditions: true,
        actions: true,
        constraints: true
      }
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to create promotion:', error);
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }
}
