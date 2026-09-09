import { useState, useEffect, useCallback } from 'react';
import type { HarvestProject } from './types/assets';
import { listProjects } from './lib/projectStore';
import { fetchApiBaseFromDb } from './lib/apiClient';
import { getApiKey, setApiKey, fetchApiKeyFromDb } from './lib/gemini';
import { AppShell, type ClarioPhase } from './components/layout/AppShell';
import { AuthGate } from './components/layout/AuthGate';
import { fetchBrandKitFromDb } from './lib/brandKit';
import { ReferenceLibraryPanel } from './components/workbenches/ReferenceLibraryPanel';
import { ScriptAnalysisWorkbench } from './components/workbenches/ScriptAnalysisWorkbench';
import { HomeView } from './components/workbenches/HomeView';

export default function App() {
  const [currentProject, setCurrentProject] = useState<HarvestProject | null>(null);
  const [currentPhase, setCurrentPhase] = useState<ClarioPhase>('reference_library');

  // Shell modals
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);


  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchApiKeyFromDb(),
      fetchApiBaseFromDb(),
      fetchBrandKitFromDb()
    ]).finally(() => {
      setApiKeyInput(getApiKey());
      setSettingsLoaded(true);
    });
  }, []);



  const refreshProjectList = useCallback(async () => {
    try {
      await listProjects();
    } catch (err) {
      console.warn('Failed to list projects:', err);
    }
  }, []);

  useEffect(() => {
    refreshProjectList();
  }, [refreshProjectList]);



  const handleSaveApiKey = () => {
    setApiKey(apiKeyInput);
    setSavedKeySuccess(true);
    setTimeout(() => {
      setSavedKeySuccess(false);
      setShowApiKeyModal(false);
    }, 1000);
  };

  const handleNavigatePhase = (p: ClarioPhase) => {
    setCurrentPhase(p);
    if (p === 'home') setCurrentProject(null);
  };

  if (!settingsLoaded) {
    return <div className="h-screen w-screen flex items-center justify-center bg-background text-muted">Loading settings...</div>;
  }

  return (
    <AuthGate>
      <AppShell
      currentPhase={currentPhase}
      onNavigatePhase={handleNavigatePhase}
      onOpenApiKeyModal={() => setShowApiKeyModal(true)}
      hasApiKey={Boolean(getApiKey())}
    >
      {/* ── Brand Kit Drawer / Modal ───────────────────────────────────────── */}

      {/* ── API Key Modal ──────────────────────────────────────────────────── */}
      {showApiKeyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(17, 19, 24, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
          onClick={() => setShowApiKeyModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 460,
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 14,
              padding: 24,
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: 'var(--font-display)' }}>
                Gemini 2.0 API Configuration
              </h3>
              <button
                onClick={() => setShowApiKeyModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.4 }}>
              Add a Google Gemini API key to unlock advanced multimodal scene deconstruction, optical text separation, and automatic prompt generation.
            </p>
            <input
              type="password"
              placeholder="AIzaSy…"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--base)',
                color: 'var(--text-primary)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                marginBottom: 16,
              }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSaveApiKey}
                className="btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: 12 }}
              >
                {savedKeySuccess ? '✓ Saved Key!' : 'Save Key'}
              </button>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="btn-ghost"
                style={{ padding: '10px 14px', fontSize: 12, border: '1px solid var(--border)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── UNIFIED WORKSPACE ─────────────────────────────────────────────── */}
      {currentPhase === 'reference_library' ? (
        <>
          {/* Script Analysis Workbench is shown when a project is active */}
          {currentProject ? (
            <ScriptAnalysisWorkbench
              userId={currentProject.id || 'local'}
              serverBase="/api/v1"
              geminiApiKey={getApiKey() || undefined}
            />
          ) : (
            <ReferenceLibraryPanel
              userId="local"
              serverBase="/api/v1"
              geminiApiKey={getApiKey() || undefined}
            />
          )}
        </>
      ) : (
        <HomeView
          onSelectProject={(p) => {
            setCurrentProject(p as any);
            setCurrentPhase('reference_library');
          }}
        />
      )}
    </AppShell>
    </AuthGate>
  );
}
