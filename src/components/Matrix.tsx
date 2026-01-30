// ... imports
import { useState, useEffect } from 'react';
import { generateOpportunities, CompanyData, Opportunity } from '../lib/engine';
import { BadgeCheck, Frown, Sparkles, Server, ChevronDown, ChevronUp, Bookmark, Plus } from 'lucide-react';
import { EmailModal } from './EmailModal';

interface MatrixProps {
    companyData: CompanyData;
    onUnlock: (recipes: Opportunity[]) => void;
    isAdmin: boolean;
}

export function Matrix({ companyData, onUnlock, isAdmin }: MatrixProps) {
    const opportunities = generateOpportunities(companyData);
    const [savedRecipes, setSavedRecipes] = useState<Opportunity[]>([]);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [pendingRecipe, setPendingRecipe] = useState<Opportunity | null>(null);

    // Sync from LocalStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('dpg_roadmap');
        if (saved) setSavedRecipes(JSON.parse(saved));
    }, []);

    const updateStorage = (newRecipes: Opportunity[]) => {
        setSavedRecipes(newRecipes);
        localStorage.setItem('dpg_roadmap', JSON.stringify(newRecipes));
        // Also trigger the "Unlock" callback if it's the first time saving something? 
        // Or just let them save.
        if (newRecipes.length > 0) {
            // We could call onUnlock here if we want to simulate the data capture immediately
            onUnlock(newRecipes);
        }
    };

    const handleToggleSave = (opp: Opportunity) => {
        const exists = savedRecipes.find(r => r.title === opp.title);
        if (exists) {
            updateStorage(savedRecipes.filter(r => r.title !== opp.title));
        } else {
            // Check for lead capture
            const email = localStorage.getItem('dpg_user_email');
            if (!email) {
                setPendingRecipe(opp);
                setShowEmailModal(true);
            } else {
                updateStorage([...savedRecipes, opp]);
            }
        }
    };

    const handleEmailSuccess = () => {
        if (pendingRecipe) {
            updateStorage([...savedRecipes, pendingRecipe]);
            setPendingRecipe(null);
        }
        setShowEmailModal(false);
    };

    return (
        <div className="container animate-fade-in" style={{ position: 'relative' }}>
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
                    <RecipeCard
                        key={idx}
                        opp={opp}
                        isAdmin={isAdmin}
                        isSaved={!!savedRecipes.find(r => r.title === opp.title)}
                        onToggleSave={() => handleToggleSave(opp)}
                    />
                ))}
            </div>

            {showEmailModal && (
                <EmailModal onClose={() => setShowEmailModal(false)} onSuccess={handleEmailSuccess} />
            )}
        </div>
    );
}

function RecipeCard({ opp, isAdmin, isSaved, onToggleSave }: { opp: Opportunity, isAdmin: boolean, isSaved: boolean, onToggleSave: () => void }) {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="glass-panel recipe-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className="badge rev" style={{ background: 'hsla(var(--accent-gold)/0.2)', color: 'hsl(var(--accent-primary))', border: '1px solid hsla(var(--accent-gold)/0.4)' }}>{opp.public_view.roi_estimate}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>{opp.department}</span>
                </div>
                <button
                    onClick={onToggleSave}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isSaved ? 'hsl(var(--accent-gold))' : 'var(--text-muted)' }}
                    title={isSaved ? "Saved to Roadmap" : "Save to Roadmap"}
                >
                    <Bookmark size={20} fill={isSaved ? "currentColor" : "none"} />
                </button>
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

            {/* Deep Dive Content (Public + Admin) */}
            {showDetails && (
                <div className="animate-fade-in" style={{ background: 'rgba(0,0,0,0.03)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>

                    {/* Publicly visible "Technical Workflow" (simplified) */}
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: '#555' }}>
                            <strong>⚙️ How it works:</strong>
                        </div>
                        <p style={{ color: 'var(--text-muted)' }}>{opp.admin_view.workflow_steps}</p>
                    </div>

                    {/* New Content Fields */}
                    {opp.public_view.detailed_explanation && (
                        <div style={{ marginBottom: '1rem' }}>
                            <strong>📝 Deep Dive:</strong>
                            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{opp.public_view.detailed_explanation}</p>
                        </div>
                    )}
                    {opp.public_view.example_scenario && (
                        <div style={{ marginBottom: '1rem' }}>
                            <strong>💡 Example:</strong>
                            <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>"{opp.public_view.example_scenario}"</p>
                        </div>
                    )}

                    {/* Admin Only Stack */}
                    {isAdmin && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'salmon' }}>
                                <Server size={14} /> <strong>Admin Stack View</strong>
                            </div>
                            <div className="chips-grid" style={{ gap: '0.25rem' }}>
                                {opp.admin_view.tech_stack.map(t => (
                                    <span key={t} style={{ background: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid var(--border-glass)' }}>{t}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>Value Prop</label>
                <span style={{ fontSize: '0.95rem', fontStyle: 'italic', color: 'hsl(var(--accent-secondary))' }}>"{opp.public_view.value_proposition}"</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowDetails(!showDetails);
                    }}
                    className="btn-secondary"
                    style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', position: 'relative', zIndex: 10 }}
                >
                    {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />} {showDetails ? 'Hide' : 'Blueprint'}
                </button>
                <button
                    onClick={onToggleSave}
                    className="btn-primary"
                    style={{ padding: '0.5rem', fontSize: '0.9rem', background: isSaved ? 'hsl(var(--accent-gold))' : undefined, color: isSaved ? 'hsl(var(--bg-dark))' : undefined, borderColor: isSaved ? 'hsl(var(--accent-gold))' : undefined }}
                >
                    {isSaved ? <BadgeCheck size={16} /> : <Plus size={16} />} {isSaved ? 'On Roadmap' : 'Add to Roadmap'}
                </button>
            </div>
        </div>
    );
}
