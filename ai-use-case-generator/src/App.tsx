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
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';


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
        console.log("DewPoint App v2.1 Loaded - Auth Tabs Removed");
    }, []);

    // Handlers
    const handleOnboardingComplete = (data: Partial<CompanyData>) => {
        setData(prev => ({ ...prev, ...data }));
        setView('ANALYSIS');
    };

    const handleAnalysisComplete = (opportunities: Opportunity[]) => {
        setLeads([{
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            company: data,
            recipes: opportunities
        }]);
        setView('MATRIX');
    };

    const handleCaptureLead = (lead: any) => {
        // Logic to unlock functionality
        console.log("Lead captured", lead);
    };

    const saveToBackend = async (recipe: Opportunity, userContext?: any) => {
        try {
            const currentUser = userContext || user;
            if (!currentUser?.email) return;

            const token = localStorage.getItem('dpg_auth_token');
            const response = await fetch(`${import.meta.env.PROD ? 'https://dewpoint-ai-use-cases.onrender.com' : 'http://localhost:3000'}/api/leads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: currentUser.email,
                    name: currentUser.name,
                    recipes: [recipe] // Upsert logic on backend handles merging
                })
            });

            if (!response.ok) throw new Error('Failed to sync save');

        } catch (err) {
            console.error("Failed to sync save to backend", err);
        }
    };

    const handleRequestSave = (recipe: Opportunity) => {
        if (user) {
            // Optimistic Update?
            // Actually, we should just save to backend
            saveToBackend(recipe).then(() => {
                alert("Saved to Roadmap!");
            });
        } else {
            setPendingSave(recipe);
            setAuthModal('LOGIN');
        }
    };

    const handleLoginSuccess = (loggedInUser: any) => {
        setAuthModal(null);
        if (pendingSave) {
            saveToBackend(pendingSave, loggedInUser).then(() => {
                setPendingSave(null);
                alert("Saved to Roadmap!");
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
                        {/* My Roadmap Button - Conditional Style based on view */}
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

                        {/* Admin Toggle Removed */}
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
                {/* Note: Passing user and leads to Roadmap to handle Admin integration */}

                {/* view === 'ADMIN' block removed as it's merged into Roadmap */}

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

                <Footer />
            </div>
        </ErrorBoundary>
    );
}

export default App
