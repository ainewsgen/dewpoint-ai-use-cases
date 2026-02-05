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

        const cost = (promptTokens * inputRate) + (completionTokens * outputRate);

        try {
            await db.insert(apiUsage).values({
                userId,
                integrationId,
                shadowId: shadowId || null,
                model,
                promptTokens,
                completionTokens,
                totalCost: cost.toFixed(6),
                timestamp: new Date()
            });
            const userLabel = userId ? `User ${userId}` : `Anon (Shadow: ${shadowId || 'none'})`;
            console.log(`[Usage] Logged: $${cost.toFixed(6)} (${promptTokens}in/${completionTokens}out) for ${userLabel} via ${model} (Int: ${integrationId})`);
        } catch (e) {
            console.error("Failed to insert api_usage log:", e);
        }
    }

    /**
     * Get usage stats for the dashboard.
     */
    static async getDailyStats() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // Fetch spending per integration for better dashboard context
        const statsByIntegration = await db.select({
            integrationId: apiUsage.integrationId,
            totalSpend: sql<number>`coalesce(sum(${apiUsage.totalCost}), 0)`,
            requestCount: sql<number>`count(*)`
        })
            .from(apiUsage)
            .where(gte(apiUsage.timestamp, startOfDay))
            .groupBy(apiUsage.integrationId);

        const allIntegrations = await db.select().from(integrations);

        // Map stats to integration names and limits
        const detailedStats = allIntegrations.map(int => {
            const stat = statsByIntegration.find(s => s.integrationId === int.id);
            const metaLimit = (int.metadata as any)?.daily_limit_usd;
            const limit = (metaLimit !== undefined && metaLimit !== null) ? Number(metaLimit) : 5.00;

            return {
                id: int.id,
                name: int.name,
                spend: parseFloat(String(stat?.totalSpend || 0)),
                requests: parseInt(String(stat?.requestCount || 0), 10),
                limit
            };
        });

        // Global Totals
        const totalSpend = detailedStats.reduce((sum, s) => sum + s.spend, 0);
        const totalRequests = detailedStats.reduce((sum, s) => sum + s.requests, 0);
        const totalLimit = detailedStats.reduce((sum, s) => sum + s.limit, 0);

        return {
            spend: totalSpend,
            requests: totalRequests,
            limit: totalLimit,
            detailed: detailedStats,
            integrationCount: allIntegrations.length
        };
    }
}
