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
    const [nameInput, setNameInput] = useState('');

    const submitEmail = () => {
        if (!emailInput.includes('@')) return;
        localStorage.setItem('dpg_user_email', emailInput);
        if (nameInput) localStorage.setItem('dpg_user_name', nameInput);
        onSuccess(emailInput); // passing email for legacy comp
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
            <div className="glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center', background: 'white' }}>
                <div style={{ background: 'hsla(var(--accent-gold)/0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Lock size={30} className="text-gold" />
                </div>
                <h3 style={{ marginBottom: '0.5rem', color: 'hsl(var(--bg-dark))' }}>{title || "Save Your Roadmap"}</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>{description || "To persist your strategies and unlock full blueprints, please verify your email."}</p>

                <div className="input-group" style={{ marginBottom: '1rem', textAlign: 'left' }}>
                    <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem', display: 'block' }}>Name</label>
                    <input
                        type="text"
                        placeholder="Your Name"
                        value={nameInput}
                        onChange={e => setNameInput(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                </div>

                <div className="input-group" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
                    <label style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem', display: 'block' }}>Email Address</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="email"
                            placeholder="name@company.com"
                            value={emailInput}
                            onChange={e => setEmailInput(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', paddingRight: '2.5rem', borderRadius: '4px', border: '1px solid #ddd' }}
                            autoFocus
                        />
                        <Mail size={18} className="input-icon" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                    </div>
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
