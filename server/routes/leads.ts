import { Router } from 'express';
import { db } from '../db';
import { leads, companies, users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Save Lead (Company + Recipes to Roadmap)
router.post('/leads', async (req, res) => {
    try {
        const { email, companyData, recipes } = req.body;

        if (!email || !companyData || !recipes) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get or create user
        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found. Please login first.' });
        }

        const userId = user[0].id;

        // Create company record
        const company = await db.insert(companies).values({
            userId,
            url: companyData.url || null,
            industry: companyData.industry || null,
            role: companyData.role || null,
            size: companyData.size || null,
            painPoint: companyData.painPoint || null,
            stack: companyData.stack || [],
        }).returning();

        // Create lead record
        const lead = await db.insert(leads).values({
            userId,
            companyId: company[0].id,
            recipes: recipes,
        }).returning();

        res.json({ success: true, lead: lead[0] });
    } catch (error) {
        console.error('Save lead error:', error);
        res.status(500).json({ error: 'Failed to save lead' });
    }
});

// Get User's Roadmap
router.get('/roadmap/:email', async (req, res) => {
    try {
        const { email } = req.params;

        // Get user
        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (user.length === 0) {
            return res.json({ roadmap: [] });
        }

        // Get all leads for this user
        const userLeads = await db.select().from(leads).where(eq(leads.userId, user[0].id));

        res.json({ roadmap: userLeads });
    } catch (error) {
        console.error('Get roadmap error:', error);
        res.status(500).json({ error: 'Failed to get roadmap' });
    }
});

// Get All Leads (Admin)
router.get('/admin/leads', async (req, res) => {
    try {
        const allLeads = await db.select({
            lead: leads,
            user: users,
            company: companies,
        })
            .from(leads)
            .leftJoin(users, eq(leads.userId, users.id))
            .leftJoin(companies, eq(leads.companyId, companies.id));

        res.json({ leads: allLeads });
    } catch (error) {
        console.error('Get all leads error:', error);
        res.status(500).json({ error: 'Failed to get leads' });
    }
});

export default router;
