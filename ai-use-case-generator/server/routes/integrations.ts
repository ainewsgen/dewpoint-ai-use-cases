import { Router } from 'express';
import { db } from '../db';
import { integrations } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { requireAuth, requireAdmin, AuthRequest } from '../middleware/auth';
import { encrypt, decrypt } from '../utils/encryption';
import { OpenAIService } from '../services/openai';
import { GeminiService } from '../services/gemini';

const router = Router();

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
            // Explicitly set provider for backward compatibility with schema
            provider: metadata?.provider || (name.toLowerCase().includes('gemini') ? 'gemini' : 'openai'),
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
    } catch (error: any) {
        console.error('Create integration error:', error);
        // Better error logging for debugging
        const errorDetail = error.detail || error.message || 'Unknown error';
        const errorCode = error.code || 'NoCode';
        res.status(500).json({
            error: `Failed to create integration: ${error.message}`,
            details: `DB Error ${errorCode}: ${errorDetail}`
        });
    }
});

// Update integration
router.put('/integrations/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
        const userId = req.user!.id;
        const integrationId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
        const { name, authType, baseUrl, apiKey, apiSecret, metadata, enabled } = req.body;

        // Ensure user owns this integration OR is admin
        const isAdmin = req.user!.role === 'admin';
        const query = isAdmin
            ? eq(integrations.id, integrationId)
            : and(eq(integrations.id, integrationId), eq(integrations.userId, userId));

        const [existing] = await db.select().from(integrations).where(query);

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

        // Ensure provider matches metadata (for Hybrid Schema compatibility)
        if (metadata) {
            updateData.provider = metadata.provider || (updateData.name?.toLowerCase().includes('gemini') ? 'gemini' : 'openai');
        }

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
    } catch (error: any) {
        console.error('Update integration error:', error);
        res.status(500).json({ error: `Failed to update integration: ${error.message}` });
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

// NEW: Consolidated Admin Test Route (Matches Frontend)
router.post('/admin/integrations/test', requireAuth, requireAdmin, async (req: AuthRequest, res) => {
    try {
        const { id, provider, name, apiKey, baseUrl } = req.body;

        let effectiveProvider = provider;
        let effectiveName = name;
        let effectiveKey = apiKey;

        // 1. Fetch from DB if ID provided (for list-view tests)
        if (id) {
            const [int] = await db.select().from(integrations).where(eq(integrations.id, id));
            if (int) {
                if (!effectiveProvider) effectiveProvider = int.provider;
                if (!effectiveName) effectiveName = int.name;
                if (!effectiveKey && int.apiKey) effectiveKey = decrypt(int.apiKey);
            }
        }

        // 2. Identify Provider fallback
        if (effectiveKey?.startsWith('AIza')) {
            effectiveProvider = 'gemini';
        }
        effectiveProvider = effectiveProvider || (effectiveName?.toLowerCase().includes('gemini') ? 'gemini' : 'openai');

        if (!effectiveKey) {
            return res.status(400).json({ error: 'No API Key provided for test' });
        }

        // 3. Perform Test
        if (effectiveProvider === 'gemini') {
            try {
                // Gemini Handshake - simple JSON response check
                await GeminiService.generateJSON({
                    apiKey: effectiveKey,
                    systemPrompt: "You are a connection tester.",
                    userContext: "Return { \"status\": \"ok\" } JSON object. No markdown.",
                    model: "gemini-pro" // Stable model for connection test
                });
                return res.json({ success: true, message: 'Successfully connected to Google Gemini!' });
            } catch (err: any) {
                console.error("Gemini Test Fail:", err);
                return res.status(400).json({ error: 'Gemini Connection Failed', details: err.message });
            }
        } else {
            // Default to OpenAI
            try {
                await OpenAIService.generateJSON({
                    apiKey: effectiveKey,
                    systemPrompt: "You are a connection tester.",
                    userContext: "Return { \"status\": \"ok\" } JSON.",
                    model: "gpt-3.5-turbo"
                });
                return res.json({ success: true, message: 'Successfully connected to OpenAI!' });
            } catch (err: any) {
                console.error("OpenAI Test Fail:", err);
                return res.status(400).json({ error: 'OpenAI Connection Failed', details: err.message });
            }
        }
    } catch (error: any) {
        console.error('Unified test error:', error);
        res.status(500).json({ error: `Server error during test: ${error.message}` });
    }
});

export default router;
