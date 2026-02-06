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
        <div className="animate-fade-in" style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '1rem 1.25rem',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: `1px solid ${currentStyle.color}40`,
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.2)',
            color: '#1a1a1a',
            minWidth: '300px'
        }}>
            <div style={{ color: currentStyle.color }}>
                {currentStyle.icon}
            </div>
            <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>
                {message}
            </div>
            <button
                onClick={onClose}
                style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <X size={16} />
            </button>
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
