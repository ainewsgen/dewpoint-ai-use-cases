import { useState, useEffect } from 'react';
import { Opportunity } from '../lib/engine';
import { Bookmark, Frown, Sparkles, Trash2, ArrowRight } from 'lucide-react';

export function Roadmap() {
    const [savedRecipes, setSavedRecipes] = useState<Opportunity[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('dpg_roadmap');
        if (saved) {
            setSavedRecipes(JSON.parse(saved));
        }
    }, []);

    const removeRecipe = (index: number) => {
        const updated = savedRecipes.filter((_, i) => i !== index);
        setSavedRecipes(updated);
        localStorage.setItem('dpg_roadmap', JSON.stringify(updated));
    };

    return (
        <div className="container animate-fade-in" style={{ paddingTop: '2rem' }}>
            <header className="library-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', background: 'hsla(var(--accent-gold)/0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                    <Bookmark size={48} className="text-gold" />
                </div>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>My Roadmap</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Your curated list of high-impact AI strategies.</p>
            </header>

            {savedRecipes.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Your roadmap is currently empty.</p>
                    <p>Go back to the <strong>Generator</strong> or <strong>Library</strong> to find recipes to save.</p>
                </div>
            ) : (
                <div className="matrix-grid">
                    {savedRecipes.map((opp, idx) => (
                        <div key={idx} className="glass-panel recipe-card" style={{ borderTopColor: 'hsl(var(--accent-secondary))' }}>
                            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <span className={`badge ${opp.public_view.roi_estimate.includes('$') ? 'cost' : 'eff'}`}>{opp.department}</span>
                                <span style={{ color: 'hsl(var(--accent-gold))', fontSize: '0.8rem', fontWeight: 700 }}>{opp.public_view.roi_estimate}</span>
                            </div>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>{opp.title}</h3>

                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <Frown size={16} style={{ color: 'salmon', minWidth: '16px', marginTop: '4px' }} />
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>{opp.public_view.problem}</p>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                <Sparkles size={16} className="text-gold" style={{ minWidth: '16px', marginTop: '4px' }} />
                                <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{opp.public_view.solution_narrative}</p>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    View Specs <ArrowRight size={14} />
                                </button>
                                <button
                                    onClick={() => removeRecipe(idx)}
                                    className="btn-secondary"
                                    style={{ borderColor: 'salmon', color: 'salmon', padding: '0.5rem' }}
                                    title="Remove from Roadmap"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
