import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
                    <h1>Something went wrong.</h1>
                    <pre style={{ textAlign: 'left', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
                        {this.state.error?.toString()}
                    </pre>
                    <button onClick={() => window.location.href = '/'} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
                        Reload Application
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
