import { Router } from 'express';
import { db } from '../db';
import { leads, companies, users } from '../db/schema';
import { eq, or, isNull } from 'drizzle-orm';

const router = Router();

// Save Lead (Company + Recipes to Roadmap) - Upsert Logic
router.post('/leads', async (req, res) => {
    try {
        const { email, companyData, recipes } = req.body;
        const shadowId = (req as any).shadowId;

        // Validation: Need EITHER email OR shadowId
        if ((!email && !shadowId) || !recipes) {
            return res.status(400).json({ error: 'Missing required fields (email or shadowId required)' });
        }

        let userId: number | null = null;
        if (email) {
            // Get user
            const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
            if (user.length > 0) {
                userId = user[0].id;
            } else {
                return res.status(404).json({ error: 'User not found. Please login first.' });
            }
        }

        const newRecipes = Array.isArray(recipes) ? recipes : [recipes];

        // Check for existing lead
        let existingLead = [];
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
            // 1. Create Company (if data provided, or link to null)
            // If shadow user, we still want a company record to store their manually entered data (industry, etc)
            let companyId: number;

            // Check for existing company for this user/shadow
            let existingCompany = [];
            if (userId) {
                existingCompany = await db.select().from(companies).where(eq(companies.userId, userId)).limit(1);
            } else {
                // For shadow users, we don't have a shadowId on companies table yet? 
                // Wait, companies.userId is nullable too. But we didn't add shadowId to companies table.
                // We should probably rely on leads->company relationship.
                // For now, always create a new company for a new lead? Or try to reuse?
                // Without shadowId on companies, we can't easily find a shadow user's company unless we query leads first.
                // But we are in "Create New Lead" block, so no lead exists.
                // Thus, create new company.
            }

            if (existingCompany.length > 0) {
                companyId = existingCompany[0].id;
                // Optionally update company data here if provided
            } else {
                const company = await db.insert(companies).values({
                    userId: userId, // null for shadow
                    url: companyData?.url || null,
                    industry: companyData?.industry || null,
                    naicsCode: companyData?.naicsCode || null, // NEW
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
                shadowId: shadowId || null,
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
router.put('/leads/sync', async (req, res) => {
    try {
        const { email, recipes, companyData } = req.body;
        const shadowId = (req as any).shadowId;

        // Need email OR shadowId
        if ((!email && !shadowId) || !recipes) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        let userId: number | null = null;
        if (email) {
            const user = await db.select().from(users).where(eq(users.email, email)).limit(1);
            if (user.length > 0) userId = user[0].id;
            else return res.status(404).json({ error: 'User not found' });
        }

        // Check for existing lead
        let existingLead = [];
        if (userId) {
            existingLead = await db.select().from(leads).where(eq(leads.userId, userId)).limit(1);
        } else if (shadowId) {
            existingLead = await db.select().from(leads).where(eq(leads.shadowId, shadowId)).limit(1);
        }

        // Handle Company Data
        let companyId: number;
        // Logic to Find/Create Company...
        // If userId exists, use it. If not, create new company with null userId.

        let existingCompany = [];
        if (userId) {
            existingCompany = await db.select().from(companies).where(eq(companies.userId, userId)).limit(1);
        }
        // Note: For shadow users, we effectively create a new company every time we create a new lead? 
        // Or we should update the company linked to the existing lead.

        if (existingLead.length > 0) {
            // Use company from existing lead
            companyId = existingLead[0].companyId!;

            if (companyData) {
                await db.update(companies).set({
                    url: companyData.url || undefined,
                    industry: companyData.industry || undefined,
                    naicsCode: companyData.naicsCode || undefined,
                    role: companyData.role || undefined,
                    size: companyData.size || undefined,
                    painPoint: companyData.painPoint || undefined,
                    stack: companyData.stack || undefined,
                    // If we are converting shadow -> registered, assign userId to company
                    userId: userId || undefined
                }).where(eq(companies.id, companyId));
            }
        } else {
            // Create New Company
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
            // MERGE logic if converting shadow -> registered?
            // "Sync" usually implies replacement (from localStorage to DB).
            // But if we have shadow data in DB already, we might want to attach userId to it.

            const updated = await db.update(leads)
                .set({
                    recipes: recipes,
                    companyId: companyId,
                    userId: userId || undefined, // Assign user if they just registered
                    // Keep shadowId? Yes, for tracking history.
                })
                .where(eq(leads.id, existingLead[0].id))
                .returning();
            return res.json({ success: true, lead: updated[0] });
        } else {
            // Check if there was a SHADOW lead that we should maintain connection to?
            // If the request came with a userId, but we found no lead for that userId.
            // Check if there is a lead for the shadowId (if provided).
            if (userId && shadowId) {
                const shadowLead = await db.select().from(leads).where(eq(leads.shadowId, shadowId)).limit(1);
                if (shadowLead.length > 0) {
                    // Found a shadow lead! Convert it to this user.
                    // Also need to update company ownership
                    const shadowCompanyId = shadowLead[0].companyId!;
                    await db.update(companies).set({ userId: userId }).where(eq(companies.id, shadowCompanyId));

                    const converted = await db.update(leads)
                        .set({
                            userId: userId,
                            recipes: recipes // Use the payload recipes (which might be merged on client)
                        })
                        .where(eq(leads.id, shadowLead[0].id))
                        .returning();
                    return res.json({ success: true, lead: converted[0], converted: true });
                }
            }

            // Create brand new
            const lead = await db.insert(leads).values({
                userId,
                companyId: companyId,
                shadowId: shadowId || null,
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

// Delete a specific recipe from a user's roadmap (Admin)
router.delete('/admin/leads/:userId/recipes', async (req, res) => {
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
router.delete('/admin/leads/:id', async (req, res) => {
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

// Delete a Lead (remove from list, keep user) - LEGACY / User Specific
router.delete('/admin/leads/user/:userId', async (req, res) => {
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
router.get('/admin/leads', async (req, res) => {
    try {
        const allLeads = await db.select({
            lead: leads,
            user: users,
            company: companies,
        })
            .from(leads)
            .leftJoin(users, eq(leads.userId, users.id)) // Allow null users
            .leftJoin(companies, eq(leads.companyId, companies.id))
            .where(or(
                eq(users.isActive, true),
                isNull(leads.userId)
            ));

        console.log(`[DEBUG] GET /admin/leads matched ${allLeads.length} records.`);
        const anonCount = allLeads.filter(l => !l.lead.userId).length;
        const regCount = allLeads.filter(l => l.lead.userId).length;
        console.log(`[DEBUG] Anonymous: ${anonCount}, Registered: ${regCount}`);
        if (allLeads.length > 0) {
            console.log(`[DEBUG] Sample Lead:`, allLeads[0]);
        }

        // Format for frontend (optional, or do it there);
        res.json({ leads: allLeads });
    } catch (error: any) {
        console.error('Get all leads error:', error);
        res.status(500).json({
            error: 'Failed to get leads',
            details: error.message,
            stack: error.stack
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
