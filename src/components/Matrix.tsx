import { useState } from 'react';
import { generateOpportunities, CompanyData, Opportunity } from '../lib/engine';
import { BadgeCheck, Frown, Sparkles, Server, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

interface MatrixProps {
    companyData: CompanyData;
    onUnlock: (recipes: Opportunity[]) => void;
}

export function Matrix({ companyData, onUnlock }: MatrixProps) {
    const opportunities = generateOpportunities(companyData);

    return (
        <div className="container animate-fade-in">
            <header className="matrix-header" style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="text-accent">Opportunity Matrix</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Generated for <strong>{companyData.url || "Your Business"}</strong></p>
                </div>
                <div className="glass-panel" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: 'hsl(var(--accent-primary))', fontWeight: 500 }}>
                    <span>{opportunities.length} High-Value Workflows Found</span>
                </div>
            </header>

            <div className="matrix-grid">
                {opportunities.map((opp, idx) => (
                    <RecipeCard key={idx} opp={opp} onUnlock={() => onUnlock(opportunities)} />
                ))}
            </div>
        </div>
    );
}

function RecipeCard({ opp, onUnlock }: { opp: Opportunity, onUnlock: () => void }) {
    const [showAdmin, setShowAdmin] = useState(false);

    return (
        <div className="glass-panel recipe-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className="badge rev" style={{ background: 'hsla(var(--accent-primary)/0.15)', color: 'hsl(var(--accent-primary))', border: '1px solid hsla(var(--accent-primary)/0.3)' }}>{opp.public_view.roi_estimate}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>{opp.department}</span>
            </div>

            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>{opp.title}</h3>

            {/* Public View */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Frown size={16} style={{ color: 'salmon', minWidth: '16px', marginTop: '4px' }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{opp.public_view.problem}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <Sparkles size={16} className="text-accent" style={{ minWidth: '16px', marginTop: '4px' }} />
                <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{opp.public_view.solution_narrative}</p>
            </div>

            {/* Admin View Toggle */}
            {showAdmin && (
                <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: '#a0a0a0' }}>
                            <Server size={14} /> <strong>Stack</strong>
                        </div>
                        <div className="chips-grid" style={{ gap: '0.25rem' }}>
                            {opp.admin_view.tech_stack.map(t => (
                                <span key={t} style={{ background: '#222', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid #333' }}>{t}</span>
                            ))}
                        </div>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: '#a0a0a0' }}>
                            <Terminal size={14} /> <strong>Workflow</strong>
                        </div>
                        <p style={{ color: '#ccc' }}>{opp.admin_view.workflow_steps}</p>
                    </div>
                </div>
            )}

            <div className="metrics" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Value Prop</label>
                    <span style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>"{opp.public_view.value_proposition}"</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                    onClick={() => setShowAdmin(!showAdmin)}
                    className="btn-secondary"
                    style={{ padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                    {showAdmin ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Specs
                </button>
                <button
                    onClick={onUnlock}
                    className="btn-primary"
                    style={{ padding: '0.5rem', fontSize: '0.9rem' }}
                >
                    <BadgeCheck size={16} /> Unlock
                </button>
            </div>
        </div>
    );
}
