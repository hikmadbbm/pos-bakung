const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const u = await sql`SELECT count(*) FROM "user"`;
    const m = await sql`SELECT count(*) FROM "menu"`;
    const o = await sql`SELECT count(*) FROM "order"`;
    console.log("USERS:", u[0].count);
    console.log("MENUS:", m[0].count);
    console.log("ORDERS:", o[0].count);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
check();
