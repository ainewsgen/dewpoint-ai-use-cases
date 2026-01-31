// ... imports
import { useState, useEffect } from 'react';
import { generateOpportunities, CompanyData, Opportunity } from '../lib/engine';
import { BadgeCheck, Frown, Sparkles, Server, ChevronDown, ChevronUp, Plus } from 'lucide-react';


interface MatrixProps {
    companyData: CompanyData;
    onUnlock: (recipes: Opportunity[]) => void;
    isAdmin: boolean;
    onSaveRequest: (recipe: Opportunity) => void;
    user: any;
}

export function Matrix({ companyData, onUnlock, isAdmin, onSaveRequest, user }: MatrixProps) {
    const opportunities = generateOpportunities(companyData);
    const [savedRecipes, setSavedRecipes] = useState<Opportunity[]>([]);

    // Sync from LocalStorage on mount (for visual "checked" state)
    useEffect(() => {
        const saved = localStorage.getItem('dpg_roadmap');
        if (saved) setSavedRecipes(JSON.parse(saved));

        // Listen for storage changes in case App updates it
        const handleStorageChange = () => {
            const saved = localStorage.getItem('dpg_roadmap');
            if (saved) setSavedRecipes(JSON.parse(saved));
        };
        window.addEventListener('storage', handleStorageChange);
        // Custom event for same-tab updates
        window.addEventListener('roadmap-updated', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('roadmap-updated', handleStorageChange);
        };
    }, []);

    const handleToggleSave = (opp: Opportunity) => {
        // Delegate to App
        onSaveRequest(opp);
        // Note: The App will update localStorage, which triggers our listener
        // But for immediate feedback, we can optimistically update IF user is logged in
        if (user) {
            const exists = savedRecipes.find(r => r.title === opp.title);
            if (exists) {
                setSavedRecipes(savedRecipes.filter(r => r.title !== opp.title));
            } else {
                setSavedRecipes([...savedRecipes, opp]);
            }
        }
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

            {/* Modal Logic Removed */}
        </div>
    );
}

function RecipeCard({ opp, isAdmin, isSaved, onToggleSave }: { opp: Opportunity, isAdmin: boolean, isSaved: boolean, onToggleSave: () => void }) {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <div className="glass-panel recipe-card">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'flex-start' }}>
                <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>{opp.department}</span>
                    <h3 style={{ fontSize: '1.25rem', lineHeight: '1.3' }}>{opp.title}</h3>
                </div>
                {/* Save Icon Button */}
                <button
                    onClick={onToggleSave}
                    style={{
                        background: isSaved ? 'hsl(var(--accent-gold))' : 'rgba(0,0,0,0.05)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px', height: '32px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer',
                        color: isSaved ? 'white' : 'var(--text-muted)',
                        transition: 'all 0.2s'
                    }}
                    title={isSaved ? "Saved to Roadmap" : "Add to Roadmap"}
                >
                    {isSaved ? <BadgeCheck size={18} /> : <Plus size={18} />}
                </button>
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
        </div>
    );
}
