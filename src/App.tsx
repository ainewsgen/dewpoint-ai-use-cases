import { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { Analysis } from './components/Analysis';
import { Matrix } from './components/Matrix';
import { CompanyData } from './lib/engine';


type ViewState = 'DISCOVERY' | 'ANALYSIS' | 'MATRIX';

function App() {
    const [view, setView] = useState<ViewState>('DISCOVERY');
    const [data, setData] = useState<CompanyData>({
        url: '', role: '', size: 'Solopreneur', stack: [], painPoint: ''
    });

    // Lucide manual refresh (fallback) - though React components import icons directly now.
    // We can keep this just in case we used <i data-lucide> anywhere, but we migrated to Lucide React components.
    // So this is largely unnecessary but harmless.
    useEffect(() => {
        // nothing needed for Lucide React
    }, [view]);

    const handleOnboardingComplete = (partialData: Partial<CompanyData>) => {
        setData(prev => ({ ...prev, ...partialData }));
        setView('ANALYSIS');
    };

    const handleAnalysisComplete = () => {
        setView('MATRIX');
    };

    return (
        <div className="app-shell">
            {view === 'DISCOVERY' && <Onboarding onComplete={handleOnboardingComplete} />}
            {view === 'ANALYSIS' && <Analysis onComplete={handleAnalysisComplete} />}
            {view === 'MATRIX' && <Matrix companyData={data} />}
        </div>
    );
}

export default App
