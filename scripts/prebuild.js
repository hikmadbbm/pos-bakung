const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../../backend/prisma/schema.prisma');
const srcMigrationsDir = path.join(__dirname, '../../backend/prisma/migrations');
const destDir = path.join(__dirname, '../prisma');
const dest = path.join(destDir, 'schema.prisma');
const destMigrationsDir = path.join(destDir, 'migrations');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log('Copied schema.prisma from backend to frontend');

if (fs.existsSync(destMigrationsDir)) {
  fs.rmSync(destMigrationsDir, { recursive: true, force: true });
}

if (fs.existsSync(srcMigrationsDir)) {
  fs.cpSync(srcMigrationsDir, destMigrationsDir, { recursive: true });
  console.log('Copied prisma/migrations from backend to frontend');
}
