import { useState } from 'react';
import {
  type HarvestProject,
  type ShotRecord,
  type ResolvedAssetRecord,
  type CleanAssetRecord,
  type ReplacementRecord,
  type GeneratedAssetPrompt,
  type ReferenceSegmentRecord,
  isProductionEligible,
} from '../types/assets';
import { RightsBadge } from '../components/ui/RightsBadge';
import { ResolveShotWorkbench } from '../components/workbenches/ResolveShotWorkbench';
import { ClipPreviewModal } from '../components/modals/ClipPreviewModal';
import { cutReferenceSegment } from '../lib/segmentCutter';
import { checkServerHealth, cutSegmentOnServer } from '../lib/apiClient';

interface HarvestStudioPhaseProps {
  project: HarvestProject;
  contactSheetUrl?: string;
  onUpdateProject: (project: HarvestProject) => void;
  onExportPack: () => void;
  onBackToHome: () => void;
}

export function HarvestStudioPhase({
  project,
  contactSheetUrl,
  onUpdateProject,
  onExportPack,
  onBackToHome,
}: HarvestStudioPhaseProps) {
  const [activeTab, setActiveTab] = useState<'queue' | 'library'>('queue');
  const [resolvingShot, setResolvingShot] = useState<ShotRecord | null>(null);
  const [previewingShot, setPreviewingShot] = useState<ShotRecord | null>(null);
  const [showContactSheetModal, setShowContactSheetModal] = useState(false);

  const cleanMasters = project.clean_assets || [];
  const replacements = project.replacements || [];
  const resolvedAssets = project.resolved_assets || [];
  const referenceSegments = project.reference_segments || [];

  const [segmentProcessing, setSegmentProcessing] = useState<Record<string, { status: 'idle' | 'processing' | 'error', progress?: number, error?: string }>>({});

  // Strict derived category lists
  const cleanMastersEligible = cleanMasters.filter(c => isProductionEligible(c.rights_status));
  const unresolvedAttachments = cleanMasters.filter(c => !isProductionEligible(c.rights_status));
  const generatedOriginals = replacements.filter(r => r.replacement_type === 'generated_original');
  const reconstructedStills = replacements.filter(
    r => r.replacement_type === 'ai_cleaned_reference' || r.replacement_type === 'crop_reframe'
  );

  const totalLibraryCount =
    cleanMastersEligible.length +
    unresolvedAttachments.length +
    generatedOriginals.length +
    reconstructedStills.length +
    referenceSegments.length;

  const handleCreateSegment = async (shot: ShotRecord) => {
    if (!project.reference_url) {
      alert("No reference video available to cut segment from.");
      return;
    }
    
    setSegmentProcessing(prev => ({ ...prev, [shot.shot_id]: { status: 'processing', progress: 0 } }));
    
    try {
      let result;
      const serverAvailable = await checkServerHealth();
      
      if (serverAvailable) {
        setSegmentProcessing(prev => ({ ...prev, [shot.shot_id]: { status: 'processing', progress: 50 } }));
        const serverResult = await cutSegmentOnServer(
          project.id,
          shot.shot_id,
          shot.start_seconds,
          shot.end_seconds
        );
        result = {
          filename: serverResult.filename,
          startSeconds: shot.start_seconds,
          endSeconds: shot.end_seconds,
          durationSeconds: shot.duration,
          width: 1920,
          height: 1080,
          hasAudio: true,
          url: serverResult.url,
        };
      } else {
        const res = await fetch(project.reference_url);
        const blob = await res.blob();
        
        const wasmResult = await cutReferenceSegment(
          {
            sourceFile: blob,
            shotId: shot.shot_id,
            startSeconds: shot.start_seconds,
            endSeconds: shot.end_seconds,
          },
          null,
          (progress) => {
            setSegmentProcessing(prev => ({ ...prev, [shot.shot_id]: { status: 'processing', progress } }));
          }
        );
        
        result = {
          ...wasmResult,
          url: URL.createObjectURL(wasmResult.blob)
        };
      }
      
      const newSegment: ReferenceSegmentRecord = {
        id: `segment_${shot.shot_id}_${Date.now()}`,
        project_id: project.id,
        shot_id: shot.shot_id,
        asset_kind: 'reference_segment',
        rights_status: 'reference_only',
        production_eligible: false,
        title: `${shot.shot_id.toUpperCase()} Reference Segment`,
        filename: result.filename,
        mime_type: 'video/mp4',
        start_seconds: result.startSeconds,
        end_seconds: result.endSeconds,
        duration_seconds: result.durationSeconds,
        width: result.width,
        height: result.height,
        has_audio: result.hasAudio,
        url: result.url,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      
      const updatedProject = {
        ...project,
        reference_segments: [...(project.reference_segments || []).filter(rs => rs.shot_id !== shot.shot_id), newSegment],
      };
      
      onUpdateProject(updatedProject);
      setSegmentProcessing(prev => ({ ...prev, [shot.shot_id]: { status: 'idle' } }));
    } catch (err: any) {
      console.error(err);
      setSegmentProcessing(prev => ({ ...prev, [shot.shot_id]: { status: 'error', error: err.message || 'Failed to cut segment' } }));
    }
  };

  // Helper to determine single resolution status & next-action line for a shot
  const getShotStatusAndAction = (shot: ShotRecord) => {
    // Check if clean master attached
    const attachedMaster = cleanMasters.find(c => c.shot_id === shot.shot_id);
    if (attachedMaster) {
      const isEligible = isProductionEligible(attachedMaster.rights_status);
      if (isEligible) {
        return {
          status: attachedMaster.rights_status || 'user_owned',
          statusLabel: 'Production-Eligible Master Attached',
          nextAction: 'Authorized clean master attached. Cleared for production pack export.',
        };
      } else {
        return {
          status: attachedMaster.rights_status || 'unresolved',
          statusLabel: 'Unresolved Attachment',
          nextAction: 'Attached file has unresolved rights. Excluded from strict production pack until clearance is verified.',
        };
      }
    }

    // Check if generated original exists
    const hasOriginal = replacements.some(
      r => r.shot_id === shot.shot_id && r.replacement_type === 'generated_original'
    );
    if (hasOriginal) {
      return {
        status: 'generated_original',
        statusLabel: 'Generated Original Ready',
        nextAction: 'Original functional equivalent synthesized. Cleared for production pack.',
      };
    }

    // Check if reconstructed still exists
    const hasStill = replacements.some(
      r =>
        r.shot_id === shot.shot_id &&
        (r.replacement_type === 'ai_cleaned_reference' || r.replacement_type === 'crop_reframe')
    );
    if (hasStill) {
      return {
        status: 'reference_only',
        statusLabel: 'Reference Still Reconstructed (Research Only)',
        nextAction: 'Still reconstructed for research/moodboard only. Attach clean master or generated original for production.',
      };
    }

    // Default status based on candidate license
    if (shot.license_status === 'public_domain_candidate') {
      return {
        status: 'public_domain_candidate',
        statusLabel: 'Public-Domain Candidate (Unconfirmed)',
        nextAction: 'Verify source license evidence or attach official archive master.',
      };
    }

    return {
      status: 'reference_only',
      statusLabel: 'Reference Only — Not Reusable',
      nextAction: 'Create an original equivalent or attach an authorized clean master.',
    };
  };

  const handleResolveAsset = (
    shotId: string,
    resolvedAsset: ResolvedAssetRecord,
    updatedStatus: { resolution_status: any; rights_status: any; next_action_label: string },
    cleanMaster?: CleanAssetRecord,
    replacement?: ReplacementRecord,
    prompt?: GeneratedAssetPrompt
  ) => {
    // Update shot in project
    const updatedShots = project.shots.map(s => {
      if (s.shot_id === shotId) {
        return {
          ...s,
          rights_status: updatedStatus.rights_status,
          resolution_status: updatedStatus.resolution_status,
          next_action_label: updatedStatus.next_action_label,
        };
      }
      return s;
    });

    const updatedClean = cleanMaster
      ? [...cleanMasters.filter(c => c.shot_id !== shotId), cleanMaster]
      : cleanMasters;

    const updatedRep = replacement
      ? [...replacements.filter(r => r.shot_id !== shotId), replacement]
      : replacements;

    const updatedPrompts = prompt
      ? [...project.generated_prompts.filter(p => p.id !== prompt.id), prompt]
      : project.generated_prompts;

    const updatedResolved = [
      ...resolvedAssets.filter(ra => ra.id !== resolvedAsset.id),
      resolvedAsset,
    ];

    const updatedProject: HarvestProject = {
      ...project,
      shots: updatedShots,
      clean_assets: updatedClean,
      replacements: updatedRep,
      generated_prompts: updatedPrompts,
      resolved_assets: updatedResolved,
      updated_at: Date.now(),
    };

    onUpdateProject(updatedProject);
  };

  return (
    <div
      className="phase-enter"
      style={{
        flex: 1,
        background: 'var(--base)',
        color: 'var(--text-primary)',
        padding: '24px 32px 80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* ── Top Header Bar ─────────────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: 1040,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onBackToHome}
            className="btn-ghost"
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            ← Home
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-display)',
                  margin: 0,
                }}
              >
                {project.name}
              </h1>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                }}
              >
                {project.shots.length} Shots
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {contactSheetUrl && (
            <button
              onClick={() => setShowContactSheetModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 12px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid var(--border)',
                background: 'var(--panel)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              🖼 View Contact Sheet
            </button>
          )}

          <button
            onClick={onExportPack}
            className="btn-primary"
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 700,
              background: 'var(--text-primary)',
              color: '#FFFFFF',
            }}
          >
            Review & Export Pack →
          </button>
        </div>
      </div>

      {/* ── Capability Boundary Notice ──────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          maxWidth: 1040,
          background: 'rgba(78, 108, 242, 0.05)',
          border: '1px solid rgba(78, 108, 242, 0.2)',
          borderRadius: 10,
          padding: '10px 16px',
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.4,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 14 }}>ℹ️</span>
        <span>
          <strong>Asset Resolution Studio:</strong> Clario analyzes reference videos and helps resolve rights-cleared assets. It does not currently render continuous cleaned video. Reconstructed stills are for research only; use verified clean masters or generated originals for production packs.
        </span>
      </div>

      {/* ── 2 Main Result Tabs (Queue vs Grouped Library) ───────────────────── */}
      <div style={{ width: '100%', maxWidth: 1040, marginBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            background: 'var(--surface-2)',
            padding: 3,
            borderRadius: 10,
            gap: 4,
            border: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setActiveTab('queue')}
            style={{
              flex: 1,
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              background: activeTab === 'queue' ? 'var(--panel)' : 'transparent',
              color: activeTab === 'queue' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: activeTab === 'queue' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>Shot Queue</span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 10,
                background: 'rgba(100,116,139,0.15)',
                color: 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {project.shots.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            style={{
              flex: 1,
              padding: '9px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              border: 'none',
              background: activeTab === 'library' ? 'var(--panel)' : 'transparent',
              color: activeTab === 'library' ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: activeTab === 'library' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <span>Asset Library</span>
            <span
              style={{
                fontSize: 10,
                padding: '1px 6px',
                borderRadius: 10,
                background: totalLibraryCount > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)',
                color: totalLibraryCount > 0 ? 'var(--emerald)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {totalLibraryCount}
            </span>
          </button>
        </div>
      </div>

      {/* ── TAB 1: SHOT QUEUE ───────────────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <div style={{ width: '100%', maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {project.shots.map((shot, idx) => {
            const { status, nextAction } = getShotStatusAndAction(shot);

            return (
              <div
                key={shot.shot_id || idx}
                className="paper-card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  background: 'var(--panel)',
                }}
              >
                {/* ── Top Row: Identity, Metadata, Action ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '84px 1fr auto', gap: 20, alignItems: 'center' }}>
                {/* Left: 9:16 Aspect Ratio Frame Thumbnail with Video Preview Launcher */}
                <div
                  onClick={() => setPreviewingShot(shot)}
                  style={{
                    position: 'relative',
                    width: 84,
                    height: 148,
                    aspectRatio: '9 / 16',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: '#000',
                    flexShrink: 0,
                    border: '1px solid var(--border)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                  }}
                  title="Click to preview reference clip"
                >
                  <img
                    src={shot.frame_url}
                    alt={shot.shot_id}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontSize: 16,
                    }}
                  >
                    ▶
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      left: 4,
                      right: 4,
                      background: 'rgba(0,0,0,0.7)',
                      borderRadius: 4,
                      padding: '2px 0',
                      fontSize: 9,
                      fontFamily: 'var(--font-mono)',
                      color: '#FFF',
                      textAlign: 'center',
                    }}
                  >
                    {shot.duration.toFixed(1)}s
                  </div>
                </div>

                {/* Center: Shot Metadata & OCR Separation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {shot.shot_id.toUpperCase()}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {shot.start_seconds.toFixed(1)}s – {shot.end_seconds.toFixed(1)}s
                    </span>
                    <RightsBadge status={status} size="sm" />
                    {shot.analysis_confidence === 'low' && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(100,116,139,0.1)',
                          border: '1px solid rgba(100,116,139,0.2)',
                          color: 'var(--text-muted)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        ANALYSIS: LOW (FALLBACK)
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                    {shot.likely_source !== 'Unresolved' ? shot.likely_source : shot.visual_description}
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.45 }}>
                    {shot.visual_description}
                  </p>

                  {/* OCR Text Separation */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
                    {shot.editor_text && (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: '#EF4444',
                        }}
                      >
                        <strong>Caption:</strong> “{shot.editor_text}”
                      </span>
                    )}
                    {shot.source_text && (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(78, 108, 242, 0.08)',
                          border: '1px solid rgba(78, 108, 242, 0.2)',
                          color: 'var(--accent)',
                        }}
                      >
                        <strong>Scene Text:</strong> “{shot.source_text}”
                      </span>
                    )}
                  </div>

                </div>

                {/* Right: Primary Action Button */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 170 }}>
                  <button
                    onClick={() => setResolvingShot(shot)}
                    className="btn-primary"
                    style={{
                      padding: '12px 20px',
                      fontSize: 13,
                      fontWeight: 700,
                      background: 'var(--text-primary)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      borderRadius: 10,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      cursor: 'pointer',
                    }}
                  >
                    <span>Resolve This Shot</span>
                    <span style={{ fontSize: 14 }}>→</span>
                  </button>
                </div>
                </div>

                {/* ── Bottom Row: Action Box & Reference Segment ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 2 }}>
                  {/* Next Action Box */}
                  <div
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 14 }}>👉</span>
                    <span>
                      <strong style={{ color: 'var(--text-primary)' }}>Next action:</strong> {nextAction}
                    </span>
                  </div>

                  {/* Reference Segment Section */}
                  <div className="glass-inset" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>REFERENCE SEGMENT</div>
                    </div>
                    {(() => {
                      const existingSegment = referenceSegments.find(rs => rs.shot_id === shot.shot_id);
                      const processState = segmentProcessing[shot.shot_id];
                      
                      if (existingSegment) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              Original trimmed video · {existingSegment.start_seconds.toFixed(1)}s–{existingSegment.end_seconds.toFixed(1)}s · <span style={{ color: '#EF4444', fontWeight: 600 }}>REFERENCE ONLY</span>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => setPreviewingShot(shot)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11 }}>▶ Preview Clip</button>
                              <a href={existingSegment.url} download={existingSegment.filename} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11, textDecoration: 'none' }}>⬇ Download</a>
                            </div>
                          </div>
                        );
                      }
                      
                      if (processState?.status === 'processing') {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                              Creating video segment… {Math.round(processState.progress || 0)}%
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {processState?.status === 'error' ? <span style={{ color: '#EF4444' }}>Error: {processState.error}</span> : 'Not rendered yet'}
                          </div>
                          <button onClick={() => handleCreateSegment(shot)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: 11 }}>
                            ✂️ Create Reference Segment
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: ASSET LIBRARY (Grouped Actual Output Artifacts) ─────────── */}
      {activeTab === 'library' && (
        <div style={{ width: '100%', maxWidth: 1040, display: 'flex', flexDirection: 'column', gap: 28 }}>
          {/* Section 1: Production-Eligible Asset Masters */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: 'var(--emerald)', margin: 0 }}>
                1. Production-Eligible Asset Masters ({cleanMastersEligible.length})
              </h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                User-owned or verified licensed clean masters cleared for production packs
              </span>
            </div>
            {cleanMastersEligible.length === 0 ? (
              <div className="paper-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No production-eligible clean masters attached yet. Click <strong>Resolve This Shot</strong> on any shot to attach authorized masters.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {cleanMastersEligible.map(asset => (
                  <div key={asset.id} className="paper-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{asset.shot_id.toUpperCase()}</span>
                      <RightsBadge status={asset.rights_status} size="sm" />
                    </div>
                    <div style={{ borderRadius: 6, overflow: 'hidden', height: 120, background: '#000' }}>
                      <img src={asset.url} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{asset.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{asset.source_title} · {asset.dimensions}</div>
                    {asset.rights_note && (
                      <div style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--base)', padding: '4px 6px', borderRadius: 4 }}>
                        Note: {asset.rights_note}
                      </div>
                    )}
                    <a
                      href={asset.url}
                      download={`${asset.title.replace(/\s+/g, '_')}.png`}
                      className="btn-primary"
                      style={{ textAlign: 'center', textDecoration: 'none', padding: '6px', fontSize: 11, background: 'var(--emerald)', marginTop: 'auto' }}
                    >
                      ⬇ Download Clean Master
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Unresolved Attachments */}
          {unresolvedAttachments.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: '#F59E0B', margin: 0 }}>
                  2. Unresolved Attachments ({unresolvedAttachments.length})
                </h3>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Attached for internal investigation; excluded from strict production packs
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {unresolvedAttachments.map(asset => (
                  <div
                    key={asset.id}
                    className="paper-card"
                    style={{
                      padding: 14,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      border: '1px solid rgba(245,158,11,0.3)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{asset.shot_id.toUpperCase()}</span>
                      <RightsBadge status={asset.rights_status} size="sm" />
                    </div>
                    <div style={{ borderRadius: 6, overflow: 'hidden', height: 120, background: '#000' }}>
                      <img src={asset.url} alt={asset.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{asset.title}</div>
                    <div style={{ fontSize: 11, color: '#F59E0B' }}>⚠️ Rights Unresolved — excluded from production packs</div>
                    <a
                      href={asset.url}
                      download={`${asset.title.replace(/\s+/g, '_')}_unresolved.png`}
                      className="btn-ghost"
                      style={{ textAlign: 'center', textDecoration: 'none', padding: '6px', fontSize: 11, border: '1px solid var(--border)', marginTop: 'auto' }}
                    >
                      ⬇ Download Attachment (Unresolved)
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Generated Originals */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', margin: 0 }}>
                {unresolvedAttachments.length > 0 ? '3' : '2'}. Generated Originals ({generatedOriginals.length})
              </h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Original functional equivalents synthesized without protected likenesses
              </span>
            </div>
            {generatedOriginals.length === 0 ? (
              <div className="paper-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No generated originals yet. Click <strong>Resolve This Shot → Create Original Equivalent</strong> to synthesize prompts.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {generatedOriginals.map(rep => (
                  <div key={rep.id} className="paper-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{rep.shot_id.toUpperCase()}</span>
                      <RightsBadge status="generated_original" size="sm" />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{rep.title}</div>
                    <div
                      style={{
                        padding: 6,
                        background: 'var(--base)',
                        borderRadius: 6,
                        fontSize: 10,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                        maxHeight: 60,
                        overflowY: 'auto',
                      }}
                    >
                      {rep.prompt}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                      <button
                        onClick={() => navigator.clipboard.writeText(rep.prompt)}
                        className="btn-ghost"
                        style={{ flex: 1, padding: '6px', fontSize: 11, border: '1px solid var(--border)' }}
                      >
                        📋 Copy Prompt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Reconstructed Reference Stills */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>
                {unresolvedAttachments.length > 0 ? '4' : '3'}. Reconstructed Reference Stills — Research Only ({reconstructedStills.length})
              </h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Moodboard & internal research stills only; not clean video
              </span>
            </div>
            {reconstructedStills.length === 0 ? (
              <div className="paper-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No reconstructed reference stills.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {reconstructedStills.map(rep => (
                  <div key={rep.id} className="paper-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{rep.shot_id.toUpperCase()}</span>
                      <RightsBadge status="reference_only" size="sm" />
                    </div>
                    <div style={{ borderRadius: 6, overflow: 'hidden', height: 120, background: '#000' }}>
                      <img src={rep.url} alt={rep.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{rep.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>⚠️ Reconstructed still for moodboard / internal research only.</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Section 5: Reference Segments */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>
                {unresolvedAttachments.length > 0 ? '5' : '4'}. Reference Segments — Research Only ({referenceSegments.length})
              </h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Trimmed original reference videos; strictly excluded from production packs
              </span>
            </div>
            {referenceSegments.length === 0 ? (
              <div className="paper-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No reference segments cut yet. Click <strong>Create Reference Segment</strong> on any shot.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {referenceSegments.map(rs => (
                  <div key={rs.id} className="paper-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{rs.shot_id.toUpperCase()}</span>
                      <RightsBadge status="reference_only" size="sm" />
                    </div>
                    <div style={{ borderRadius: 6, overflow: 'hidden', height: 120, background: '#000', position: 'relative' }}>
                      <video src={rs.url} muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: 'white', fontSize: 24 }}>▶</span>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{rs.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{rs.duration_seconds.toFixed(1)}s · {rs.width}x{rs.height}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>⚠️ Reference segment. Not cleared for production.</div>
                    <a
                      href={rs.url}
                      download={rs.filename}
                      className="btn-ghost"
                      style={{ textAlign: 'center', textDecoration: 'none', padding: '6px', fontSize: 11, border: '1px solid var(--border)', marginTop: 'auto' }}
                    >
                      ⬇ Download Reference Segment
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Unified Single Resolve Workbench Modal ──────────────────────────── */}
      <ResolveShotWorkbench
        shot={resolvingShot}
        referenceVideoUrl={project.reference_url}
        onClose={() => setResolvingShot(null)}
        onResolveAsset={handleResolveAsset}
      />

      {/* ── Interactive Clip Preview Modal ─────────────────────────────────── */}
      <ClipPreviewModal
        shot={previewingShot}
        referenceVideoUrl={project.reference_url}
        onClose={() => setPreviewingShot(null)}
        onResolveThisShot={shotToResolve => {
          setPreviewingShot(null);
          setResolvingShot(shotToResolve);
        }}
      />

      {/* ── Contact Sheet Modal Preview ────────────────────────────────────── */}
      {showContactSheetModal && contactSheetUrl && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 19, 24, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
          onClick={() => setShowContactSheetModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--panel)',
              borderRadius: 16,
              padding: 24,
              maxWidth: 900,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Reference Contact Sheet</h3>
              <a
                href={contactSheetUrl}
                download={`${project.name.replace(/\s+/g, '_')}_contact_sheet.jpg`}
                className="btn-primary"
                style={{ textDecoration: 'none', padding: '6px 12px', fontSize: 12 }}
              >
                ⬇ Download High-Res JPG
              </a>
            </div>
            <img src={contactSheetUrl} alt="Contact sheet" style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
