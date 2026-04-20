const { syncDailySummary } = require('./src/lib/aggregation');

async function sync() {
  const yesterday = new Date(Date.now() - (24 * 60 * 60 * 1000));
  const today = new Date();
  
  console.log('Syncing Yesterday...');
  await syncDailySummary(yesterday);
  
  console.log('Syncing Today...');
  await syncDailySummary(today);
  
  console.log('Manual sync complete.');
  process.exit(0);
}

sync();
