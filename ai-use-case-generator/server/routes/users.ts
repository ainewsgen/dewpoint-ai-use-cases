import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db';
import { users, companies, leads } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const SALT_ROUNDS = 10;

// All routes require admin
router.use(requireAuth, requireAdmin);

// List all users with full profile data
router.get('/users', async (req, res) => {
    try {
        const allUsers = await db.select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            isActive: users.isActive,
            lastLogin: users.lastLogin,
            createdAt: users.createdAt,
        }).from(users).where(eq(users.isActive, true));

        // Fetch related data
        // Optimization: In a real large app, use JOINs. Here, separate queries are fine.
        // Fallback to Raw SQL for companies due to persistent Drizzle/Schema hydration issues in Prod
        const companiesResult = await db.execute(sql`SELECT * FROM companies`);
        const allCompanies = companiesResult.rows as any[];

        const allLeads = await db.select().from(leads); // Need to import leads

        const enrichedUsers = allUsers.map(u => {
            const comp = allCompanies.find(c => c.userId === u.id);
            const lead = allLeads.find(l => l.userId === u.id);

            return {
                ...u,
                company: {
                    // UI expects these nested for the Detail View
                    name: u.name,
                    email: u.email,
                    url: comp?.url || '',
                    industry: comp?.industry || '',
                    role: comp?.role || '', // Job Title
                    size: comp?.size || '',
                    painPoint: comp?.painPoint || '',
                    stack: comp?.stack || [],
                },
                recipes: lead?.recipes || [],
                allRecipes: lead?.recipes || []
            };
        });

        res.json({ users: enrichedUsers });
    } catch (error: any) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to fetch users', details: error.message, stack: error.stack });
    }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const [user] = await db.select({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            isActive: users.isActive,
            lastLogin: users.lastLogin,
            createdAt: users.createdAt,
        }).from(users).where(eq(users.id, userId));

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// Create new user
router.post('/users', async (req, res) => {
    try {
        const { email, name, password, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Check if user exists
        const existing = await db.select().from(users).where(eq(users.email, email));
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const [newUser] = await db.insert(users).values({
            email,
            name,
            passwordHash,
            role: role || 'user',
            isActive: true,
        }).returning({
            id: users.id,
            email: users.email,
            name: users.name,
            role: users.role,
            isActive: users.isActive,
        });

        res.json({ user: newUser });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user
router.put('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const { email, name, role, isActive } = req.body;

        const updateData: any = {};
        if (email !== undefined) updateData.email = email;
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (req.body.password) {
            updateData.passwordHash = await bcrypt.hash(req.body.password, SALT_ROUNDS);
        }

        const [updatedUser] = await db.update(users)
            .set(updateData)
            .where(eq(users.id, userId))
            .returning({
                id: users.id,
                email: users.email,
                name: users.name,
                role: users.role,
                isActive: users.isActive,
            });

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: updatedUser });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user (soft delete)
router.delete('/users/:id', async (req: AuthRequest, res) => {
    try {
        const userId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

        // Prevent deleting self
        if (req.user && req.user.id === userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const [deletedUser] = await db.update(users)
            .set({ isActive: false })
            .where(eq(users.id, userId))
            .returning({ id: users.id });

        if (!deletedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'User deactivated successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Admin-initiated password reset
router.post('/users/:id/reset-password', async (req, res) => {
    try {
        const userId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const { newPassword } = req.body;

        if (!newPassword) {
            return res.status(400).json({ error: 'New password required' });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        const [updatedUser] = await db.update(users)
            .set({ passwordHash })
            .where(eq(users.id, userId))
            .returning({ id: users.id });

        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Admin password reset error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

export default router;
