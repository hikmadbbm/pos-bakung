const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function checkAll() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    const results = {};
    
    for (const t of tables) {
      try {
        const count = await sql`SELECT count(*) FROM "${sql.raw(t.table_name)}"`;
        results[t.table_name] = count[0].count;
      } catch (e) {
        results[t.table_name] = "ERROR: " + e.message;
      }
    }
    console.log(JSON.stringify(results, null, 2));
  } catch (e) {
    console.error("Schema error:", e.message);
  }
}

checkAll();
