const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function main() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const cols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'consignment_daily_log'`;
    console.log("Columns for consignment_daily_log:", cols);
    
    const sample = await sql`SELECT * FROM consignment_daily_log LIMIT 5`;
    console.log("Sample rows:", sample);
  } catch (e) {
    console.error(e);
  }
}
main();
