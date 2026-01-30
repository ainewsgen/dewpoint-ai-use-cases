import { useState, useEffect } from 'react';
import { MessageSquare, ArrowRight, Globe, Sparkles, Briefcase, Loader2 } from 'lucide-react';
import { CompanyData } from '../lib/engine';

interface OnboardingProps {
    onComplete: (data: Partial<CompanyData>) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(1);
    const [painPoint, setPainPoint] = useState('');
    const [url, setUrl] = useState('');
    const [industry, setIndustry] = useState('');
    const [role, setRole] = useState('');
    const [size, setSize] = useState('Solopreneur');
    const [stack, setStack] = useState<string[]>([]);
    const [error, setError] = useState(false);
    const [isScanning, setIsScanning] = useState(false);

    // CMS state
    const [announcement, setAnnouncement] = useState('');

    useEffect(() => {
        const msg = localStorage.getItem('dpg_announcement');
        if (msg) setAnnouncement(msg);
    }, []);

    const techOptions = [
        'Salesforce', 'HubSpot', 'Zoho', 'Pipedrive',
        'QuickBooks', 'Xero', 'NetSuite',
        'Slack', 'Microsoft Teams',
        'Jira', 'Asana', 'Trello', 'ClickUp',
        'Shopify', 'WordPress', 'Webflow',
        'Gmail/GSuite', 'Outlook'
    ];

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
        onComplete({ painPoint, url, industry, role, size, stack });
    };

    const toggleTech = (tech: string) => {
        setStack(prev =>
            prev.includes(tech) ? prev.filter(t => t !== tech) : [...prev, tech]
        );
    };

    const scanUrl = () => {
        if (!url.includes('.')) {
            setError(true);
            return;
        }
        setIsScanning(true);
        setError(false);

        // Simulate scanning
        setTimeout(() => {
            setIsScanning(false);

            // Heuristic Stuff
            const u = url.toLowerCase();
            if (u.includes('law') || u.includes('legal')) setIndustry('Legal');
            else if (u.includes('tech') || u.includes('soft') || u.includes('io') || u.includes('ai')) setIndustry('Technology');
            else if (u.includes('shop') || u.includes('store')) setIndustry('E-Commerce');
            else if (u.includes('med') || u.includes('clinic')) setIndustry('Healthcare');

            const newStack = [...stack];
            // Guessing Tech
            if (!newStack.includes('Gmail/GSuite')) newStack.push('Gmail/GSuite'); // Safe bet for most
            if (u.includes('shopify')) newStack.push('Shopify');
            if (u.includes('wordpress')) newStack.push('WordPress');

            setStack(newStack);

        }, 1500);
    };

    if (step === 1) {
        return (
            <div className="center-stage animate-fade-in" style={{ justifyContent: 'flex-start', paddingTop: '12vh' }}>
                {announcement && (
                    <div className="announcement-banner" style={{
                        background: 'linear-gradient(90deg, hsl(var(--accent-primary)) 0%, hsl(var(--accent-secondary)) 100%)',
                        color: 'white', padding: '0.4rem 1rem', borderRadius: '50px',
                        marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
                        fontWeight: 600, fontSize: '0.8rem', boxShadow: '0 4px 15px hsla(var(--accent-primary)/0.3)'
                    }}>
                        <Sparkles size={14} />
                        {announcement}
                    </div>
                )}

                <div style={{ textAlign: 'center', marginBottom: '3rem', padding: '0 1rem' }}>
                    <h1 style={{
                        fontSize: 'clamp(3rem, 6vw, 5rem)',
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
                    width: '100%', maxWidth: '600px', padding: '2.5rem',
                    boxShadow: '0 25px 60px -15px rgba(32, 100, 185, 0.25)',
                    border: '1px solid white',
                    background: 'rgba(255,255,255,0.8)',
                    borderRadius: '16px'
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

                    <div className="input-group" style={{ marginBottom: '2rem' }}>
                        <input
                            type="text"
                            placeholder="e.g. Reconciliation, Scheduling, Lead Gen..."
                            value={painPoint}
                            onChange={(e) => { setPainPoint(e.target.value); setError(false); }}
                            style={{
                                borderColor: error ? 'salmon' : 'var(--border-glass)',
                                padding: '1.25rem 1rem 1.25rem 3.5rem',
                                fontSize: '1.1rem',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                borderRadius: '8px'
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                            autoFocus
                        />
                        <MessageSquare className="input-icon" size={20} style={{ top: '50%', transform: 'translateY(-50%)', left: '1.25rem', color: 'var(--text-muted)' }} />
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
            <div className="glass-panel form-card" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem' }}>
                <div className="progress-bar" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)' }}>
                    <div className="fill" style={{ width: '100%', height: '100%', background: 'hsl(var(--accent-primary))' }}></div>
                </div>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Business Context</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>I need to know who I'm advising to generate relevant "Recipes".</p>

                <div className="form-grid" style={{ display: 'grid', gap: '1.5rem' }}>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Company URL (Optional)</label>
                        <div className="input-group" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', background: 'transparent', border: 'none', padding: 0 }}>
                            <div style={{ position: 'relative', width: '100%' }}>
                                <input
                                    type="text" placeholder="example.com"
                                    value={url} onChange={e => {
                                        setUrl(e.target.value);
                                        setError(false);
                                    }}
                                    style={{ borderColor: error ? 'salmon' : undefined, width: '100%', paddingLeft: '2.5rem' }}
                                />
                                <Globe className="input-icon" size={20} style={{ left: '0.8rem' }} />
                            </div>
                            <button
                                onClick={scanUrl}
                                disabled={isScanning || !url}
                                className="btn-secondary"
                                style={{ height: '100%', padding: '0 1.25rem', borderColor: 'var(--accent-primary)', color: 'hsl(var(--accent-primary))', minWidth: '100px' }}
                            >
                                {isScanning ? <Loader2 className="spin" size={18} /> : (
                                    <>
                                        <Sparkles size={16} style={{ marginRight: '5px' }} /> Scan
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Industry (if no URL)</label>
                        <div className="input-group">
                            <input
                                type="text"
                                placeholder="e.g. Legal, Manufacturing, Dental..."
                                value={industry}
                                onChange={e => setIndustry(e.target.value)}
                            />
                            <Briefcase className="input-icon" size={20} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Your Role</label>
                            <div className="input-group">
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    style={{ width: '100%', padding: '0.9rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'white', color: 'hsl(var(--text-main))', fontSize: '1rem' }}
                                >
                                    <option value="" disabled>Select Role...</option>
                                    <option value="Founder">Founder / CEO</option>
                                    <option value="CTO">CTO / Technical Lead</option>
                                    <option value="Ops Manager">Operations Manager</option>
                                    <option value="marketing">Marketing Director</option>
                                    <option value="sales">Sales Leader</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Company Size</label>
                            <div className="input-group">
                                <select
                                    value={size}
                                    onChange={e => setSize(e.target.value)}
                                    style={{ width: '100%', padding: '0.9rem', borderRadius: '6px', border: '1px solid var(--border-glass)', background: 'white', color: 'hsl(var(--text-main))', fontSize: '1rem' }}
                                >
                                    <option value="Solopreneur">Solopreneur (1)</option>
                                    <option value="1-10">Micro (1-10)</option>
                                    <option value="11-50">Small (11-50)</option>
                                    <option value="50+">Mid-Sized (50+)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tech Stack</label>

                        {/* Custom Tech Input */}
                        <div className="input-group" style={{ marginBottom: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Add custom tech (Press Enter)..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const val = e.currentTarget.value.trim();
                                        if (val && !stack.includes(val)) {
                                            setStack(prev => [...prev, val]);
                                            e.currentTarget.value = '';
                                        }
                                    }
                                }}
                            />
                        </div>

                        <div className="chips-grid">
                            {techOptions.map(t => (
                                <button
                                    key={t}
                                    className={`chip ${stack.includes(t) ? 'active' : ''}`}
                                    onClick={() => toggleTech(t)}
                                >
                                    {t}
                                </button>
                            ))}
                            {/* Render Custom Chips */}
                            {stack.filter(s => !techOptions.includes(s)).map(s => (
                                <button
                                    key={s}
                                    className="chip active"
                                    onClick={() => toggleTech(s)}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <button onClick={handleSubmit} className="btn-primary" style={{ width: '100%', marginTop: '2rem' }}>
                    <Sparkles size={18} /> Generate Opportunity Matrix
                </button>
            </div>
        </div>
    );
}
