const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../../backend/prisma/schema.prisma');
const destDir = path.join(__dirname, '../prisma');
const dest = path.join(destDir, 'schema.prisma');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log('Copied schema.prisma from backend to frontend');
