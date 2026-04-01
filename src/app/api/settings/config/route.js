import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    const config = await prisma.storeConfig.findFirst({ orderBy: { id: 'asc' } });
    if (!config) {
      const created = await prisma.storeConfig.create({ data: {} });
      return NextResponse.json(created);
    }
    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to fetch store config:', error);
    return NextResponse.json({ error: 'Failed to fetch store config' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { response } = await verifyAuth(req, ['OWNER', 'MANAGER']);
    if (response) return response;
    const body = await req.json();
    const data = {};

    if (body.store_name !== undefined) data.store_name = body.store_name;
    if (body.address !== undefined) data.address = body.address;
    if (body.phone !== undefined) data.phone = body.phone;
    if (body.receipt_footer !== undefined) data.receipt_footer = body.receipt_footer;
    if (body.tax_rate !== undefined) data.tax_rate = Number(body.tax_rate);
    if (body.service_charge !== undefined) data.service_charge = Number(body.service_charge);
    if (body.paper_width !== undefined) data.paper_width = Number(body.paper_width);
    if (body.show_logo !== undefined) data.show_logo = Boolean(body.show_logo);
    if (body.show_customer !== undefined) data.show_customer = Boolean(body.show_customer);
    if (body.show_name !== undefined) data.show_name = Boolean(body.show_name);
    if (body.kitchen_enabled !== undefined) data.kitchen_enabled = Boolean(body.kitchen_enabled);
    if (body.kitchen_auto_print !== undefined) data.kitchen_auto_print = Boolean(body.kitchen_auto_print);
    if (body.kitchen_copies !== undefined) data.kitchen_copies = Number(body.kitchen_copies);
    if (body.kitchen_categories !== undefined) data.kitchen_categories = body.kitchen_categories;
    if (body.language !== undefined) data.language = body.language;
    if (body.logo_url !== undefined) data.logo_url = body.logo_url;
    if (body.instagram !== undefined) data.instagram = body.instagram;
    if (body.whatsapp !== undefined) data.whatsapp = body.whatsapp;
    if (body.quick_tags !== undefined) data.quick_tags = body.quick_tags;
    if (body.kitchen_delay !== undefined) data.kitchen_delay = Number(body.kitchen_delay);

    const existing = await prisma.storeConfig.findFirst({ orderBy: { id: 'asc' }, select: { id: true } });
    const saved = existing
      ? await prisma.storeConfig.update({ where: { id: existing.id }, data })
      : await prisma.storeConfig.create({ data });

    return NextResponse.json(saved);
  } catch (error) {
    console.error('Failed to update store config:', error);
    return NextResponse.json({ error: 'Failed to update store config' }, { status: 500 });
  }
}

