import React from 'react';

export const Footer: React.FC = () => {
    return (
        <footer style={{
            marginTop: 'auto',
            padding: '1.5rem',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            borderTop: '1px solid var(--border-glass)',
            background: 'rgba(0,0,0,0.2)'
        }}>
            <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: 'hsl(var(--accent-primary))' }}>DewPoint Strategy Core</span>
                <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>|</span>
                <span>v3.12 (Beta)</span>
            </div>
            <div style={{ maxWidth: '600px', margin: '0 auto', opacity: 0.7 }}>
                <p style={{ marginBottom: '0.5rem' }}>
                    Authorized Use Only. This system processes proprietary strategy data.
                    All activities are logged for compliance and security monitoring.
                </p>
                <p>
                    &copy; {new Date().getFullYear()} DewPoint AI. All Rights Reserved.
                </p>
            </div>
        </footer>
    );
};
