
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifySummary() {
  try {
    // 1. Get a user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log("No user found");
      return;
    }

    // 2. Mock a shift if none exists
    let shift = await prisma.userShift.findFirst({
      where: { user_id: user.id, status: 'OPEN' }
    });

    if (!shift) {
      shift = await prisma.userShift.create({
        data: {
          user_id: user.id,
          starting_cash: 100000,
          status: 'OPEN'
        }
      });
      console.log("Created mock shift:", shift.id);
    }

    // 3. Check for payment methods
    const pm = await prisma.paymentMethod.findFirst();
    if (!pm) {
      console.log("No payment method found");
      return;
    }

    // 4. Create a mock order if needed
    const order = await prisma.order.create({
      data: {
        total: 50000,
        discount: 5000,
        payment_method_id: pm.id,
        created_by_user_id: user.id,
        status: 'COMPLETED',
        date: new Date()
      }
    });
    console.log("Created mock order:", order.id, "with PM:", pm.name);

    // 5. Test the summary logic (simulating the API)
    const orders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        date: { gte: shift.start_time },
        OR: [{ created_by_user_id: user.id }, { processed_by_user_id: user.id }],
      },
      select: { 
        id: true, 
        total: true, 
        discount: true, 
        payment_method_id: true,
        paymentMethod: {
          select: { name: true, type: true }
        }
      },
    });

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { is_active: true }
    });

    const methodTotals = paymentMethods.map(pm => ({
      id: pm.id,
      name: pm.name,
      type: pm.type,
      systemAmount: 0,
      count: 0
    }));

    orders.forEach(o => {
      const target = methodTotals.find(m => m.id === o.payment_method_id);
      if (target) {
        const amount = Math.max(0, Number(o.total || 0) - Number(o.discount || 0));
        target.systemAmount += amount;
        target.count += 1;
      }
    });

    console.log("Method Totals:", JSON.stringify(methodTotals, null, 2));
    
    const cashTotal = methodTotals.filter(m => m.type === 'CASH').reduce((a, b) => a + b.systemAmount, 0);
    console.log("Total Cash Sales:", cashTotal);
    console.log("Expected Cash (Start + Sales):", shift.starting_cash + cashTotal);

  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySummary();
