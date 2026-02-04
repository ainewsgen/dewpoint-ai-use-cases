import { db } from '../db';
import { apiUsage, integrations } from '../db/schema';
import { eq, sql, and, gte, lt, desc } from 'drizzle-orm';

export class UsageService {
    private static GPT4O_INPUT_COST = 5.00 / 1000000;
    private static GPT4O_OUTPUT_COST = 15.00 / 1000000;

    // Gemini 1.5 Pro ~ $3.50 / $10.50 (Simulate high tier safe bet)
    // Gemini 1.5 Flash ~ $0.075 / $0.30 (Much cheaper)
    // For safety, we default to GPT-4o pricing if unknown, or apply heuristic.

    /**
     * Helper to find the configured daily limit from the Primary (or any) integration.
     */
    private static async getGlobalDailyLimit(): Promise<number> {
        // Find enabled integrations sorted by priority
        const activeIntegrations = await db.select().from(integrations)
            .where(eq(integrations.enabled, true))
            .orderBy(integrations.priority);

        // Find first with a specific limit set
        const primary = activeIntegrations.find(i => (i.metadata as any)?.daily_limit_usd !== undefined) || activeIntegrations[0];

        const metaLimit = (primary?.metadata as any)?.daily_limit_usd;
        // Default to $5.00 if strictly undefined, allow 0.
        return (metaLimit !== undefined && metaLimit !== null) ? Number(metaLimit) : 5.00;
    }

    /**
     * Checks if the current daily spend is within the limit.
     * Throws an error if limit exceeded.
     */
    static async checkBudgetExceeded(): Promise<void> {
        const dailyLimit = await this.getGlobalDailyLimit();

        // 2. Calculate Today's Spend
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const result = await db.select({
            totalSpend: sql<number>`sum(${apiUsage.totalCost})`
        })
            .from(apiUsage)
            .where(gte(apiUsage.timestamp, startOfDay));

        const currentSpend = Number(result[0]?.totalSpend || 0);

        if (currentSpend >= dailyLimit) {
            throw new Error(`Daily API budget exceeded. Limit: $${dailyLimit}, Current: $${currentSpend.toFixed(4)}`);
        }
    }

    /**
     * Logs usage and cost to the DB.
     * Accepts null userId for anonymous users.
     */
    static async logUsage(userId: number | null, promptTokens: number, completionTokens: number, model = 'gpt-4o', shadowId?: string) {
        // Simple heuristic for cost - could be expanded to a map
        let inputRate = this.GPT4O_INPUT_COST;
        let outputRate = this.GPT4O_OUTPUT_COST;

        if (model.includes('flash') || model.includes('mini')) {
            // Approx cheap tier (Flash / GPT-4o-mini)
            inputRate = 0.15 / 1000000;
            outputRate = 0.60 / 1000000;
        } else if (model.includes('gemini') && !model.includes('flash')) {
            // Gemini Pro is slightly cheaper than GPT-4o but close enough to keep simple
            inputRate = 3.50 / 1000000;
            outputRate = 10.50 / 1000000;
        }

        const cost = (promptTokens * inputRate) + (completionTokens * outputRate);

        try {
            await db.insert(apiUsage).values({
                userId, // Can be null for anonymous users
                shadowId: shadowId || null,
                model,
                promptTokens,
                completionTokens,
                totalCost: cost.toFixed(6), // Store as string/decimal
                timestamp: new Date()
            });
            const userLabel = userId ? `User ${userId}` : `Anonymous (Shadow: ${shadowId || 'none'})`;
            console.log(`[Usage] Logged: $${cost.toFixed(6)} (${promptTokens}in/${completionTokens}out) for ${userLabel} via ${model}`);
        } catch (e) {
            console.error("Failed to insert api_usage log (non-fatal):", e);
        }
    }

    /**
     * Get usage stats for the dashboard.
     */
    static async getDailyStats() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        // 1. Fetch Spending & Requests (Debug wrapped)
        let result: { totalSpend: number, requestCount: number }[] = [];
        try {
            // @ts-ignore
            result = await db.select({
                totalSpend: sql<number>`coalesce(sum(${apiUsage.totalCost}), 0)`,
                requestCount: sql<number>`count(*)`
            })
                .from(apiUsage)
                .where(gte(apiUsage.timestamp, startOfDay));
        } catch (e: any) {
            console.error("UsageService: Failed to fetch apiUsage", e);
            result = [{ totalSpend: 0, requestCount: 0 }];
        }

        const limit = await this.getGlobalDailyLimit();

        // Get active integration count for context
        const allIntegrations = await db.select().from(integrations);

        return {
            spend: parseFloat(String(result[0]?.totalSpend || 0)),
            requests: parseInt(String(result[0]?.requestCount || 0), 10),
            limit,
            integrationId: 'global', // Simplified
            debugMeta: {},
            integrationCount: allIntegrations.length
        };
    }
}
