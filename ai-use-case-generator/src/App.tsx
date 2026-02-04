import { useState, useEffect, useCallback } from 'react';
import { Onboarding } from './components/Onboarding';
import { Analysis } from './components/Analysis';
import { Matrix } from './components/Matrix';
import { Library } from './components/Library';
import { Roadmap } from './components/Roadmap';
import { AdminDashboard } from './components/AdminDashboard';
import { CompanyData, Opportunity } from './lib/engine';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { useAuth } from './context/AuthContext';
import { Shield, LogOut, User } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';


import { TrackingService } from './lib/tracking';

type ViewState = 'DISCOVERY' | 'ANALYSIS' | 'MATRIX' | 'LIBRARY' | 'ROADMAP' | 'ADMIN';

// Simulated database
interface Lead {
    id: string;
    timestamp: string;
    company: CompanyData;
    recipes: Opportunity[];
}

function App() {
    const { user, logout } = useAuth();
    const [view, setView] = useState<ViewState>('DISCOVERY');
    const [data, setData] = useState<CompanyData>({
        url: '', role: '', size: 'Solopreneur', stack: [], painPoint: ''
    });
    const [leads, setLeads] = useState<Lead[]>([]);
    // const [isAdminMode, setIsAdminMode] = useState(false); // Removed manual toggle
    const isAdminMode = user?.role === 'admin'; // Derived from auth
    const [authModal, setAuthModal] = useState<'LOGIN' | 'SIGNUP' | null>(null);

    const [pendingSave, setPendingSave] = useState<Opportunity | null>(null);

    // ... (keep useEffect) ...
    useEffect(() => {
        console.log("DewPoint App v3.15 Loaded - API Check Pending");

        // Initialize Shadow Tracking
        const shadowId = TrackingService.getShadowId();
        console.log("Shadow ID Active:", shadowId);
    }, []);

    // Handlers
    const handleOnboardingComplete = async (data: Partial<CompanyData>) => {
        const updatedData = { ...data };
        setData(prev => ({ ...prev, ...updatedData }));

        // Always save to localStorage for persistence (anonymous or logged in)
        localStorage.setItem('dpg_onboarding_data', JSON.stringify(updatedData));

        // Save company data to backend if user is logged in
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
                        companyData: updatedData,
                        recipes: [] // Empty recipes initially, will be added after generation
                    })
                });
            } catch (error) {
                console.error('Failed to save company data:', error);
            }
        }

        setView('ANALYSIS');
    };

    const handleAnalysisComplete = () => {
        // Transition to Matrix view
        // Logic for capturing leads moved to Matrix component on load
        setView('MATRIX');
    };

    const handleMatrixLoaded = useCallback(async (opportunities: Opportunity[]) => {
        // Shadow Lead Capture: Automatically save upon generation
        console.log("Matrix Loaded - Triggering Shadow Capture", opportunities.length);
        try {
            const shadowHeaders = TrackingService.getHeaders();
            await fetch(`/api/leads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...shadowHeaders
                },
                body: JSON.stringify({
                    recipes: opportunities,
                    companyData: data
                })
            });
            console.log("Shadow Lead Captured Successfully");

            // AUTO-ARCHIVE: Save all generated recipes to Library as unpublished
            const token = localStorage.getItem('dpg_auth_token');
            for (const opp of opportunities) {
                try {
                    await fetch(`/api/admin/library`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            industry: opp.industry || data.industry || 'General',
                            title: opp.title,
                            description: opp.public_view.solution_narrative,
                            roiEstimate: opp.public_view.roi_estimate,
                            difficulty: opp.admin_view.implementation_difficulty,
                            tags: opp.admin_view.tech_stack,
                            data: opp,
                            isPublished: false
                        })
                    });
                } catch (libErr) {
                    console.error("Failed to auto-archive recipe", libErr);
                }
            }

            // Update local session history
            setLeads(prev => [{
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                company: data,
                recipes: opportunities
            }, ...prev]);

        } catch (err) {
            console.error("Failed to capture shadow lead", err);
        }
    }, [data]);

    const handleCaptureLead = (lead: any) => {
        // Logic to unlock functionality
        console.log("Lead captured", lead);
    };

    const saveToBackend = async (recipe: Opportunity, userContext?: any) => {
        try {
            const currentUser = userContext || user;

            // 1. Local Storage Management (Primary Toggle Source)
            const localSaved = localStorage.getItem('dpg_roadmap');
            let currentLocal: Opportunity[] = localSaved ? JSON.parse(localSaved) : [];
            let action: 'ADDED' | 'REMOVED' = 'ADDED';

            if (currentLocal.find(r => r.title === recipe.title)) {
                // Exists -> Remove it
                currentLocal = currentLocal.filter(r => r.title !== recipe.title);
                action = 'REMOVED';
            } else {
                // New -> Add it
                currentLocal.push(recipe);
                action = 'ADDED';
            }

            // Sync Local
            localStorage.setItem('dpg_roadmap', JSON.stringify(currentLocal));
            window.dispatchEvent(new Event('roadmap-updated')); // Notify Library, Roadmap

            // Return action early if no user to sync with, so UI can still feedback
            if (!currentUser?.email) return action;

            const token = localStorage.getItem('dpg_auth_token');
            // USE PUT /leads/sync to ensure exact state match (replacing list, not merging)
            const response = await fetch(`${import.meta.env.PROD ? '' : 'http://localhost:3000'}/api/leads/sync`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: currentUser.email,
                    recipes: currentLocal // Full Sync matches local state exactly
                })
            });

            if (!response.ok) throw new Error('Failed to sync save');
            return action;

        } catch (err) {
            console.error("Failed to sync save to backend", err);
            return 'ERROR';
        }
    };

    const handleRequestSave = (recipe: Opportunity) => {
        // Always save locally first (handled by saveToBackend logic for localStorage)
        saveToBackend(recipe).then((action) => {
            // Feedback
            if (action === 'ADDED') alert(user ? "Added to Roadmap!" : "Added to temporary Roadmap. Sign up to save permanently.");
            if (action === 'REMOVED') alert("Removed from Roadmap.");
        });

        // Prompt for signup if anonymous to ensure data persistence
        if (!user) {
            setPendingSave(recipe);
            setAuthModal('SIGNUP');
        }
    };

    const handleLoginSuccess = async (loggedInUser: any) => {
        setAuthModal(null);

        // Retrieve onboarding data from localStorage
        const storedOnboardingData = localStorage.getItem('dpg_onboarding_data');
        const onboardingData = storedOnboardingData ? JSON.parse(storedOnboardingData) : null;

        // Save onboarding data to backend if it exists
        if (onboardingData && loggedInUser?.email) {
            try {
                const token = localStorage.getItem('dpg_auth_token');
                await fetch(`/api/leads/sync`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        email: loggedInUser.email,
                        companyData: onboardingData,
                        recipes: [] // Will be updated when user saves cards
                    })
                });
                // Clear onboarding data from localStorage after successful save
                localStorage.removeItem('dpg_onboarding_data');
            } catch (error) {
                console.error('Failed to save onboarding data:', error);
            }
        }

        // Handle pending save (if user was trying to save a card)
        if (pendingSave) {
            saveToBackend(pendingSave, loggedInUser).then((action) => {
                setPendingSave(null);
                if (action === 'ADDED') alert("Added to Roadmap!");
                if (action === 'REMOVED') alert("Removed from Roadmap!");
            });
        }
    };

    return (
        <ErrorBoundary>
            <div className="app-shell">
                <nav style={{ position: 'fixed', top: 0, right: 0, left: 0, padding: '1rem', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
                    {/* ... (rest of nav remains the same, assuming valid) */}
                    {/* To avoid huge replace block, I'm wrapping the whole div. The content inside is unchanged. */}
                    {/* Brand - visible on larger screens */}
                    <div style={{ pointerEvents: 'auto', paddingLeft: '1rem' }}>
                        <div className="logo-pill" style={{ padding: '0.25rem 0.5rem' }}>
                            <img src="/logo-icon.png" alt="DPG" style={{ height: '32px' }} />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', pointerEvents: 'auto' }}>

                        {/* User Login - Global HIDDEN per requirements. Only show if user is logged in (Profile) */}

                        {user && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    <User size={14} style={{ marginRight: '4px' }} />
                                    {user.name || user.email.split('@')[0]}
                                </div>
                                <button
                                    onClick={() => logout()}
                                    title="Logout"
                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                                >
                                    <LogOut size={16} />
                                </button>
                            </div>
                        )}

                        {view !== 'DISCOVERY' && view !== 'ADMIN' && (
                            <button onClick={() => setView('DISCOVERY')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', marginRight: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>New Search</button>
                        )}

                        {/* Global Navigation - Always Visible */}
                        <button
                            onClick={() => setView(view === 'LIBRARY' ? 'DISCOVERY' : 'LIBRARY')}
                            style={{
                                background: view === 'LIBRARY' ? 'hsl(var(--accent-primary))' : 'hsla(var(--bg-card)/0.6)',
                                border: '1px solid var(--border-glass)',
                                color: view === 'LIBRARY' ? 'white' : 'hsl(var(--text-main))',
                                padding: '0.4rem 0.8rem', /* Slightly reduced padding */
                                borderRadius: '50px',
                                cursor: 'pointer',
                                backdropFilter: 'blur(10px)',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Free Library of Use Cases
                        </button>
                        {/* My Roadmap Button - Conditional Style based on view */}
                        <button
                            onClick={() => {
                                if (view === 'ROADMAP') {
                                    setView('DISCOVERY');
                                    return;
                                }
                                // Allow anonymous access but nudge for login
                                setView('ROADMAP');
                                if (!user) {
                                    setAuthModal('SIGNUP');
                                }
                            }}
                            style={{
                                background: view === 'ROADMAP' ? 'hsl(var(--accent-gold))' : 'hsla(var(--bg-card)/0.6)',
                                border: '1px solid var(--border-glass)',
                                color: view === 'ROADMAP' ? 'hsl(var(--bg-dark))' : 'hsl(var(--text-main))',
                                fontWeight: 'bold',
                                padding: '0.4rem 0.8rem',
                                borderRadius: '50px',
                                cursor: 'pointer',
                                backdropFilter: 'blur(10px)',
                                fontSize: '0.85rem',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Roadmap
                        </button>

                        {/* Admin Console - Only for Admins */}
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => setView('ADMIN')}
                                style={{
                                    background: view === 'ADMIN' ? 'hsl(var(--accent-secondary))' : 'hsla(var(--bg-card)/0.6)',
                                    border: '1px solid var(--border-glass)',
                                    color: view === 'ADMIN' ? 'white' : 'hsl(var(--text-main))',
                                    fontWeight: 'bold',
                                    padding: '0.4rem 1rem',
                                    borderRadius: '50px',
                                    cursor: 'pointer',
                                    backdropFilter: 'blur(10px)',
                                    fontSize: '0.85rem'
                                }}
                            >
                                <Shield size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
                                Admin
                            </button>
                        )}
                    </div>
                </nav>

                {view === 'DISCOVERY' && <Onboarding onComplete={handleOnboardingComplete} />}
                {view === 'ANALYSIS' && <Analysis onComplete={handleAnalysisComplete} />}
                {/* ... other views ... */}
                {view === 'MATRIX' && (
                    <Matrix
                        companyData={data}
                        onUnlock={handleCaptureLead}
                        isAdmin={isAdminMode}
                        onSaveRequest={handleRequestSave}
                        user={user}
                        onLoaded={handleMatrixLoaded}
                    />
                )}
                {view === 'LIBRARY' && (
                    <Library
                        isAdmin={isAdminMode}
                        onSaveRequest={handleRequestSave}
                        user={user}
                    />
                )}
                {view === 'ROADMAP' && <Roadmap isAdmin={isAdminMode} user={user} leads={leads} />}

                {/* Admin Dashboard restored as top-level view */}
                {view === 'ADMIN' && <AdminDashboard />}

                {authModal === 'LOGIN' && (
                    <Login
                        onClose={() => setAuthModal(null)}
                        onSuccess={handleLoginSuccess}
                        switchToSignup={() => setAuthModal('SIGNUP')}
                    />
                )}

                {authModal === 'SIGNUP' && (
                    <Signup
                        onClose={() => setAuthModal(null)}
                        onSuccess={handleLoginSuccess}
                        switchToLogin={() => setAuthModal('LOGIN')}
                    />
                )}

                {view !== 'ADMIN' && <Footer />}
            </div>
        </ErrorBoundary>
    );
}

export default App
