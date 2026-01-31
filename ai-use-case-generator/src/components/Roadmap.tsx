// ... imports
import { useState, useEffect } from 'react';
import { Opportunity } from '../lib/engine';
import { Bookmark, Frown, Sparkles, Trash2, ArrowRight, Server, Lock, ArrowDownUp, Map, Shield } from 'lucide-react';



interface RoadmapProps {
    isAdmin: boolean;
    user?: any;
    leads?: any[];
}

type SortOption = 'ROI' | 'DEPARTMENT' | 'NEWEST';

export function Roadmap({ isAdmin, user, leads = [] }: RoadmapProps) {
    const [savedRecipes, setSavedRecipes] = useState<Opportunity[]>([]);
    const [isLocked, setIsLocked] = useState(true);
    const [sortBy, setSortBy] = useState<SortOption>('ROI');

    useEffect(() => {
        const fetchRoadmap = async () => {
            if (user?.email) {
                setIsLocked(false);
                try {
                    const res = await fetch(`${import.meta.env.PROD ? '/api' : 'http://localhost:3000/api'}/roadmap/${user.email}`);

                    if (res.ok) {
                        const data = await res.json();
                        // Backend returns 'leads' object with 'recipes' array
                        // Need to flatten recipes from all leads
                        const allRecipes = data.roadmap.flatMap((l: any) => l.recipes);
                        setSavedRecipes(allRecipes);
                    }
                } catch (error) {
                    console.error("Failed to fetch roadmap", error);
                    // Fallback to local storage
                    const saved = localStorage.getItem('dpg_roadmap');
                    if (saved) setSavedRecipes(JSON.parse(saved));
                }
            } else if (localStorage.getItem('dpg_user_email')) {
                // Weak auth fallback (mostly for dev)
                setIsLocked(false);
                const saved = localStorage.getItem('dpg_roadmap');
                if (saved) setSavedRecipes(JSON.parse(saved));
            }
        };

        fetchRoadmap();
    }, [user]);

    const handleLoginSuccess = () => {
        // ... handled by App.tsx passed prop now
    };

    const removeRecipe = (index: number) => {
        alert("Removing items needs backend support (Implementation Pending). Blocking for now to prevent sync issues.");
        // TODO: Implement DELETE /api/roadmap endpoint
    };


    // Sorting Logic
    const sortedRecipes = [...savedRecipes].sort((a, b) => {
        if (sortBy === 'DEPARTMENT') {
            return a.department.localeCompare(b.department);
        }
        if (sortBy === 'ROI') {
            const getVal = (s: string | undefined) => {
                if (!s) return 0;
                const num = parseInt(s.replace(/\D/g, '')) || 0;
                return s.includes('$') ? num * 1000 : num;
            };
            return getVal(b.public_view?.roi_estimate) - getVal(a.public_view?.roi_estimate);
        }
        return 0;
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
                    Please login to access your saved strategic roadmap.
                </p>
                {/* Rely on App.tsx modal for login now, or inline button triggers parent modality?
                    Actually App.tsx gates it mostly. If we end up here (e.g. direct link or refresh issue), 
                    we show a lock. 
                */}
            </div>
        );
    }

    // Simplified View
    return (
        <div className="container animate-fade-in" style={{ paddingTop: '2rem', position: 'relative' }}>

            {/* Centered Header */}
            <header style={{ textAlign: 'center', marginBottom: '3rem', marginTop: '1rem' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', background: 'hsla(var(--accent-gold)/0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                    <Map size={48} className="text-gold" />
                </div>
                <h2 className="text-accent" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                    My Blueprints
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                    Your curated list of high-impact AI strategies.
                </p>
            </header>

            <div className="roadmap-grid">
                {savedRecipes.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: 'var(--text-muted)', border: '2px dashed var(--border-glass)', borderRadius: '12px' }}>
                        <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Your roadmap is empty.</p>
                        <p>Explore the library to find automations for your business.</p>
                    </div>
                ) : (
                    sortedRecipes.map((opp, idx) => (
                        <RoadmapCard key={idx} opp={opp} onRemove={() => removeRecipe(idx)} isAdmin={isAdmin} />
                    ))
                )}
            </div>
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
