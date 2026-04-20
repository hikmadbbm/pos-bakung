const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const res = await sql`SELECT id, name FROM "platform"`;
    console.log(res);
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
check();
