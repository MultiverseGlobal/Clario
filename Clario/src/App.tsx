import { useState, useEffect, useCallback } from 'react';

import { listProjects, saveProject, uploadBlobToVault, duplicateProject, syncProjectToVault, ClarioProject } from './lib/projectStore';
import { fetchApiBaseFromDb } from './lib/apiClient';
import { getApiKey, setApiKey, fetchApiKeyFromDb } from './lib/gemini';
import { AppShell, type ClarioPhase } from './components/layout/AppShell';
import { AuthGate } from './components/layout/AuthGate';
import { fetchBrandKitFromDb } from './lib/brandKit';
import { db } from './lib/dexieDb';
import { ReferenceLibraryPanel, type LibraryClip } from './components/workbenches/ReferenceLibraryPanel';
import { ScriptAnalysisWorkbench } from './components/workbenches/ScriptAnalysisWorkbench';
import { HomeView } from './components/workbenches/HomeView';
import { DeliverableView } from './components/workbenches/DeliverableView';
import { RecordingStudio } from './components/workbenches/RecordingStudio';
import { RecordingPreview } from './components/workbenches/RecordingPreview';
import { VideoCanvas } from './components/canvas/VideoCanvas';
import { SlideCanvas } from './components/canvas/SlideCanvas';
import { ResolveShotWorkbench } from './components/workbenches/ResolveShotWorkbench';
import { DeconstructionDrawer } from './components/blocks/DeconstructionDrawer';

export default function App() {
  const [currentProject, setCurrentProject] = useState<ClarioProject | null>(null);
  const [currentPhase, setCurrentPhase] = useState<ClarioPhase>('home');
  const [latestResult, setLatestResult] = useState<any>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedEditScript, setRecordedEditScript] = useState<string>('');
  const [recordedCategory, setRecordedCategory] = useState<'sales' | 'content'>('sales');
  const [librarySubView, setLibrarySubView] = useState<'vault' | 'script'>('vault');

  // Video Canvas Playback & Track State
  const [canvasTime, setCanvasTime] = useState(0);
  const [canvasIsPlaying, setCanvasIsPlaying] = useState(false);
  const [canvasSelectedItemId, setCanvasSelectedItemId] = useState<string | null>(null);

  // Slide Canvas State
  const [slideActiveIdx, setSlideActiveIdx] = useState(0);
  const [slideSelectedTextId, setSlideSelectedTextId] = useState<string | null>(null);
  const [slideSelectedElementId, setSlideSelectedElementId] = useState<string | null>(null);

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

  // Playback timer for VideoCanvas
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (canvasIsPlaying && currentPhase === 'video_canvas') {
      interval = setInterval(() => {
        setCanvasTime((t) => {
          const totalDur = currentProject?.trackItems?.reduce((sum: number, i: any) => sum + (i.duration || 0), 0) || 30;
          if (t >= totalDur) {
            setCanvasIsPlaying(false);
            return 0;
          }
          return parseFloat((t + 0.1).toFixed(1));
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [canvasIsPlaying, currentPhase, currentProject]);

  const handleNavigatePhase = (p: ClarioPhase) => {
    if (p === 'video_canvas') {
      if (currentProject?.mode === 'slide_harvester' || currentProject?.mode === 'carousel') {
        setCurrentPhase('slide_canvas');
        return;
      }
    }
    setCurrentPhase(p);
    if (p === 'home') setCurrentProject(null);
  };

  const handleOpenClipInEditor = async (clip: LibraryClip) => {
    const projId = `proj_${Date.now()}`;
    const clipUrl = clip.source_url || clip.frame_url || '';
    const isARoll = clip.content_type === 'a_roll';
    const newProj: ClarioProject = {
      id: projId,
      name: `${clip.title || clip.scene_tag || 'Scene'} Edit (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      mode: 'video_harvester',
      category: 'content',
      targetPurpose: 'content_creator',
      scriptText: clip.description || '',
      slides: [],
      trackItems: [{
        id: `track_${Date.now()}`,
        title: clip.title || clip.scene_tag || 'Scene 1',
        startTime: 0,
        endTime: clip.duration || 5,
        duration: clip.duration || 5,
        type: 'video',
        url: clipUrl,
        videoUrl: clipUrl,
        isBroll: !isARoll,
        thumbnailUrl: clip.frame_url,
      } as any],
      selectedAssets: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setCurrentProject(newProj);
    await saveProject(newProj);
    setCanvasTime(0);
    setCanvasIsPlaying(false);
    setCurrentPhase('video_canvas');
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
      hasActiveProject={Boolean(currentProject)}
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
                  placeholder="https://clario-l5d0.onrender.com"
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
        <div className="flex flex-col h-full w-full">
          {currentProject && (
            <div className="flex items-center justify-between px-6 py-2 bg-card/70 border-b border-border/40 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLibrarySubView('vault')}
                  className={`px-3 py-1 text-xs rounded-xl font-medium transition-all cursor-pointer ${
                    librarySubView === 'vault'
                      ? 'bg-foreground text-background font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  📦 Asset Vault & Scene Categories
                </button>
                <button
                  onClick={() => setLibrarySubView('script')}
                  className={`px-3 py-1 text-xs rounded-xl font-medium transition-all cursor-pointer ${
                    librarySubView === 'script'
                      ? 'bg-foreground text-background font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  🧠 Script Intelligence ({currentProject.name})
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {librarySubView === 'script' && currentProject ? (
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
                onOpenInEditor={handleOpenClipInEditor}
              />
            )}
          </div>
        </div>
      ) : currentPhase === 'deliverable' ? (
        <DeliverableView 
          projectName={currentProject?.name || 'Untitled Project'} 
          result={latestResult} 
          onBack={() => setCurrentPhase('home')} 
        />
      ) : currentPhase === 'studio' ? (
        <RecordingStudio
          onBack={() => setCurrentPhase('home')}
          initialCategory={recordedCategory}
          onFinish={(blob, editScript, category) => {
            if (blob) {
              setRecordedBlob(blob);
              setRecordedEditScript(editScript || '');
              if (category) setRecordedCategory(category);
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
          editScript={recordedEditScript}
          onBack={() => setCurrentPhase('home')}
          onReRecord={() => {
            setRecordedBlob(null);
            setRecordedEditScript('');
            setCurrentPhase('studio');
          }}
          onMoveToEditor={async () => {
            if (recordedBlob) {
              const projId = `proj_${Date.now()}`;
              const previewUrl = URL.createObjectURL(recordedBlob);
              const isSales = recordedCategory === 'sales';
              const newProj: ClarioProject = {
                id: projId,
                name: `${isSales ? 'Sales Pitch' : 'Content Reel'} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
                mode: 'video_harvester',
                category: recordedCategory,
                targetPurpose: isSales ? 'sales_outreach' : 'content_creator',
                scriptText: recordedEditScript,
                slides: [],
                trackItems: [{
                  id: `track_rec_${Date.now()}`,
                  title: isSales ? 'Prospect Walkthrough' : 'Main Cut',
                  startTime: 0,
                  endTime: 30,
                  duration: 30,
                  type: 'video',
                  url: previewUrl,
                  isBroll: false,
                }],
                selectedAssets: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              setCurrentProject(newProj);
              await saveProject(newProj);
            }
            setCurrentPhase('video_canvas');
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
      ) : currentPhase === 'video_canvas' ? (
        <VideoCanvas 
          trackItems={currentProject?.trackItems || []}
          assets={currentProject?.selectedAssets || []}
          videoUrl={currentProject?.trackItems?.[0]?.url || (currentProject?.trackItems?.[0] as any)?.videoUrl || ''}
          duration={
            currentProject?.trackItems?.reduce((sum: number, item: any) => sum + (item.duration || 0), 0) || 30
          }
          currentTime={canvasTime}
          isPlaying={canvasIsPlaying}
          selectedItemId={canvasSelectedItemId}
          projectName={currentProject?.name}
          onSaveAssetPack={async () => {
            if (!currentProject) return;
            // Iterate over track items and save each as a shot & vault asset in Dexie
            for (const item of (currentProject.trackItems || [])) {
              const shotId = `shot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              const isARoll = !item.isBroll;
              const sceneTag = (item as any).scene_tag || (isARoll ? 'A-Roll (Talking Head)' : 'Cinematic B-Roll');
              const itemUrl = item.url || (item as any).videoUrl || '';
              const thumb = (item as any).thumbnailUrl || (item as any).thumbnail || itemUrl;
              await db.shots.put({
                id: shotId,
                harvest_job_id: currentProject.id,
                shot_id: shotId,
                start_seconds: item.startTime,
                end_seconds: item.endTime,
                duration: item.duration || (item.endTime - item.startTime),
                visual_description: item.title,
                clean_source_url: itemUrl,
                frame_url: thumb,
                content_type: isARoll ? 'a_roll' : 'b_roll',
                scene_tag: sceneTag,
                notes: `Saved from ${currentProject.name}`,
              } as any);
              await db.vaultAssets.put({
                id: `vault_${shotId}`,
                shotId: shotId,
                projectId: currentProject.id,
                title: item.title || sceneTag,
                assetKind: isARoll ? 'attached_master' : 'vault_broll',
                sourceUrl: itemUrl,
                rightsNote: 'Workspace Reference Pack',
                createdAt: Date.now(),
              } as any);
            }
            if (currentProject.harvestProject) {
              await syncProjectToVault(currentProject.harvestProject);
            }
            // Navigate to library so user can see their saved asset pack
            setLibrarySubView('vault');
            setCurrentPhase('reference_library');
          }}
          onMakeNewVideo={async () => {
            if (!currentProject) return;
            const cloned = await duplicateProject(currentProject.id);
            if (cloned) {
              setCurrentProject(cloned);
              setCanvasTime(0);
              setCanvasIsPlaying(false);
            }
          }}
          onChange={(newTrackItems) => {
            if (currentProject) {
              const updated = {
                ...currentProject,
                trackItems: newTrackItems,
                updatedAt: Date.now()
              };
              setCurrentProject(updated);
              saveProject(updated);
            }
          }}
          onSeek={(time) => setCanvasTime(time)}
          onTogglePlay={() => setCanvasIsPlaying((prev) => !prev)}
          onSelectItem={(id) => setCanvasSelectedItemId(id)}
        />
      ) : currentPhase === 'slide_canvas' ? (
        <SlideCanvas
          slides={currentProject?.slides || []}
          assets={currentProject?.selectedAssets || []}
          activeIdx={slideActiveIdx}
          selectedTextId={slideSelectedTextId}
          selectedElementId={slideSelectedElementId}
          onChange={(newSlides) => {
            if (currentProject) {
              const updated = { ...currentProject, slides: newSlides, updatedAt: Date.now() };
              setCurrentProject(updated);
              saveProject(updated);
            }
          }}
          onActiveChange={(idx) => setSlideActiveIdx(idx)}
          onSelectText={(id) => setSlideSelectedTextId(id)}
          onSelectElement={(id) => setSlideSelectedElementId(id)}
        />
      ) : currentPhase === 'resolve_shot' ? (
        <ResolveShotWorkbench
          shot={{
            project_id: 'local', shot_id: 'shot_1', start_seconds: 0, end_seconds: 5, duration: 5,
            frame_url: '', visual_description: 'Test Shot', editor_text: '', source_text: '',
            content_type: 'b_roll', source_type: 'original', likely_source: 'Test',
            confidence: 'confirmed', exact_source_found: true, clean_source_url: '',
            license_status: 'unresolved', replacement_needed: false, replacement_prompt: '',
            search_queries: [], notes: ''
          }}
          onClose={() => setCurrentPhase('home')}
          onResolveAsset={() => {}}
        />
      ) : currentPhase === 'deconstruction' ? (
        <DeconstructionDrawer
          asset={{
            id: 'test', projectId: 'local', assetKind: 'reference_evidence',
            rightsStatus: 'unresolved', productionEligible: false, title: 'Test Asset',
            createdAt: 0, updatedAt: 0
          }}
          onClose={() => setCurrentPhase('home')}
          onApplyRemix={() => {}}
        />
      ) : (
        <HomeView
          onSelectProject={(p) => {
            setCurrentProject(p);
            if (p.mode === 'slide_harvester' || p.mode === 'carousel') {
              setCurrentPhase('slide_canvas');
            } else {
              setCurrentPhase('video_canvas');
            }
          }}
        />
      )}
    </AppShell>
    </AuthGate>
  );
}
