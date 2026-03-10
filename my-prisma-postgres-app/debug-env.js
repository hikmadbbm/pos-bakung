console.log('=== Environment Variables Debug ===');
console.log('DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

// Check if .env file is being loaded
console.log('\n=== Checking .env files ===');
const fs = require('fs');
const path = require('path');

const envFiles = [
  '.env',
  '.env.local', 
  '.env.development',
  '.env.development.local'
];

envFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('DATABASE_URL')) {
      console.log(`   DATABASE_URL found in ${file}`);
    }
  } else {
    console.log(`❌ ${file} does not exist`);
  }
});