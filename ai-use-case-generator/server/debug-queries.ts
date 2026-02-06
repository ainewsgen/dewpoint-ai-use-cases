import { db } from './db/index.js';
import { apiUsage, analyticsEvents, users, companies, leads } from './db/schema.js';
import { eq, sql, desc, count } from 'drizzle-orm';
import { UsageService } from './services/usage.js';
import { AnalyticsService } from './services/analytics.js';

async function debug() {
    console.log("--- Testing UsageService.getDailyStats ---");
    try {
        const stats = await UsageService.getDailyStats();
        console.log("Daily Stats Success:", stats);
    } catch (e) {
        console.error("Daily Stats Failed:", e);
    }

    console.log("\n--- Testing by-user query ---");
    try {
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
        console.log("User Stats Success:", userStats.length, "users found");
    } catch (e) {
        console.error("User Stats Failed:", e);
    }

    console.log("\n--- Testing AnalyticsService.getFunnelMetrics ---");
    try {
        const funnel = await AnalyticsService.getFunnelMetrics();
        console.log("Funnel Success:", funnel);
    } catch (e) {
        console.error("Funnel Failed:", e);
    }

    process.exit(0);
}

debug();
