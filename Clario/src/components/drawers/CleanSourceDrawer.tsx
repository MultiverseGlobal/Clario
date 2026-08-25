import { useState, useRef } from 'react';
import type { ShotRecord, CleanAssetRecord } from '../../types/assets';
import { RightsBadge } from '../ui/RightsBadge';

interface CleanSourceDrawerProps {
  shot: ShotRecord | null;
  onClose: () => void;
  onAttachCleanAsset: (asset: CleanAssetRecord) => void;
  onOpenCleaningModal: (shot: ShotRecord) => void;
  onOpenPromptModal: (shot: ShotRecord) => void;
}

export function CleanSourceDrawer({
  shot,
  onClose,
  onAttachCleanAsset,
  onOpenCleaningModal,
  onOpenPromptModal,
}: CleanSourceDrawerProps) {
  const [activeTab, setActiveTab] = useState<'what_sees' | 'sources' | 'actions' | 'alternatives'>('what_sees');
  const [customSourceUrl, setCustomSourceUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!shot) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newCleanAsset: CleanAssetRecord = {
      id: `clean_${shot.shot_id}_${Date.now()}`,
      shot_id: shot.shot_id,
      asset_type: file.type.startsWith('video/') ? 'clip' : 'still',
      title: customTitle.trim() || file.name,
      url: URL.createObjectURL(file),
      dimensions: '1080x1920',
      rights_status: 'user_owned',
      source_title: customTitle.trim() || 'User Imported Master File',
      source_url: customSourceUrl.trim() || undefined,
      transformation_history: ['Attached via local file import'],
      created_at: Date.now(),
    };

    onAttachCleanAsset(newCleanAsset);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17, 19, 24, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 999,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          height: '100%',
          background: 'var(--panel)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 30px rgba(0,0,0,0.1)',
          animation: 'slideLeft 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Drawer Header ─────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {shot.shot_id.toUpperCase()}
              </span>
              <RightsBadge status={shot.rights_status || shot.license_status} size="sm" />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Timecode: {shot.start_seconds.toFixed(1)}s - {shot.end_seconds.toFixed(1)}s ({shot.duration.toFixed(1)}s duration)
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Segmented Tabs ────────────────────────────────────────────────── */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--border)', background: 'var(--base)' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4,
              background: 'var(--surface-2)',
              padding: 3,
              borderRadius: 8,
            }}
          >
            <button
              onClick={() => setActiveTab('what_sees')}
              style={{
                padding: '6px 4px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'what_sees' ? 'var(--panel)' : 'transparent',
                color: activeTab === 'what_sees' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Evidence
            </button>
            <button
              onClick={() => setActiveTab('sources')}
              style={{
                padding: '6px 4px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'sources' ? 'var(--panel)' : 'transparent',
                color: activeTab === 'sources' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Sources
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              style={{
                padding: '6px 4px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'actions' ? 'var(--panel)' : 'transparent',
                color: activeTab === 'actions' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Import Clean
            </button>
            <button
              onClick={() => setActiveTab('alternatives')}
              style={{
                padding: '6px 4px',
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 6,
                border: 'none',
                background: activeTab === 'alternatives' ? 'var(--panel)' : 'transparent',
                color: activeTab === 'alternatives' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Transform
            </button>
          </div>
        </div>

        {/* ── Tab Contents ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          {/* TAB 1: WHAT CLARIO SEES */}
          {activeTab === 'what_sees' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Extracted Reference Frame
                </div>
                <div
                  style={{
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                    background: '#000',
                    maxHeight: 280,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img src={shot.frame_url} alt="Reference frame" style={{ maxHeight: 280, width: 'auto', objectFit: 'contain' }} />
                </div>
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                  Visual Description
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                  {shot.visual_description}
                </p>
              </div>

              {/* OCR Separation Box */}
              <div
                style={{
                  background: 'var(--base)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  OCR Text Separation
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                      Burnt-In Editor Caption / Overlay:
                    </span>
                    <span style={{ fontSize: 12, color: shot.editor_text ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {shot.editor_text ? `“${shot.editor_text}”` : 'None detected'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                      Physical Scene / Environmental Text:
                    </span>
                    <span style={{ fontSize: 12, color: shot.source_text ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {shot.source_text ? `“${shot.source_text}”` : 'None visible'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LIKELY SOURCES */}
          {activeTab === 'sources' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                style={{
                  background: 'rgba(78, 108, 242, 0.05)',
                  border: '1px solid rgba(78, 108, 242, 0.2)',
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>
                  Likely Origin Candidate
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {shot.likely_source}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <RightsBadge status={shot.rights_status || shot.license_status} size="sm" />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    Confidence: {shot.confidence}
                  </span>
                </div>
                {shot.notes && (
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    {shot.notes}
                  </p>
                )}
              </div>

              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Clean Source Search Launchers
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(shot.search_queries || []).map((query, qi) => (
                    <div
                      key={qi}
                      style={{
                        padding: '10px 12px',
                        background: 'var(--base)',
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {query}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}
                        >
                          Google ↗
                        </a>
                        <a
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}
                        >
                          YouTube ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: IMPORT CLEAN ASSET */}
          {activeTab === 'actions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div
                style={{
                  background: 'var(--base)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Attach Authorized / Clean Master
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.4 }}>
                  Attach your downloaded uncompressed footage, stock clip, or licensed master to replace this reference excerpt.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                  <input
                    type="text"
                    placeholder="Source Title (e.g. Apollo 11 Master Clip)"
                    value={customTitle}
                    onChange={e => setCustomTitle(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--panel)',
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                  <input
                    type="url"
                    placeholder="License / Source Link (optional)"
                    value={customSourceUrl}
                    onChange={e => setCustomSourceUrl(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--panel)',
                      fontSize: 12,
                      color: 'var(--text-primary)',
                      outline: 'none',
                    }}
                  />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-primary"
                  style={{ width: '100%', padding: '10px 14px', fontSize: 12 }}
                >
                  📁 Select Clean Master File…
                </button>
              </div>

              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: 'rgba(245, 158, 11, 0.05)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4,
                }}
              >
                ⚠️ <strong>Rights Note:</strong> A candidate link is not proof of license. Only attach material you own, have licensed, or verified as public domain.
              </div>
            </div>
          )}

          {/* TAB 4: TRANSFORM & GENERATE */}
          {activeTab === 'alternatives' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  background: 'var(--base)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Option A: Guided Equivalent Prompt
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                  Generate an original 9:16 asset in Midjourney/Flux/Kling that preserves the shot's visual pacing and composition without protected likenesses.
                </p>
                <button
                  onClick={() => {
                    onOpenPromptModal(shot);
                    onClose();
                  }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '10px 14px', fontSize: 12, background: 'var(--accent)', color: '#fff' }}
                >
                  ✦ Open Prompt Builder
                </button>
              </div>

              <div
                style={{
                  background: 'var(--base)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Option B: AI Overlay Cleaning
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.4 }}>
                  Infill burnt-in captions and watermark regions. Tagged strictly as <em>AI-Cleaned Reference</em>.
                </p>
                <button
                  onClick={() => {
                    onOpenCleaningModal(shot);
                    onClose();
                  }}
                  className="btn-ghost"
                  style={{ width: '100%', padding: '10px 14px', fontSize: 12, border: '1px solid var(--border)' }}
                >
                  ⟡ Open Cleaning Panel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
