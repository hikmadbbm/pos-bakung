import express from "express";

export default function analyticsRouter({ prisma }) {
  const router = express.Router();

  // GET /api/analytics/menu-intelligence
  router.get("/menu-intelligence", async (req, res) => {
    try {
      const menus = await prisma.menu.findMany({
        include: {
          category: true,
          orderItems: {
            where: {
              order: {
                status: "COMPLETED"
              }
            },
            include: {
              order: {
                include: {
                  platform: true
                }
              }
            }
          }
        }
      });

      const analysis = menus.map(m => {
        let total_qty = 0;
        let total_revenue = 0;
        let total_cost = 0;
        let total_commission = 0;

        m.orderItems.forEach(item => {
          const qty = item.qty;
          const price = item.price;
          const cost = item.cost;
          const commissionRate = item.order?.platform?.commission_rate || 0;

          total_qty += qty;
          total_revenue += price * qty;
          total_cost += cost * qty;
          total_commission += (price * qty * commissionRate) / 100;
        });

        const gross_profit = total_revenue - total_cost;
        const net_profit = gross_profit - total_commission;
        const profit_margin = total_revenue > 0 ? (net_profit / total_revenue) * 100 : 0;

        return {
          id: m.id,
          name: m.name,
          category: m.category?.name || "Uncategorized",
          total_qty,
          total_revenue,
          total_cost,
          total_commission,
          gross_profit,
          net_profit,
          profit_margin
        };
      });

      // Classification Logic
      const avgQty = analysis.reduce((acc, curr) => acc + curr.total_qty, 0) / (analysis.length || 1);
      const avgProfit = analysis.reduce((acc, curr) => acc + curr.net_profit, 0) / (analysis.length || 1);

      const classified = analysis.map(m => {
        let status = "UNDERPERFORMING MENU";
        if (m.total_qty >= avgQty && m.net_profit >= avgProfit) {
          status = "STAR MENU";
        } else if (m.net_profit >= avgProfit) {
          status = "PROFITABLE MENU";
        } else if (m.total_qty >= avgQty && m.net_profit < avgProfit) {
          status = "LOW MARGIN MENU";
        }

        return { ...m, status };
      });

      // Insights
      const topProfitable = [...classified].sort((a, b) => b.net_profit - a.net_profit).slice(0, 5);
      const lowMargin = classified.filter(m => m.total_qty > avgQty && m.profit_margin < 15);
      const lowSelling = classified.filter(m => m.total_qty < (avgQty * 0.5));

      // Overhead Analysis
      const fixedCosts = await prisma.fixedCost.findMany();
      let totalDailyOverhead = 0;
      fixedCosts.forEach(fc => {
        if (fc.frequency === 'DAILY') totalDailyOverhead += fc.amount;
        else if (fc.frequency === 'WEEKLY') totalDailyOverhead += fc.amount / 7;
        else if (fc.frequency === 'MONTHLY') totalDailyOverhead += fc.amount / 30;
      });

      const totalQtyAll = classified.reduce((acc, curr) => acc + curr.total_qty, 0);
      const overheadPerOrder = totalQtyAll > 0 ? totalDailyOverhead / totalQtyAll : 0;

      const menuWithOverhead = classified.map(m => {
        const shareOfSales = totalQtyAll > 0 ? m.total_qty / totalQtyAll : 0;
        const allocatedOverhead = totalDailyOverhead * shareOfSales;
        const profitAfterOverhead = m.net_profit - allocatedOverhead;
        return {
          ...m,
          allocatedOverhead: Math.round(allocatedOverhead),
          profitAfterOverhead: Math.round(profitAfterOverhead)
        };
      });

      res.json({
        data: menuWithOverhead,
        insights: {
          topProfitable,
          lowMargin,
          lowSelling,
          totalDailyOverhead: Math.round(totalDailyOverhead),
          overheadPerOrder: Math.round(overheadPerOrder)
        },
        thresholds: {
          avgQty,
          avgProfit
        }
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch menu intelligence" });
    }
  });

  // GET /api/analytics/demand-forecast
  router.get("/demand-forecast", async (req, res) => {
    try {
      const menus = await prisma.menu.findMany();
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);

      const forecast = await Promise.all(menus.map(async (m) => {
        const last7DaysItems = await prisma.orderItem.findMany({
          where: {
            menu_id: m.id,
            order: {
              date: {
                gte: sevenDaysAgo
              },
              status: "COMPLETED"
            }
          }
        });

        const totalQtyLast7Days = last7DaysItems.reduce((acc, curr) => acc + curr.qty, 0);
        const avgDailySales = totalQtyLast7Days / 7;
        
        // Simple prediction: tomorrow = avgDailySales * (1 + small_growth_factor if it's weekend?)
        // For simplicity, just avgDailySales
        const predictedTomorrow = Math.ceil(avgDailySales);
        const predictedNext7Days = Math.ceil(avgDailySales * 7);

        // Recommended prep: predicted + 10% buffer
        const recommendedPrep = Math.ceil(predictedTomorrow * 1.1);

        return {
          id: m.id,
          name: m.name,
          avgDailySales: parseFloat(avgDailySales.toFixed(2)),
          predictedTomorrow,
          predictedNext7Days,
          recommendedPrep
        };
      }));

      res.json(forecast);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch demand forecast" });
    }
  });

  // POST /api/analytics/price-recommendation
  router.post("/price-recommendation", async (req, res) => {
    const { basePrice, cost } = req.body;
    
    // Check for existence, but allow 0
    if (basePrice === undefined || cost === undefined) {
      return res.status(400).json({ error: "Base price and cost are required" });
    }

    try {
      const platforms = await prisma.platform.findMany();
      const recommendations = {};

      platforms.forEach(p => {
        const commissionRate = p.commission_rate || 0;
        
        if (p.type === 'OFFLINE' || commissionRate === 0) {
          recommendations[p.id] = parseInt(basePrice);
        } else {
          // AI Logic: Calculate price to maintain same net profit as offline
          // Payout = Price * (1 - rate)
          // We want Payout = BasePrice
          // So Price = BasePrice / (1 - rate)
          const rate = commissionRate / 100;
          
          let recommended = 0;
          if (rate < 1) {
             recommended = basePrice / (1 - rate);
          } else {
             // If commission is 100% or more (shouldn't happen), just use base + base*rate
             recommended = basePrice * (1 + rate);
          }
          
          // Round to nearest 500
          recommended = Math.ceil(recommended / 500) * 500;
          
          recommendations[p.id] = recommended;
        }
      });

      res.json({
        recommendations,
        logic: "Calculated to maintain base profit margin after platform commission, rounded to nearest 500."
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to generate price recommendations" });
    }
  });

  // GET /api/analytics/cashier-report?date=YYYY-MM-DD
  router.get("/cashier-report", async (req, res) => {
    try {
      const dateStr = req.query.date || new Date().toISOString().split('T')[0];
      
      // Fix date range for local time
      // Use explicit parsing to ensure consistency with POST
      const [year, month, day] = dateStr.split('-').map(Number);
      const start = new Date(year, month - 1, day); // Local midnight
      
      const end = new Date(year, month - 1, day);
      end.setHours(23, 59, 59, 999);

      // 0. Check for existing reconciliation report
      // Search by range to find any report for this day, regardless of stored time component
      const reconciliation = await prisma.cashierReconciliation.findFirst({
        where: { 
          date: {
            gte: start,
            lte: end
          }
        }
      });

      // 1. Fetch Orders for the day
      const orders = await prisma.order.findMany({
        where: {
          date: {
            gte: start,
            lte: end
          },
          status: "COMPLETED"
        },
        include: {
          platform: true
        }
      });

      // 2. Aggregate by Payment Method
      // We want to separate PLATFORM payments by their actual Platform Name (e.g. GoFood, GrabFood)
      const paymentSummary = {};
      
      // Initialize common methods
      ["CASH", "QRIS", "DEBIT", "CREDIT", "TRANSFER"].forEach(m => {
        paymentSummary[m] = { count: 0, amount: 0 };
      });
      
      let totalSales = 0;
      let totalDiscount = 0;
      let totalCommission = 0;
      let totalNet = 0;
      
      orders.forEach(o => {
        let method = o.payment_method || "CASH";
        
        // If method is PLATFORM, use the actual platform name instead
        if (method === "PLATFORM") {
          method = o.platform?.name || "Unknown Platform";
        }

        if (!paymentSummary[method]) {
            paymentSummary[method] = { count: 0, amount: 0 };
        }
        
        const amount = o.total - (o.discount || 0);

        paymentSummary[method].count++;
        paymentSummary[method].amount += amount;

        totalSales += o.total; 
        totalDiscount += (o.discount || 0);
        // Commission is stored in order, or calculated?
        // Let's assume stored if possible, or calculate from platform rate
        const comm = o.commission || 0; // Assuming commission field exists or is calculated elsewhere. If not, this might be 0.
        totalCommission += comm;
        totalNet += (amount - comm);
      });

      // 3. Aggregate by Platform (Source) - Useful for seeing where orders come from
      const platformSummary = {};
      orders.forEach(o => {
        const pName = o.platform?.name || "Unknown";
        if (!platformSummary[pName]) platformSummary[pName] = { count: 0, amount: 0 };
        platformSummary[pName].count++;
        platformSummary[pName].amount += (o.total - (o.discount || 0));
      });

      const cashInDrawer = paymentSummary["CASH"] ? paymentSummary["CASH"].amount : 0;

      res.json({
        date: dateStr,
        summary: {
          totalOrders: orders.length,
          grossSales: totalSales,
          netSales: totalSales - totalDiscount,
          totalCommission,
          netProfit: totalNet
        },
        paymentMethods: paymentSummary,
        platformBreakdown: platformSummary,
        cashInDrawer,
        reconciliation: reconciliation // Include existing report if any
      });

    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to generate cashier report" });
    }
  });

  // POST /api/analytics/reconciliation
  router.post("/reconciliation", async (req, res) => {
    const { date, details, notes, submitted_by } = req.body;
    
    console.log("Reconciliation Request Body:", req.body); // Debug log

    if (!date || !details) {
      console.error("Missing date or details in request");
      return res.status(400).json({ error: "Date and details required" });
    }

    try {
      // Ensure date is treated as local date (YYYY-MM-DD)
      // Create date object from YYYY-MM-DD string to avoid UTC offset issues
      // Handle cases where date might be full ISO string or just YYYY-MM-DD
      let reportDate;
      if (date.includes('T')) {
         reportDate = new Date(date);
      } else {
         const [year, month, day] = date.split('-').map(Number);
         reportDate = new Date(year, month - 1, day); // Local midnight
      }
      
      console.log(`Parsed Date: ${reportDate.toString()}`);
      
      // Calculate totals from details
      let total_system = 0;
      let total_actual = 0;
      let closing_cash = 0;

      // details: { CASH: { system: 100, actual: 100 }, ... }
      Object.entries(details).forEach(([method, data]) => {
        total_system += (parseInt(data.system) || 0);
        total_actual += (parseInt(data.actual) || 0);
        if (method === 'CASH') {
          closing_cash = (parseInt(data.actual) || 0);
        }
      });

      const discrepancy = total_actual - total_system;

      console.log(`Submitting reconciliation for ${date} (Local: ${reportDate.toString()})`);
      console.log(`Calculated: System=${total_system}, Actual=${total_actual}, Discrepancy=${discrepancy}`);

      // FIX: Use Find-First-By-Date-Range instead of Upsert-By-Exact-Date
      // This prevents issues where existing records have different time components (e.g. UTC vs Local)
      const startOfDay = new Date(reportDate);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(reportDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingReport = await prisma.cashierReconciliation.findFirst({
        where: {
          date: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      });

      let report;
      if (existingReport) {
        console.log(`Updating existing report ID: ${existingReport.id}`);
        // Update existing
        report = await prisma.cashierReconciliation.update({
          where: { id: existingReport.id },
          data: {
            details,
            total_system,
            total_actual,
            closing_cash,
            discrepancy,
            notes,
            submitted_by,
            status: "SUBMITTED",
            updated_at: new Date()
          }
        });
      } else {
        console.log(`Creating new report`);
        // Create new
        try {
          report = await prisma.cashierReconciliation.create({
            data: {
              date: reportDate,
              details,
              total_system,
              total_actual,
              closing_cash,
              discrepancy,
              notes,
              submitted_by,
              status: "SUBMITTED"
            }
          });
        } catch (createError) {
          // If creation fails due to unique constraint, try to find and update again
          // This handles race conditions or if findFirst missed it (unlikely but possible)
          if (createError.code === 'P2002') {
             console.log("Report already exists (P2002), trying update");
             const retryExisting = await prisma.cashierReconciliation.findFirst({
                where: {
                  date: {
                    gte: startOfDay,
                    lte: endOfDay
                  }
                }
             });
             
             if (retryExisting) {
                report = await prisma.cashierReconciliation.update({
                  where: { id: retryExisting.id },
                  data: {
                    details,
                    total_system,
                    total_actual,
                    closing_cash,
                    discrepancy,
                    notes,
                    submitted_by,
                    status: "SUBMITTED",
                    updated_at: new Date()
                  }
                });
             } else {
               throw createError; // Re-throw if we still can't find it
             }
          } else {
            throw createError;
          }
        }
      }

      res.json(report);
    } catch (e) {
      console.error("Reconciliation Error Full Stack:", e);
      res.status(500).json({ error: "Failed to submit reconciliation: " + e.message });
    }
  });
  
  // GET /api/analytics/reconciliation-list
  router.get("/reconciliation-list", async (req, res) => {
    try {
      const list = await prisma.cashierReconciliation.findMany({
        orderBy: { date: 'desc' },
        take: 30
      });
      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch list" });
    }
  });

  return router;
}
