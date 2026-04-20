const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function fix() {
  const sql = neon(process.env.DATABASE_URL);
  try {
    // 1. Fetch records
    const logs = await sql`
        SELECT l.id, l.date, l."expectedIncome", l.status, c."partnerName"
        FROM consignment_daily_log l
        JOIN consignment c ON l."consignmentId" = c.id
        WHERE c."partnerName" LIKE '%Es Teller%'
        AND l.date >= '2026-04-12' AND l.date <= '2026-04-19'
        ORDER BY l.date ASC
    `;

    console.log(`Found ${logs.length} records to update.`);

    for (const record of logs) {
        // Handle timezone - DB storage is UTC
        const dateObj = new Date(record.date);
        dateObj.setHours(dateObj.getHours() + 10);
        const dateStr = dateObj.toISOString().split('T')[0];
        
        // Logical matching
        let newAmount = 40000;
        let newActual = 0;
        let newStatus = record.status;

        if (dateStr === '2026-04-13' || dateStr === '2026-04-14' || dateStr === '2026-04-15' || dateStr === '2026-04-16') {
            newStatus = 'RECEIVED';
            newActual = 40000;
        } else if (dateStr === '2026-04-17') {
            newStatus = 'PENDING';
            newActual = 0;
        } else if (dateStr === '2026-04-18') {
             newAmount = 0; // Holiday
             newActual = 0;
             newStatus = 'PENDING';
        }

        console.log(`Date: ${dateStr} | New Amount: ${newAmount} | New Status: ${newStatus}`);
        
        await sql`
            UPDATE consignment_daily_log 
            SET "expectedIncome" = ${newAmount}, "actualReceived" = ${newActual}, "status" = ${newStatus}
            WHERE id = ${record.id}
        `;
    }

    console.log("✅ Database successfully updated for Es Teller Creamy.");
  } catch (e) {
    console.error("❌ SQL Error:", e);
  }
}

fix();
