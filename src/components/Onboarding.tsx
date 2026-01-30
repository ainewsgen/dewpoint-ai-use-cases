import { useState } from 'react';
import { MessageSquare, ArrowRight, Globe, User, Sparkles, Briefcase } from 'lucide-react';
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

    if (step === 1) {
        return (
            <div className="center-stage animate-fade-in">
                <div className="logo-header">
                    <div className="logo-pill">
                        <img src="/logo-full.png" alt="DewPoint Group" style={{ height: '60px' }} />
                    </div>
                </div>

                <p className="subtitle" style={{ marginBottom: '3rem', color: 'var(--text-muted)' }}>
                    The AI Agency in a Box. We analyze your business DNA to uncover hidden automation revenue.
                </p>

                <div className="glass-panel form-card" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem' }}>
                    <div className="progress-bar" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)' }}>
                        <div className="fill" style={{ width: '50%', height: '100%', background: 'hsl(var(--accent-primary))' }}></div>
                    </div>

                    <label className="input-label" style={{ display: 'block', fontWeight: 600, color: 'hsl(var(--accent-primary))', marginBottom: '0.5rem', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                        First, a diagnostic question:
                    </label>
                    <p className="question-text" style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 500 }}>
                        "What is the one weekly task that your most expensive employee hates doing?"
                    </p>

                    <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                        <input
                            type="text"
                            placeholder="e.g. Reconciliation, Scheduling, Lead Gen..."
                            value={painPoint}
                            onChange={(e) => { setPainPoint(e.target.value); setError(false); }}
                            style={{ borderColor: error ? 'salmon' : undefined }}
                            onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                            autoFocus
                        />
                        <MessageSquare className="input-icon" size={20} />
                    </div>

                    <button onClick={handleNext} className="btn-primary" style={{ width: '100%' }}>
                        Continue <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="center-stage animate-fade-in">
            <div className="logo-header sm">
                <div className="logo-pill">
                    <img src="/logo-full.png" alt="DewPoint Group" style={{ height: '40px' }} />
                </div>
            </div>

            <div className="glass-panel form-card" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem' }}>
                <div className="progress-bar" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)' }}>
                    <div className="fill" style={{ width: '100%', height: '100%', background: 'hsl(var(--accent-primary))' }}></div>
                </div>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Business Context</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>I need to know who I'm advising to generate relevant "Recipes".</p>

                <div className="form-grid" style={{ display: 'grid', gap: '1.5rem' }}>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Company URL (Optional)</label>
                        <div className="input-group">
                            <input
                                type="text" placeholder="example.com"
                                value={url} onChange={e => { setUrl(e.target.value); setError(false); }}
                                style={{ borderColor: error ? 'salmon' : undefined }}
                            />
                            <Globe className="input-icon" size={20} />
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

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Your Role</label>
                        <div className="input-group">
                            <input type="text" placeholder="Founder, CTO, Ops Manager..." value={role} onChange={e => setRole(e.target.value)} />
                            <User className="input-icon" size={20} />
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Company Size</label>
                        <div className="segment-control">
                            {['Solopreneur', '1-10', '11-50', '50+'].map(s => (
                                <button
                                    key={s}
                                    className={`segment-btn ${size === s ? 'active' : ''}`}
                                    onClick={() => setSize(s)}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tech Stack</label>
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
