const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function ensureUser(client, { name, username, role, password, pin }) {
  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await client.user.findUnique({ where: { username }, select: { id: true } });
  if (existing) {
    return client.user.update({
      where: { username },
      data: { name, role, password: passwordHash, status: 'ACTIVE', pin: pin || null },
      select: { id: true, username: true, role: true },
    });
  }
  return client.user.create({
    data: { name, username, role, password: passwordHash, status: 'ACTIVE', pin: pin || null },
    select: { id: true, username: true, role: true },
  });
}

async function ensureByName(client, model, name, data) {
  const existing = await client[model].findFirst({ where: { name }, select: { id: true } });
  if (existing) return client[model].update({ where: { id: existing.id }, data, select: { id: true, name: true } });
  return client[model].create({ data: { name, ...data }, select: { id: true, name: true } });
}

(async () => {
  const result = await prisma.$transaction(async (tx) => {
    const password = 'password';

    const owner = await ensureUser(tx, { name: 'Owner', username: 'owner', role: 'OWNER', password: 'owner', pin: '1111' });
    const manager = await ensureUser(tx, { name: 'Manager', username: 'manager', role: 'MANAGER', password, pin: '2222' });
    const cashier = await ensureUser(tx, { name: 'Cashier', username: 'cashier', role: 'CASHIER', password, pin: '3333' });
    const kitchen = await ensureUser(tx, { name: 'Kitchen', username: 'kitchen', role: 'KITCHEN', password, pin: '4444' });

    const storeConfig = await tx.storeConfig.upsert({
      where: { id: 1 },
      update: {
        store_name: 'BAKMIE YOU-TJE',
        address: 'Jl. Bakung No. 123, Jakarta',
        phone: '0812-3456-7890',
        receipt_footer: 'Thank you for visiting!\nPlease come again.',
        tax_rate: 10,
        service_charge: 5,
      },
      create: {
        id: 1,
        store_name: 'BAKMIE YOU-TJE',
        address: 'Jl. Bakung No. 123, Jakarta',
        phone: '0812-3456-7890',
        receipt_footer: 'Thank you for visiting!\nPlease come again.',
        tax_rate: 10,
        service_charge: 5,
      },
      select: { id: true },
    });

    const offline = await ensureByName(tx, 'platform', 'Offline', { type: 'OFFLINE', commission_rate: 0 });
    const gofood = await ensureByName(tx, 'platform', 'GoFood', { type: 'DELIVERY', commission_rate: 20 });
    const grab = await ensureByName(tx, 'platform', 'GrabFood', { type: 'DELIVERY', commission_rate: 22 });

    const noodles = await ensureByName(tx, 'menuCategory', 'Noodles', { color: '#2563eb' });
    const drinks = await ensureByName(tx, 'menuCategory', 'Drinks', { color: '#16a34a' });
    const snacks = await ensureByName(tx, 'menuCategory', 'Snacks', { color: '#f59e0b' });

    const menuSeed = [
      { name: 'Bakmie Original', price: 25000, cost: 12000, categoryId: noodles.id },
      { name: 'Bakmie Spicy', price: 27000, cost: 13000, categoryId: noodles.id },
      { name: 'Es Teh Manis', price: 8000, cost: 2000, categoryId: drinks.id },
      { name: 'Es Jeruk', price: 10000, cost: 2500, categoryId: drinks.id },
      { name: 'Pangsit Goreng', price: 15000, cost: 7000, categoryId: snacks.id },
    ];

    const menus = [];
    for (const m of menuSeed) {
      const existing = await tx.menu.findFirst({ where: { name: m.name }, select: { id: true } });
      if (existing) {
        menus.push(
          await tx.menu.update({
            where: { id: existing.id },
            data: { price: m.price, cost: m.cost, categoryId: m.categoryId },
            select: { id: true, name: true, price: true },
          })
        );
      } else {
        menus.push(
          await tx.menu.create({
            data: { name: m.name, price: m.price, cost: m.cost, categoryId: m.categoryId },
            select: { id: true, name: true, price: true },
          })
        );
      }
    }

    await tx.menuPrice.createMany({
      data: menus.flatMap((m) => [
        { menu_id: m.id, platform_id: offline.id, price: m.price },
        { menu_id: m.id, platform_id: gofood.id, price: Math.round(m.price * 1.2) },
        { menu_id: m.id, platform_id: grab.id, price: Math.round(m.price * 1.22) },
      ]),
      skipDuplicates: true,
    });

    const fixedCosts = [
      { name: 'Rent', amount: 5000000, frequency: 'MONTHLY', is_active: true },
      { name: 'Internet', amount: 500000, frequency: 'MONTHLY', is_active: true },
      { name: 'Gas', amount: 150000, frequency: 'WEEKLY', is_active: true },
    ];
    for (const fc of fixedCosts) {
      const existing = await tx.fixedCost.findFirst({ where: { name: fc.name }, select: { id: true } });
      if (existing) {
        await tx.fixedCost.update({ where: { id: existing.id }, data: fc, select: { id: true } });
      } else {
        await tx.fixedCost.create({ data: fc, select: { id: true } });
      }
    }

    const expenses = [
      { item: 'Noodles', category: 'RAW_MATERIAL', amount: 250000, description: 'Restock ingredients' },
      { item: 'Packaging', category: 'PACKAGING', amount: 100000, description: 'Takeaway boxes' },
      { item: 'Cleaning', category: 'OPERATIONAL', amount: 75000, description: 'Supplies' },
    ];
    for (const ex of expenses) {
      const existing = await tx.expense.findFirst({
        where: { item: ex.item, category: ex.category, amount: ex.amount, description: ex.description },
        select: { id: true },
      });
      if (!existing) {
        await tx.expense.create({ data: ex, select: { id: true } });
      }
    }

    return {
      users: { owner, manager, cashier, kitchen },
      storeConfig,
      platforms: { offline, gofood, grab },
      categories: { noodles, drinks, snacks },
      menusCount: menus.length,
    };
  });

  console.log(JSON.stringify(result));
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
