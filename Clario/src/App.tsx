import { useState, useEffect, useCallback } from 'react';

import { listProjects, saveProject, uploadBlobToVault, ClarioProject } from './lib/projectStore';
import { fetchApiBaseFromDb } from './lib/apiClient';
import { getApiKey, setApiKey, fetchApiKeyFromDb } from './lib/gemini';
import { AppShell, type ClarioPhase } from './components/layout/AppShell';
import { AuthGate } from './components/layout/AuthGate';
import { fetchBrandKitFromDb } from './lib/brandKit';
import { ReferenceLibraryPanel } from './components/workbenches/ReferenceLibraryPanel';
import { ScriptAnalysisWorkbench } from './components/workbenches/ScriptAnalysisWorkbench';
import { HomeView } from './components/workbenches/HomeView';
import { DeliverableView } from './components/workbenches/DeliverableView';
import { RecordingStudio } from './components/workbenches/RecordingStudio';
import { RecordingPreview } from './components/workbenches/RecordingPreview';

export default function App() {
  const [currentProject, setCurrentProject] = useState<ClarioProject | null>(null);
  const [currentPhase, setCurrentPhase] = useState<ClarioPhase>('home');
  const [latestResult, setLatestResult] = useState<any>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  // Shell modals
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiBaseInput, setApiBaseInput] = useState("");
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);


  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchApiKeyFromDb(),
      fetchApiBaseFromDb(),
      fetchBrandKitFromDb()
    ]).finally(() => {
      setApiKeyInput(getApiKey());
      import('./lib/apiClient').then(m => setApiBaseInput(m.getApiBase()));
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



  const handleSaveApiKey = async () => {
    setApiKey(apiKeyInput);
    const { setApiBase } = await import('./lib/apiClient');
    await setApiBase(apiBaseInput);
    
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
            className="pds-animate-enter"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(17, 19, 24, 0.4)',
              backdropFilter: 'blur(24px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
            onClick={() => setShowApiKeyModal(false)}
          >
            <div
              className="clario-glass-card"
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: 460,
                borderRadius: 14,
                padding: 24,
                boxShadow: 'var(--pds-shadow-float)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 className="font-display" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Configuration Settings
                </h3>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: 'var(--pds-text-muted)' }}
                >
                  ✕
                </button>
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--pds-text-secondary)', marginBottom: 4 }}>
                  Gemini 2.0 API Key
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy…"
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--pds-border-subtle)',
                    background: 'var(--pds-surface-2)',
                    color: 'var(--pds-text-primary)',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--pds-text-secondary)', marginBottom: 4 }}>
                  FastAPI Backend URL
                </label>
                <input
                  type="text"
                  placeholder="http://localhost:8000"
                  value={apiBaseInput}
                  onChange={e => setApiBaseInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--pds-border-subtle)',
                    background: 'var(--pds-surface-2)',
                    color: 'var(--pds-text-primary)',
                    fontSize: 12,
                    fontFamily: 'monospace',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handleSaveApiKey}
                  className="pds-btn-primary"
                  style={{ flex: 1, padding: '10px', fontSize: 12 }}
                >
                  {savedKeySuccess ? '✓ Saved Key!' : 'Save Key'}
                </button>
                <button
                  onClick={() => setShowApiKeyModal(false)}
                  className="pds-btn-ghost"
                  style={{ padding: '10px 14px', fontSize: 12 }}
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
              currentProject={currentProject}
              onUpdateProject={(p) => {
                setCurrentProject(p);
                saveProject(p);
              }}
              userId={currentProject.id || 'local'}
              serverBase="/api/v1"
              geminiApiKey={getApiKey() || undefined}
              onGenerateDeliverable={(result) => {
                setLatestResult(result);
                setCurrentPhase('deliverable');
              }}
            />
          ) : (
            <ReferenceLibraryPanel
              userId="local"
              serverBase="/api/v1"
              geminiApiKey={getApiKey() || undefined}
            />
          )}
        </>
      ) : currentPhase === 'deliverable' ? (
        <DeliverableView 
          projectName={currentProject?.name || 'Untitled Project'} 
          result={latestResult} 
          onBack={() => setCurrentPhase('reference_library')} 
        />
      ) : currentPhase === 'studio' ? (
        <RecordingStudio
          onBack={() => setCurrentPhase('home')}
          onFinish={(blob) => {
            if (blob) {
              setRecordedBlob(blob);
              setCurrentPhase('preview');
            } else {
              setCurrentPhase('home');
            }
          }}
        />
      ) : currentPhase === 'preview' && recordedBlob ? (
        <RecordingPreview
          blob={recordedBlob}
          projectName={currentProject?.name}
          onBack={() => setCurrentPhase('home')}
          onReRecord={() => {
            setRecordedBlob(null);
            setCurrentPhase('studio');
          }}
          onSave={async (blob) => {
             const asset = await uploadBlobToVault(blob, currentProject?.name);
             if (asset) {
               console.log('Saved blob to Vault and Supabase:', asset);
             } else {
               console.error('Failed to save blob to Vault');
             }
          }}
        />
      ) : (
        <HomeView
          onSelectProject={(p) => {
            setCurrentProject(p);
            setCurrentPhase('reference_library');
          }}
        />
      )}
    </AppShell>
    </AuthGate>
  );
}
