import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get('lang') || 'id';
    
    const rootDir = process.cwd();
    const localesPath = path.join(rootDir, 'src', 'locales', lang);
    
    if (!fs.existsSync(localesPath)) {
      return NextResponse.json({ error: 'Locales not found' }, { status: 404 });
    }

    const translations = {};
    const files = fs.readdirSync(localesPath);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const namespace = file.replace('.json', '');
        const filePath = path.join(localesPath, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          translations[namespace] = JSON.parse(content);
        } catch (e) {
          console.error(`Error reading ${file}:`, e);
        }
      }
    }

    // Merge common into root
    if (translations.common) {
      Object.keys(translations.common).forEach(key => {
        if (!(key in translations)) {
          translations[key] = translations.common[key];
        }
      });
    }

    return NextResponse.json(translations);

  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
