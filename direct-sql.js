const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function check() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    const users = await sql`SELECT count(*) FROM "user"`;
    const menus = await sql`SELECT count(*) FROM "Menu"`;
    const orders = await sql`SELECT count(*) FROM "Order"`;
    
    console.log({
      users: users[0].count,
      menus: menus[0].count,
      orders: orders[0].count
    });
  } catch (e) {
    // Try lowercase if PascalCase fails
    try {
        const users = await sql`SELECT count(*) FROM user`;
        const menus = await sql`SELECT count(*) FROM Menu`;
        console.log("Fallback counts:", { users, menus });
    } catch (err) {
        console.error("Direct SQL Error:", e.message);
    }
  }
}

check();
