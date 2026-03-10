import express from "express";
import cors from "cors";
import authRouter from "./routes/auth.js";
import menusRouter from "./routes/menus.js";
import categoriesRouter from "./routes/categories.js";
import platformsRouter from "./routes/platforms.js";
import ordersRouter from "./routes/orders.js";
import expensesRouter from "./routes/expenses.js";
import dashboardRouter from "./routes/dashboard.js";
import fixedCostsRouter from "./routes/fixed-costs.js";
import reportsRouter from "./routes/reports.js";
import settingsRouter from "./routes/settings.js";
import analyticsRouter from "./routes/analytics.js";
import usersRouter from "./routes/users.js";
import shiftsRouter from "./routes/shifts.js";

export function createApp(prisma, jwtSecret) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Log incoming requests for debugging
  app.use((req, res, next) => {
    console.log(`[Express] Received ${req.method} ${req.url}`);
    next();
  });

  app.use("/api/auth", authRouter({ prisma, JWT_SECRET: jwtSecret }));
  app.use("/api/menus", menusRouter({ prisma }));
  app.use("/api/categories", categoriesRouter({ prisma }));
  app.use("/api/platforms", platformsRouter({ prisma }));
  app.use("/api/orders", ordersRouter({ prisma }));
  app.use("/api/expenses", expensesRouter({ prisma }));
  app.use("/api/dashboard", dashboardRouter({ prisma }));
  app.use("/api/fixed-costs", fixedCostsRouter({ prisma }));
  app.use("/api/reports", reportsRouter({ prisma }));
  app.use("/api/settings", settingsRouter({ prisma }));
  app.use("/api/analytics", analyticsRouter({ prisma }));
  app.use("/api/users", usersRouter({ prisma }));
  app.use("/api/shifts", shiftsRouter({ prisma }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  return app;
}
