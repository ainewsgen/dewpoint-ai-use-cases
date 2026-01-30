import { useState } from 'react';
import { Mail, Lock } from 'lucide-react';

interface EmailModalProps {
    onClose: () => void;
    onSuccess: (email: string) => void;
    title?: string;
    description?: string;
}

export function EmailModal({ onClose, onSuccess, title, description }: EmailModalProps) {
    const [emailInput, setEmailInput] = useState('');

    const submitEmail = () => {
        if (!emailInput.includes('@')) return;
        localStorage.setItem('dpg_user_email', emailInput);
        onSuccess(emailInput);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
            <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center', background: 'white' }}>
                <div style={{ background: 'hsla(var(--accent-gold)/0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Lock size={30} className="text-gold" />
                </div>
                <h3 style={{ marginBottom: '0.5rem', color: 'hsl(var(--bg-dark))' }}>{title || "Save Your Roadmap"}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>{description || "To persist your strategies and unlock full blueprints, please verify your email."}</p>

                <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                    <input
                        type="email"
                        placeholder="name@company.com"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        style={{ width: '100%' }}
                        autoFocus
                    />
                    <Mail size={18} className="input-icon" />
                </div>

                <button onClick={submitEmail} className="btn-primary" style={{ width: '100%' }}>
                    Save & Continue
                </button>
                <button onClick={onClose} style={{ marginTop: '1rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}>
                    Cancel
                </button>
            </div>
        </div>
    );
}
