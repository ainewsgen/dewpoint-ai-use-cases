import { useState, useEffect } from 'react';
import { ArrowRight, Globe, Sparkles, Briefcase, Loader2 } from 'lucide-react';
import { CompanyData } from '../lib/engine';

interface OnboardingProps {
    onComplete: (data: Partial<CompanyData>) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(1);
    const [painPoint, setPainPoint] = useState('');
    const [url, setUrl] = useState('');
    const [industry, setIndustry] = useState('');
    const [role, setRole] = useState('Founder / Owner');
    const [size, setSize] = useState('Solopreneur');
    const [stack, setStack] = useState<string[]>([]);

    // Scraped Context
    const [description, setDescription] = useState('');
    const [scrapedContext, setScrapedContext] = useState<any>(null);

    const [error, setError] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // CMS state
    const [announcement, setAnnouncement] = useState('');

    useEffect(() => {
        const msg = localStorage.getItem('dpg_announcement');
        if (msg) setAnnouncement(msg);
    }, []);

    const techCategories = {
        "CRM & Sales": ['Salesforce', 'HubSpot', 'Zoho CRM', 'Pipedrive', 'Monday.com Sales'],
        "Communication": ['Slack', 'Microsoft Teams', 'Zoom', 'Google Meet', 'Intercom'],
        "Telephony & Voice": ['RingCentral', 'Zoom Phone', 'Dialpad', 'Aircall', 'Nextiva', 'GoToConnect'],
        "Productivity": ['Notion', 'Asana', 'Jira', 'Trello', 'ClickUp', 'Monday.com', 'Airtable'],
        "Finance & HR": ['QuickBooks', 'Xero', 'NetSuite', 'Gusto', 'Rippling', 'Expensify'],
        "Marketing": ['Mailchimp', 'Klaviyo', 'Buffer', 'Hootsuite', 'Canva', 'Shopify'],
        "Cloud & IT": ['AWS', 'Google Cloud', 'Azure', 'Zapier', 'Make (Integromat)', 'Dropbox', 'Google Drive']
    };
    // Flatten for compatibility with existing logic if needed, but we'll iterate categories in render
    const allTechOptions = Object.values(techCategories).flat();

    const handleNext = () => {
        if (!painPoint.trim()) {
            setError(true);
            return;
        }
        setError(false);
        setStep(2);
    };

    const handleSubmit = () => {
        if (!url.trim() && !industry.trim()) {
            setError(true);
            // Shake effect placeholder
            return;
        }
        onComplete({
            painPoint, url, industry, role, size, stack, description,
            context: scrapedContext,
            icpType: (scrapedContext as any)?.icpType || 'dewpoint'
        });
    };

    const toggleTech = (tech: string) => {
        setStack(prev =>
            prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
        );
    };

    const scanUrl = async () => {
        let cleanUrl = url.trim();
        if (!cleanUrl.includes('.')) {
            setError(true);
            return;
        }
        setIsScanning(true);
        setError(false);

        try {
            // Attempt server-side "AI" scan via Proxy
            const response = await fetch('/api/scan-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: cleanUrl })
            });

            if (response.ok) {
                const { data } = await response.json();

                if (data.industry) setIndustry(data.industry);
                if (data.description) setDescription(data.description);
                if (data.context) setScrapedContext(data.context);

                if (data.stack && data.stack.length > 0) {
                    setStack(prev => {
                        const next = new Set([...prev, ...data.stack, 'Gmail/GSuite']);
                        return Array.from(next);
                    });
                } else {
                    setStack(prev => prev.includes('Gmail/GSuite') ? prev : [...prev, 'Gmail/GSuite']);
                }
            } else {
                console.warn("Scan failed, falling back to heuristics");
                runClientHeuristics(cleanUrl);
            }

        } catch (err) {
            console.warn("Server scan network error, using fallback.", err);
            runClientHeuristics(cleanUrl);
        } finally {
            setIsScanning(false);
        }
    };

    const runClientHeuristics = (u: string) => {
        // Fallback Heuristics
        u = u.toLowerCase();

        if (u.includes('law') || u.includes('legal') || u.includes('attorney') || u.includes('esq')) setIndustry('Legal');
        else if (u.includes('consult') || u.includes('advis') || u.includes('agency') || u.includes('partner')) setIndustry('Consulting');
        else if (u.includes('market') || u.includes('brand') || u.includes('media') || u.includes('studio')) setIndustry('Marketing');
        else if (u.includes('tech') || u.includes('soft') || u.includes('io') || u.includes('ai') || u.includes('app')) setIndustry('Technology');
        else if (u.includes('shop') || u.includes('store') || u.includes('cart') || u.includes('retail')) setIndustry('E-Commerce');
        else if (u.includes('med') || u.includes('clinic') || u.includes('health') || u.includes('dr')) setIndustry('Healthcare');
        else if (u.includes('fin') || u.includes('capital') || u.includes('invest') || u.includes('bank')) setIndustry('Finance');
        else if (u.includes('real') || u.includes('estate') || u.includes('home') || u.includes('prop')) setIndustry('Real Estate');
        else if (u.includes('build') || u.includes('construct') || u.includes('contract')) setIndustry('Construction');
        else if (u.includes('edu') || u.includes('school') || u.includes('learn')) setIndustry('Education');

        // Basic Stack Guess
        setStack(prev => prev.includes('Gmail/GSuite') ? prev : [...prev, 'Gmail/GSuite']);
    };

    if (step === 1) {
        return (
            <div className="center-stage animate-fade-in" style={{ justifyContent: 'flex-start', paddingTop: '8vh', padding: '1rem' }}>
                {announcement && (
                    <div className="announcement-banner" style={{
                        background: 'linear-gradient(90deg, hsl(var(--accent-primary)) 0%, hsl(var(--accent-secondary)) 100%)',
                        color: 'white', padding: '0.4rem 1rem', borderRadius: '50px',
                        marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontWeight: 600, fontSize: '0.75rem', boxShadow: '0 4px 15px hsla(var(--accent-primary)/0.3)',
                        textAlign: 'center'
                    }}>
                        <Sparkles size={14} />
                        {announcement}
                    </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '3rem', padding: '0 1rem' }}>
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 5vw, 4rem)',
                        fontWeight: 800,
                        lineHeight: 1.05,
                        marginBottom: '1.25rem',
                        maxWidth: '1000px',
                        margin: '0 auto 1.5rem auto',
                        letterSpacing: '-0.03em',
                    }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Turn "I hate doing this"</span><br />
                        <span style={{
                            background: 'linear-gradient(135deg, hsl(var(--accent-primary)) 0%, hsl(var(--accent-gold)) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            display: 'inline-block',
                            paddingBottom: '0.5rem' // Prevent descender clipping
                        }}>into "It's already done."</span>
                    </h1>

                    <p className="subtitle" style={{
                        color: 'hsl(var(--text-main))',
                        fontSize: '1.25rem',
                        lineHeight: 1.6,
                        maxWidth: '720px',
                        margin: '0 auto',
                        opacity: 0.85
                    }}>
                        Tell us a little about your business and the tools you use. We’ll instantly map out exactly where AI can save you time, money, and sanity—customized to how you actually work.
                    </p>
                </div>

                <div className="glass-panel form-card" style={{
                    width: '100%', maxWidth: '600px', padding: '1.5rem 1.5rem 2.5rem 1.5rem',
                    boxShadow: '0 25px 60px -15px rgba(32, 100, 185, 0.25)',
                    border: '1px solid white',
                    background: 'rgba(255,255,255,0.8)',
                    borderRadius: '16px',
                    position: 'relative'
                }}>
                    <div className="progress-bar" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'rgba(0,0,0,0.05)' }}>
                        <div className="fill" style={{ width: '50%', height: '100%', background: 'hsl(var(--accent-gold))' }}></div>
                    </div>

                    <label className="input-label" style={{
                        display: 'block', fontWeight: 700, color: 'hsl(var(--accent-primary))',
                        marginBottom: '0.75rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em'
                    }}>
                        Let's start here
                    </label>
                    <p className="question-text" style={{ fontSize: '1.5rem', marginBottom: '2rem', fontWeight: 600, lineHeight: 1.3, color: 'hsl(var(--text-main))' }}>
                        What is the one weekly task that your most expensive employee hates doing?
                    </p>

                    <div className="input-group" style={{ marginBottom: '2rem', marginTop: '1rem' }}>
                        <input
                            type="text"
                            placeholder="e.g. Reconciliation, Scheduling, Lead Gen..."
                            value={painPoint}
                            onChange={(e) => { setPainPoint(e.target.value); setError(false); }}
                            style={{
                                borderColor: error ? 'salmon' : 'var(--border-glass)',
                                padding: '1.25rem 1rem', // Removed left padding for icon
                                fontSize: '1.1rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                borderRadius: '8px',
                                width: '100%'
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                            autoFocus
                        />
                    </div>

                    <button onClick={handleNext} className="btn-primary" style={{ width: '100%', padding: '1.1rem', fontSize: '1rem', borderRadius: '8px' }}>
                        Continue <ArrowRight size={20} />
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Takes less than 2 minutes • Completely free
                    </p>
                </div>
            </div>
        );
    }

    // Render Step 2
    return (
        <div className="center-stage animate-fade-in">
            {announcement && (
                <div className="announcement-banner" style={{
                    background: 'linear-gradient(90deg, hsl(var(--accent-primary)) 0%, hsl(var(--accent-secondary)) 100%)',
                    color: 'white', padding: '0.75rem 1.5rem', borderRadius: '50px',
                    marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                    fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 15px hsla(var(--accent-primary)/0.3)'
                }}>
                    <Sparkles size={16} />
                    {announcement}
                </div>
            )}
            <div className="glass-panel form-card" style={{ width: '100%', maxWidth: '700px', padding: '3rem' }}>
                <div className="progress-bar" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)' }}>
                    <div className="fill" style={{ width: '100%', height: '100%', background: 'hsl(var(--accent-primary))' }}></div>
                </div>

                <h2 style={{ fontSize: '2rem', marginBottom: '0.75rem', fontWeight: 800 }}>Business Context</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '1.1rem' }}>Customize your AI recipes based on who you serve and how you work.</p>

                <div className="form-grid" style={{ display: 'grid', gap: '2rem' }}>

                    {/* IDENTITY SECTION */}
                    <div style={{ paddingBottom: '2rem', borderBottom: '1px solid var(--border-glass)' }}>
                        <label className="section-label" style={{
                            display: 'block', fontSize: '0.75rem', fontWeight: 800,
                            color: 'hsl(var(--accent-primary))', marginBottom: '1.5rem',
                            textTransform: 'uppercase', letterSpacing: '0.1em'
                        }}>
                            Who do you serve?
                        </label>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => setScrapedContext({ ...scrapedContext, icpType: 'dewpoint' })}
                                style={{
                                    display: 'flex', flexDirection: 'column',
                                    padding: '1.5rem',
                                    background: (scrapedContext as any)?.icpType === 'dewpoint' || !(scrapedContext as any)?.icpType
                                        ? 'hsla(var(--accent-gold)/0.1)'
                                        : 'var(--bg-card)',
                                    border: (scrapedContext as any)?.icpType === 'dewpoint' || !(scrapedContext as any)?.icpType
                                        ? '2px solid hsl(var(--accent-gold))'
                                        : '1px solid var(--border-glass)',
                                    borderRadius: '12px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
                                    <span style={{
                                        fontWeight: 800, fontSize: '1.25rem',
                                        // Use accent-primary (Blue) for text even if gold border, or text-main. Gold text is too light.
                                        color: (scrapedContext as any)?.icpType === 'dewpoint' || !(scrapedContext as any)?.icpType ? 'hsl(var(--accent-primary))' : 'var(--text-main)'
                                    }}>B2B</span>
                                    <Briefcase size={20} style={{ opacity: 0.5 }} />
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.25rem' }}>Business to Business</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selling services or products to other companies.</div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setScrapedContext({ ...scrapedContext, icpType: 'internal' })}
                                style={{
                                    display: 'flex', flexDirection: 'column',
                                    padding: '1.5rem',
                                    background: (scrapedContext as any)?.icpType === 'internal'
                                        ? 'hsla(var(--accent-primary)/0.1)'
                                        : 'var(--bg-card)',
                                    border: (scrapedContext as any)?.icpType === 'internal'
                                        ? '2px solid hsl(var(--accent-primary))'
                                        : '1px solid var(--border-glass)',
                                    borderRadius: '12px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '0.5rem' }}>
                                    <span style={{
                                        fontWeight: 800, fontSize: '1.25rem',
                                        // Blue text on light blue bg is okay (5.7:1), but keep consistent
                                        color: (scrapedContext as any)?.icpType === 'internal' ? 'hsl(var(--accent-primary))' : 'var(--text-main)'
                                    }}>B2C</span>
                                    <Globe size={20} style={{ opacity: 0.5 }} />
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 600, marginBottom: '0.25rem' }}>Business to Consumer</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Selling directly to individual customers.</div>
                            </button>
                        </div>
                    </div>

                    {/* COMPANY DETAILS SECTION REFACTORED */}
                    <div style={{ marginTop: '2rem' }}>

                        {/* Row 1: Website */}
                        <div style={{ marginBottom: '2rem' }}>
                            <label className="section-label" style={{
                                display: 'block', fontSize: '0.75rem', fontWeight: 800,
                                color: 'hsl(var(--accent-primary))', marginBottom: '0.75rem',
                                textTransform: 'uppercase', letterSpacing: '0.1em'
                            }}>
                                Company Website
                            </label>
                            <div className="input-group" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
                                <div style={{ position: 'relative', width: '100%' }}>
                                    <input
                                        type="text" placeholder="www.company.com"
                                        value={url} onChange={e => { setUrl(e.target.value); setError(false); }}
                                        style={{ width: '100%', paddingLeft: '2.5rem', background: 'var(--bg-card)' }}
                                    />
                                    <Globe className="input-icon" size={18} style={{ left: '1rem', position: 'absolute', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                </div>
                                <button
                                    onClick={scanUrl}
                                    disabled={isScanning || !url}
                                    className="btn-secondary"
                                    style={{ padding: '0 1.5rem', height: '100%', borderColor: 'var(--accent-primary)', color: 'hsl(var(--accent-primary))' }}
                                >
                                    {isScanning ? <Loader2 className="spin" size={18} /> : "Scan"}
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Industry & Role */}
                        <div style={{ marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                <label className="section-label" style={{
                                    fontSize: '0.75rem', fontWeight: 800,
                                    color: 'hsl(var(--accent-primary))',
                                    textTransform: 'uppercase', letterSpacing: '0.1em',
                                    marginBottom: 0
                                }}>
                                    Industry
                                </label>

                                {/* General Toggle */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        id="general-toggle"
                                        checked={industry === 'General Business'}
                                        onChange={(e) => {
                                            if (e.target.checked) setIndustry('General Business');
                                            else setIndustry('');
                                        }}
                                        style={{ accentColor: 'hsl(var(--accent-gold))' }}
                                    />
                                    <label htmlFor="general-toggle" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                                        I don't fit a specific niche
                                    </label>
                                </div>
                            </div>

                            <div className="input-group" style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="e.g. Legal, Manufacturing..."
                                    value={industry === 'General Business' ? 'General Business (Cross-Industry Efficiency)' : industry}
                                    onChange={e => {
                                        if (industry === 'General Business') return; // Locked
                                        setIndustry(e.target.value);
                                    }}
                                    disabled={industry === 'General Business'}
                                    style={{
                                        background: industry === 'General Business' ? 'rgba(255,255,255,0.05)' : 'var(--bg-card)',
                                        width: '100%', paddingLeft: '2.5rem',
                                        color: industry === 'General Business' ? 'var(--text-muted)' : 'white',
                                        fontStyle: industry === 'General Business' ? 'italic' : 'normal'
                                    }}
                                />
                                <Briefcase className="input-icon" size={18} style={{ left: '1rem', position: 'absolute', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>
                        </div>

                        {/* Row 3: Your Role */}
                        <div style={{ marginBottom: '2.5rem' }}>
                            <label className="section-label" style={{
                                display: 'block', fontSize: '0.75rem', fontWeight: 800,
                                color: 'hsl(var(--accent-primary))', marginBottom: '0.75rem',
                                textTransform: 'uppercase', letterSpacing: '0.1em'
                            }}>
                                Your Role
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                {['Founder / Owner', 'Executive (CXO/VP)', 'Manager / Lead', 'Freelancer / Consultant'].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setRole(r)}
                                        style={{
                                            padding: '1rem 0.5rem',
                                            borderRadius: '12px',
                                            border: role === r ? '2px solid hsl(var(--accent-primary))' : '1px solid var(--border-glass)',
                                            background: role === r ? 'hsla(var(--accent-primary)/0.1)' : 'var(--bg-card)',
                                            color: role === r ? 'hsl(var(--accent-primary))' : 'var(--text-muted)',
                                            fontSize: '0.9rem',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            boxShadow: role === r ? '0 4px 12px hsla(var(--accent-primary)/0.2)' : 'none',
                                            transform: role === r ? 'translateY(-2px)' : 'none',
                                            minHeight: '80px'
                                        }}
                                        title={r}
                                    >
                                        <span style={{ fontWeight: role === r ? 800 : 500, fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.2 }}>
                                            {r.replace(' (', '\n(')}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Row 3: Company Size */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label className="section-label" style={{
                                display: 'block', fontSize: '0.75rem', fontWeight: 800,
                                color: 'hsl(var(--accent-primary))', marginBottom: '1rem',
                                textTransform: 'uppercase', letterSpacing: '0.1em'
                            }}>
                                Company Size
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                                {['Solopreneur (1)', 'Micro (1-10)', 'Small (11-50)', 'Mid-Sized (50+)'].map(opt => {
                                    const stateVal = opt.includes('Solopreneur') ? 'Solopreneur' : opt.match(/\((.*)\)/)?.[1] || '1-10';

                                    const mainLabel = opt.split(' (')[0];
                                    const subLabel = opt.match(/\((.*)\)/)?.[1] || '';

                                    return (
                                        <button
                                            key={opt}
                                            onClick={() => setSize(stateVal)}
                                            style={{
                                                padding: '1rem 0.5rem',
                                                borderRadius: '12px',
                                                border: size === stateVal ? '2px solid hsl(var(--accent-primary))' : '1px solid var(--border-glass)',
                                                background: size === stateVal ? 'hsla(var(--accent-primary)/0.05)' : 'var(--bg-card)',
                                                color: size === stateVal ? 'hsl(var(--accent-primary))' : 'var(--text-muted)',
                                                fontSize: '0.9rem',
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: size === stateVal ? '0 4px 12px hsla(var(--accent-primary)/0.15)' : 'none',
                                                transform: size === stateVal ? 'translateY(-2px)' : 'none'
                                            }}
                                        >
                                            <span style={{ fontWeight: size === stateVal ? 700 : 600, fontSize: '0.95rem' }}>{mainLabel}</span>
                                            {subLabel && <span style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '4px' }}>{subLabel} employees</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* TECH STACK SECTION */}
                        <div style={{ marginTop: '1rem', paddingTop: '2rem', borderTop: '1px solid var(--border-glass)' }}>
                            <label className="section-label" style={{
                                display: 'block', fontSize: '0.75rem', fontWeight: 800,
                                color: 'hsl(var(--accent-primary))', marginBottom: '1.5rem',
                                textTransform: 'uppercase', letterSpacing: '0.1em'
                            }}>
                                What tools do you use?
                            </label>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem 3rem' }}>
                                {Object.entries({
                                    ...techCategories,
                                    "CRM & Sales": ['Salesforce', 'HubSpot', 'Zoho CRM', 'Pipedrive', 'Monday.com Sales', 'Google Sheets', 'Microsoft Excel'],
                                    "Productivity": ['Notion', 'Asana', 'Jira', 'Trello', 'ClickUp', 'Monday.com', 'Airtable', 'Google Sheets', 'Microsoft Excel'],
                                    "Finance & HR": ['QuickBooks', 'Xero', 'NetSuite', 'Gusto', 'Rippling', 'Expensify', 'Google Sheets', 'Microsoft Excel'],
                                    "Telephony & Voice": ['RingCentral', 'Zoom Phone', 'Dialpad', 'Aircall', 'Nextiva', 'GoToConnect', 'Personal Cellphone']
                                }).map(([category, tools]) => (
                                    <div key={category}>
                                        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontWeight: 600 }}>{category}</h4>
                                        <div className="chips-grid" style={{ gap: '0.5rem' }}>
                                            {tools.map(t => (
                                                <button
                                                    key={t}
                                                    className={`chip ${stack.includes(t) ? 'active' : ''}`}
                                                    onClick={() => toggleTech(t)}
                                                    style={{ fontSize: '0.8rem', padding: '0.3rem 0.75rem' }}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Custom Tech Input */}
                            <div style={{ marginTop: '2rem' }}>
                                <input
                                    type="text"
                                    placeholder="Add any other tools... (Press Enter)"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const val = e.currentTarget.value.trim();
                                            if (val && !stack.includes(val)) {
                                                setStack(prev => [...prev, val]);
                                                e.currentTarget.value = '';
                                            }
                                        }
                                    }}
                                    style={{ width: '100%', background: 'transparent', borderBottom: '1px solid var(--border-glass)', borderTop: 'none', borderLeft: 'none', borderRight: 'none', padding: '0.5rem 0', outline: 'none', color: 'white' }}
                                />
                                {stack.filter(s => !allTechOptions.includes(s) && !['RingCentral', 'Zoom Phone', 'Dialpad', 'Aircall', 'Nextiva', 'GoToConnect'].includes(s)).length > 0 && (
                                    <div className="chips-grid" style={{ marginTop: '1rem' }}>
                                        {stack.filter(s => !allTechOptions.includes(s) && !['RingCentral', 'Zoom Phone', 'Dialpad', 'Aircall', 'Nextiva', 'GoToConnect'].includes(s)).map(s => (
                                            <button key={s} className="chip active" onClick={() => toggleTech(s)}>{s}</button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={handleSubmit} className="btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem', borderRadius: '50px', boxShadow: '0 10px 30px hsla(var(--accent-primary)/0.3)' }}>
                            Generate Roadmap <Sparkles size={18} style={{ marginLeft: '8px' }} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
