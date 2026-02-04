import { Router } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

// Login or Register User
router.post('/login', async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user exists
        const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (existingUser.length > 0) {
            return res.json({ user: existingUser[0] });
        }

        // Create new user
        const newUser = await db.insert(users).values({
            email,
            name: name || null,
        }).returning();

        res.json({ user: newUser[0] });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login' });
    }
});

// Get User by Email
router.get('/user/:email', async (req, res) => {
    try {
        const { email } = req.params;

        const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

        if (user.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: user[0] });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

export default router;
