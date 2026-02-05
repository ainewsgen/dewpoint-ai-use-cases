
import { db } from '../db/index.js';
import { industryIcps } from '../db/schema.js';
import { sql } from 'drizzle-orm';

async function checkGtmData() {
    try {
        console.log("🔍 Checking industry_icps table...");

        // Count rows
        const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM industry_icps`);
        const count = countResult.rows[0].count;
        console.log(`\n📊 Total Rows: ${count}`);

        if (Number(count) === 0) {
            console.log("❌ Table is empty.");
            process.exit(0);
        }

        // Fetch first 3 rows to inspect
        const samples = await db.select().from(industryIcps).limit(3);

        console.log("\n🧪 Sample Data (First 3):");
        samples.forEach((row, i) => {
            console.log(`\n--- Row ${i + 1}: ${row.industry} (${row.icpPersona}) ---`);
            console.log(`ID: ${row.id}`);
            console.log(`Scores (Profit/LTV/Speed/Sat): ${row.profitScore}/${row.ltvScore}/${row.speedToCloseScore}/${row.satisfactionScore}`);
            console.log(`Overall Attractiveness: ${row.overallAttractiveness}`);
            console.log(`Discovery Guidance: ${row.discoveryGuidance ? row.discoveryGuidance.substring(0, 50) + "..." : "NULL"}`);
            // Check complex JSONB fields
            console.log(`Communities (JSON):`, row.communities ? "✅ Present" : "❌ NULL");
            console.log(`LinkedIn Angles (JSON):`, row.linkedinAngles ? "✅ Present" : "❌ NULL");
        });

    } catch (error) {
        console.error("Error checking data:", error);
    }
    process.exit(0);
}

checkGtmData();
