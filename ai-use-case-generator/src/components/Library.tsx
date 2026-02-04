import { useState, useEffect } from 'react';
import { Opportunity } from '../lib/engine';
import { BookOpen, Server, Plus, BadgeCheck, Frown, Sparkles, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';


// Fallback recipes removed. Library is now fully dynamic from the Admin database.

interface LibraryProps {
    isAdmin: boolean;
    onSaveRequest: (recipe: Opportunity) => void;
    user: any;
}

export function Library({ isAdmin, onSaveRequest, user }: LibraryProps) {
    const [filter, setFilter] = useState('All');
    const departments = ['All', 'General', 'Finance', 'Sales', 'Operations', 'Marketing'];

    // Save/Load Logic
    const [savedRecipes, setSavedRecipes] = useState<Opportunity[]>([]);
    const [libRecipes, setLibRecipes] = useState<Opportunity[]>([]);

    useEffect(() => {
        // Fetch from Backend
        const fetchLibrary = async () => {
            try {
                const apiBase = '/api';

                // 1. Fetch Static Library
                const staticRes = await fetch(`${apiBase}/library`);
                let staticCases: any[] = [];
                if (staticRes.ok) {
                    const data = await staticRes.json();
                    staticCases = data.useCases || [];
                }

                // 2. Map Database Use Cases to Opportunity objects
                const formattedStatic: Opportunity[] = staticCases.map(sc => {
                    // Start with the rich data if available
                    const base = sc.data || {};

                    return {
                        ...base,
                        id: sc.id, // Ensure ID is from the library record
                        title: sc.title, // Prefer top-level metadata
                        department: base.department || "General", // Fallback to "General" only if missing
                        industry: sc.industry || base.industry,
                        public_view: {
                            ...(base.public_view || {}),
                            problem: sc.description, // Ensure description matches library view
                            solution_narrative: sc.description,
                            value_proposition: base.public_view?.value_proposition || "Verified Use Case",
                            roi_estimate: sc.roiEstimate || base.public_view?.roi_estimate || "N/A",
                            detailed_explanation: base.public_view?.detailed_explanation || sc.description,
                            example_scenario: base.public_view?.example_scenario || `Industry: ${sc.industry}. Difficulty: ${sc.difficulty}`,
                            walkthrough_steps: base.public_view?.walkthrough_steps || []
                        },
                        admin_view: {
                            ...(base.admin_view || {}),
                            tech_stack: sc.tags || base.admin_view?.tech_stack || [],
                            implementation_difficulty: (sc.difficulty as any) || base.admin_view?.implementation_difficulty,
                            workflow_steps: base.admin_view?.workflow_steps || "Refer to documentation.",
                            upsell_opportunity: base.admin_view?.upsell_opportunity || "Consultation"
                        },
                        generation_metadata: base.generation_metadata || { source: 'System', model: 'Static Library' }
                    };
                });

                setLibRecipes(formattedStatic);
            } catch (err) {
                console.error("Failed to load library", err);
            }
        };
        fetchLibrary();

        // Load saved for toggle status
        const saved = localStorage.getItem('dpg_roadmap');
        if (saved) {
            setSavedRecipes(JSON.parse(saved));
        }

        // Listen for storage changes
        const handleStorageChange = () => {
            const saved = localStorage.getItem('dpg_roadmap');
            if (saved) setSavedRecipes(JSON.parse(saved));
        };
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('roadmap-updated', handleStorageChange); // Custom event
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('roadmap-updated', handleStorageChange);
        };
    }, []);



    const handleToggleSave = (opp: Opportunity) => {
        onSaveRequest(opp);
        // Optimistic / Prop-driven update logic
        if (user) {
            const exists = savedRecipes.find(r => r.title === opp.title);
            if (exists) {
                setSavedRecipes(savedRecipes.filter(r => r.title !== opp.title));
            } else {
                setSavedRecipes([...savedRecipes, opp]);
            }
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this use case? This cannot be undone.")) return;
        try {
            const token = localStorage.getItem('dpg_auth_token');
            const res = await fetch(`/api/admin/library/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                setLibRecipes(prev => prev.filter(r => r.id !== id));
            } else {
                alert("Failed to delete use case. Check console for details.");
            }
        } catch (err) {
            console.error("Failed to delete use case", err);
            alert("Error deleting use case.");
        }
    };

    const filteredRecipes = filter === 'All'
        ? libRecipes
        : libRecipes.filter(r => r.department === filter);

    return (
        <div className="container animate-fade-in" style={{ paddingTop: '2rem' }}>
            <header className="library-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', padding: '1rem', background: 'hsla(var(--accent-primary)/0.1)', borderRadius: '50%', marginBottom: '1rem' }}>
                    <BookOpen size={48} className="text-accent" />
                </div>
                <h2 className="text-accent" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Free Library of Use Cases</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem' }}>Browse our archive of proven automation recipes.</p>
            </header>

            <div className="filter-bar" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
                {departments.map(dept => (
                    <button
                        key={dept}
                        onClick={() => setFilter(dept)}
                        style={{
                            padding: '0.5rem 1.5rem',
                            background: filter === dept ? 'hsl(var(--accent-primary))' : 'transparent',
                            color: filter === dept ? 'white' : 'var(--text-muted)',
                            border: `1px solid ${filter === dept ? 'hsl(var(--accent-primary))' : 'var(--border-glass)'}`,
                            borderRadius: '50px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            transition: 'all 0.2s'
                        }}
                    >
                        {dept}
                    </button>
                ))}
            </div>

            <div className="matrix-grid">
                {filteredRecipes.map((opp, idx) => (
                    <LibraryCard
                        key={idx}
                        opp={opp}
                        isAdmin={isAdmin}
                        isSaved={savedRecipes.some(r => r.title === opp.title)}
                        onToggle={() => handleToggleSave(opp)}
                        onDelete={opp.id ? () => handleDelete(opp.id!) : undefined}
                    />
                ))}
            </div>
        </div>
    );
}

function LibraryCard({ opp, isAdmin, isSaved, onToggle, onDelete }: { opp: Opportunity, isAdmin: boolean, isSaved: boolean, onToggle: () => void, onDelete?: () => void }) {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="glass-panel recipe-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        <span className={`badge ${opp.public_view.roi_estimate.includes('$') ? 'cost' : 'eff'}`} style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem' }}>
                            {opp.department || 'General'}
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ opacity: 0.3 }}>|</span>
                            {opp.industry || 'General'}
                        </span>
                    </div>
                    <h3 style={{ fontSize: '1.25rem', lineHeight: '1.3' }}>{opp.title}</h3>
                </div>
                {/* Save Icon Button */}
                <button
                    onClick={onToggle}
                    style={{
                        background: isSaved ? 'hsl(var(--accent-gold))' : 'rgba(0,0,0,0.05)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        color: isSaved ? 'white' : 'var(--text-muted)',
                        transition: 'all 0.2s',
                        marginLeft: '0.5rem'
                    }}
                    title={isSaved ? "Saved to Roadmap" : "Add to Roadmap"}
                >
                    {isSaved ? <BadgeCheck size={18} /> : <Plus size={18} />}
                </button>

                {/* Admin Delete Button */}
                {isAdmin && onDelete && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        style={{
                            background: 'rgba(255, 99, 71, 0.1)',
                            border: '1px solid rgba(255, 99, 71, 0.2)',
                            borderRadius: '50%',
                            width: '32px', height: '32px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'tomato',
                            transition: 'all 0.2s',
                            marginLeft: '0.5rem'
                        }}
                        title="Delete Use Case"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span className="badge rev" style={{ background: 'hsla(var(--accent-gold)/0.1)', color: 'hsl(var(--accent-primary))', border: '1px solid hsla(var(--accent-gold)/0.2)', fontSize: '0.8rem' }}>
                    💰 {opp.public_view.roi_estimate}
                </span>
            </div>

            <div style={{ marginBottom: '1.5rem', minHeight: '80px' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <Frown size={14} style={{ color: 'salmon', marginTop: '3px', minWidth: '14px' }} />
                    {opp.public_view.problem}
                </p>
                <p style={{ fontSize: '0.9rem', display: 'flex', gap: '0.5rem' }}>
                    <Sparkles size={14} className="text-gold" style={{ marginTop: '3px', minWidth: '14px' }} />
                    {opp.public_view.solution_narrative}
                </p>
            </div>

            {/* Deep Dive Content (Public + Admin) */}
            {showDetails && (
                <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.02)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid var(--border-glass)' }}>

                    {/* Publicly visible "Technical Workflow" (simplified) */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'hsl(var(--accent-primary))' }}>
                            <strong>⚙️ How it works</strong>
                        </div>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>{opp.admin_view.workflow_steps}</p>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'hsl(var(--accent-primary))' }}>
                            <strong>📝 Deep Dive</strong>
                        </div>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>{opp.public_view.detailed_explanation}</p>
                    </div>

                    {/* Admin Only Stack */}
                    {isAdmin && (
                        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                                <Server size={14} style={{ color: 'salmon' }} /> <strong style={{ color: 'salmon' }}>Admin Stack View</strong>
                            </div>
                            <div className="chips-grid" style={{ gap: '0.25rem' }}>
                                {(Array.isArray(opp.admin_view?.tech_stack) ? opp.admin_view.tech_stack : []).map((t: string) => (
                                    <span key={t} style={{ background: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid var(--border-glass)' }}>{t}</span>
                                ))}
                            </div>

                            {/* Generation Source Indicator */}
                            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', borderTop: '1px dashed var(--border-glass)', paddingTop: '0.5rem' }}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span>Source: <strong>{opp.generation_metadata?.source || 'System'}</strong></span>
                                    {opp.generation_metadata?.source === 'System' && opp.generation_metadata?.fallback_reason && (
                                        <span style={{ color: 'salmon', fontSize: '0.7rem' }}>⚠️ {opp.generation_metadata.fallback_reason}</span>
                                    )}
                                </div>
                                {opp.generation_metadata?.model && (
                                    <span>Model: <strong>{opp.generation_metadata.model}</strong></span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 'auto' }}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowDetails(!showDetails);
                    }}
                    className="btn-primary"
                    style={{
                        width: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        padding: '0.75rem', fontSize: '1rem',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    {showDetails ? 'Hide Blueprint' : 'View Blueprint'} {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
            </div>
        </div >
    );
}
