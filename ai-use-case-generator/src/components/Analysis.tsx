import { useState, useEffect } from 'react';
import { MonitorStop } from 'lucide-react';

interface AnalysisProps {
    onComplete: () => void;
}

export function Analysis({ onComplete }: AnalysisProps) {
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        const steps = [
            "Reading Company URL context...",
            "Identifying core revenue drivers...",
            "Benchmarking against industry standards...",
            "Searching for automation bottlenecks...",
            "Synthesizing Opportunity Matrix...",
            "Analysis complete."
        ];

        let currentStep = 0;
        // Initial log
        setLogs(['> Initializing agents...']);

        const interval = setInterval(() => {
            if (currentStep >= steps.length) {
                clearInterval(interval);
                setTimeout(onComplete, 800);
                return;
            }

            const msg = steps[currentStep];
            if (msg) {
                setLogs(prev => [...prev, `> ${msg}`]);
            }
            currentStep++;
        }, 800);

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div className="center-stage animate-fade-in" style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'hsla(var(--accent-primary)/0.1)', borderRadius: '50%' }}>
                <MonitorStop size={64} className="text-accent" />
            </div>

            <h2 style={{ marginTop: '2rem', fontSize: '2rem' }}>Analyzing Business DNA</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>DewPoint Strategy Core is auditing your digital footprint...</p>

            <div className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto', textAlign: 'left', fontFamily: 'monospace', fontSize: '0.9rem', color: '#a0a0a0', minHeight: '300px' }}>
                {logs.map((log, i) => (
                    <p key={i} className="animate-fade-in" style={{
                        marginBottom: '0.5rem',
                        color: i === logs.length - 1 ? 'hsl(var(--accent-primary))' : '#a0a0a0'
                    }}>
                        {log}
                    </p>
                ))}
            </div>
        </div>
    );
}
