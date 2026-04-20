const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const c = await sql`SELECT count(*) FROM "consignment"`;
    console.log("CONSIGNMENTS:", c[0].count);
    const m = await sql`SELECT count(*) FROM "menu"`;
    console.log("MENUS:", m[0].count);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
check();
