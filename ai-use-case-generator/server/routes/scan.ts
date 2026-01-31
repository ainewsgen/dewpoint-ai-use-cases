import { Router } from 'express';

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

        // 1. Fetch the HTML
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; DewPointBot/1.0; +http://dewpoint.ai)'
            },
            signal: AbortSignal.timeout(5000) // 5s timeout
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status}`);
        }

        const html = await response.text();

        // 2. Simple Parse (Regex) - No Cheerio needed for this
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : '';

        const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
            || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
        const description = metaDescMatch ? metaDescMatch[1].trim() : '';

        // Combine text for "AI" analysis
        const combinedText = (title + ' ' + description + ' ' + url).toLowerCase();

        // 3. Determine Industry (Keyword Heuristics on Content)
        let industry = '';

        const heuristics: Record<string, string[]> = {
            'Legal': ['law', 'legal', 'attorney', 'lawyer', 'firm', 'litigation', 'counsel', 'juridical'],
            'Medical': ['medical', 'clinic', 'health', 'doctor', 'patient', 'surgery', 'care', 'dental', 'pharmacy', 'hospital', 'wellness'],
            'Real Estate': ['real estate', 'realty', 'property', 'properties', 'listings', 'home', 'housing', 'broker', 'agent', 'tenant', 'lease'],
            'Construction': ['construction', 'build', 'contractor', 'renovation', 'roofing', 'hvac', 'plumbing', 'electric', 'engineering', 'civil'],
            'Finance': ['finance', 'financial', 'invest', 'capital', 'wealth', 'bank', 'fund', 'asset', 'tax', 'accounting', 'cpa', 'ledger'],
            'Marketing': ['marketing', 'agency', 'brand', 'digital', 'social media', 'creative', 'advertising', 'pr', 'media', 'seo', 'content'],
            'Consulting': ['consulting', 'consultancy', 'advisory', 'advisor', 'strategy', 'management', 'solutions', 'partner'],
            'Technology': ['software', 'technology', 'tech', 'saas', 'app', 'platform', 'cloud', 'cyber', 'data', 'ai', 'automation', 'developer'],
            'Manufacturing': ['manufacturing', 'industrial', 'factory', 'production', 'machinery', 'automation', 'supply chain', 'logistics', 'equipment'],
            'Retail': ['shop', 'store', 'retail', 'fashion', 'clothing', 'apparel', 'boutique', 'ecommerce', 'cart'],
            'Education': ['education', 'school', 'university', 'academy', 'learning', 'training', 'course', 'student', 'campus'],
            'Hospitality': ['hotel', 'resort', 'travel', 'booking', 'restaurant', 'cafe', 'food', 'dining', 'hospitality', 'event']
        };

        // Score Matches
        let bestScore = 0;

        for (const [ind, keywords] of Object.entries(heuristics)) {
            let score = 0;
            keywords.forEach(kw => {
                if (combinedText.includes(kw)) score++;
                // Double points for title match
                if (title.toLowerCase().includes(kw)) score += 2;
            });
            if (score > bestScore) {
                bestScore = score;
                industry = ind;
            }
        }

        // Tech Stack Guessing
        const stack: string[] = [];
        if (html.includes('wp-content') || html.includes('wordpress')) stack.push('WordPress');
        if (html.includes('shopify')) stack.push('Shopify');
        if (html.includes('squarespace')) stack.push('Squarespace');
        if (html.includes('wix')) stack.push('Wix');
        if (html.includes('hubspot')) stack.push('HubSpot');

        // Defaults if nothing found
        if (!industry) {
            // Try to guess from text density? No, just return empty or "Other" logic on frontend
        }

        res.json({
            success: true,
            data: {
                industry,
                title,
                description,
                stack
            }
        });

    } catch (error) {
        console.error('Scan error:', error);
        res.status(500).json({ error: 'Failed to scan URL' });
    }
});

export default router;
