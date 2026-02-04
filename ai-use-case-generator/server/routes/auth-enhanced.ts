import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.js';
import { runMigrations } from '../db/migrate.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import type { AuthRequest } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { email, name, password } = req.body;

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
            role: 'user', // Default to user, admin must be promoted manually
            isActive: true,
        }).returning();

        // Generate JWT
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });

        res.json({
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
            },
        });
    } catch (error) {
        logger.error('Signup error', error);
        res.status(500).json({ error: 'Signup failed' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        // Find user
        const [user] = await db.select().from(users).where(eq(users.email, email));

        if (!user || !user.passwordHash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        if (!user.isActive) {
            return res.status(401).json({ error: 'Account deactivated' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.passwordHash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await db.update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id));

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        logger.error('Login error', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', async (req: AuthRequest, res) => {
    try {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };

        const [user] = await db.select().from(users).where(eq(users.id, decoded.id));

        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
            },
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Request password reset
router.post('/request-reset', async (req, res) => {
    try {
        const { email } = req.body;

        const [user] = await db.select().from(users).where(eq(users.email, email));

        if (!user) {
            // Don't reveal if user exists
            return res.json({ message: 'If email exists, reset link sent' });
        }

        // Generate reset token
        const resetToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.update(users)
            .set({ resetToken, resetTokenExpiry })
            .where(eq(users.id, user.id));

        // TODO: Send email with reset link
        // For now, just return the token (in production, send via email)
        logger.info(`Reset token generated (DEBUG)`, { email, resetToken });

        res.json({ message: 'If email exists, reset link sent' });
    } catch (error) {
        logger.error('Password reset request error', error);
        res.status(500).json({ error: 'Reset request failed' });
    }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password required' });
        }

        // Find user with this reset token
        const [user] = await db.select().from(users).where(eq(users.resetToken, token));

        if (!user || !user.resetTokenExpiry) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        if (new Date() > user.resetTokenExpiry) {
            return res.status(400).json({ error: 'Reset token expired' });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password and clear reset token
        await db.update(users)
            .set({
                passwordHash,
                resetToken: null,
                resetTokenExpiry: null,
            })
            .where(eq(users.id, user.id));

        res.json({ message: 'Password reset successful' });
    } catch (error) {
        logger.error('Password reset error', error);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// Emergency Reset Endpoint (Remove after use)
router.get('/nuke-reset-db-secure-8857', async (req, res) => {
    try {
        // Ensure tables exist before trying to wipe them
        logger.warn('Running migrations (Nuke DB)...');
        await runMigrations();

        logger.warn('Wiping users (Nuke DB)...');
        await db.delete(users);
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash('admin123', saltRounds);

        const [admin] = await db.insert(users).values({
            email: 'admin@thedewpointgroup.com',
            name: 'The DewPoint Group Admin',
            passwordHash,
            role: 'admin',
            isActive: true,
            createdAt: new Date(),
            lastLogin: new Date()
        }).returning();

        res.json({ message: 'Database wiped and Admin restored.', adminEmail: admin.email });
    } catch (error: any) {
        logger.error('Nuke failed', error);
        res.status(500).json({
            error: 'Reset failed',
            step: error.message.includes('Migration') ? 'Migration' : 'Wipe',
            details: error.message || error
        });
    }
});

export default router;
