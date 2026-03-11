const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    },
  },
});

describe('Categories persistence', () => {
  test('creates and reads category via Prisma transaction', async () => {
    const created = await prisma.$transaction(async (tx) => {
      return tx.menuCategory.create({
        data: { name: 'Test Category', color: '#123456' },
      });
    });
    const row = await prisma.menuCategory.findUnique({ where: { id: created.id } });
    expect(row).not.toBeNull();
    expect(row.name).toBe('Test Category');
  });
});
