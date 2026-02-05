import { Router } from 'express';
import { AnalyticsService } from '../services/analytics.js';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { leads, companies, users } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Track conversion event (Public)
router.post('/analytics/event', async (req, res) => {
    try {
        const { eventType, eventData } = req.body;
        const authReq = req as any; // Cast to access potential user/shadow from middleware

        await AnalyticsService.logEvent(
            eventType,
            authReq.user?.id || null,
            authReq.shadowId || null,
            eventData
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to log event' });
    }
});

// Admin Stats
router.get('/admin/analytics/stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        const funnel = await AnalyticsService.getFunnelMetrics();
        const industries = await AnalyticsService.getIndustryInsights();
        const painPoints = await AnalyticsService.getPainPointInsights();

        res.json({ funnel, industries, painPoints });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics stats' });
    }
});

// CSV Export for Leads
router.get('/admin/leads/export', requireAuth, requireAdmin, async (req, res) => {
    try {
        const allLeads = await db.select({
            id: leads.id,
            email: users.email,
            name: users.name,
            url: companies.url,
            industry: companies.industry,
            role: companies.role,
            size: companies.size,
            painPoint: companies.painPoint,
            createdAt: leads.createdAt
        })
            .from(leads)
            .leftJoin(users, eq(leads.userId, users.id))
            .leftJoin(companies, eq(leads.companyId, companies.id))
            .orderBy(desc(leads.createdAt));

        const headers = ['ID', 'Email', 'Name', 'URL', 'Industry', 'Role', 'Size', 'Pain Point', 'Created At'];
        const rows = allLeads.map(l => [
            l.id,
            l.email || 'Anonymous',
            l.name || 'N/A',
            l.url || '',
            l.industry || '',
            l.role || '',
            l.size || '',
            l.painPoint || '',
            l.createdAt?.toISOString() || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=leads_export.csv');
        res.status(200).send(csvContent);
    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).json({ error: 'Failed to export leads' });
    }
});

export default router;
