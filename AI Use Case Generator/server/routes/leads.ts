import { Router } from 'express';
import { db } from '../db';
import { leads, companies, users } from '../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Save Lead (Company + Recipes to Roadmap) - Upsert Logic
router.post('/leads', async (req, res) => {
    try {
        const { email, companyData, recipes } = req.body;

        if (!email || !recipes) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Get or create user
        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found. Please login first.' });
        }

        const userId = user[0].id;
        const newRecipes = Array.isArray(recipes) ? recipes : [recipes];

        // Check for existing lead for this user
        const existingLead = await db.select().from(leads).where(eq(leads.userId, userId)).limit(1);

        if (existingLead.length > 0) {
            // Update existing lead
            const currentRecipes = existingLead[0].recipes as any[];

            // Merge and Dedupe
            const mergedRecipes = [...currentRecipes];
            newRecipes.forEach((newR: any) => {
                if (!mergedRecipes.find((r: any) => r.title === newR.title)) {
                    mergedRecipes.push(newR);
                }
            });

            const updatedLead = await db.update(leads)
                .set({
                    recipes: mergedRecipes,
                    // We could update company info too, but let's keep the original "profile" 
                    // or maybe update it if provided? User asked to "track cards", so recipes are key.
                })
                .where(eq(leads.id, existingLead[0].id))
                .returning();

            return res.json({ success: true, lead: updatedLead[0] });

        } else {
            // Create new lead (and company if needed, though strictly we might just link to a dummy company if data missing)

            // Create company record (or find?) - For now, creating new one for the user if they don't have one?
            // "One entry per user" -> Maybe one Company per user too? 
            // For simplicity, let's just insert one.
            const company = await db.insert(companies).values({
                userId,
                url: companyData?.url || null,
                industry: companyData?.industry || null,
                role: companyData?.role || null,
                size: companyData?.size || null,
                painPoint: companyData?.painPoint || null,
                stack: companyData?.stack || [],
            }).returning();

            // Create lead record
            const lead = await db.insert(leads).values({
                userId,
                companyId: company[0].id,
                recipes: newRecipes,
            }).returning();

            return res.json({ success: true, lead: lead[0] });
        }
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
