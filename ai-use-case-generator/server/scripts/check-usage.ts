
import dotenv from 'dotenv';
dotenv.config();

import { db } from '../db/index.js';
import { apiUsage } from '../db/schema.js';
import { desc } from 'drizzle-orm';

async function main() {
    console.log("Checking api_usage table...");

    // Get all rows
    const rows = await db.select().from(apiUsage).orderBy(desc(apiUsage.timestamp)).limit(10);
    console.log(`Found ${rows.length} rows.`);

    if (rows.length > 0) {
        console.log("Latest row:", rows[0]);
        console.log("Row Timestamp (ISO):", rows[0].timestamp?.toISOString());
        console.log("Row Timestamp (Local):", rows[0].timestamp?.toLocaleString());
    }

    // Check Service Logic
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    console.log("\nService Logic:");
    console.log("Start of Day (Local):", startOfDay.toLocaleString());
    console.log("Start of Day (ISO):", startOfDay.toISOString());

    const count = rows.filter(r => r.timestamp && r.timestamp >= startOfDay).length;
    console.log(`Rows matching >= Start of Day in JS filter: ${count}`);

    process.exit(0);
}

main().catch(console.error);
