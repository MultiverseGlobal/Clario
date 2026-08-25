import { useState, useEffect, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import type { HarvesterMode, HarvestProject } from './types/assets';
import { HomePhase } from './phases/HomePhase';
import { IngestPhase } from './phases/IngestPhase';
import { HarvestStudioPhase } from './phases/HarvestStudioPhase';
import { ExportPhase } from './phases/ExportPhase';
import { ProvenanceLibraryPhase } from './phases/ProvenanceLibraryPhase';
import { harvestVideoProject, harvestSlideProject, generateContactSheet } from './lib/extractor';
import { saveProject, listProjects, getVaultAssetsCount, type ClarioProject } from './lib/projectStore';
import { checkServerHealth, uploadToWorker, pollJobStatus } from './lib/apiClient';
import { getApiKey, setApiKey } from './lib/gemini';
import { AppShell } from './components/layout/AppShell';
import { BrandKitPanel } from './components/ui/BrandKitPanel';

type Phase = 'home' | 'ingest' | 'harvest_studio' | 'export' | 'vault';

export default function App() {
  const [phase, setPhase] = useState<Phase>('home');
  const [mode, setMode] = useState<HarvesterMode>('video_harvester');
  const [currentProject, setCurrentProject] = useState<HarvestProject | null>(null);
  const [contactSheetUrl, setContactSheetUrl] = useState<string>('');
  const [isHarvesting, setIsHarvesting] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ msg: string; pct: number }>({ msg: '', pct: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Shell modals
  const [brandKitOpen, setBrandKitOpen] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);
  const [allProjects, setAllProjects] = useState<ClarioProject[]>([]);
  const [vaultCount, setVaultCount] = useState<number>(0);

  const ffmpegRef = useState(() => new FFmpeg())[0];

  const refreshProjectList = useCallback(async () => {
    try {
      const list = await listProjects();
      setAllProjects(list);
      const vCount = await getVaultAssetsCount();
      setVaultCount(vCount);
    } catch (err) {
      console.warn('Failed to list projects:', err);
    }
  }, []);

  useEffect(() => {
    refreshProjectList();
  }, [refreshProjectList, phase]);

  // Load FFmpeg WASM in background
  useEffect(() => {
    const load = async () => {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      try {
        await ffmpegRef.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      } catch (err) {
        console.warn('FFmpeg background load warning:', err);
      }
    };
    load();
  }, [ffmpegRef]);

  const handleSelectMode = (selectedMode: HarvesterMode) => {
    setMode(selectedMode);
    setPhase('ingest');
  };

  const handleOpenSavedProject = (proj: ClarioProject) => {
    if (proj.harvestProject) {
      setCurrentProject(proj.harvestProject);
      setMode(proj.harvestProject.mode);
      setPhase('harvest_studio');
    } else {
      const fallbackProject: HarvestProject = {
        id: proj.id,
        name: proj.name,
        mode: (proj.mode as any) || 'video_harvester',
        shots: [],
        slides: [],
        generated_prompts: [],
        provenance: [],
        created_at: proj.createdAt,
        updated_at: proj.updatedAt,
      };
      setCurrentProject(fallbackProject);
      setPhase('harvest_studio');
    }
  };

  const handleHarvestFiles = async (files: File[], referenceUrl: string = '') => {
    if (files.length === 0) return;
    setIsHarvesting(true);
    setErrorMessage(null);

    try {
      const isServerOnline = await checkServerHealth();

      if (isServerOnline && mode === 'video_harvester') {
        setProgress({ msg: 'Connecting to FastAPI media worker…', pct: 5 });
        const { job_id } = await uploadToWorker(files[0], mode);
        const serverProject = await pollJobStatus(job_id, (msg, pct) => setProgress({ msg, pct }));
        await saveProject(serverProject);
        setCurrentProject(serverProject);
        setPhase('harvest_studio');
      } else {
        if (mode === 'video_harvester') {
          const { project, contactSheetUrl: sheetUrl } = await harvestVideoProject(
            files[0],
            referenceUrl,
            ffmpegRef,
            (msg, pct) => setProgress({ msg, pct })
          );
          await saveProject(project);
          setCurrentProject(project);
          setContactSheetUrl(sheetUrl);
          setPhase('harvest_studio');
        } else {
          const { project } = await harvestSlideProject(
            files,
            referenceUrl,
            (msg, pct) => setProgress({ msg, pct })
          );
          await saveProject(project);
          setCurrentProject(project);
          setPhase('harvest_studio');
        }
      }
      await refreshProjectList();
    } catch (err: any) {
      console.error('Harvest pipeline error:', err);
      setErrorMessage(
        `Harvest error: ${err.message || 'Processing failed. Check console or verify your file format.'}`
      );
    } finally {
      setIsHarvesting(false);
      setProgress({ msg: '', pct: 0 });
    }
  };

  const handleLoadDirectProject = async (project: HarvestProject) => {
    await saveProject(project);
    setCurrentProject(project);
    if (project.shots && project.shots.length > 0) {
      const sheetUrl = await generateContactSheet(project.shots);
      setContactSheetUrl(sheetUrl);
    }
    await refreshProjectList();
    setPhase('harvest_studio');
  };

  const handleUpdateProject = async (updated: HarvestProject) => {
    setCurrentProject(updated);
    await saveProject(updated);
    await refreshProjectList();
  };

  const handleSaveApiKey = () => {
    setApiKey(apiKeyInput);
    setSavedKeySuccess(true);
    setTimeout(() => {
      setSavedKeySuccess(false);
      setShowApiKeyModal(false);
    }, 1000);
  };

  return (
    <AppShell
      currentProject={currentProject}
      currentPhase={phase}
      onNavigatePhase={p => {
        if (p === 'home' || p === 'vault') setCurrentProject(null);
        setPhase(p);
      }}
      onOpenBrandKit={() => setBrandKitOpen(true)}
      onOpenApiKeyModal={() => setShowApiKeyModal(true)}
      vaultCount={vaultCount}
      projectCount={allProjects.length}
      hasApiKey={Boolean(getApiKey())}
    >
      {/* ── Global Processing / Loading Modal ───────────────────────────────── */}
      {isHarvesting && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(17, 19, 24, 0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            className="paper-card"
            style={{
              padding: '32px 36px',
              width: 420,
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'rgba(78, 108, 242, 0.1)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 20 20"
                fill="none"
                style={{ animation: 'spin 1.5s linear infinite' }}
              >
                <circle
                  cx="10"
                  cy="10"
                  r="7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="32"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 700,
                fontFamily: 'var(--font-display)',
                color: 'var(--text-primary)',
                marginBottom: 6,
              }}
            >
              Harvesting Asset Intelligence
            </h3>
            <p
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                marginBottom: 20,
                minHeight: 32,
              }}
            >
              {progress.msg || 'Extracting media ingredients and analyzing sources…'}
            </p>

            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                height: 4,
                background: 'var(--surface-2)',
                borderRadius: 2,
                overflow: 'hidden',
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: `${progress.pct}%`,
                  height: '100%',
                  background: 'var(--text-primary)',
                  borderRadius: 2,
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
            <span
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {progress.pct}% COMPLETE
            </span>
          </div>
        </div>
      )}

      {/* ── Global Error Banner ────────────────────────────────────────────── */}
      {errorMessage && (
        <div
          style={{
            position: 'fixed',
            top: 70,
            right: 20,
            zIndex: 10000,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: '10px 16px',
            color: '#EF4444',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#EF4444',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Brand Kit Drawer / Modal ───────────────────────────────────────── */}
      {brandKitOpen && <BrandKitPanel onClose={() => setBrandKitOpen(false)} />}

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

      {/* ── Main Studio Phase Router ───────────────────────────────────────── */}
      {phase === 'home' && (
        <HomePhase
          onSelectMode={handleSelectMode}
          onOpenProject={handleOpenSavedProject}
        />
      )}

      {phase === 'ingest' && (
        <IngestPhase
          mode={mode}
          onBack={() => setPhase('home')}
          onHarvestFiles={handleHarvestFiles}
          onLoadDirectProject={handleLoadDirectProject}
          onSwitchMode={newMode => setMode(newMode)}
        />
      )}

      {phase === 'harvest_studio' && currentProject && (
        <HarvestStudioPhase
          project={currentProject}
          contactSheetUrl={contactSheetUrl}
          onUpdateProject={handleUpdateProject}
          onExportPack={() => setPhase('export')}
          onBackToHome={() => setPhase('home')}
        />
      )}

      {phase === 'export' && currentProject && (
        <ExportPhase
          project={currentProject}
          contactSheetUrl={contactSheetUrl}
          onBackToStudio={() => setPhase('harvest_studio')}
          onStartOver={() => setPhase('home')}
        />
      )}

      {phase === 'vault' && (
        <ProvenanceLibraryPhase
          onOpenProject={handleOpenSavedProject}
          onBackToHome={() => setPhase('home')}
        />
      )}
    </AppShell>
  );
}
