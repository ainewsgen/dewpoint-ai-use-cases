
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { UsageService } from '../services/usage.js';
import { eq, sql, desc } from 'drizzle-orm';

async function testStats() {
    console.log("--- Testing Global Stats ---");
    try {
        const stats = await UsageService.getDailyStats();
        console.log("Stats Success:", JSON.stringify(stats, null, 2));
    } catch (e: any) {
        console.error("Stats Error:", e.message);
        if (e.stack) console.error(e.stack);
    }
}

async function testByUser() {
    console.log("\n--- Testing By-User Stats ---");
    try {
        const { users, apiUsage } = schema;
        const userStats = await db.select({
            userId: users.id,
            userName: users.name,
            userEmail: users.email,
            totalSpend: sql<number>`CAST(SUM(${apiUsage.totalCost}) AS DOUBLE PRECISION)`,
            requestCount: sql<number>`COUNT(*)`
        })
            .from(apiUsage)
            .leftJoin(users, eq(apiUsage.userId, users.id))
            .groupBy(users.id, users.name, users.email)
            .orderBy(desc(sql`total_spend`));

        console.log("By-User Success:", JSON.stringify(userStats, null, 2));
    } catch (e: any) {
        console.error("By-User Error:", e.message);
        if (e.stack) console.error(e.stack);
    }
}

async function run() {
    await testStats();
    await testByUser();
    process.exit(0);
}

run();
