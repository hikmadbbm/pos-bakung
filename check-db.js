const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log("Database Tables:", tables.map(t => t.table_name));
  } catch (e) {
    console.error(e);
  }
}
main();
