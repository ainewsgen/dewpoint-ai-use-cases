import { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { Analysis } from './components/Analysis';
import { Matrix } from './components/Matrix';
import { Library } from './components/Library';
import { Roadmap } from './components/Roadmap';
import { AdminDashboard } from './components/AdminDashboard';
import { CompanyData, Opportunity } from './lib/engine';
import { Shield } from 'lucide-react';

type ViewState = 'DISCOVERY' | 'ANALYSIS' | 'MATRIX' | 'LIBRARY' | 'ROADMAP' | 'ADMIN';

// Simulated database
interface Lead {
    id: string;
    timestamp: string;
    company: CompanyData;
    recipes: Opportunity[];
}

function App() {
    const [view, setView] = useState<ViewState>('DISCOVERY');
    const [data, setData] = useState<CompanyData>({
        url: '', role: '', size: 'Solopreneur', stack: [], painPoint: ''
    });
    const [leads, setLeads] = useState<Lead[]>([]);

    // Lucid React components are used directly now.
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
        // Simulate saving to DB
        const newLead: Lead = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            company: data,
            recipes: recipes
        };
        setLeads(prev => [newLead, ...prev]);
        alert("Blueprint Unlocked! DewPoint Team has been notified.");
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

                    {view !== 'DISCOVERY' && view !== 'ADMIN' && (
                        <button onClick={() => setView('DISCOVERY')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', marginRight: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>New Search</button>
                    )}

                    {view !== 'ADMIN' && (
                        <>
                            <button
                                onClick={() => setView(view === 'LIBRARY' ? 'DISCOVERY' : 'LIBRARY')}
                                style={{ background: view === 'LIBRARY' ? 'hsl(var(--accent-primary))' : 'hsla(var(--bg-card)/0.8)', border: '1px solid var(--border-glass)', color: 'white', padding: '0.4rem 1rem', borderRadius: '50px', cursor: 'pointer', backdropFilter: 'blur(10px)', fontSize: '0.85rem' }}
                            >
                                Library
                            </button>
                            <button
                                onClick={() => setView(view === 'ROADMAP' ? 'DISCOVERY' : 'ROADMAP')}
                                style={{ background: view === 'ROADMAP' ? 'hsl(var(--accent-gold))' : 'hsla(var(--bg-card)/0.8)', border: '1px solid var(--border-glass)', color: view === 'ROADMAP' ? 'hsl(var(--bg-dark))' : 'white', fontWeight: view === 'ROADMAP' ? 'bold' : 'normal', padding: '0.4rem 1rem', borderRadius: '50px', cursor: 'pointer', backdropFilter: 'blur(10px)', fontSize: '0.85rem' }}
                            >
                                My Roadmap
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => setView(view === 'ADMIN' ? 'DISCOVERY' : 'ADMIN')}
                        style={{ background: view === 'ADMIN' ? 'hsl(var(--accent-primary))' : 'transparent', border: 'none', color: view === 'ADMIN' ? 'black' : '#333', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Admin Access"
                    >
                        <Shield size={16} />
                    </button>
                </div>
            </nav>

            {view === 'DISCOVERY' && <Onboarding onComplete={handleOnboardingComplete} />}
            {view === 'ANALYSIS' && <Analysis onComplete={handleAnalysisComplete} />}
            {view === 'MATRIX' && <Matrix companyData={data} onUnlock={handleCaptureLead} />}
            {view === 'LIBRARY' && <Library />}
            {view === 'ROADMAP' && <Roadmap />}
            {view === 'ADMIN' && <AdminDashboard leads={leads} />}
        </div>
    );
}

export default App
