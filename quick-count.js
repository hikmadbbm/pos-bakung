const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  const tables = ['user', 'Menu', 'Order', 'platform', 'category', 'expense', 'user_shift', 'daily_summary'];
  const results = {};
  
  for (const table of tables) {
    try {
      // Direct string interpolation for check only - BE CAREFUL
      const count = await sql([`SELECT count(*) FROM "${table}"`]);
      results[table] = count[0].count;
    } catch (e) {
      results[table] = "FAIL: " + e.message;
    }
  }
  console.log(results);
}

check();
