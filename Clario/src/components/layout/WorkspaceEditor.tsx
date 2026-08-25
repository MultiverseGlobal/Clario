import React, { useState } from 'react';
import type { HarvestProject } from '../../types/assets';

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onHarvestFiles(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 60px)',
        background: 'var(--base)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        overflow: 'hidden',
      }}
    >
      {/* ── LEFT SIDEBAR: Library & Ingest ── */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          width: 320,
          borderRight: '1px solid var(--border)',
          background: 'var(--panel)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Asset Library
          </h2>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!project || project.shots.length === 0 ? (
            <div
              style={{
                border: '2px dashed var(--border-strong)',
                borderRadius: 12,
                padding: 30,
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: 13,
                background: 'rgba(0,0,0,0.1)',
                cursor: 'pointer',
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'video/mp4,video/quicktime,video/webm';
                input.onchange = (e: any) => {
                  if (e.target.files) onHarvestFiles(Array.from(e.target.files));
                };
                input.click();
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
              <strong>Drag & Drop Media</strong>
              <div style={{ fontSize: 11, marginTop: 4 }}>or click to browse</div>
            </div>
          ) : (
            project.shots.map((shot) => (
              <div
                key={shot.shot_id}
                onClick={() => setSelectedShotId(shot.shot_id)}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: 8,
                  borderRadius: 8,
                  background: selectedShotId === shot.shot_id ? 'var(--surface-2)' : 'transparent',
                  border: selectedShotId === shot.shot_id ? '1px solid var(--accent)' : '1px solid transparent',
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 40, height: 70, background: '#000', borderRadius: 4, overflow: 'hidden' }}>
                  <img src={shot.frame_url} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{shot.shot_id}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{shot.duration.toFixed(1)}s</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── CENTER CANVAS: Editor / Timeline ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0A0B0E' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, fontFamily: 'var(--font-display)' }}>
            {project ? project.name : 'No Project Active'}
          </h2>
        </div>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          {project && selectedShotId ? (
            <div style={{ width: '100%', maxWidth: 400, aspectRatio: '9/16', background: '#000', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
              <img 
                src={project.shots.find(s => s.shot_id === selectedShotId)?.frame_url} 
                alt="Preview" 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
              />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                 <div style={{ width: 60, height: 60, borderRadius: 30, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: 24 }}>▶</div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Select a shot from the library to preview.</div>
          )}
        </div>

        {/* Timeline representation */}
        {project && project.shots.length > 0 && (
           <div style={{ height: 120, borderTop: '1px solid var(--border)', background: 'var(--panel)', padding: '16px 24px', overflowX: 'auto', display: 'flex', gap: 2 }}>
             {project.shots.map(shot => (
               <div 
                 key={shot.shot_id}
                 onClick={() => setSelectedShotId(shot.shot_id)}
                 style={{ 
                   height: '100%', 
                   width: Math.max(shot.duration * 15, 30), // Visual scaling
                   background: '#000',
                   border: selectedShotId === shot.shot_id ? '2px solid var(--accent)' : '1px solid var(--border)',
                   borderRadius: 4,
                   overflow: 'hidden',
                   cursor: 'pointer'
                 }}
                 title={`${shot.shot_id} (${shot.duration.toFixed(1)}s)`}
               >
                 <img src={shot.frame_url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
               </div>
             ))}
           </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Intelligence & Export ── */}
      <div style={{ width: 340, borderLeft: '1px solid var(--border)', background: 'var(--panel)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Intelligence
          </h2>
          <button 
            onClick={onExportPack}
            disabled={!project}
            className="btn-primary" 
            style={{ padding: '6px 12px', fontSize: 11, background: 'var(--emerald)', opacity: project ? 1 : 0.5 }}
          >
            Export Pack →
          </button>
        </div>

        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
           {project && selectedShotId ? (() => {
             const shot = project.shots.find(s => s.shot_id === selectedShotId)!;
             return (
               <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                 <div>
                   <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>SHOT DETAILS</div>
                   <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{shot.visual_description || 'No description available'}</div>
                   <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>{shot.start_seconds.toFixed(1)}s - {shot.end_seconds.toFixed(1)}s</div>
                 </div>
                 
                 {shot.editor_text && (
                   <div>
                     <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 700 }}>CLEANED CAPTION</div>
                     <div style={{ padding: 12, background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 8, fontSize: 13, color: '#38BDF8' }}>
                       "{shot.editor_text}"
                     </div>
                   </div>
                 )}

                 <button className="btn-secondary" style={{ padding: '10px', fontSize: 12, width: '100%' }}>
                   Resolve Asset Rights
                 </button>
               </div>
             );
           })() : (
             <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
               Select a shot to view its AI intelligence, transcripts, and rights resolution status.
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
