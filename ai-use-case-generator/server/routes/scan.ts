import { Router } from 'express';
import { load } from 'cheerio';
import { db } from '../db';
import { integrations } from '../db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '../utils/encryption';
import { OpenAIService } from '../services/openai';
import { buildScanPrompt } from '../lib/prompts';

const router = Router();

router.post('/scan-url', async (req, res) => {
    try {
        let { url } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        // Add protocol if missing
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        // SSRF Protection: Block localhost and private IP ranges
        try {
            const parsedUrl = new URL(url);
            const host = parsedUrl.hostname;

            const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1';
            const isPrivate = host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('172.16.') || host.startsWith('169.254.');

            if (isLocal || isPrivate) {
                return res.status(400).json({ error: 'Invalid or restricted URL' });
            }
        } catch (e) {
            return res.status(400).json({ error: 'Malformed URL' });
        }

        // 1. Fetch the HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            signal: AbortSignal.timeout(8000) // 8s timeout
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
        }

        const html = await response.text();
        const $ = load(html);

        // 2. Extract Metadata
        const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || '';
        const description = $('meta[name="description"]').attr('content')
            || $('meta[property="og:description"]').attr('content')
            || '';

        // 3. Extract Key Content (Headers & Body)
        const h1 = $('h1').map((_, el) => $(el).text().trim()).get().join('; ');
        const h2 = $('h2').slice(0, 5).map((_, el) => $(el).text().trim()).get().join('; ');

        // Get generic body text (first 1000 chars) for flavor
        // Remove scripts/styles first
        $('script').remove();
        $('style').remove();
        $('noscript').remove();
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 1500);

        // 4. Detect Specific Signals (Advanced Logic Markers)
        const signals = {
            hasLogin: /login|sign in|portal|client area/i.test(html),
            hasBooking: /book|schedule|appointment/i.test(html),
            hasPricing: /pricing|plans|cost/i.test(html),
            hasContactForm: /contact|get in touch/i.test(html) && !/book|schedule/i.test(html), // Only contact, no booking
            isWordPress: /wp-content|wordpress/i.test(html),
            isShopify: /shopify/i.test(html)
        };

        // Combine text for "AI" classification
        const combinedText = `${title} ${description} ${h1} ${h2} ${bodyText}`.toLowerCase();

        // Initial Tech Stack Guessing (Regex)
        const stack: string[] = [];
        if (signals.isWordPress) stack.push('WordPress');
        if (signals.isShopify) stack.push('Shopify');
        if (html.includes('squarespace')) stack.push('Squarespace');
        if (html.includes('wix')) stack.push('Wix');
        if (html.includes('hubspot')) stack.push('HubSpot');
        if (html.includes('salesforce')) stack.push('Salesforce');
        if (html.includes('calendly')) stack.push('Calendly');
        if (html.includes('intercom')) stack.push('Intercom');

        // ---------------------------------------------------------
        // INTELLIGENT SCAN (AI)
        // ---------------------------------------------------------
        let industry = '';
        let aiAnalysis: any = null;

        // Check for Active AI Integration
        const integrationsList = await db.select().from(integrations)
            .where(eq(integrations.enabled, true));
        const activeInt = integrationsList.find(i => i.enabled && (i.apiKey || i.apiSecret));

        if (activeInt && activeInt.apiKey) {
            try {
                const apiKey = decrypt(activeInt.apiKey);
                const systemPrompt = buildScanPrompt({ url, title, description, h1, h2, bodySnippet: bodyText.substring(0, 800) });

                aiAnalysis = await OpenAIService.generateJSON({
                    apiKey,
                    model: 'gpt-4o',
                    systemPrompt,
                    userContext: "Analyze the website content above."
                });

                if (aiAnalysis?.industry) {
                    industry = aiAnalysis.industry;
                    console.log(`[Scan] AI Classified: ${industry} (NAICS: ${aiAnalysis.naics})`);

                    // Merge AI stack findings
                    if (Array.isArray(aiAnalysis.stack_additions)) {
                        aiAnalysis.stack_additions.forEach((t: string) => {
                            if (!stack.includes(t)) stack.push(t);
                        });
                    }
                }
            } catch (err) {
                console.warn("[Scan] AI analysis failed, falling back to heuristics:", err);
            }
        }

        // ---------------------------------------------------------
        // FALLBACK: HEURISTICS
        // ---------------------------------------------------------
        if (!industry) {
            // 5. Determine Industry (Keyword Heuristics on Content)
            const heuristics: Record<string, string[]> = {
                'Legal': ['law', 'legal', 'attorney', 'lawyer', 'firm', 'litigation', 'counsel', 'juridical'],
                'Medical': ['medical', 'clinic', 'health', 'doctor', 'patient', 'surgery', 'care', 'dental', 'pharmacy', 'hospital'],
                'Real Estate': ['real estate', 'realty', 'property', 'properties', 'listings', 'home', 'housing', 'broker', 'agent', 'leasing'],
                'Construction': ['construction', 'build', 'contractor', 'renovation', 'roofing', 'hvac', 'plumbing', 'electric', 'engineering', 'drafting', 'blueprint', 'cad', 'architecture', 'architect', 'design build'],
                'Finance': ['finance', 'financial', 'invest', 'capital', 'wealth', 'bank', 'fund', 'asset', 'tax', 'accounting', 'cpa', 'bookkeeping'],
                'Marketing': ['marketing', 'agency', 'brand', 'digital', 'social media', 'creative', 'advertising', 'pr', 'media', 'seo', 'content'],
                'Consulting': ['consulting', 'consultancy', 'advisory', 'advisor', 'strategy', 'management', 'partner', 'coaching'],
                'Technology': ['software', 'technology', 'tech', 'saas', 'app', 'platform', 'cloud', 'cyber', 'data', 'ai', 'automation', 'it services'],
                'Manufacturing': ['manufacturing', 'industrial', 'factory', 'production', 'machinery', 'automation', 'supply chain', '3d modeling', 'prototyping', 'fabrication'],
                'Retail': ['shop', 'store', 'retail', 'fashion', 'clothing', 'apparel', 'boutique', 'ecommerce', 'cart', 'consumer goods'],
                'Education': ['education', 'school', 'university', 'academy', 'learning', 'training', 'course', 'student', 'tutor'],
                'Hospitality': ['hotel', 'resort', 'travel', 'booking', 'restaurant', 'cafe', 'food', 'dining', 'hospitality', 'event']
            };

            // Score Matches
            let bestScore = 0;
            for (const [ind, keywords] of Object.entries(heuristics)) {
                let score = 0;
                keywords.forEach(kw => {
                    if (combinedText.includes(kw)) score++;
                    // Triple points for Title/H1 match
                    if (`${title} ${h1}`.toLowerCase().includes(kw)) score += 3;
                });
                if (score > bestScore) {
                    bestScore = score;
                    industry = ind;
                }
            }
        }

        res.json({
            success: true,
            data: {
                industry,
                title,
                description: aiAnalysis?.summary || description, // Prefer AI summary if available
                stack,
                // Pass back rich context for the frontend to store -> send to Generate API
                context: {
                    h1,
                    h2,
                    bodySnippet: bodyText.substring(0, 500),
                    signals,
                    naics: aiAnalysis?.naics || null, // Pass NAICS if AI found it
                    source: aiAnalysis ? 'AI' : 'System' // Tracking Source
                }
            }
        });

    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ error: 'Failed to scan URL' });
    }
});

export default router;
