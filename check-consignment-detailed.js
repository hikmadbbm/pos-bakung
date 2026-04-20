const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const rows = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'consignment'`;
    rows.forEach(r => console.log(`COL: ${r.column_name}`));
    
    // Check constraints to see why it might fail
    const constraints = await sql`
        SELECT
            tc.constraint_name, tc.table_name, kcu.column_name, 
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name 
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_name = 'consignment';
    `;
    console.log("CONSTRAINTS:", JSON.stringify(constraints));
  } catch (e) {
    console.log("ERROR:", e.message);
  }
}
check();
