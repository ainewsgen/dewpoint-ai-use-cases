import { db } from '../db/index.js';
import { analyticsEvents, leads, companies, users } from '../db/schema.js';
import { eq, sql, and, gte, desc, count } from 'drizzle-orm';

export class AnalyticsService {
    static async logEvent(eventType: string, userId: number | null, shadowId: string | null, eventData: any = {}) {
        try {
            await db.insert(analyticsEvents).values({
                eventType,
                userId,
                shadowId,
                eventData,
                timestamp: new Date()
            });
        } catch (error) {
            console.error('[Analytics] Error logging event:', error);
        }
    }

    static async getFunnelMetrics() {
        // Simple 3-step funnel: Onboarding Start -> Lead Created -> Roadmap Download
        const startEvents = await db.select({ count: count() })
            .from(analyticsEvents)
            .where(eq(analyticsEvents.eventType, 'onboarding_start'));

        const totalLeads = await db.select({ count: count() })
            .from(leads);

        const downloadEvents = await db.select({ count: count() })
            .from(analyticsEvents)
            .where(eq(analyticsEvents.eventType, 'roadmap_export'));

        return {
            onboarding_starts: startEvents[0].count,
            leads_converted: totalLeads[0].count,
            roadmap_downloads: downloadEvents[0].count
        };
    }

    static async getIndustryInsights() {
        const result = await db.select({
            industry: companies.industry,
            count: count()
        })
            .from(companies)
            .where(sql`${companies.industry} IS NOT NULL`)
            .groupBy(companies.industry)
            .orderBy(desc(count()));

        return result;
    }

    static async getPainPointInsights() {
        const result = await db.select({
            painPoint: companies.painPoint,
            count: count()
        })
            .from(companies)
            .where(sql`${companies.painPoint} IS NOT NULL`)
            .groupBy(companies.painPoint)
            .orderBy(desc(count()))
            .limit(10);

        return result;
    }
}
