import { Router } from 'express';
import { db } from '../db/index.js';
import { leads, companies, users } from '../db/schema.js';
import { eq, or, isNull } from 'drizzle-orm';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Save Lead (Company + Recipes to Roadmap) - Upsert Logic
// Save Lead (Company + Recipes to Roadmap) - Upsert Logic
router.post('/leads', async (req, res) => {
    try {
        const { email, companyData, recipes } = req.body;
        const shadowId = (req as any).shadowId;
        const authReq = req as any; // Cast to access user from middleware if present (optionalAuth applied globally or check headers)

        // Manual Auth Check (since this is an open endpoint for anon users too)
        // We prefer req.user if it exists.

        let userId: number | null = null;
        let userEmail: string | null = null;

        // AUTHENTICATED USER PATH
        if (authReq.user) {
            userId = authReq.user.id;
            userEmail = authReq.user.email;
            // IGNORE body.email for security - use authenticated email
        }
        // ANONYMOUS / SHADOW PATH
        else {
            // If body.email is sent but no auth token -> deny if that user exists? 
            // Phase 3 Audit: Don't allow writing to a registered user's account without a token.
            if (email) {
                const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
                if (existingUser.length > 0) {
                    return res.status(401).json({ error: 'User exists. Please login to save.' });
                }
                // If user doesn't exist, we could allow it (creating a lead for a future user? or just fail?)
                // Compliance: Don't store email without verification.
                // Strategy: Only allow shadowId for anonymous.
            }
        }

        // Validation: Need EITHER userId OR shadowId
        if (!userId && !shadowId) {
            return res.status(400).json({ error: 'Session tracking failed.' });
        }
        if (!recipes) {
            return res.status(400).json({ error: 'Missing recipes' });
        }


        const newRecipes = Array.isArray(recipes) ? recipes : [recipes];

        // Check for existing lead
        let existingLead: any[] = [];
        if (userId) {
            existingLead = await db.select().from(leads).where(eq(leads.userId, userId)).limit(1);
        } else if (shadowId) {
            existingLead = await db.select().from(leads).where(eq(leads.shadowId, shadowId)).limit(1);
        }

        if (existingLead.length > 0) {
            // Update existing lead
            const currentRecipes = existingLead[0].recipes as any[];
            const mergedRecipes = [...currentRecipes];

            newRecipes.forEach((newR: any) => {
                if (!mergedRecipes.find((r: any) => r.title === newR.title)) {
                    mergedRecipes.push(newR);
                }
            });

            const updatedLead = await db.update(leads)
                .set({ recipes: mergedRecipes })
                .where(eq(leads.id, existingLead[0].id))
                .returning();

            return res.json({ success: true, lead: updatedLead[0] });

        } else {
            // Create New Lead
            let companyId: number;

            // Check for existing company for this user/shadow
            let existingCompany: any[] = [];
            if (userId) {
                existingCompany = await db.select().from(companies).where(eq(companies.userId, userId)).limit(1);
            }

            if (existingCompany.length > 0) {
                companyId = existingCompany[0].id;
            } else {
                const company = await db.insert(companies).values({
                    userId: userId, // null for shadow
                    url: companyData?.url || null,
                    industry: companyData?.industry || null,
                    naicsCode: companyData?.naicsCode || null,
                    role: companyData?.role || null,
                    size: companyData?.size || null,
                    painPoint: companyData?.painPoint || null,
                    stack: companyData?.stack || [],
                }).returning();
                companyId = company[0].id;
            }

            // 2. Create Lead
            const lead = await db.insert(leads).values({
                userId: userId,
                companyId: companyId,
                shadowId: !userId ? shadowId : null, // Clear shadow ID if registered
                recipes: newRecipes,
            }).returning();

            return res.json({ success: true, lead: lead[0] });
        }
    } catch (error) {
        console.error('Save lead error:', error);
        res.status(500).json({ error: 'Failed to save lead' });
    }
});

// Sync/Replace Roadmap (For Deletions/Reordering/Registration Sync)
// Sync/Replace Roadmap (For Deletions/Reordering/Registration Sync)
router.put('/leads/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
        const { recipes, companyData } = req.body;

        // SECURE: Use authenticated User ID. Ignore body email.
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Authentication required for sync.' });
        }
        const userId = req.user.id;

        // Note: For Shadow Sync during registration, the client should have sent the 'shadowId' 
        // separately or we detect it.
        // BUT, complex shadow merging logic is risky. 
        // Safer approach: Client converts local storage to a standard 'save' call, OR we trust the client to just overwrite.
        // For simplicity & security: We treat this as "Set my roadmap to X".

        if (!recipes) {
            return res.status(400).json({ error: 'Missing recipes' });
        }

        // Check for existing lead for this User
        let existingLead = await db.select().from(leads).where(eq(leads.userId, userId)).limit(1);

        let companyId: number;

        if (existingLead.length > 0) {
            companyId = existingLead[0].companyId!;
            // Update Company if data provided
            if (companyData) {
                await db.update(companies).set({
                    ...companyData,
                    userId: userId
                }).where(eq(companies.id, companyId));
            }
        } else {
            // Check for shadow conversion opportunity? 
            // If the user just registered, they might have a shadow lead. 
            // However, typical flow is: Register -> Client calls Sync with local data.
            // So we just create new structures for them.

            const newCompany = await db.insert(companies).values({
                userId: userId,
                url: companyData?.url || null,
                industry: companyData?.industry || null,
                naicsCode: companyData?.naicsCode || null,
                role: companyData?.role || null,
                size: companyData?.size || null,
                painPoint: companyData?.painPoint || null,
                stack: companyData?.stack || [],
            }).returning();
            companyId = newCompany[0].id;
        }

        if (existingLead.length > 0) {
            const updated = await db.update(leads)
                .set({
                    recipes: recipes,
                    companyId: companyId,
                    userId: userId,
                })
                .where(eq(leads.id, existingLead[0].id))
                .returning();
            return res.json({ success: true, lead: updated[0] });

        } else {
            // Create New Lead
            const lead = await db.insert(leads).values({
                userId,
                companyId,
                shadowId: null, // Registered users don't need shadowId
                recipes: recipes
            }).returning();
            return res.json({ success: true, lead: lead[0] });
        }

    } catch (error) {
        console.error('Sync roadmap error:', error);
        res.status(500).json({ error: 'Failed to sync roadmap' });
    }
});

// Get User's Roadmap
// Get User's Roadmap - SECURE (Authentication Required)
// Was: /roadmap/:email (IDOR)
router.get('/roadmap', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Get all leads for this user (derived from token)
        const userLeads = await db.select().from(leads).where(eq(leads.userId, userId));

        res.json({ roadmap: userLeads });
    } catch (error) {
        console.error('Get roadmap error:', error);
        res.status(500).json({ error: 'Failed to get roadmap' });
    }
});

// Delete a specific recipe from a user's roadmap (Admin)
router.delete('/admin/leads/:userId/recipes', requireAuth, requireAdmin, async (req: any, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { title } = req.body; // Deleting by Title (assuming uniqueness in list)

        if (!title) return res.status(400).json({ error: "Recipe title required" });

        const userLeads = await db.select().from(leads).where(eq(leads.userId, userId)).limit(1);
        if (userLeads.length === 0) return res.status(404).json({ error: "No leads found for user" });

        const currentRecipes = userLeads[0].recipes as any[];
        const updatedRecipes = currentRecipes.filter(r => r.title !== title);

        await db.update(leads)
            .set({ recipes: updatedRecipes })
            .where(eq(leads.id, userLeads[0].id));

        res.json({ success: true, count: updatedRecipes.length });

    } catch (error) {
        console.error('Delete recipe error:', error);
        res.status(500).json({ error: 'Failed to delete recipe' });
    }
});

// Delete a Lead by ID (Global)
router.delete('/admin/leads/:id', requireAuth, requireAdmin, async (req: any, res) => {
    try {
        const id = parseInt(req.params.id);
        const result = await db.delete(leads).where(eq(leads.id, id)).returning();

        if (result.length === 0) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        res.json({ success: true, deletedId: id });
    } catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

// Update Lead (Admin)
router.put('/admin/leads/:id', requireAuth, requireAdmin, async (req: any, res) => {
    try {
        const leadId = parseInt(req.params.id);
        const { companyData, userName } = req.body;

        const lead = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
        if (lead.length === 0) return res.status(404).json({ error: 'Lead not found' });

        const companyId = lead[0].companyId;
        const userId = lead[0].userId;

        // 1. Update Company Data
        if (companyId && companyData) {
            await db.update(companies).set({
                url: companyData.url,
                industry: companyData.industry,
                naicsCode: companyData.naicsCode,
                role: companyData.role,
                size: companyData.size,
                painPoint: companyData.painPoint,
                stack: companyData.stack, // Ensure frontend sends array or we parse it
                description: companyData.description,
                scannerSource: companyData.scannerSource
            }).where(eq(companies.id, companyId));
        }

        // 2. Update User Name (if registered)
        if (userId && userName) {
            await db.update(users).set({ name: userName }).where(eq(users.id, userId));
        }

        res.json({ success: true });
    } catch (error: any) {
        console.error('Update lead error:', error);
        res.status(500).json({ error: 'Failed to update lead', details: error.message });
    }
});

// Delete a Lead (remove from list, keep user) - LEGACY / User Specific
router.delete('/admin/leads/user/:userId', requireAuth, requireAdmin, async (req: any, res) => {
    try {
        const userId = parseInt(req.params.userId);

        // Delete the lead record
        await db.delete(leads).where(eq(leads.userId, userId));

        // Optionally, we could also delete the company record if we wanted to be thorough, 
        // but keeping it might be useful if the user generates a new lead later.
        // For now, just removing the lead record removes it from the dashboard list.

        res.json({ success: true });
    } catch (error) {
        console.error('Delete lead error:', error);
        res.status(500).json({ error: 'Failed to delete lead' });
    }
});

// Get All Leads (Admin)
router.get('/admin/leads', requireAuth, requireAdmin, async (req, res) => {
    try {
        const allLeads = await db.select({
            lead: leads,
            user: users,
            company: companies,
        })
            .from(leads)
            .leftJoin(users, eq(leads.userId, users.id))
            .leftJoin(companies, eq(leads.companyId, companies.id))
            .where(or(
                eq(users.isActive, true),
                isNull(leads.userId)
            ));

        console.log(`[DEBUG] GET /admin/leads matched ${allLeads.length} records.`);
        const anonCount = allLeads.filter(l => !l.lead.userId).length;
        const regCount = allLeads.filter(l => l.lead.userId).length;
        console.log(`[DEBUG] Anonymous: ${anonCount}, Registered: ${regCount}`);

        res.json({ leads: allLeads });
    } catch (dbError: any) {
        console.error('[CRITICAL] Database Query in GET /admin/leads failed:', dbError);
        res.status(500).json({
            error: 'Database Query Failed',
            details: dbError.message
        });
    }
});

// Get Public Library (All Generated Recipes)
router.get('/community-library', async (req, res) => {
    try {
        const allLeads = await db.select({
            recipes: leads.recipes
        }).from(leads);

        // Flatten and Dedupe
        const allRecipes: any[] = [];
        const seenTitles = new Set();

        // Add some default system recipes if DB is empty?
        // For now, let's just return what we have. Frontend can keep defaults as fallback.

        allLeads.forEach(row => {
            const recipeList = row.recipes as any[];
            if (Array.isArray(recipeList)) {
                recipeList.forEach(r => {
                    if (!seenTitles.has(r.title)) {
                        seenTitles.add(r.title);
                        allRecipes.push(r);
                    }
                });
            }
        });

        res.json({ recipes: allRecipes });
    } catch (error) {
        console.error('Get library error:', error);
        res.status(500).json({ error: 'Failed to get library' });
    }
});

export default router;
