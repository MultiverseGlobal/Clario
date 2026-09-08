import { useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = loading
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignUp) {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setMagicSent(true);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) { setError('Enter your email first.'); return; }
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithOtp({ email });
      if (err) throw err;
      setMagicSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Still checking session
  if (session === undefined) {
    return (
      <div style={{
        height: '100vh', width: '100vw',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--base)',
      }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)',
          animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    );
  }

  // Authenticated — render app
  if (session) return <>{children}</>;

  // Magic link sent
  if (magicSent) return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--base)', fontFamily: 'var(--font-body)',
    }}>
      <div style={{ maxWidth: 400, textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>✉️</div>
        <h2 style={{ fontSize: 18, fontFamily: 'var(--font-display)', marginBottom: 8, color: 'var(--text-primary)' }}>
          Check your email
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          We sent a magic link to <strong>{email}</strong>. Click it to sign in.
        </p>
        <button
          onClick={() => setMagicSent(false)}
          style={{ marginTop: 20, background: 'none', border: 'none', color: 'var(--text-muted)',
            fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Use a different method
        </button>
      </div>
    </div>
  );

  // Login / Sign up form
  return (
    <div style={{
      height: '100vh', width: '100vw',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--base)', fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '36px 32px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        margin: '0 16px',
      }}>
        {/* Logo / wordmark */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            color: 'var(--text-primary)',
          }}>
            CLARIO
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
            {isSignUp ? 'Create your account' : 'Sign in to your studio'}
          </p>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{
              padding: '10px 14px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--base)', color: 'var(--text-primary)',
              fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none',
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              padding: '10px 14px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--base)', color: 'var(--text-primary)',
              fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none',
            }}
          />

          {error && (
            <p style={{ fontSize: 11, color: '#ef4444', margin: 0 }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ padding: '11px', fontSize: 13, marginTop: 4 }}
          >
            {loading ? '...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>

        <button
          onClick={handleMagicLink}
          disabled={loading}
          className="btn-ghost"
          style={{ width: '100%', padding: '10px', fontSize: 12,
            border: '1px solid var(--border)', borderRadius: 8 }}
        >
          ✉️ Send magic link
        </button>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 20 }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)',
              fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  );
}
