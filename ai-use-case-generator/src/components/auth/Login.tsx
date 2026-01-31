import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Loader2 } from 'lucide-react';

interface LoginProps {
    onClose: () => void;
    onSuccess: (user: any) => void;
    switchToSignup: () => void;
}

export const Login: React.FC<LoginProps> = ({ onClose, onSuccess, switchToSignup }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        // ... (keep existing handleSubmit)
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await login(email, password);
            onSuccess(user);
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content glass-panel" style={{ maxWidth: '400px', width: '90%', padding: '2rem' }}>
                {/* ... (keep close button) */}
                <button
                    onClick={onClose}
                    className="close-button"
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                    <X size={20} />
                </button>

                <h2 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>Welcome Back</h2>

                {error && (
                    <div style={{ background: 'rgba(255, 59, 48, 0.1)', color: '#ff3b30', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Email</label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value.trim())}
                            className="glass-input"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'white', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                            placeholder="you@company.com"
                        // Removed required and type=email to prevent browser validation blocks
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="glass-input"
                                style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '8px', background: 'white', border: '1px solid var(--border-glass)', color: 'var(--text-main)' }}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '0.75rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '0'
                                }}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            background: 'hsl(var(--accent-primary))',
                            color: 'white',
                            border: 'none',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            marginTop: '0.5rem'
                        }}
                    >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Don't have an account?{' '}
                    <button
                        onClick={switchToSignup}
                        style={{ background: 'none', border: 'none', color: 'hsl(var(--accent-primary))', cursor: 'pointer', fontWeight: 500, textDecoration: 'underline' }}
                    >
                        Sign up
                    </button>
                </div>
                <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.7rem', color: '#ccc' }}>v3.11</div>
            </div>
        </div>
    );
};
