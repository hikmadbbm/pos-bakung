const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const res = await sql`SELECT name, is_active FROM "menu"`;
    console.log(res);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
check();
