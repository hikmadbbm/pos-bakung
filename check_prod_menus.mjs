import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED;
if (!databaseUrl) {
  console.error("DATABASE_URL is not defined in environment variables");
  process.exit(1);
}

const sql = neon(databaseUrl);

async function checkMenus() {
  try {
    const menus = await sql`SELECT id, name, is_active FROM menu`;
    console.log('Menus found:', menus.length);
    console.log(menus);
    
    const categories = await sql`SELECT id, name FROM menucategory`;
    console.log('\nCategories found:', categories.length);
    console.log(categories);
  } catch (error) {
    console.error('Error querying database:', error);
  }
}

checkMenus();
