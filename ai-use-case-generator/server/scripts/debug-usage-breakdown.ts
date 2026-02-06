
import { db } from '../db/index.js';
import { apiUsage, integrations } from '../db/schema.js';
import { UsageService } from '../services/usage.js';
import { sql } from 'drizzle-orm';

async function debugUsage() {
    console.log("=== USAGE BREAKDOWN DIAGNOSTIC ===\n");

    try {
        // 1. Check Integrations
        console.log("--- Integrations Table ---");
        const allIntegrations = await db.select().from(integrations);
        console.table(allIntegrations.map(i => ({ id: i.id, name: i.name, enabled: i.enabled })));

        // 2. Check Raw API Usage Counts
        console.log("\n--- API Usage Raw Counts ---");
        const usageCounts = await db.select({
            total: sql<number>`count(*)`,
            with_id: sql<number>`count(*) filter (where integration_id is not null)`,
            without_id: sql<number>`count(*) filter (where integration_id is null)`,
        }).from(apiUsage);
        console.table(usageCounts);

        // 3. Check Breakdown by ID
        console.log("\n--- API Usage Grouped by Integration ID ---");
        const grouped = await db.select({
            integrationId: apiUsage.integrationId,
            count: sql<number>`count(*)`,
            totalSpend: sql<number>`sum(${apiUsage.totalCost})`
        })
            .from(apiUsage)
            .groupBy(apiUsage.integrationId);
        console.table(grouped);

        // 4. Run Service Method
        console.log("\n--- UsageService.getDailyStats() Output ---");
        const stats = await UsageService.getDailyStats();
        console.log(`Global Spend: $${stats.spend}`);
        console.log(`Global MTD Spend: $${stats.mtdSpend}`);
        console.log(`Global Lifetime Spend: $${stats.lifetimeSpend}`);

        console.log("\nDetailed Breakdown:");
        if (stats.detailed && stats.detailed.length > 0) {
            console.table(stats.detailed.map(d => ({
                id: d.id,
                name: d.name,
                spend: d.spend,
                mtdSpend: d.mtdSpend,
                lifetimeSpend: d.lifetimeSpend
            })));
        } else {
            console.log("No detailed stats returned.");
        }

    } catch (e) {
        console.error("Diagnostic Failed:", e);
    }
    process.exit(0);
}

debugUsage();
