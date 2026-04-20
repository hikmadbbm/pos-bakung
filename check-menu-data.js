const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql`SELECT id, name, "productType" as pt FROM "menu"`;
    console.log("Sample Menus:", rows);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
check();
