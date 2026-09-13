import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Component, type ReactNode, type ErrorInfo } from 'react'
import './index.css'
import App from './App.tsx'

/** Minimal error boundary — catches unhandled React errors and shows a recovery UI. */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Clario] Unhandled React error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          height: '100vh', width: '100vw',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0E1117', color: '#F8F7F4',
          fontFamily: "'Inter', sans-serif", flexDirection: 'column', gap: 16,
          padding: 24, textAlign: 'center',
        }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ fontSize: 13, color: '#999', maxWidth: 400 }}>
            Clario encountered an unexpected error. Your work is saved locally.
          </p>
          <pre style={{
            fontSize: 11, color: '#f87171', background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)', padding: 16, borderRadius: 8,
            maxWidth: 600, overflow: 'auto', maxHeight: '30vh', whiteSpace: 'pre-wrap',
            textAlign: 'left',
          }}>
            {this.state.error.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 600,
              background: '#fff', color: '#0E1117', border: 'none',
              borderRadius: 8, cursor: 'pointer', marginTop: 8,
            }}
          >
            Reload Clario
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
