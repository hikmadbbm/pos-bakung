import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const lang = params.lang || 'en';
  
  try {
    const localesDir = path.join(process.cwd(), 'src', 'locales', lang);
    
    if (!fs.existsSync(localesDir)) {
      return NextResponse.json({ error: 'Language not found' }, { status: 404 });
    }

    const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
    const translations = {};

    for (const file of files) {
      const namespace = file.replace('.json', '');
      const filePath = path.join(localesDir, file);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      translations[namespace] = JSON.parse(fileContents);
    }
    
    // Also include common (root strings from before) at root level to make it compatible
    // with how keys are structured if they aren't deeply nested.
    // wait, actually, the user splits keys like 'dashboard.today_revenue'
    // This implies `dashboard` is the top-level key.
    // So our JSON object should just be `{ dashboard: { ... }, pos: { ... } }`
    
    // For common strings that were essentially at the root level, like "stop_shift": "End Shift"
    // They are currently in common.json. If they are accessed as t('stop_shift'), the current logic 
    // expects `{ stop_shift: "End Shift" }` at the root. 
    // If they are in common.json, they'll become `{ common: { stop_shift: "End Shift" } }`.
    // Let's merge `common` into the root.
    if (translations.common) {
        Object.assign(translations, translations.common);
        // keep common namespace as well just in case
    }

    return NextResponse.json(translations);
  } catch (error) {
    console.error("Error loading locales:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
