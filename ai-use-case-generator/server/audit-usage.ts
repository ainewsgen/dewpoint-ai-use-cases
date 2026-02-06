import { db } from './db/index.js';
import { apiUsage, integrations, users } from './db/schema.js';
import { sql, gte } from 'drizzle-orm';

async function auditUsage() {
    console.log("=== API USAGE DATA AUDIT ===\n");

    try {
        // 1. Total Records
        const totalRows = await db.select({ count: sql<number>`count(*)` }).from(apiUsage);
        console.log(`Total api_usage records: ${totalRows[0].count}`);

        // 2. Integration Linkage
        const missingIntegrationId = await db.select({ count: sql<number>`count(*)` })
            .from(apiUsage)
            .where(sql`integration_id IS NULL`);
        console.log(`Records missing integration_id: ${missingIntegrationId[0].count}`);

        // 3. User Linkage
        const missingUserId = await db.select({ count: sql<number>`count(*)` })
            .from(apiUsage)
            .where(sql`user_id IS NULL`);
        console.log(`Records missing user_id: ${missingUserId[0].count}`);

        // 4. Timestamp Range
        const ranges = await db.select({
            min: sql<string>`min(timestamp)`,
            max: sql<string>`max(timestamp)`
        }).from(apiUsage);
        console.log(`Timestamp range: ${ranges[0].min} to ${ranges[0].max}`);

        // 5. Recent Records check (Today UTC)
        const now = new Date();
        const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const recent = await db.select({ count: sql<number>`count(*)` })
            .from(apiUsage)
            .where(gte(apiUsage.timestamp, startOfDay));
        console.log(`Records starting from ${startOfDay.toISOString()} (UTC Today): ${recent[0].count}`);

        // 6. Detailed Integration Breakdown (Raw)
        console.log("\n--- Raw Integration Breakdown ---");
        const breakdown = await db.select({
            id: apiUsage.integrationId,
            count: sql<number>`count(*)`,
            total_cost: sql<number>`sum(total_cost)`
        }).from(apiUsage).groupBy(apiUsage.integrationId);

        console.table(breakdown);

        // 7. Integrations Table status
        console.log("\n--- Integrations Table ---");
        const activeInts = await db.select().from(integrations);
        console.table(activeInts.map(i => ({ id: i.id, name: i.name, enabled: i.enabled })));

    } catch (e) {
        console.error("Audit Failed:", e);
    }

    process.exit(0);
}

auditUsage();
