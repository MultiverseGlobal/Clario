import { useState, useEffect } from 'react';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { SplashScreen } from './components/SplashScreen';
import type { ConstitutionRule, ContextState, Integration, Portrait, Journey, LibraryItem } from '@william/types';

interface AppState {
  username: string;
  portrait: Portrait;
  journeys: Journey[];
  library: LibraryItem[];
  rules: ConstitutionRule[];
  context: Partial<ContextState>;
  integrations: Integration[];
}

const isProd = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
const METAPHOR_API = isProd ? "https://metaphor-backend.onrender.com/api/v1/mcp" : "http://localhost:8000/api/v1/mcp";
const WILLIAM_CLIENT_ID = 'william';
const WILLIAM_REDIRECT_URI = window.location.origin;

/**
 * Fix 1 + Fix 6: Intercept the OAuth code from Metaphor OS and exchange it
 * for a real Bearer access token. This runs at root level so it works whether
 * William is showing the Onboarding screen or the Dashboard.
 */
async function handleMetaphorCallback(): Promise<boolean> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return false;

  // Clean the URL immediately so user doesn't see the code in the address bar
  window.history.replaceState({}, '', window.location.pathname);

  try {
    const tokenRes = await fetch(`${METAPHOR_API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: WILLIAM_CLIENT_ID,
        redirect_uri: WILLIAM_REDIRECT_URI,
        code,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const detail = await tokenRes.text();
      console.error('[William] Metaphor token exchange failed:', detail);
      return false;
    }

    const { access_token } = await tokenRes.json();
    if (!access_token) {
      console.error('[William] Metaphor response contained no access_token.');
      return false;
    }

    // Persist the real Bearer token — not the raw auth code
    localStorage.setItem('metaphor_access_token', access_token);
    console.info('[William] Metaphor OS connected. Token stored.');
    return true;
  } catch (err) {
    console.error('[William] Failed to exchange Metaphor auth code:', err);
    return false;
  }
}

function App() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  useEffect(() => {
    const init = async () => {
      // Fix 1 + Fix 6: Run OAuth callback handler first, before restoring state.
      // This covers both the Onboarding and Dashboard screens.
      await handleMetaphorCallback();

      const savedState = localStorage.getItem('william_workspace_state');
      const savedOnboarded = localStorage.getItem('william_onboarding_complete');

      if (savedOnboarded === 'true' && savedState) {
        try {
          setAppState(JSON.parse(savedState));
          setIsOnboarded(true);
        } catch (e) {
          console.error('Error parsing persisted state', e);
          localStorage.clear();
        }
      }
    };

    init();
  }, []);

  const handleOnboardingComplete = (data: AppState) => {
    localStorage.setItem('william_workspace_state', JSON.stringify(data));
    localStorage.setItem('william_onboarding_complete', 'true');
    setAppState(data);
    setIsOnboarded(true);
  };

  const handleReset = () => {
    localStorage.removeItem('william_workspace_state');
    localStorage.removeItem('william_onboarding_complete');
    setAppState(null);
    setIsOnboarded(false);
  };

  return (
    <>
      {showSplash ? (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      ) : isOnboarded && appState ? (
        <Dashboard initialData={appState} onReset={handleReset} />
      ) : (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}
    </>
  );
}

export default App;
