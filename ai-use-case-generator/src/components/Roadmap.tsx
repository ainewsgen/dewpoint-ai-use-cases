// ... imports
import { useState, useEffect } from 'react';
import { Opportunity } from '../lib/engine';
import { Map, Lock, BookOpen, Download, FileText, ArrowRight } from 'lucide-react';
import { RoadmapCard } from './RoadmapCard';



interface RoadmapProps {
    isAdmin: boolean;
    user?: any;
    leads?: any[];
    onSignup?: () => void;
}

type SortOption = 'ROI' | 'DEPARTMENT' | 'NEWEST';

export function Roadmap({ isAdmin, user, leads: _leads = [], onSignup }: RoadmapProps) {
    const [savedRecipes, setSavedRecipes] = useState<Opportunity[]>([]);
    const [documents, setDocuments] = useState<any[]>([]);
    const [isLocked, setIsLocked] = useState(true);
    const [isLoadingDocs, setIsLoadingDocs] = useState(false);
    const [sortBy] = useState<SortOption>('ROI');

    useEffect(() => {
        const fetchRoadmap = async () => {
            // Always load local immediately for best UX
            const localSavedStr = localStorage.getItem('dpg_roadmap');
            let localData: Opportunity[] = localSavedStr ? JSON.parse(localSavedStr) : [];
            setSavedRecipes(localData);

            if (user?.email) {
                // Logged in: Unlock and sync
                setIsLocked(false);
                try {
                    const token = localStorage.getItem('dpg_auth_token');
                    const res = await fetch('/api/roadmap', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (res.ok) {
                        const data = await res.json();
                        // Backend returns 'roadmap' array of Leads. Each Lead has 'recipes'.
                        // We need to extract all recipes from all leads.
                        const serverRecipes = data.roadmap.flatMap((l: any) => l.recipes || []);

                        // Merge Strategy: Union by Title
                        const merged = [...localData];
                        serverRecipes.forEach((srv: Opportunity) => {
                            if (!merged.find(m => m.title === srv.title)) {
                                merged.push(srv);
                            }
                        });

                        // Update UI with combined list
                        setSavedRecipes(merged);
                    }
                    fetchPublishedDocs();
                } catch (error) {
                    console.error("Failed to sync roadmap from server", error);
                }
            } else {
                // Anonymous: Unlock logic
                // Unlock IF they have local items, OR if we want to show empty state (unlocked but empty)
                // Let's unlock always, so they can see the "Empty" state which nudges them to Library.
                setIsLocked(false);
            }
        };

        const fetchPublishedDocs = async () => {
            setIsLoadingDocs(true);
            try {
                const token = localStorage.getItem('dpg_auth_token');
                const res = await fetch('/api/documents', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setDocuments(data.documents);
                }
            } catch (error) {
                console.error("Failed to fetch documents", error);
            } finally {
                setIsLoadingDocs(false);
            }
        };

        fetchRoadmap();
    }, [user]);



    const removeRecipe = async (index: number) => {
        if (!confirm("Are you sure you want to remove this blueprint?")) return;

        // 1. Optimistic UI Update
        const updated = [...savedRecipes];
        updated.splice(index, 1);
        setSavedRecipes(updated);

        // 2. Sync Local Storage (Critical for Library Checkmarks)
        localStorage.setItem('dpg_roadmap', JSON.stringify(updated));
        window.dispatchEvent(new Event('roadmap-updated'));

        // 3. Sync Backend
        if (user?.email) {
            try {
                const token = localStorage.getItem('dpg_auth_token');
                await fetch(`/api/leads/sync`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        email: user.email,
                        recipes: updated
                    })
                });
            } catch (err) {
                console.error("Failed to sync deletion to server", err);
                // Ideally revert UI here if strict, but for MVP keep it deleted locally
            }
        }
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

    const handleExportPDF = () => {
        window.print();
    };

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

                <div style={{ marginTop: '2rem' }} data-no-print="true">
                    <button
                        onClick={handleExportPDF}
                        disabled={savedRecipes.length === 0}
                        className="btn-primary"
                        style={{ background: 'hsl(var(--accent-primary))', gap: '0.75rem', opacity: savedRecipes.length === 0 ? 0.5 : 1 }}
                    >
                        <Download size={18} /> Export Strategy Roadmap (PDF)
                    </button>
                </div>

                {/* Anonymous Signup Nudge */}
                {!user?.email && savedRecipes.length > 0 && (
                    <div className="signup-nudger" style={{
                        marginTop: '1.5rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '1rem',
                        maxWidth: '600px',
                        textAlign: 'left'
                    }} data-no-print="true">
                        <div style={{ flex: 1 }}>
                            <strong style={{ display: 'block', color: 'hsl(var(--accent-gold))', marginBottom: '0.25rem' }}>
                                Temporary Roadmap
                            </strong>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                These blueprints are only saved on this device. Create a free account to sync them to the cloud.
                            </p>
                        </div>
                        {/* 
                           Ideally, we trigger the signup modal here. 
                           Since we don't have the `setAuthModal` prop drilled down here yet, 
                           we might need to rely on a global event or just refresh to trigger it via App logic?
                           BUT, for now, let's just make it a visual notice. The actual button functionality 
                           would require prop drilling `onSignup` from App.tsx.
                           Given current constraints, maybe just a text notice is enough for MVP, 
                           or we reload to force auth check (bad UX).
                           
                           Better: Trigger a custom event that App.tsx listens to, or just tell them "Sign Up Button in Top Right".
                        */}
                    </div>
                )}
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

            {/* Resources & Guides Section */}
            <div className="strategic-resources" style={{ marginTop: '5rem', borderTop: '1px solid var(--border-glass)', paddingTop: '4rem' }} data-no-print="true">
                <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', padding: '0.75rem', background: 'hsla(var(--accent-primary)/0.1)', borderRadius: '12px', marginBottom: '1rem' }}>
                        <BookOpen size={32} className="text-accent" />
                    </div>
                    <h3 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Strategic Resources</h3>
                    <p style={{ color: 'var(--text-muted)' }}>Implementation guides and expert reports curated for your journey.</p>
                </div>

                {!user?.email ? (
                    /* Locked State for Anonymous Users */
                    <div className="glass-panel" style={{
                        padding: '3rem',
                        textAlign: 'center',
                        background: 'linear-gradient(135deg, hsla(var(--bg-card)/0.4) 0%, hsla(var(--bg-card)/0.1) 100%)',
                        border: '1px dashed var(--border-glass)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{ padding: '1rem', background: 'hsla(var(--accent-gold)/0.1)', borderRadius: '50%' }}>
                            <Lock size={32} className="text-gold" />
                        </div>
                        <h4 style={{ fontSize: '1.2rem' }}>Implementation Guides Locked</h4>
                        <p style={{ color: 'var(--text-muted)', maxWidth: '450px', fontSize: '0.9rem' }}>
                            Sign up to unlock step-by-step deployment manuals and ROI reports for your selected AI blueprints.
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'hsl(var(--accent-gold))', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Login to Access
                        </p>
                        {onSignup && (
                            <button
                                onClick={onSignup}
                                className="btn-primary"
                                style={{ marginTop: '0.5rem', padding: '0.6rem 1.5rem' }}
                            >
                                Get Started for Free
                            </button>
                        )}
                    </div>
                ) : (
                    /* Logged In View */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {isLoadingDocs ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                <div className="animate-pulse">Loading expert resources...</div>
                            </div>
                        ) : documents.length === 0 ? (
                            /* Empty State for Logged In User */
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-glass)', borderRadius: '12px' }}>
                                <p style={{ color: 'var(--text-muted)' }}>No resources available yet. Check back soon for guides tailored to your roadmap.</p>
                            </div>
                        ) : (
                            documents.map((doc) => (
                                <div key={doc.id} className="glass-panel" style={{
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    transition: 'transform 0.2s',
                                    cursor: 'default'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{
                                            padding: '0.5rem',
                                            background: 'hsla(var(--accent-primary)/0.1)',
                                            borderRadius: '8px',
                                            color: 'hsl(var(--accent-primary))'
                                        }}>
                                            <FileText size={20} />
                                        </div>
                                        <span style={{
                                            fontSize: '0.7rem',
                                            padding: '0.25rem 0.5rem',
                                            background: 'hsla(var(--bg-card)/0.8)',
                                            borderRadius: '4px',
                                            color: 'var(--text-muted)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}>
                                            {doc.type}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{doc.name}</h4>
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                            {doc.description && doc.description.trim() !== ''
                                                ? doc.description
                                                : (doc.type === 'Implementation Guide'
                                                    ? 'Step-by-step instructions to deploy these AI blueprints in your workflow.'
                                                    : 'Deeper market context and ROI analysis for your specific industry use cases.')}
                                        </p>
                                    </div>
                                    <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                                        <button
                                            onClick={async () => {
                                                // Track analytics
                                                try {
                                                    const token = localStorage.getItem('dpg_auth_token');
                                                    fetch(`/api/documents/${doc.id}/download`, {
                                                        method: 'POST',
                                                        headers: { 'Authorization': `Bearer ${token}` }
                                                    });
                                                } catch (e) { console.error("Analytics failed", e); }

                                                // Trigger download
                                                const link = document.createElement('a');
                                                link.href = doc.content;
                                                link.download = doc.fileName || `${doc.name}.pdf`;
                                                link.click();
                                            }}
                                            className="btn-secondary"
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                                        >
                                            <Download size={16} /> Download {doc.type} <ArrowRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Removed RoadmapCard definition - imported from components/RoadmapCard
