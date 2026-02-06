import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
}

export function Toast({ message, type = 'success', onClose, duration = 3000 }: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const styles: Record<ToastType, { bg: string; icon: React.ReactNode; color: string }> = {
        success: {
            bg: 'hsla(142, 70%, 45%, 0.1)',
            color: 'hsl(142, 70%, 45%)',
            icon: <CheckCircle size={18} />
        },
        error: {
            bg: 'hsla(0, 84%, 60%, 0.1)',
            color: 'hsl(0, 84%, 60%)',
            icon: <XCircle size={18} />
        },
        info: {
            bg: 'hsla(217, 91%, 60%, 0.1)',
            color: 'hsl(217, 91%, 60%)',
            icon: <AlertCircle size={18} />
        }
    };

    const currentStyle = styles[type];

    return (
        <div style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            border: `1px solid ${currentStyle.bg.replace('0.1', '0.2')}`,
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)',
            minWidth: '320px',
            overflow: 'hidden',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'start',
                gap: '0.75rem',
                padding: '1rem 1.25rem',
            }}>
                <div style={{ color: currentStyle.color, marginTop: '2px' }}>
                    {currentStyle.icon}
                </div>
                <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'hsl(var(--text-main))' }}>
                        {type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Note'}
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {message}
                    </p>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent', border: 'none', padding: '0',
                        cursor: 'pointer', color: 'var(--text-muted)', opacity: 0.6
                    }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress Bar */}
            <div style={{ width: '100%', height: '3px', background: 'rgba(0,0,0,0.05)' }}>
                <div style={{
                    height: '100%',
                    width: '100%',
                    background: currentStyle.color,
                    animation: `shrink ${duration}ms linear forwards`
                }} />
            </div>
            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                }
            `}</style>
        </div>
    );
}

// Simple Toast Manager Hook
export function useToast() {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const showToast = (message: string, type: ToastType = 'success') => {
        setToast({ message, type });
    };

    const hideToast = () => {
        setToast(null);
    };

    return { toast, showToast, hideToast };
}
