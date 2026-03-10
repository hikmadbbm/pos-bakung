import puppeteer from "puppeteer";
import fs from "node:fs";
import path from "node:path";

const devices = [
  { name: "iPhone SE", viewport: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: "iPhone 12", viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
  { name: "Galaxy S20", viewport: { width: 412, height: 915, deviceScaleFactor: 3, isMobile: true, hasTouch: true } },
];

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

function safeName(name) {
  return name.replace(/\s+/g, "_");
}

async function clickByText(page, selector, text) {
  const clicked = await page.evaluate(({ selector, text }) => {
    const nodes = Array.from(document.querySelectorAll(selector));
    const target = nodes.find((n) => (n.textContent || "").trim().includes(text));
    if (!target) return false;
    target.click();
    return true;
  }, { selector, text });

  if (!clicked) {
    throw new Error(`Could not find ${selector} containing text: ${text}`);
  }
}

async function waitForText(page, selector, text) {
  await page.waitForFunction(
    ({ selector, text }) => {
      const nodes = Array.from(document.querySelectorAll(selector));
      return nodes.some((n) => (n.textContent || "").includes(text));
    },
    { timeout: 30000 },
    { selector, text }
  );
}

async function capture() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  const outDir = path.resolve(process.cwd(), "screenshots");
  fs.mkdirSync(outDir, { recursive: true });

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    const method = req.method();
    const respondJson = (data) => req.respond({
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify(data),
    });

    if (url.includes("/api/") && method === "OPTIONS") {
      return req.respond({
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Max-Age": "86400",
        },
        body: "",
      });
    }

    if (url.includes("/api/menus")) {
      return respondJson([
        {
          id: 1,
          name: "Bakmie Special",
          price: 28000,
          cost: 12000,
          categoryId: "cat1",
          category: { id: "cat1", name: "Foods", color: "#2563eb" },
          prices: { "1": 28000 },
        },
      ]);
    }
    if (url.includes("/api/categories")) {
      return respondJson([{ id: "cat1", name: "Foods", color: "#2563eb" }]);
    }
    if (url.includes("/api/platforms")) {
      return respondJson([{ id: 1, name: "Take Away", type: "OFFLINE", commission_rate: 0 }]);
    }
    if (url.includes("/api/orders/pending")) {
      return respondJson([
        {
          id: 99,
          order_number: "TRX-0001",
          date: new Date("2026-03-09T13:00:00.000Z").toISOString(),
          total: 28000,
          status: "PENDING",
          platform_id: 1,
          platform: { id: 1, name: "Take Away" },
          customer_name: "",
          note: "",
          discount: 0,
          orderItems: [
            { id: 1, menu_id: 1, qty: 1, price: 28000, menu: { id: 1, name: "Bakmie Special" } },
          ],
        },
      ]);
    }

    return req.continue();
  });

  for (const d of devices) {
    await page.setViewport(d.viewport);
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded", timeout: 0 });
    await page.evaluate(() => {
      localStorage.setItem("token", "screenshot-token");
      localStorage.setItem("user", JSON.stringify({ id: 1, name: "Cashier", username: "cashier", role: "CASHIER" }));
    });

    await page.goto(`${BASE_URL}/orders`, { waitUntil: "networkidle2", timeout: 0 });

    await page.waitForSelector('button[aria-label^="Add "]', { timeout: 30000 });
    await page.click('button[aria-label^="Add "]');

    await clickByText(page, "button", "Process Payment");
    await waitForText(page, "h2", "Checkout & Payment");
    await page.screenshot({ path: path.join(outDir, `screens-${safeName(d.name)}-checkout.png`), fullPage: false });

    await clickByText(page, "button", "Cancel");

    await clickByText(page, "button", "Pending");
    await waitForText(page, "h2", "Pending Orders");
    await page.screenshot({ path: path.join(outDir, `screens-${safeName(d.name)}-pending-list.png`), fullPage: false });
  }

  await browser.close();
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
