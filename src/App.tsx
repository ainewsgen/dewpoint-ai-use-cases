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

    useEffect(() => {
    }, [view]);

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

    // ... Inside App component

    // ... existing handlers

    const handleLoginSuccess = () => {
        setAuthModal(null);
        // If they have data, maybe take them to roadmap?
        const saved = localStorage.getItem('dpg_roadmap');
        if (saved && JSON.parse(saved).length > 0) {
            setView('ROADMAP');
        } else {
            // Stay on discovery 
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

                    {/* User Login - Global */}
                    {!user && view !== 'ADMIN' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setAuthModal('LOGIN')}
                                style={{
                                    background: 'transparent',
                                    border: '1px solid var(--border-glass)',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    padding: '0.3rem 0.8rem',
                                    borderRadius: '4px',
                                }}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => setAuthModal('SIGNUP')}
                                style={{
                                    background: 'hsl(var(--accent-primary))',
                                    border: 'none',
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    padding: '0.3rem 0.8rem',
                                    borderRadius: '4px',
                                    fontWeight: 500
                                }}
                            >
                                Sign Up
                            </button>
                        </div>
                    )}

                    {user && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {user.name || user.email}
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
            {view === 'MATRIX' && <Matrix companyData={data} onUnlock={handleCaptureLead} isAdmin={isAdminMode} />}
            {view === 'LIBRARY' && <Library isAdmin={isAdminMode} />}
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
