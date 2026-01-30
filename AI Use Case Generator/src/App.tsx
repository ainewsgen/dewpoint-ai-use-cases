import { useState, useEffect } from 'react';
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
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [authModal, setAuthModal] = useState<'LOGIN' | 'SIGNUP' | null>(null);

    const [pendingSave, setPendingSave] = useState<Opportunity | null>(null);

    // Persist user effect (simulated for now, real implementation would use AuthProvider better)
    useEffect(() => {
    }, [view]);

    // ... existing handlers ...

    const handleOnboardingComplete = (partialData: Partial<CompanyData>) => {
        setData(prev => ({ ...prev, ...partialData }));
        setView('ANALYSIS');
    };

    const handleAnalysisComplete = () => {
        setView('MATRIX');
    };

    const handleCaptureLead = (recipes: Opportunity[]) => {
        // Collect latest data
        const finalData = {
            ...data,
            email: user?.email,
            name: user?.name || undefined
        };

        // Simulate saving to DB
        const newLead: Lead = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            company: finalData,
            recipes: recipes
        };
        setLeads(prev => [newLead, ...prev]);
        alert("Blueprint unlocked and saved to My Roadmap.");
    };

    const saveToBackend = async (recipe: Opportunity, userContext?: any) => {
        try {
            const currentUser = userContext || user;
            if (!currentUser?.email) return;

            // Use local dev URL or prod URL based on env, hardcoded for now as per context
            // Note: In real prod, use relative path '/api/leads' if served from same origin, or env var.
            // Using relative path for robustness if proxy set up, or absolute if CORS allowed.
            // Let's use relative '/api/leads' assuming Vite proxy or same-origin deployment.
            // If strictly separate, use full URL. The previous code used full URL.
            const API_URL = import.meta.env.PROD
                ? 'https://dewpoint-ai-use-cases.onrender.com/api/leads'
                : 'http://localhost:3000/api/leads';

            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: currentUser.email,
                    recipes: [recipe], // Upsert logic handles merging
                    companyData: data
                })
            });

            if (res.ok) {
                const json = await res.json();
                if (json.lead && json.lead.recipes) {
                    // Sync local storage with authoritative backend state
                    localStorage.setItem('dpg_roadmap', JSON.stringify(json.lead.recipes));
                    window.dispatchEvent(new Event('roadmap-updated'));
                }
            } else {
                console.error("Backend save failed status:", res.status);
            }
        } catch (err) {
            console.error("Failed to sync save to backend", err);
        }
    };

    const handleRequestSave = (recipe: Opportunity) => {
        if (user) {
            // User is logged in. 
            // 1. Optimistic update (Local)
            const current = JSON.parse(localStorage.getItem('dpg_roadmap') || '[]');
            const exists = current.find((r: Opportunity) => r.title === recipe.title);
            if (!exists) {
                const updated = [...current, recipe];
                localStorage.setItem('dpg_roadmap', JSON.stringify(updated));
                window.dispatchEvent(new Event('roadmap-updated')); // Ensure Matrix/Library update
            }

            // 2. Sync to Backend (Fire and forget, or handle error?)
            // We'll fire and forget for UI responsiveness, but log errors.
            saveToBackend(recipe);

            alert("Saved to Roadmap!");
        } else {
            // User NOT logged in
            setPendingSave(recipe);
            setAuthModal('SIGNUP'); // Prompt signup for new users adding content
        }
    };

    const handleLoginSuccess = (loggedInUser: any) => {
        setAuthModal(null);

        // Handle Pending Save
        if (pendingSave) {
            // Sync to backend immediately
            saveToBackend(pendingSave, loggedInUser).then(() => {
                // The saveToBackend updates localStorage with the merged list
                setPendingSave(null);
                // UX Change: Stay on current view so they can keep shopping/saving
                alert("Saved to Roadmap!");
            });
        } else {
            // Standard login: Fetch latest roadmap from backend?
            setView('ROADMAP');
        }
    };

    return (
        <div className="app-shell">
            <nav style={{ position: 'fixed', top: 0, right: 0, left: 0, padding: '1rem', zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
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
                            padding: '0.4rem 1rem',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            backdropFilter: 'blur(10px)',
                            fontSize: '0.85rem',
                            fontWeight: 500
                        }}
                    >
                        Library
                    </button>
                    <button
                        onClick={() => {
                            if (view === 'ROADMAP') {
                                setView('DISCOVERY');
                                return;
                            }
                            // Gating Logic
                            if (!user) {
                                setAuthModal('LOGIN');
                            } else {
                                setView('ROADMAP');
                            }
                        }}
                        style={{
                            background: view === 'ROADMAP' ? 'hsl(var(--accent-gold))' : 'hsla(var(--bg-card)/0.6)',
                            border: '1px solid var(--border-glass)',
                            color: view === 'ROADMAP' ? 'hsl(var(--bg-dark))' : 'hsl(var(--text-main))',
                            fontWeight: 'bold',
                            padding: '0.4rem 1rem',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            backdropFilter: 'blur(10px)',
                            fontSize: '0.85rem'
                        }}
                    >
                        My Roadmap
                    </button>

                    <button
                        onClick={() => {
                            const newMode = !isAdminMode;
                            setIsAdminMode(newMode);
                            if (newMode) setView('ADMIN');
                            else if (view === 'ADMIN') setView('DISCOVERY');
                        }}
                        style={{ background: isAdminMode ? 'hsl(var(--accent-primary))' : 'transparent', border: 'none', color: isAdminMode ? 'white' : '#333', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={isAdminMode ? "Exit Admin Mode" : "Enter Admin Mode"}
                    >
                        <Shield size={16} fill={isAdminMode ? "currentColor" : "none"} />
                    </button>
                </div>
            </nav>

            {view === 'DISCOVERY' && <Onboarding onComplete={handleOnboardingComplete} />}
            {view === 'ANALYSIS' && <Analysis onComplete={handleAnalysisComplete} />}
            {view === 'MATRIX' && (
                <Matrix
                    companyData={data}
                    onUnlock={handleCaptureLead}
                    isAdmin={isAdminMode}
                    onSaveRequest={handleRequestSave}
                    user={user}
                />
            )}
            {view === 'LIBRARY' && (
                <Library
                    isAdmin={isAdminMode}
                    onSaveRequest={handleRequestSave}
                    user={user}
                />
            )}
            {view === 'ROADMAP' && <Roadmap isAdmin={isAdminMode} />}
            {view === 'ADMIN' && <AdminDashboard leads={leads} />}

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
        </div>
    );
}

export default App
