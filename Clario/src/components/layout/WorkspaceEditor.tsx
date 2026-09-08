import React, { useState, useRef } from 'react';
import type { HarvestProject } from '../../types/assets';
import { Film, Upload, Clock } from 'lucide-react';

interface WorkspaceEditorProps {
  project: HarvestProject | null;
  onUpdateProject: (project: HarvestProject) => void;
  onHarvestFiles: (files: File[]) => void;
  onExportPack: () => void;
}

export function WorkspaceEditor({
  project,
  onUpdateProject: _onUpdateProject,
  onHarvestFiles,
  onExportPack,
}: WorkspaceEditorProps) {
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) onHarvestFiles(Array.from(e.dataTransfer.files));
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const selectedShot = project?.shots.find(s => s.shot_id === selectedShotId) ?? null;

  return (
    <div className="flex-1 flex overflow-hidden pt-20">

      {/* ── LEFT SIDEBAR: Asset Library ────────────────────────────────────── */}
      <aside
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="w-72 shrink-0 clario-glass-panel border-y-0 border-l-0 border-r border-border-subtle flex flex-col"
      >
        {/* Sidebar header */}
        <div className="px-4 py-3 border-b border-border-subtle">
          <span className="pds-label mb-0">Asset Library</span>
        </div>

        {/* Shot list / empty state */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {!project || project.shots.length === 0 ? (
            /* ── Drop Zone ── */
            <button
              onClick={openFilePicker}
              className="clario-grid-bg clario-frame-card rounded-xl border-2 border-dashed border-border-mid hover:border-border-strong flex flex-col items-center justify-center gap-3 py-10 px-6 text-center transition-colors group w-full"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-muted-foreground group-hover:border-border-mid transition-colors">
                <Upload className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">Drop media here</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">or click to browse — MP4, MOV, WebM</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                className="sr-only"
                onChange={e => { if (e.target.files) onHarvestFiles(Array.from(e.target.files)); }}
              />
            </button>
          ) : (
            project.shots.map(shot => {
              const isSelected = selectedShotId === shot.shot_id;
              return (
                <button
                  key={shot.shot_id}
                  onClick={() => setSelectedShotId(shot.shot_id)}
                  className={[
                    'clario-frame-card flex items-center gap-2.5 p-2 rounded-lg text-left w-full transition-all duration-150',
                    isSelected
                      ? 'clario-glass-card ring-1 ring-border-strong'
                      : 'hover:bg-surface-2 border border-transparent hover:border-border-subtle',
                  ].join(' ')}
                >
                  {/* Thumbnail */}
                  <div className="w-10 h-[70px] bg-black rounded shrink-0 overflow-hidden border border-border-subtle">
                    <img
                      src={shot.frame_url}
                      alt={shot.shot_id}
                      className="w-full h-full object-cover opacity-90"
                    />
                  </div>
                  {/* Meta */}
                  <div className="flex flex-col justify-center gap-1 min-w-0">
                    <span className="text-[11px] font-bold font-mono text-foreground truncate">
                      {shot.shot_id}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-2.5 w-2.5" />
                      {shot.duration.toFixed(1)}s
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── CENTER CANVAS: Preview + Timeline ──────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent">

        {/* Canvas header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-3">
          <Film className="h-4 w-4 text-muted-foreground shrink-0" />
          <h2 className="font-display text-[15px] font-bold text-foreground tracking-tight">
            {project ? project.name : 'No Project Active'}
          </h2>
          {project && (
            <span className="ml-auto clario-glass-capsule px-2 py-0.5 rounded-full text-[9px] font-mono text-muted-foreground">
              {project.shots.length} shots
            </span>
          )}
        </div>

        {/* Preview area */}
        <div className="flex-1 flex items-center justify-center p-8">
          {project && selectedShot ? (
            <div className="clario-frame-card relative rounded-2xl overflow-hidden border border-white/10 shadow-float"
              style={{ width: '100%', maxWidth: 360, aspectRatio: '9/16' }}>
              {/* Specular rim handled by clario-frame-card::before */}
              <img
                src={selectedShot.frame_url}
                alt="Preview"
                className="w-full h-full object-contain bg-black"
              />
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-xl pl-1 hover:bg-white/25 transition-colors cursor-pointer">
                  ▶
                </div>
              </div>
              {/* Time code */}
              <div className="absolute bottom-3 left-3 clario-glass-capsule px-2 py-1 rounded-md text-[10px] font-mono text-white/70">
                {selectedShot.start_seconds.toFixed(1)}s – {selectedShot.end_seconds.toFixed(1)}s
              </div>
            </div>
          ) : (
            <div className="clario-ambient-glow clario-glass-card flex flex-col items-center gap-4 text-center px-8 py-16 rounded-2xl shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-surface-1 border border-border-subtle flex items-center justify-center shadow-sm">
                <Film className="h-5 w-5 text-foreground" />
              </div>
              <p className="text-[14px] text-foreground font-semibold">
                {project ? 'Select a shot from the library to preview.' : 'Harvest a video to get started.'}
              </p>
            </div>
          )}
        </div>

        {/* Timeline strip */}
        {project && project.shots.length > 0 && (
          <div className="h-28 shrink-0 border-t border-white/[0.06] bg-black/40 px-6 py-3 overflow-x-auto">
            <div className="flex gap-1.5 h-full">
              {project.shots.map(shot => (
                <button
                  key={shot.shot_id}
                  onClick={() => setSelectedShotId(shot.shot_id)}
                  title={`${shot.shot_id} (${shot.duration.toFixed(1)}s)`}
                  className={[
                    'h-full shrink-0 rounded overflow-hidden transition-all duration-150',
                    selectedShotId === shot.shot_id
                      ? 'ring-2 ring-white/60 opacity-100'
                      : 'opacity-60 hover:opacity-90 ring-1 ring-white/10',
                  ].join(' ')}
                  style={{ width: Math.max(shot.duration * 15, 32) }}
                >
                  <img
                    src={shot.frame_url}
                    className="w-full h-full object-cover bg-black"
                    alt={shot.shot_id}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Intelligence & Export ─────────────────────────────── */}
      <aside className="w-80 shrink-0 clario-glass-panel border-y-0 border-r-0 border-l border-border-subtle flex flex-col">

        {/* Panel header */}
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
          <span className="pds-label mb-0">Intelligence</span>
          <button
            onClick={onExportPack}
            disabled={!project}
            className="pds-btn-ghost px-3 py-1.5 rounded-lg text-[11px] gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: project ? 'rgba(16, 185, 129, 0.08)' : undefined, color: project ? 'var(--pds-success)' : undefined, borderColor: project ? 'rgba(16, 185, 129, 0.25)' : undefined }}
          >
            Export Pack →
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {project && selectedShot ? (
            <div className="flex flex-col gap-5 animate-enter">

              {/* Shot details */}
              <div className="pds-data-card p-4">
                <span className="pds-label">Shot Details</span>
                <p className="text-[13px] font-semibold text-foreground leading-snug">
                  {selectedShot.visual_description || 'No description available'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-2 font-mono">
                  {selectedShot.start_seconds.toFixed(1)}s — {selectedShot.end_seconds.toFixed(1)}s
                  &nbsp;·&nbsp;{selectedShot.duration.toFixed(1)}s duration
                </p>
              </div>

              {/* Cleaned caption */}
              {selectedShot.editor_text && (
                <div className="pds-data-card p-4" style={{ borderLeftColor: 'var(--pds-info)' }}>
                  <span className="pds-label" style={{ color: 'var(--pds-info)' }}>Cleaned Caption</span>
                  <p className="text-[13px] text-foreground leading-relaxed italic">
                    &ldquo;{selectedShot.editor_text}&rdquo;
                  </p>
                </div>
              )}

              {/* Rights action */}
              <button className="pds-btn-ghost w-full py-2.5 rounded-lg text-[12px] justify-center">
                Resolve Asset Rights
              </button>
            </div>
          ) : (
            <div className="clario-ambient-glow clario-glass-card flex flex-col items-center justify-center gap-3 text-center py-16 rounded-xl shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-surface-1 border border-border-subtle flex items-center justify-center shadow-sm">
                <Film className="h-4 w-4 text-foreground" />
              </div>
              <p className="text-[13px] text-foreground font-semibold leading-relaxed max-w-[180px]">
                Select a shot to view AI intelligence, transcripts, and rights resolution.
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
