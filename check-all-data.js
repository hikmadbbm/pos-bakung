const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function checkAll() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    let foundAny = false;
    for (const t of tables) {
      const name = t.table_name;
      try {
        const count = await sql([`SELECT count(*) FROM "${name}"`]);
        const c = parseInt(count[0].count);
        if (c > 0) {
          console.log(`Table ${name} HAS DATA: ${c} rows`);
          foundAny = true;
        }
      } catch (e) {}
    }
    if (!foundAny) console.log("ALL TABLES ARE EMPTY");
  } catch (e) {
    console.error("Schema error:", e.message);
  }
}

checkAll();
