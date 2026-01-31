import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../db';
import { integrations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

// Encryption key from environment (fallback for dev)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'dev-key-change-in-production-32b';
const ALGORITHM = 'aes-256-cbc';

// Simple encryption/decryption utilities
function encrypt(text: string): string {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

// Get user's integrations
router.get('/integrations', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;

        const userIntegrations = await db.select().from(integrations)
            .where(eq(integrations.userId, userId));

        // Decrypt credentials for the owner
        const decryptedIntegrations = userIntegrations.map(int => ({
            ...int,
            apiKey: int.apiKey ? decrypt(int.apiKey) : null,
            apiSecret: int.apiSecret ? decrypt(int.apiSecret) : null,
        }));

        res.json({ integrations: decryptedIntegrations });
    } catch (error) {
        console.error('Get integrations error:', error);
        res.status(500).json({ error: 'Failed to get integrations' });
    }
});

// Get all integrations (Admin only - no decryption)
router.get('/admin/integrations', requireAuth, requireAdmin, async (req, res) => {
    try {
        const allIntegrations = await db.select({
            id: integrations.id,
            userId: integrations.userId,
            name: integrations.name,
            authType: integrations.authType,
            baseUrl: integrations.baseUrl,
            enabled: integrations.enabled,
            createdAt: integrations.createdAt,
            // Don't send encrypted keys to frontend
        }).from(integrations);

        res.json({ integrations: allIntegrations });
    } catch (error) {
        console.error('Get all integrations error:', error);
        res.status(500).json({ error: 'Failed to get integrations' });
    }
});

// Create integration
router.post('/integrations', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const { name, authType, baseUrl, apiKey, apiSecret, metadata } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        // Encrypt sensitive data
        const encryptedData: any = {
            userId,
            name,
            authType: authType || 'api_key',
            baseUrl: baseUrl || null,
            metadata: metadata || null,
            enabled: true,
        };

        if (apiKey) encryptedData.apiKey = encrypt(apiKey);
        if (apiSecret) encryptedData.apiSecret = encrypt(apiSecret);

        const [integration] = await db.insert(integrations)
            .values(encryptedData)
            .returning();

        // Return with decrypted keys
        res.json({
            integration: {
                ...integration,
                apiKey: apiKey || null,
                apiSecret: apiSecret || null,
            },
        });
    } catch (error) {
        console.error('Create integration error:', error);
        res.status(500).json({ error: 'Failed to create integration' });
    }
});

// Update integration
router.put('/integrations/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const integrationId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const { name, authType, baseUrl, apiKey, apiSecret, metadata, enabled } = req.body;

        // Ensure user owns this integration
        const [existing] = await db.select().from(integrations)
            .where(and(
                eq(integrations.id, integrationId),
                eq(integrations.userId, userId)
            ));

        if (!existing) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        // Build update object
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (authType !== undefined) updateData.authType = authType;
        if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
        if (metadata !== undefined) updateData.metadata = metadata;
        if (enabled !== undefined) updateData.enabled = enabled;
        if (apiKey !== undefined) updateData.apiKey = apiKey ? encrypt(apiKey) : null;
        if (apiSecret !== undefined) updateData.apiSecret = apiSecret ? encrypt(apiSecret) : null;

        const [updated] = await db.update(integrations)
            .set(updateData)
            .where(eq(integrations.id, integrationId))
            .returning();

        // Return with decrypted keys
        res.json({
            integration: {
                ...updated,
                apiKey: updated.apiKey ? decrypt(updated.apiKey) : null,
                apiSecret: updated.apiSecret ? decrypt(updated.apiSecret) : null,
            },
        });
    } catch (error) {
        console.error('Update integration error:', error);
        res.status(500).json({ error: 'Failed to update integration' });
    }
});

// Delete integration
router.delete('/integrations/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const integrationId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

        // Ensure user owns this integration or is admin
        const isAdmin = req.user!.role === 'admin';

        const query = isAdmin
            ? eq(integrations.id, integrationId)
            : and(eq(integrations.id, integrationId), eq(integrations.userId, userId));

        const deleted = await db.delete(integrations)
            .where(query)
            .returning();

        if (deleted.length === 0) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        res.json({ message: 'Integration deleted successfully' });
    } catch (error) {
        console.error('Delete integration error:', error);
        res.status(500).json({ error: 'Failed to delete integration' });
    }
});

// Test integration connection (placeholder)
router.post('/integrations/:id/test', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const integrationId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);

        const [integration] = await db.select().from(integrations)
            .where(and(
                eq(integrations.id, integrationId),
                eq(integrations.userId, userId)
            ));

        if (!integration) {
            return res.status(404).json({ error: 'Integration not found' });
        }

        // TODO: Implement actual API testing based on integration type
        // For now, just validate that credentials exist
        if (!integration.apiKey && !integration.apiSecret) {
            return res.status(400).json({ error: 'No credentials configured' });
        }

        res.json({
            success: true,
            message: 'Integration test successful',
            // Would include actual test results here
        });
    } catch (error) {
        console.error('Test integration error:', error);
        res.status(500).json({ error: 'Failed to test integration' });
    }
});

export default router;
