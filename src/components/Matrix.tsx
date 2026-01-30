import { generateOpportunities, CompanyData, Opportunity } from '../lib/engine';
import { Star, Frown, Bot } from 'lucide-react';

interface MatrixProps {
    companyData: CompanyData;
}

export function Matrix({ companyData }: MatrixProps) {
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
                    <RecipeCard key={idx} opp={opp} />
                ))}
            </div>
        </div>
    );
}

function RecipeCard({ opp }: { opp: Opportunity }) {
    const badgeClass =
        opp.type === 'Revenue Gen' ? 'rev' :
            opp.type === 'Cost Saving' ? 'cost' : 'eff';

    return (
        <div className="glass-panel recipe-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span className={`badge ${badgeClass}`}>{opp.type}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>{opp.department}</span>
            </div>

            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>{opp.title}</h3>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <Frown size={16} style={{ color: 'salmon', minWidth: '16px' }} />
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{opp.pain}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                <Bot size={16} className="text-accent" style={{ minWidth: '16px' }} />
                <p style={{ fontSize: '0.9rem' }}>{opp.solution}</p>
            </div>

            <div className="metrics" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Stack</label>
                    <span style={{ fontSize: '0.85rem' }}>{opp.stack}</span>
                </div>
                <div>
                    <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Difficulty</label>
                    <div className="stars">
                        {Array(5).fill(0).map((_, i) => (
                            <Star key={i} size={14} className={`star ${i < opp.difficulty ? 'fill' : ''}`} />
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button className="btn-secondary" style={{ padding: '0.5rem', background: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-muted)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>Too Complex</button>
                <button className="btn-primary" style={{ padding: '0.5rem', fontSize: '0.9rem' }}>Unlock Recipe</button>
            </div>
        </div>
    );
}
