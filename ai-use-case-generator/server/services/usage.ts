import { db } from '../db';
import { apiUsage, integrations } from '../db/schema';
import { eq, sql, and, gte, lt } from 'drizzle-orm';

export class UsageService {
    private static GPT4O_INPUT_COST = 5.00 / 1000000; // $5 per 1M tokens
    private static GPT4O_OUTPUT_COST = 15.00 / 1000000; // $15 per 1M tokens

    /**
     * Checks if the current daily spend is within the limit.
     * Throws an error if limit exceeded.
     */
    static async checkBudgetExceeded(): Promise<void> {
        // 1. Get Daily Limit (Find LATEST created integration to match Admin logic)
        const openAIIntegrations = await db.query.integrations.findMany({
            where: eq(integrations.name, 'OpenAI'),
            orderBy: (integrations, { desc }) => [desc(integrations.id)],
            limit: 1
        });
        const openAIInt = openAIIntegrations[0];

        // Default to $5.00 if not set, but respect 0 if explicitly set
        const metaLimit = (openAIInt?.metadata as any)?.daily_limit_usd;
        const dailyLimit = metaLimit !== undefined ? Number(metaLimit) : 5.00;

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
     */
    static async logUsage(promptTokens: number, completionTokens: number, model = 'gpt-4o') {
        const cost = (promptTokens * this.GPT4O_INPUT_COST) + (completionTokens * this.GPT4O_OUTPUT_COST);

        await db.insert(apiUsage).values({
            model,
            promptTokens,
            completionTokens,
            totalCost: cost.toFixed(6), // Store as string/decimal
            timestamp: new Date()
        });

        console.log(`[Usage] Logged: $${cost.toFixed(6)} (${promptTokens}in/${completionTokens}out)`);
    }

    /**
     * Get usage stats for the dashboard.
     */
    static async getDailyStats() {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const result = await db.select({
            totalSpend: sql<number>`COALESCE(SUM(${apiUsage.totalCost}), 0)`,
            requestCount: sql<number>`COUNT(*)`
        })
            .from(apiUsage)
            .where(gte(apiUsage.timestamp, startOfDay));

        // Fetch ALL integrations (enabled or not) to debug visibility
        const allIntegrations = await db.query.integrations.findMany({
            orderBy: (integrations, { desc }) => [desc(integrations.id)]
        });

        // 1. Try exact name match
        // 2. Try metadata provider match
        // 3. Fallback to the most recent integration
        const openAIInt = allIntegrations.find(i => i.name === 'OpenAI')
            || allIntegrations.find(i => (i.metadata as any)?.provider === 'openai')
            || allIntegrations[0];

        console.log(`[UsageStats] Total Integrations: ${allIntegrations.length}`);
        console.log(`[UsageStats] Selected Integration ID: ${openAIInt?.id}, Name: ${openAIInt?.name}`);

        // Ensure default of 5.00 if strictly undefined or null, but allow 0 if explicitly set (and not null)
        const metaLimit = (openAIInt?.metadata as any)?.daily_limit_usd;
        const limit = (metaLimit !== undefined && metaLimit !== null) ? Number(metaLimit) : 5.00;

        return {
            spend: Number(result[0]?.totalSpend || 0),
            requests: Number(result[0]?.requestCount || 0),
            limit,
            integrationId: openAIInt?.id,
            debugMeta: openAIInt?.metadata,
            integrationCount: allIntegrations.length
        };
    }
}
