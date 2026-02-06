import { db } from '../db/index.js';
import { apiUsage, integrations } from '../db/schema.js';
import { sql } from 'drizzle-orm';

async function checkLinkage() {
    console.log("=== DB LINKAGE DIAGNOSTIC ===\n");

    try {
        // 1. Check Integrations
        const allIntegrations = await db.select().from(integrations);
        console.log("Integrations Table:");
        console.table(allIntegrations.map(i => ({ id: i.id, name: i.name, provider: i.provider })));

        // 2. Check API Usage Row Counts
        const counts = await db.select({
            hasId: sql<number>`count(*) filter (where integration_id is not null)`,
            noId: sql<number>`count(*) filter (where integration_id is null)`,
            total: sql<number>`count(*)`
        }).from(apiUsage);

        console.log("\nAPI Usage Linkage Status:");
        console.table(counts);

        // 3. Check for specific IDs in API Usage
        if (counts[0].hasId > 0) {
            const usedIds = await db.select({
                integrationId: apiUsage.integrationId,
                count: sql<number>`count(*)`
            }).from(apiUsage)
                .where(sql`integration_id is not null`)
                .groupBy(apiUsage.integrationId);

            console.log("\nUnique Integration IDs found in api_usage:");
            console.table(usedIds);
        }

        // 4. Sample check for recent record
        const recent = await db.select().from(apiUsage).orderBy(sql`timestamp desc`).limit(1);
        if (recent.length > 0) {
            console.log("\nMost Recent Record Sample:");
            console.log(JSON.stringify(recent[0], null, 2));
        }

    } catch (e) {
        console.error("Diagnostic Failed:", e);
    }
    process.exit(0);
}

checkLinkage();
