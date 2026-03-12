import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_3NZCf8udJisc@ep-square-moon-a12tt33h-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require');

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
