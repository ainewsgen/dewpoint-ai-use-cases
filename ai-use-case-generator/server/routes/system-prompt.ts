import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
// Use process.cwd() for robust path resolution across ESM/CJS and Local/Prod
const PROMPT_FILE_PATH = path.join(process.cwd(), 'server/data/system_prompt.txt');

// Ensure data directory exists
const dataDir = path.dirname(PROMPT_FILE_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// GET System Prompt
router.get('/config/system-prompt', requireAuth, requireAdmin, (req, res) => {
    try {
        if (fs.existsSync(PROMPT_FILE_PATH)) {
            const prompt = fs.readFileSync(PROMPT_FILE_PATH, 'utf-8');
            res.json({ prompt });
        } else {
            // Return default if file doesn't exist
            res.json({ prompt: null });
        }
    } catch (error) {
        console.error('Get system prompt error:', error);
        res.status(500).json({ error: 'Failed to read system prompt' });
    }
});

// SAVE System Prompt
router.post('/config/system-prompt', requireAuth, requireAdmin, (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Prompt content is required' });
        }

        fs.writeFileSync(PROMPT_FILE_PATH, prompt, 'utf-8');
        res.json({ success: true, message: 'System prompt saved successfully' });
    } catch (error) {
        console.error('Save system prompt error:', error);
        res.status(500).json({ error: 'Failed to save system prompt' });
    }
});

export default router;
