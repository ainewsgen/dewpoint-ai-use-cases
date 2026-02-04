// ... imports
import { useState, useEffect } from 'react';
import { Opportunity } from '../lib/engine';
import { Map, Lock } from 'lucide-react';
import { RoadmapCard } from './RoadmapCard';



interface RoadmapProps {
    isAdmin: boolean;
    user?: any;
    leads?: any[];
}

type SortOption = 'ROI' | 'DEPARTMENT' | 'NEWEST';

export function Roadmap({ isAdmin, user, leads: _leads = [] }: RoadmapProps) {
    const [savedRecipes, setSavedRecipes] = useState<Opportunity[]>([]);
    const [isLocked, setIsLocked] = useState(true);
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

                {/* Anonymous Signup Nudge */}
                {!user?.email && savedRecipes.length > 0 && (
                    <div style={{
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
                    }}>
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
        </div>
    );
}

// Removed RoadmapCard definition - imported from components/RoadmapCard
