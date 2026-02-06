
import { db } from '../db/index.js';
import { integrations, apiUsage } from '../db/schema.js';
import { eq, sql, and, gte } from 'drizzle-orm';
import dotenv from 'dotenv';
import { UsageService } from '../services/usage.js';

dotenv.config();

async function debugIntegrations() {
    console.log("=== Debugging Integration Selection Logic ===");

    // 1. Fetch Enabled Integrations
    console.log("Fetching enabled integrations...");
    const integrationsList = await db.select().from(integrations)
        .where(eq(integrations.enabled, true));

    console.log(`Found ${integrationsList.length} enabled integrations.`);

    // 2. Simulate Selection Logic from generate.ts
    const sortedIntegrations = integrationsList
        .filter(i => (i.apiKey || i.apiSecret))
        .sort((a, b) => {
            const pA = a.priority || 999;
            const pB = b.priority || 999;
            const valA = pA === 0 ? 999 : pA;
            const valB = pB === 0 ? 999 : pB;
            return valA - valB;
        });

    console.log("\n=== Sorted Execution Order (Priority 1 = Highest) ===");
    for (const [index, int] of sortedIntegrations.entries()) {
        const metadata = (int.metadata as any) || {};
        const dailyLimit = metadata.daily_limit_usd || 5.00;

        console.log(`${index + 1}. ${int.name} (ID: ${int.id})`);
        console.log(`   - Priority: ${int.priority}`);
        console.log(`   - Provider: ${metadata.provider || 'default'}`);
        console.log(`   - Model: ${metadata.model || 'default'}`);
        console.log(`   - Daily Limit: $${dailyLimit}`);
        console.log(`   - Last Error: ${metadata.last_error || 'None'}`);

        // Check Budget Real-time
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const usage = await db.select({
            totalSpend: sql<number>`sum(${apiUsage.totalCost})`
        })
            .from(apiUsage)
            .where(and(
                eq(apiUsage.integrationId, int.id),
                gte(apiUsage.timestamp, startOfDay)
            ));

        const spend = Number(usage[0]?.totalSpend || 0);
        console.log(`   - Today's Spend: $${spend.toFixed(4)}`);

        if (spend >= dailyLimit) {
            console.log(`   - STATUS: BLOCKED (Budget Exceeded) ❌`);
        } else {
            console.log(`   - STATUS: READY ✅`);
        }
        console.log('-----------------------------------');
    }

    if (sortedIntegrations.length === 0) {
        console.log("WARNING: No executions candidates found! (Check if enabled & has API keys)");
    }

    process.exit(0);
}

debugIntegrations().catch(console.error);
