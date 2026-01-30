// ... imports
import { useState, useEffect } from 'react';
import { Opportunity } from '../lib/engine';
import { Bookmark, Frown, Sparkles, Trash2, ArrowRight, Server, Lock, ArrowDownUp } from 'lucide-react';
import { EmailModal } from './EmailModal';

interface RoadmapProps {
    isAdmin: boolean;
}

type SortOption = 'ROI' | 'DEPARTMENT' | 'NEWEST';

export function Roadmap({ isAdmin }: RoadmapProps) {
    const [savedRecipes, setSavedRecipes] = useState<Opportunity[]>([]);
    const [isLocked, setIsLocked] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>('ROI');

    useEffect(() => {
        // Gating Check
        const email = localStorage.getItem('dpg_user_email');
        if (email) {
            setIsLocked(false);
            const saved = localStorage.getItem('dpg_roadmap');
            if (saved) {
                setSavedRecipes(JSON.parse(saved));
            }
        }
    }, []);

    const handleLoginSuccess = () => {
        setIsLocked(false);
        const saved = localStorage.getItem('dpg_roadmap');
        if (saved) setSavedRecipes(JSON.parse(saved));
    };

    const removeRecipe = (index: number) => {
        // Note: Removing by index might be buggy if sorted. Better to remove by Title.
        // But for now, we'll filter the current list and re-save.
        // Actually, to be safe with sorting, we should find the item in the master list.
        // Let's assume title is unique enough for this demo.
        const targetTitle = sortedRecipes[index].title;
        const updated = savedRecipes.filter(r => r.title !== targetTitle);
        setSavedRecipes(updated);
        localStorage.setItem('dpg_roadmap', JSON.stringify(updated));
    };

    // Sorting Logic
    const sortedRecipes = [...savedRecipes].sort((a, b) => {
        if (sortBy === 'DEPARTMENT') {
            return a.department.localeCompare(b.department);
        }
        if (sortBy === 'ROI') {
            // Heuristic: Extract first number. If '$', prioritize.
            const getVal = (s: string) => {
                const num = parseInt(s.replace(/\D/g, '')) || 0;
                return s.includes('$') ? num * 1000 : num; // Weight $ amounts higher
            };
            return getVal(b.public_view.roi_estimate) - getVal(a.public_view.roi_estimate);
        }
        return 0; // Newest (default order in array is usually oldest first pushed? actually push adds to end. So reverse for newest.)
    });

    if (sortBy === 'NEWEST') {
        sortedRecipes.reverse();
    }

    if (isLocked) {
        return (
            <div className="container animate-fade-in" style={{ paddingTop: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: 'hsla(var(--accent-gold)/0.1)', padding: '2rem', borderRadius: '50%', marginBottom: '2rem' }}>
                    <Lock size={64} className="text-gold" />
                </div>
                <h2 style={{ marginBottom: '1rem' }}>Roadmap Locked</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center', maxWidth: '400px' }}>
                    Please verify your email address to access your saved strategic roadmap.
                </p>
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    {/* Reuse EmailModal logic but inline or trigger it? Let's just inline a simple button to trigger standard modal if we want, or just render the modal form directly. 
                         Since we have the EmailModal component, let's just render it but maybe tweaking it to be inline? 
                         Actually, let's just use the EmailModal as a "gate". 
                      */}
                    <EmailModal onClose={() => { }} onSuccess={handleLoginSuccess} />
                </div>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in" style={{ paddingTop: '2rem' }}>
            <header className="library-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', background: 'hsla(var(--accent-gold)/0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                    <Bookmark size={48} className="text-gold" />
                </div>
                <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>My Roadmap</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Your curated list of high-impact AI strategies.</p>
            </header>

            {/* Toolbar */}
            {savedRecipes.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', paddingRight: '1rem' }}>
                    <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ArrowDownUp size={16} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Sort by:</span>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            style={{ background: 'transparent', border: 'none', color: 'hsl(var(--text-main))', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                        >
                            <option value="ROI">Highest ROI</option>
                            <option value="DEPARTMENT">Department</option>
                            <option value="NEWEST">Newest Added</option>
                        </select>
                    </div>
                </div>
            )}

            {savedRecipes.length === 0 ? (
                <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Your roadmap is currently empty.</p>
                    <p>Go back to the <strong>Generator</strong> or <strong>Library</strong> to find recipes to save.</p>
                </div>
            ) : (
                <div className="matrix-grid">
                    {sortedRecipes.map((opp, idx) => (
                        <RoadmapCard key={idx} opp={opp} onRemove={() => removeRecipe(idx)} isAdmin={isAdmin} />
                    ))}
                </div>
            )}
        </div>
    );
}

function RoadmapCard({ opp, onRemove, isAdmin }: { opp: Opportunity, onRemove: () => void, isAdmin: boolean }) {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="glass-panel recipe-card" style={{ borderTopColor: 'hsl(var(--accent-secondary))' }}>
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

            {/* Deep Dive Content */}
            {showDetails && (
                <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.05)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {/* Publicly visible "Technical Workflow" */}
                    <div style={{ marginBottom: '1rem' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>How it works:</p>
                        <p style={{ color: 'var(--text-muted)' }}>{opp.admin_view.workflow_steps}</p>
                    </div>

                    {/* New Content Fields */}
                    {opp.public_view.detailed_explanation && (
                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Deep Dive:</p>
                            <p style={{ color: 'var(--text-muted)' }}>{opp.public_view.detailed_explanation}</p>
                        </div>
                    )}
                    {opp.public_view.example_scenario && (
                        <div style={{ marginBottom: '1rem' }}>
                            <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Example:</p>
                            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>"{opp.public_view.example_scenario}"</p>
                        </div>
                    )}

                    {/* Admin Only Stack */}
                    {isAdmin && (
                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid rgba(0,0,0,0.1)', paddingTop: '0.5rem' }}>
                            <div style={{ width: '100%', color: 'salmon', fontSize: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Server size={12} /> Admin Stack View</div>
                            {opp.admin_view.tech_stack.map(t => (
                                <span key={t} className="chip active" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>{t}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 'auto', display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', position: 'relative', zIndex: 10 }}
                >
                    {showDetails ? 'Hide Specs' : 'View Specs'} <ArrowRight size={14} />
                </button>
                <button
                    onClick={onRemove}
                    className="btn-secondary"
                    style={{ borderColor: 'salmon', color: 'salmon', padding: '0.5rem' }}
                    title="Remove from Roadmap"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}
