import { db } from '../db/index.js';
import { apiUsage, integrations } from '../db/schema.js';
import { eq, sql, and, gte, lt, desc } from 'drizzle-orm';

export class UsageService {
    // Standardized Rates per 1M tokens (USD)
    private static GPT4O_INPUT = 5.00 / 1000000;
    private static GPT4O_OUTPUT = 15.00 / 1000000;

    private static GPT4O_MINI_INPUT = 0.15 / 1000000;
    private static GPT4O_MINI_OUTPUT = 0.60 / 1000000;

    private static GEMINI_PRO_INPUT = 3.50 / 1000000;
    private static GEMINI_PRO_OUTPUT = 10.50 / 1000000;

    private static GEMINI_FLASH_INPUT = 0.075 / 1000000;
    private static GEMINI_FLASH_OUTPUT = 0.30 / 1000000;

    /**
     * Checks if the specific integration has exceeded its daily limit.
     * Uses metadata.daily_limit_usd from the integration.
     */
    static async checkBudgetExceeded(integrationId: number): Promise<void> {
        // 1. Fetch integration to get its specific limit
        const [integration] = await db.select().from(integrations)
            .where(eq(integrations.id, integrationId));

        if (!integration) throw new Error("Integration not found");

        const metaLimit = (integration.metadata as any)?.daily_limit_usd;
        const dailyLimit = (metaLimit !== undefined && metaLimit !== null) ? Number(metaLimit) : 5.00;

        // 2. Calculate Today's Spend for THIS integration
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const result = await db.select({
            totalSpend: sql<number>`sum(${apiUsage.totalCost})`
        })
            .from(apiUsage)
            .where(and(
                eq(apiUsage.integrationId, integrationId),
                gte(apiUsage.timestamp, startOfDay)
            ));

        const currentSpend = Number(result[0]?.totalSpend || 0);

        if (currentSpend >= dailyLimit) {
            throw new Error(`Daily API budget for "${integration.name}" exceeded. Limit: $${dailyLimit}, Current: $${currentSpend.toFixed(4)}`);
        }
    }

    /**
     * Logs usage and cost to the DB, linked to a specific integration.
     */
    static async logUsage(userId: number | null, promptTokens: number, completionTokens: number, model: string, integrationId: number, shadowId?: string) {
        console.log(`[Usage] Attempting to log usage for ${userId ? `User ${userId}` : `Shadow ${shadowId || 'Anon'}`} via ${model} (Int: ${integrationId})`);

        // Safety: If integrationId is missing, try to find a default
        let finalIntId = integrationId;
        if (!finalIntId) {
            const [defaultInt] = await db.select().from(integrations).where(eq(integrations.enabled, true)).limit(1);
            if (defaultInt) {
                console.warn(`[Usage] integrationId was missing, falling back to: ${defaultInt.name} (ID: ${defaultInt.id})`);
                finalIntId = defaultInt.id;
            }
        }

        let inputRate = this.GPT4O_INPUT;
        let outputRate = this.GPT4O_OUTPUT;

        // Refined Heuristic for specific models
        const m = model.toLowerCase();
        if (m.includes('mini')) {
            inputRate = this.GPT4O_MINI_INPUT;
            outputRate = this.GPT4O_MINI_OUTPUT;
        } else if (m.includes('flash')) {
            inputRate = this.GEMINI_FLASH_INPUT;
            outputRate = this.GEMINI_FLASH_OUTPUT;
        } else if (m.includes('gemini') && !m.includes('flash')) {
            inputRate = this.GEMINI_PRO_INPUT;
            outputRate = this.GEMINI_PRO_OUTPUT;
        }

        const costValue = (promptTokens * inputRate) + (completionTokens * outputRate);
        const costStr = costValue.toFixed(6);

        try {
            const values = {
                userId,
                integrationId: finalIntId,
                shadowId: shadowId || null,
                model,
                promptTokens,
                completionTokens,
                totalCost: costStr,
                timestamp: new Date()
            };

            await db.insert(apiUsage).values(values);

            const userLabel = userId ? `User ${userId}` : `Anon (Shadow: ${shadowId || 'none'})`;
            console.log(`[Usage] SUCCESS: Logged $${costStr} (${promptTokens}in/${completionTokens}out) for ${userLabel} via ${model} (Int: ${finalIntId})`);
        } catch (e) {
            console.error("[Usage] ERROR: Failed to insert api_usage record:", e);
        }
    }

    /**
     * One-time repair to link orphaned records (where integration_id is null) 
     * to the primary integration.
     */
    static async repairOrphanedRecords() {
        console.log("[UsageRepair] Starting orphaned record repair...");

        // Find the primary integration (or just the first enabled one)
        const [primary] = await db.select().from(integrations)
            .where(eq(integrations.enabled, true))
            .orderBy(desc(integrations.id))
            .limit(1);

        if (!primary) {
            console.error("[UsageRepair] No active integration found to link records to.");
            return { updated: 0, error: 'No active integration' };
        }

        const result = await db.execute(sql`
            UPDATE api_usage 
            SET integration_id = ${primary.id} 
            WHERE integration_id IS NULL
        `);

        console.log(`[UsageRepair] Success: Linked orphaned records to "${primary.name}" (ID: ${primary.id})`);
        return { updated: true, target: primary.name };
    }

    /**
     * Get usage stats for the dashboard.
     */
    static async getDailyStats() {
        const now = new Date();
        const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

        console.log(`[UsageStats] Calculating for Day: ${startOfDay.toISOString()} | Month: ${startOfMonth.toISOString()}`);

        const allIntegrations = await db.select().from(integrations);

        // 1. Fetch Global Lifetime Totals (The "Truth")
        const lifetimeGlobal = await db.select({
            totalSpend: sql<number>`coalesce(sum(${apiUsage.totalCost}), 0)`,
            requestCount: sql<number>`count(*)`
        }).from(apiUsage);

        // 2. Fetch Global Daily Totals
        const dailyGlobal = await db.select({
            totalSpend: sql<number>`coalesce(sum(${apiUsage.totalCost}), 0)`,
            requestCount: sql<number>`count(*)`
        })
            .from(apiUsage)
            .where(gte(apiUsage.timestamp, startOfDay));

        // 3. Fetch Global MTD Totals
        const mtdGlobal = await db.select({
            totalSpend: sql<number>`coalesce(sum(${apiUsage.totalCost}), 0)`,
            requestCount: sql<number>`count(*)`
        })
            .from(apiUsage)
            .where(gte(apiUsage.timestamp, startOfMonth));

        // 4. Breakdown by Integration (Daily)
        const statsByIntegration = await db.select({
            integrationId: apiUsage.integrationId,
            totalSpend: sql<number>`coalesce(sum(${apiUsage.totalCost}), 0)`,
            requestCount: sql<number>`count(*)`
        })
            .from(apiUsage)
            .where(gte(apiUsage.timestamp, startOfDay))
            .groupBy(apiUsage.integrationId);

        // 5. Breakdown by Integration (MTD)
        const mtdStatsByIntegration = await db.select({
            integrationId: apiUsage.integrationId,
            totalSpend: sql<number>`coalesce(sum(${apiUsage.totalCost}), 0)`,
            requestCount: sql<number>`count(*)`
        })
            .from(apiUsage)
            .where(gte(apiUsage.timestamp, startOfMonth))
            .groupBy(apiUsage.integrationId);

        // 6. Breakdown by Integration (Lifetime)
        const lifetimeStatsByIntegration = await db.select({
            integrationId: apiUsage.integrationId,
            totalSpend: sql<number>`coalesce(sum(${apiUsage.totalCost}), 0)`,
            requestCount: sql<number>`count(*)`
        })
            .from(apiUsage)
            .groupBy(apiUsage.integrationId);

        // Map stats to integration names and limits
        const detailedStats = allIntegrations.map(int => {
            const stat = statsByIntegration.find(s => s.integrationId === int.id);
            const mtdStat = mtdStatsByIntegration.find(s => s.integrationId === int.id);
            const lifeStat = lifetimeStatsByIntegration.find(s => s.integrationId === int.id);

            const metaLimit = (int.metadata as any)?.daily_limit_usd;
            const limit = (metaLimit !== undefined && metaLimit !== null) ? Number(metaLimit) : 5.00;

            return {
                id: int.id,
                name: int.name,
                spend: parseFloat(String(stat?.totalSpend || 0)),
                requests: parseInt(String(stat?.requestCount || 0), 10),
                mtdSpend: parseFloat(String(mtdStat?.totalSpend || 0)),
                mtdRequests: parseInt(String(mtdStat?.requestCount || 0), 10),
                lifetimeSpend: parseFloat(String(lifeStat?.totalSpend || 0)),
                lifetimeRequests: parseInt(String(lifeStat?.requestCount || 0), 10),
                limit
            };
        });

        // Add "Unassigned" row if there are orphaned records
        const unassignedStat = lifetimeStatsByIntegration.find(s => s.integrationId === null);
        if (unassignedStat) {
            const dayUnassigned = statsByIntegration.find(s => s.integrationId === null);
            const mtdUnassigned = mtdStatsByIntegration.find(s => s.integrationId === null);

            detailedStats.push({
                id: 0,
                name: 'System/Unassigned',
                spend: parseFloat(String(dayUnassigned?.totalSpend || 0)),
                requests: parseInt(String(dayUnassigned?.requestCount || 0), 10),
                mtdSpend: parseFloat(String(mtdUnassigned?.totalSpend || 0)),
                mtdRequests: parseInt(String(mtdUnassigned?.requestCount || 0), 10),
                lifetimeSpend: parseFloat(String(unassignedStat.totalSpend || 0)),
                lifetimeRequests: parseInt(String(unassignedStat.requestCount || 0), 10),
                limit: 0
            });
        }

        const spend = parseFloat(String(dailyGlobal[0]?.totalSpend || 0));
        const requests = parseInt(String(dailyGlobal[0]?.requestCount || 0), 10);
        const mtdSpend = parseFloat(String(mtdGlobal[0]?.totalSpend || 0));
        const mtdRequests = parseInt(String(mtdGlobal[0]?.requestCount || 0), 10);
        const lifetimeSpend = parseFloat(String(lifetimeGlobal[0]?.totalSpend || 0));
        const lifetimeRequests = parseInt(String(lifetimeGlobal[0]?.requestCount || 0), 10);

        const totalLimit = detailedStats.reduce((sum, s) => sum + s.limit, 0);

        return {
            spend,
            requests,
            limit: totalLimit,
            mtdSpend,
            mtdRequests,
            lifetimeSpend,
            lifetimeRequests,
            detailed: detailedStats,
            integrationCount: allIntegrations.length,
            debug: {
                startOfDay: startOfDay.toISOString(),
                startOfMonth: startOfMonth.toISOString(),
                rowsToday: statsByIntegration.length,
                totalRows: lifetimeGlobal[0].requestCount
            }
        };
    }
}
