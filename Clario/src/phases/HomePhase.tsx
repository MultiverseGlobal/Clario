import { useState, useEffect, useCallback } from 'react';
import type { HarvesterMode } from '../types/assets';
import { listProjects, deleteProject, duplicateProject, renameProject, saveProject, type ClarioProject } from '../lib/projectStore';
import { getApiKey, setApiKey } from '../lib/gemini';
import { BrandKitPanel } from '../components/ui/BrandKitPanel';
import { getBrandKit } from '../lib/brandKit';
import { getApolloReferenceReelFixture } from '../lib/fixtures';

import { RightsBadge } from '../components/ui/RightsBadge';

interface HomePhaseProps {
  onSelectMode: (mode: HarvesterMode) => void;
  onOpenProject: (project: ClarioProject) => void;
}

// ── Clean SVG Vector Icons (No Emojis) ────────────────────────────────────────

const VideoIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="4" width="11" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M13 8l4.5-2.5v9L13 12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

const CarouselIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <rect x="2" y="3" width="9" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <rect x="9" y="6" width="9" height="11" rx="2" stroke="currentColor" strokeWidth="1.3" opacity="0.5"/>
  </svg>
);

const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
    <path d="M2 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const KeyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
    <circle cx="7.5" cy="7.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M11 11l6 6m-2-4l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export function HomePhase({ onSelectMode, onOpenProject }: HomePhaseProps) {
  const [activeTab, setActiveTab] = useState<'harvest' | 'vault' | 'projects'>('harvest');
  const [projects, setProjects] = useState<ClarioProject[]>([]);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [searchVault, setSearchVault] = useState('');
  const [brandKitOpen, setBrandKitOpen] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getApiKey());
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);

  const kit = getBrandKit();

  const loadAllProjects = useCallback(async () => {
    try {
      const list = await listProjects();
      setProjects(list);
    } catch (err) {
      console.warn('Failed to load projects:', err);
    }
  }, []);

  useEffect(() => {
    loadAllProjects();
  }, [loadAllProjects]);

  const handleSaveApiKey = () => {
    setApiKey(apiKeyInput);
    setSavedKeySuccess(true);
    setTimeout(() => {
      setSavedKeySuccess(false);
      setShowKeyModal(false);
    }, 1000);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    await deleteProject(id);
    await loadAllProjects();
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await duplicateProject(id);
    await loadAllProjects();
  };

  const startRename = (e: React.MouseEvent, project: ClarioProject) => {
    e.stopPropagation();
    setRenamingId(project.id);
    setRenameValue(project.name);
  };

  const saveRename = async (id: string) => {
    if (renameValue.trim()) {
      await renameProject(id, renameValue.trim());
      await loadAllProjects();
    }
    setRenamingId(null);
  };

  // Collect cross-project provenance records for the Vault tab
  const allProvenance = projects.flatMap(p => {
    const shots = (p.harvestProject?.shots || []).map(s => ({
      id: s.shot_id,
      title: s.likely_source !== 'Unresolved' ? s.likely_source : s.visual_description,
      type: s.content_type,
      license: s.license_status,
      confidence: s.confidence,
      sourceUrl: s.clean_source_url || s.reference_url,
      projectName: p.name,
      parentProject: p,
      thumbnail: s.frame_url,
    }));
    const slides = (p.harvestProject?.slides || []).map(sl => ({
      id: sl.slide_id,
      title: `Slide ${sl.slide_index + 1}: ${sl.layout_tokens.archetype}`,
      type: 'slide',
      license: 'generated_replacement',
      confidence: 'confirmed',
      sourceUrl: p.harvestProject?.reference_url,
      projectName: p.name,
      parentProject: p,
      thumbnail: sl.image_url,
    }));
    return [...shots, ...slides];
  });

  const [vaultFilter, setVaultFilter] = useState<'all' | 'clean' | 'reference' | 'generated' | 'ai_cleaned' | 'public_domain' | 'needs_replacement'>('all');

  const filteredProvenance = allProvenance.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchVault.toLowerCase()) ||
      item.projectName.toLowerCase().includes(searchVault.toLowerCase()) ||
      item.license.toLowerCase().includes(searchVault.toLowerCase());

    if (!matchesSearch) return false;
    if (vaultFilter === 'clean') return item.license === 'licensed_clean_available' || item.license === 'user_owned';
    if (vaultFilter === 'reference') return item.license === 'copyrighted_reference_only' || item.license === 'reference_only';
    if (vaultFilter === 'generated') return item.license === 'generated_replacement' || item.license === 'generated_original';
    if (vaultFilter === 'ai_cleaned') return item.license === 'ai_cleaned_reference';
    if (vaultFilter === 'public_domain') return item.license === 'public_domain_candidate';
    if (vaultFilter === 'needs_replacement') return item.license === 'original_replacement_needed' || item.license === 'unresolved';
    return true;
  });

  return (
    <div
      className="phase-enter"
      style={{
        minHeight: '100%',
        background: 'var(--base)',
        color: 'var(--text-primary)',
        padding: '36px 32px 80px',
        fontFamily: 'var(--font-sans)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* ── Top Bar ────────────────────────────────────────────────────────── */}
      <header
        style={{
          width: '100%',
          maxWidth: 960,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 36,
          paddingBottom: 20,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 'var(--r-md)',
              background: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 16,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
            }}
          >
            C
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  fontFamily: 'var(--font-display)',
                  color: 'var(--text-primary)',
                }}
              >
                CLARIO
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 'var(--r-pill)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Asset Intelligence
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
              Extract clean sources, isolated graphics, design tokens, and replacement prompts.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setShowKeyModal(true)}
            className="btn-ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)',
              background: getApiKey() ? 'var(--emerald-dim)' : 'var(--surface)',
              color: getApiKey() ? 'var(--emerald)' : 'var(--text-secondary)',
            }}
          >
            <KeyIcon />
            <span>{getApiKey() ? 'Gemini 2.0 Ready' : 'Connect Gemini API'}</span>
          </button>
        </div>
      </header>

      {/* ── Segmented Control Navigation ───────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 960, marginBottom: 32 }}>
        <div className="segmented-control" style={{ background: 'var(--surface-2)', padding: 3, borderRadius: 'var(--r-lg)' }}>
          <button
            onClick={() => setActiveTab('harvest')}
            className={`segmented-item ${activeTab === 'harvest' ? 'active' : ''}`}
            style={{ padding: '7px 18px', fontSize: 12, borderRadius: 'var(--r-md)' }}
          >
            Harvest Studio
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`segmented-item ${activeTab === 'vault' ? 'active' : ''}`}
            style={{ padding: '7px 18px', fontSize: 12, borderRadius: 'var(--r-md)' }}
          >
            Provenance Vault ({allProvenance.length})
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className={`segmented-item ${activeTab === 'projects' ? 'active' : ''}`}
            style={{ padding: '7px 18px', fontSize: 12, borderRadius: 'var(--r-md)' }}
          >
            Saved Projects ({projects.length})
          </button>
        </div>
      </div>

      {/* ── TAB 1: HARVEST STUDIO MODES ─────────────────────────────────────── */}
      {activeTab === 'harvest' && (
        <div style={{ width: '100%', maxWidth: 960 }}>
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: '-0.03em',
                fontFamily: 'var(--font-display)',
                color: 'var(--text-primary)',
              }}
            >
              Select Harvester Engine
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Deconstruct reference media to uncover underlying sources, isolate transparent graphics, or extract Claude recreation prompts.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
            {/* Mode A: Video Asset Harvester */}
            <div
              onClick={() => onSelectMode('video_harvester')}
              className="paper-card"
              style={{
                padding: '28px 24px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 240,
                background: 'var(--panel)',
                borderColor: 'var(--border)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--r-md)',
                      background: 'var(--accent-dim)',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <VideoIcon />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--r-pill)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--accent)',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    MODE A
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    marginBottom: 8,
                  }}
                >
                  Reference Video Harvester
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Intake TikToks, Reels, YouTube shorts, or video files. Automatically extract shot boundaries, split editor overlay text from scene text, identify candidate film/archive sources, and generate replacement prompts.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 24,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                  Launch Video Harvester →
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  MP4 · MOV · URLs
                </span>
              </div>
            </div>

            {/* Mode B: Slide & Carousel Harvester */}
            <div
              onClick={() => onSelectMode('slide_harvester')}
              className="paper-card"
              style={{
                padding: '28px 24px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 240,
                background: 'var(--panel)',
                borderColor: 'var(--border)',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 'var(--r-md)',
                      background: 'var(--emerald-dim)',
                      color: 'var(--emerald)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CarouselIcon />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--r-pill)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--emerald)',
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    MODE B
                  </span>
                </div>

                <h3
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    marginBottom: 8,
                  }}
                >
                  Carousel & Slide Harvester
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Intake slide decks, infographics, or carousel screenshots. Extract isolated transparent PNG icons/badges, reverse-engineer typography and color palettes, and write the complete Claude React/Tailwind code prompt.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 24,
                  paddingTop: 14,
                  borderTop: '1px solid var(--border)',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--emerald)' }}>
                  Launch Slide Harvester →
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  PNG · JPG · PDF
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: PROVENANCE VAULT ────────────────────────────────────────── */}
      {activeTab === 'vault' && (
        <div style={{ width: '100%', maxWidth: 960 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)', margin: 0 }}>
                Provenance & Asset Vault
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Cross-project repository of verified clean sources, generated prompts, and reference excerpts.
              </p>
            </div>

            <input
              type="text"
              placeholder="Search across all harvest records…"
              value={searchVault}
              onChange={e => setSearchVault(e.target.value)}
              style={{
                width: 260,
                padding: '8px 12px',
                borderRadius: 'var(--r-md)',
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
                fontFamily: 'var(--font-sans)',
              }}
            />
          </div>

          {/* Filter Chips Bar */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
            {[
              { id: 'all', label: 'All Items' },
              { id: 'clean', label: 'Authorized Asset Masters' },
              { id: 'reference', label: 'Reference Only' },
              { id: 'generated', label: 'Generated Originals' },
              { id: 'ai_cleaned', label: 'Reconstructed Stills' },
              { id: 'public_domain', label: 'Public Domain Candidates' },
              { id: 'needs_replacement', label: 'Needs Resolution' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setVaultFilter(f.id as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 14,
                  fontSize: 11,
                  fontWeight: 600,
                  border: '1px solid var(--border)',
                  background: vaultFilter === f.id ? 'var(--text-primary)' : 'var(--panel)',
                  color: vaultFilter === f.id ? '#FFFFFF' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.1s ease',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredProvenance.length === 0 ? (
            <div className="paper-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--text-muted)' }}>
                <FolderIcon />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>
                No assets matching filter
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.4 }}>
                Your verified, generated, and reference assets will appear here. Start by uploading a reel or loading the sample dataset.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={async () => {
                    const fixture = getApolloReferenceReelFixture();
                    await saveProject(fixture);
                    await loadAllProjects();
                  }}
                  className="btn-primary"
                  style={{ background: 'var(--accent)', color: '#FFFFFF' }}
                >
                  🚀 Load Apollo Reference Dataset
                </button>
                <button onClick={() => setActiveTab('harvest')} className="btn-ghost" style={{ border: '1px solid var(--border)' }}>
                  Start First Harvest
                </button>
              </div>
            </div>
          ) : (
            <div className="paper-card" style={{ overflow: 'hidden', padding: 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', textAlign: 'left', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    <th style={{ padding: '10px 16px' }}>Asset Preview</th>
                    <th style={{ padding: '10px 16px' }}>Identification / Source</th>
                    <th style={{ padding: '10px 16px' }}>Type</th>
                    <th style={{ padding: '10px 16px' }}>Rights Status</th>
                    <th style={{ padding: '10px 16px' }}>Project</th>
                    <th style={{ padding: '10px 16px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProvenance.map((item, idx) => (
                    <tr
                      key={idx}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => onOpenProject(item.parentProject)}
                    >
                      <td style={{ padding: '10px 16px', width: 60 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 6, background: 'var(--surface-2)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                              <VideoIcon />
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {item.title}
                        </div>
                        {item.sourceUrl && (
                          <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                            {item.sourceUrl.slice(0, 36)}…
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                          {item.type}
                        </span>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <RightsBadge status={item.license} size="sm" />
                      </td>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {item.projectName}
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 11 }}>
                          Open →
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: SAVED PROJECTS ──────────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div style={{ width: '100%', maxWidth: 960 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                Saved Harvest Projects
              </h2>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Full persistence of your shot manifests, OCR breakdowns, and generated prompts.
              </p>
            </div>
            <button onClick={() => setActiveTab('harvest')} className="btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}>
              + New Harvest
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="paper-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--text-muted)' }}>
                <FolderIcon />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)', marginBottom: 6 }}>
                No saved projects
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 360, margin: '0 auto 20px' }}>
                Every harvest is auto-saved locally in Dexie with full fidelity.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={async () => {
                    const fixture = getApolloReferenceReelFixture();
                    await saveProject(fixture);
                    await loadAllProjects();
                  }}
                  className="btn-primary"
                  style={{ background: 'var(--accent)', color: '#FFFFFF' }}
                >
                  🚀 Load Apollo Reference Project
                </button>
                <button onClick={() => setActiveTab('harvest')} className="btn-ghost" style={{ border: '1px solid var(--border)' }}>
                  Create New Harvest
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {projects.map(p => (
                <div
                  key={p.id}
                  onClick={() => onOpenProject(p)}
                  className="paper-card interactive"
                  style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}
                >
                  <div
                    style={{
                      height: 88,
                      background: 'var(--surface-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 'var(--r-md)',
                        background: 'var(--panel)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: p.mode === 'slide_harvester' || p.mode === 'carousel' ? 'var(--emerald)' : 'var(--accent)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      {p.mode === 'slide_harvester' || p.mode === 'carousel' ? <CarouselIcon /> : <VideoIcon />}
                    </div>
                    <span
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 'var(--r-pill)',
                        background: 'var(--panel)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {p.mode?.replace('_', ' ') || 'Harvest'}
                    </span>
                  </div>

                  <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {renamingId === p.id ? (
                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        <input
                          autoFocus
                          type="text"
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveRename(p.id)}
                          style={{
                            flex: 1,
                            background: 'var(--panel)',
                            border: '1px solid var(--accent)',
                            borderRadius: 'var(--r-sm)',
                            padding: '4px 8px',
                            fontSize: 12,
                            color: 'var(--text-primary)',
                            outline: 'none',
                          }}
                        />
                        <button onClick={() => saveRename(p.id)} className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}>✓</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </span>
                        <button onClick={e => startRename(e, p)} className="btn-ghost" style={{ padding: 4 }} title="Rename">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                            <path d="M11 2l3 3L5 14H2v-3L11 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    )}

                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>
                      {p.harvestProject?.shots?.length ? `${p.harvestProject.shots.length} shots` : p.harvestProject?.slides?.length ? `${p.harvestProject.slides.length} slides` : 'Harvest Record'} · {new Date(p.updatedAt).toLocaleDateString()}
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', gap: 6 }}>
                      <button onClick={e => handleDuplicate(e, p.id)} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 11 }}>
                        Duplicate
                      </button>
                      <button
                        onClick={e => handleDelete(e, p.id)}
                        style={{
                          padding: '5px 10px',
                          borderRadius: 'var(--r-sm)',
                          background: 'var(--rose-dim)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          color: 'var(--rose)',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Brand Kit Panel Modal ──────────────────────────────────────────── */}
      {brandKitOpen && <BrandKitPanel onClose={() => setBrandKitOpen(false)} />}

      {/* ── Gemini API Key Modal ───────────────────────────────────────────── */}
      {showKeyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17,19,24,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowKeyModal(false)}
        >
          <div
            className="paper-card"
            style={{
              padding: 24,
              width: 440,
              maxWidth: '90%',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 'var(--r-sm)', background: 'var(--emerald-dim)', color: 'var(--emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <KeyIcon />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                Gemini 2.0 Flash API Key
              </h3>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.5 }}>
              Clario uses client-side Gemini 2.0 Flash to analyze video frames, split OCR text, identify sources, and formulate Claude prompts directly in your browser.
            </p>

            <input
              type="password"
              placeholder="AIzaSy..."
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 'var(--r-md)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                marginBottom: 16,
                fontFamily: 'var(--font-mono)',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowKeyModal(false)} className="btn-ghost" style={{ fontSize: 12 }}>
                Cancel
              </button>
              <button onClick={handleSaveApiKey} className="btn-primary" style={{ fontSize: 12 }}>
                {savedKeySuccess ? 'Saved ✓' : 'Save Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Brand Kit Trigger — Bottom Left ────────────────────────────────── */}
      <button
        onClick={() => setBrandKitOpen(true)}
        className="glass-nav"
        style={{
          position: 'fixed',
          bottom: 20,
          left: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 'var(--r-md)',
          padding: '6px 12px',
          cursor: 'pointer',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.04em',
          border: '1px solid var(--border)',
          background: 'var(--panel)',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', gap: 3 }}>
          {[kit.primaryColor, kit.accentColor, kit.backgroundColor].map((c, i) => (
            <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
          ))}
        </div>
        <span>{kit.name ? `${kit.name} Brand Kit` : 'Brand Kit'}</span>
      </button>
    </div>
  );
}
