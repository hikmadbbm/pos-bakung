const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'menu'`;
    console.log("COLUMNS:", JSON.stringify(rows.map(r => r.column_name)));
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
check();
