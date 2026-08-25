import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  type ShotRecord,
  type ResolvedAssetRecord,
  type CleanAssetRecord,
  type ReplacementRecord,
  type GeneratedAssetPrompt,
  isProductionEligible,
} from '../../types/assets';
import { RightsBadge } from '../ui/RightsBadge';
import { ClipPreviewModal } from '../modals/ClipPreviewModal';

interface ResolveShotWorkbenchProps {
  shot: ShotRecord | null;
  referenceVideoUrl?: string;
  onClose: () => void;
  onResolveAsset: (
    shotId: string,
    resolvedAsset: ResolvedAssetRecord,
    updatedShotStatus: { resolution_status: any; rights_status: any; next_action_label: string },
    cleanMaster?: CleanAssetRecord,
    replacement?: ReplacementRecord,
    prompt?: GeneratedAssetPrompt
  ) => void;
}

export function ResolveShotWorkbench({ shot, referenceVideoUrl, onClose, onResolveAsset }: ResolveShotWorkbenchProps) {
  const [activeChoice, setActiveChoice] = useState<'attach' | 'generate' | 'reconstruct'>('attach');
  const [showEvidenceSearch, setShowEvidenceSearch] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Choice A: Attach Clean Master state
  const [cleanTitle, setCleanTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [rightsNote, setRightsNote] = useState('');
  const [ownershipStatus, setOwnershipStatus] = useState<'user_owned' | 'licensed_clean_source' | 'public_domain_candidate' | 'unresolved'>('user_owned');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Choice B: Create Original Equivalent state
  const [visualRole, setVisualRole] = useState('Process B-roll / Visual Proof');
  const [subjectType, setSubjectType] = useState('Anonymous professional / founder');
  const [setting, setSetting] = useState('Minimalist dark studio with directional lighting');
  const [lighting, setLighting] = useState('Directional warm spotlight, deep bokeh');
  const [cameraLens, setCameraLens] = useState('35mm film lens, shallow depth of field');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [negativePrompt, setNegativePrompt] = useState('watermarks, logos, protected celebrity faces, text overlays, blur, distorted limbs');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Choice C: Reconstruct Reference Still state
  const [maskCaptions, setMaskCaptions] = useState(true);
  const [maskWatermark, setMaskWatermark] = useState(true);
  const [cropReframe, setCropReframe] = useState(false);
  const [isReconstructing, setIsReconstructing] = useState(false);
  const [previewReconstructed, setPreviewReconstructed] = useState(false);

  if (!shot) return null;

  const synthesizedPrompt = `Cinematic ${cameraLens} of ${subjectType} in ${setting}. ${lighting}. High visual energy, 8k resolution, photorealistic, aspect ratio --ar ${aspectRatio === '9:16' ? '9:16' : aspectRatio === '16:9' ? '16:9' : '1:1'} --no ${negativePrompt}`;

  // ── Handle Choice A: Attach Clean Master ───────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/') && !file.type.startsWith('image/')) {
      setUploadError('Please select a valid video or image master file.');
      return;
    }
    setUploadError(null);
    setSelectedFile(file);
    if (!cleanTitle) setCleanTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleSaveCleanMaster = () => {
    if (!selectedFile) {
      setUploadError('Please select a master file to attach.');
      return;
    }
    const isEligible = isProductionEligible(ownershipStatus);
    if (isEligible && !rightsNote.trim()) {
      setUploadError('Please enter a rights / authorization note to confirm clearance.');
      return;
    }

    const fileUrl = URL.createObjectURL(selectedFile);
    const isVid = selectedFile.type.startsWith('video/');

    const resolvedAsset: ResolvedAssetRecord = {
      id: `master_${shot.shot_id}_${Date.now()}`,
      shot_id: shot.shot_id,
      asset_kind: 'attached_master',
      output_type: isEligible ? 'authorized_asset_master' : 'reference_evidence',
      title: cleanTitle.trim() || selectedFile.name,
      media_type: isVid ? 'video' : 'image',
      url: fileUrl,
      dimensions: '1080x1920',
      duration: isVid ? shot.duration : undefined,
      rights_status: ownershipStatus,
      production_eligible: isEligible,
      source_title: cleanTitle.trim() || 'Attached Clean Master',
      source_url: sourceUrl.trim() || undefined,
      rights_note: rightsNote.trim() || (isEligible ? 'Authorized clean master attached by user' : 'Rights unresolved. Non-production attachment.'),
      transformation_history: [`Attached local master: ${selectedFile.name} (Rights: ${ownershipStatus})`],
      created_at: Date.now(),
    };

    const cleanRecord: CleanAssetRecord = {
      id: resolvedAsset.id,
      shot_id: shot.shot_id,
      asset_kind: 'attached_master',
      asset_type: isVid ? 'clip' : 'still',
      title: resolvedAsset.title,
      url: fileUrl,
      dimensions: '1080x1920',
      duration: isVid ? shot.duration : undefined,
      rights_status: ownershipStatus,
      production_eligible: isEligible,
      source_title: resolvedAsset.source_title || 'Attached Master',
      source_url: resolvedAsset.source_url,
      rights_note: resolvedAsset.rights_note,
      transformation_history: resolvedAsset.transformation_history,
      created_at: Date.now(),
    };

    onResolveAsset(
      shot.shot_id,
      resolvedAsset,
      {
        resolution_status: isEligible ? 'clean_master_attached' : 'rights_unresolved',
        rights_status: ownershipStatus,
        next_action_label: isEligible
          ? 'Authorized clean master attached'
          : 'Rights unresolved — verify clearance before production',
      },
      cleanRecord
    );
    onClose();
  };

  // ── Handle Choice B: Create Original Equivalent ───────────────────────────
  const handleSaveOriginalEquivalent = () => {
    const promptRecord: GeneratedAssetPrompt = {
      id: `prompt_${shot.shot_id}_${Date.now()}`,
      title: `Original Equivalent for ${shot.shot_id.toUpperCase()}`,
      category: 'anonymous_founders',
      aspect_ratio: aspectRatio,
      prompt: synthesizedPrompt,
      negative_prompt: negativePrompt,
      style_tokens: [visualRole, cameraLens, lighting],
      intended_use: 'Original functional equivalent for edit',
      model_target: 'midjourney',
      provenance_type: 'generated_replacement',
      created_at: Date.now(),
    };

    const resolvedAsset: ResolvedAssetRecord = {
      id: `gen_${shot.shot_id}_${Date.now()}`,
      shot_id: shot.shot_id,
      asset_kind: 'generated_original',
      output_type: 'generated_original',
      title: `Generated Original (${shot.shot_id.toUpperCase()})`,
      media_type: 'image',
      url: shot.frame_url,
      dimensions: aspectRatio === '9:16' ? '1080x1920' : '1920x1080',
      rights_status: 'generated_original',
      production_eligible: true,
      prompt: synthesizedPrompt,
      negative_prompt: negativePrompt,
      model_target: 'Midjourney v6.1 / Flux Pro',
      rights_note: 'Rights-safe functional equivalent generated without copyrighted likenesses.',
      transformation_history: [
        `Decomposed reference ${shot.shot_id}`,
        'Synthesized original equivalent prompt',
        'Tagged as Generated Original (Production Eligible)',
      ],
      created_at: Date.now(),
    };

    const replacementRecord: ReplacementRecord = {
      id: resolvedAsset.id,
      shot_id: shot.shot_id,
      asset_kind: 'generated_original',
      replacement_type: 'generated_original',
      title: resolvedAsset.title,
      url: shot.frame_url,
      prompt: synthesizedPrompt,
      negative_prompt: negativePrompt,
      model_provider: 'Midjourney v6.1 / Flux Pro',
      dimensions: resolvedAsset.dimensions || '1080x1920',
      rights_status: 'generated_original',
      production_eligible: true,
      rights_note: resolvedAsset.rights_note,
      transformation_history: resolvedAsset.transformation_history,
      created_at: Date.now(),
    };

    onResolveAsset(
      shot.shot_id,
      resolvedAsset,
      {
        resolution_status: 'generated_original_ready',
        rights_status: 'generated_original',
        next_action_label: 'Generated Original Ready',
      },
      undefined,
      replacementRecord,
      promptRecord
    );
    onClose();
  };

  // ── Handle Choice C: Reconstruct Reference Still ───────────────────────────
  const handleSimulateInpaint = () => {
    setIsReconstructing(true);
    setTimeout(() => {
      setIsReconstructing(false);
      setPreviewReconstructed(true);
    }, 700);
  };

  const handleSaveReconstructedStill = () => {
    const resolvedAsset: ResolvedAssetRecord = {
      id: `reconstructed_still_${shot.shot_id}_${Date.now()}`,
      shot_id: shot.shot_id,
      asset_kind: 'reconstructed_still',
      output_type: 'ai_cleaned_reference_still',
      title: `Reconstructed Reference Still (${shot.shot_id.toUpperCase()})`,
      media_type: 'image',
      url: shot.frame_url,
      dimensions: '1080x1920 (9:16 Still)',
      rights_status: 'reference_only',
      production_eligible: false,
      rights_note: 'Reconstructed still for moodboard / research only. Not verified clean source video.',
      transformation_history: [
        `Inpainted overlay bounding boxes: ${[maskCaptions && 'captions', maskWatermark && 'watermark', cropReframe && 'crop'].filter(Boolean).join(', ')}`,
        'Saved as AI-Cleaned Reference Still (Research Only)',
      ],
      created_at: Date.now(),
    };

    const replacementRecord: ReplacementRecord = {
      id: resolvedAsset.id,
      shot_id: shot.shot_id,
      asset_kind: 'reconstructed_still',
      replacement_type: cropReframe ? 'crop_reframe' : 'ai_cleaned_reference',
      title: resolvedAsset.title,
      url: shot.frame_url,
      prompt: `Inpainted overlay regions: ${[maskCaptions && 'captions', maskWatermark && 'watermark'].filter(Boolean).join(', ')}`,
      model_provider: 'Clario Still Inpainter v1',
      dimensions: '1080x1920',
      rights_status: 'reference_only',
      production_eligible: false,
      rights_note: resolvedAsset.rights_note,
      transformation_history: resolvedAsset.transformation_history,
      created_at: Date.now(),
    };

    onResolveAsset(
      shot.shot_id,
      resolvedAsset,
      {
        resolution_status: 'reference_still_reconstructed',
        rights_status: 'reference_only',
        next_action_label: 'Reference Still Reconstructed (Research Only)',
      },
      undefined,
      replacementRecord
    );
    onClose();
  };

  const isCurrentEligible = isProductionEligible(ownershipStatus);

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(11, 13, 18, 0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 99990,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
        onClick={onClose}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: 680,
            maxHeight: '90vh',
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* ── Header ─────────────────────────────────────────────────────────── */}
          <div
            style={{
              padding: '20px 28px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--panel)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                <span style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                  RESOLVE {shot.shot_id.toUpperCase()}
                </span>
                <RightsBadge status={shot.rights_status || shot.license_status} size="sm" />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                What usable asset should be used for this {shot.duration.toFixed(1)}s shot?
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                width: 32,
                height: 32,
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {/* ── Compact Evidence Header with 9:16 Aspect Ratio ─────────────────── */}
          <div
            style={{
              padding: '16px 28px',
              background: 'var(--base)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              gap: 18,
              alignItems: 'center',
            }}
          >
            <div
              onClick={() => setPreviewModalOpen(true)}
              style={{
                position: 'relative',
                width: 54,
                height: 96,
                aspectRatio: '9 / 16',
                borderRadius: 8,
                overflow: 'hidden',
                background: '#000',
                flexShrink: 0,
                border: '1px solid var(--border)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                cursor: 'pointer',
              }}
              title="Click to preview reference clip"
            >
              <img src={shot.frame_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFF',
                  fontSize: 12,
                }}
              >
                ▶
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shot.likely_source !== 'Unresolved' ? shot.likely_source : shot.visual_description}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {shot.visual_description}
              </div>
              <button
                onClick={() => setPreviewModalOpen(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--accent)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 3,
                  marginRight: 10,
                }}
              >
                ▶ Preview Reference Clip
              </button>
              <button
                onClick={() => setShowEvidenceSearch(!showEvidenceSearch)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: 'var(--accent)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 4,
                }}
              >
                {showEvidenceSearch ? '▲ Hide Search Launchers' : '🔍 Search Possible Source ↗'}
              </button>
            </div>
          </div>

          {/* Optional Secondary Source Search Launcher Dropdown */}
          {showEvidenceSearch && (
            <div style={{ padding: '12px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
                Search Possible Source Candidates:
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(shot.search_queries || []).map((q, qi) => (
                  <a
                    key={qi}
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '4px 8px',
                      borderRadius: 4,
                      background: 'var(--panel)',
                      border: '1px solid var(--border)',
                      fontSize: 11,
                      color: 'var(--accent)',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    YouTube: “{q}” ↗
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* ── 3 Main Resolution Choices (Segmented Switcher) ─────────────────── */}
          <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--panel)' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 6,
                background: 'var(--surface-2)',
                padding: 4,
                borderRadius: 8,
              }}
            >
              <button
                onClick={() => setActiveChoice('attach')}
                style={{
                  padding: '8px 6px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: 'none',
                  background: activeChoice === 'attach' ? 'var(--panel)' : 'transparent',
                  color: activeChoice === 'attach' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: activeChoice === 'attach' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                1. Attach Master
              </button>
              <button
                onClick={() => setActiveChoice('generate')}
                style={{
                  padding: '8px 6px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: 'none',
                  background: activeChoice === 'generate' ? 'var(--panel)' : 'transparent',
                  color: activeChoice === 'generate' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: activeChoice === 'generate' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                2. Create Original
              </button>
              <button
                onClick={() => setActiveChoice('reconstruct')}
                style={{
                  padding: '8px 6px',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 6,
                  border: 'none',
                  background: activeChoice === 'reconstruct' ? 'var(--panel)' : 'transparent',
                  color: activeChoice === 'reconstruct' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: activeChoice === 'reconstruct' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                3. Reconstruct Still
              </button>
            </div>
          </div>

          {/* ── Choice Body ────────────────────────────────────────────────────── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* CHOICE A: ATTACH MASTER */}
            {activeChoice === 'attach' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                    Attach Asset Master
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Upload a clean video or still file. Declare ownership and rights status to control production-pack eligibility.
                  </p>
                </div>

                {uploadError && (
                  <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444', fontSize: 11 }}>
                    ⚠️ {uploadError}
                  </div>
                )}

                {/* Master File Picker */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 10,
                    padding: '20px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    background: selectedFile ? 'rgba(16,185,129,0.04)' : 'var(--base)',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {selectedFile ? `✓ ${selectedFile.name}` : '📁 Select clean video or still master file…'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Ready to attach` : 'Supports MP4, MOV, WebM, PNG, JPG'}
                  </div>
                </div>

                {/* Metadata & Rights Declaration */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Asset Master Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Apollo 11 Saturn V Launch (Master 1080p)"
                      value={cleanTitle}
                      onChange={e => setCleanTitle(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 12, outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                        Rights Status
                      </label>
                      <select
                        value={ownershipStatus}
                        onChange={e => setOwnershipStatus(e.target.value as any)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 12, outline: 'none', color: 'var(--text-primary)' }}
                      >
                        <option value="user_owned">User-Owned (Production Eligible)</option>
                        <option value="licensed_clean_source">Licensed Clean Source (Production Eligible)</option>
                        <option value="public_domain_candidate">Public-Domain Candidate (Unconfirmed)</option>
                        <option value="unresolved">Rights Unresolved (Excluded from Production Pack)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                        Source URL / Library Link
                      </label>
                      <input
                        type="url"
                        placeholder="https://images.nasa.gov/…"
                        value={sourceUrl}
                        onChange={e => setSourceUrl(e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 12, outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Rights Authorization Note {isCurrentEligible ? '(Required)' : '(Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder={isCurrentEligible ? 'e.g. Envato License #98231 or Self-shot 4K clip' : 'e.g. Attached for internal investigation only'}
                      value={rightsNote}
                      onChange={e => setRightsNote(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 12, outline: 'none' }}
                    />
                  </div>
                </div>

                {!isCurrentEligible && (
                  <div style={{ padding: '8px 12px', borderRadius: 6, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', fontSize: 11 }}>
                    ⚠️ <strong>Notice:</strong> This file is marked as <strong>{ownershipStatus.replace(/_/g, ' ').toUpperCase()}</strong>. It will be indexed under <em>Unresolved Attachments</em> and excluded from strict Production Packs until confirmed.
                  </div>
                )}

                <button
                  onClick={handleSaveCleanMaster}
                  className="btn-primary"
                  style={{
                    padding: '12px',
                    fontSize: 13,
                    background: isCurrentEligible ? 'var(--emerald)' : 'var(--surface-2)',
                    color: isCurrentEligible ? '#FFFFFF' : 'var(--text-primary)',
                    border: isCurrentEligible ? 'none' : '1px solid var(--border)',
                    marginTop: 8,
                  }}
                >
                  {isCurrentEligible ? '✓ Attach Production-Eligible Master' : '⚠️ Attach Unresolved Master (Non-Production)'}
                </button>
              </div>
            )}

            {/* CHOICE B: CREATE ORIGINAL EQUIVALENT */}
            {activeChoice === 'generate' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                    Create Original Equivalent
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Preserve visual function, pacing, and mood without copying named persons, film frames, logos, or protected designs.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Visual Function / Role
                    </label>
                    <input
                      type="text"
                      value={visualRole}
                      onChange={e => setVisualRole(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 11, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Subject / Action
                    </label>
                    <input
                      type="text"
                      value={subjectType}
                      onChange={e => setSubjectType(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 11, outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Setting & Background
                    </label>
                    <input
                      type="text"
                      value={setting}
                      onChange={e => setSetting(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 11, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Lighting Mood
                    </label>
                    <input
                      type="text"
                      value={lighting}
                      onChange={e => setLighting(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 11, outline: 'none' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Camera Lens & Angle
                    </label>
                    <input
                      type="text"
                      value={cameraLens}
                      onChange={e => setCameraLens(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 11, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      Aspect Ratio
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {(['9:16', '16:9', '1:1'] as const).map(ar => (
                        <button
                          key={ar}
                          type="button"
                          onClick={() => setAspectRatio(ar)}
                          style={{
                            flex: 1,
                            padding: '8px 4px',
                            borderRadius: 6,
                            border: '1px solid var(--border)',
                            background: aspectRatio === ar ? 'var(--accent)' : 'var(--base)',
                            color: aspectRatio === ar ? '#FFFFFF' : 'var(--text-secondary)',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {ar}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Negative Prompt (Disallowed Elements)
                  </label>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={e => setNegativePrompt(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 11, outline: 'none' }}
                  />
                </div>

                {/* Live Prompt Preview */}
                <div style={{ background: 'var(--base)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
                    Synthesized Generation Prompt:
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', lineHeight: 1.45 }}>
                    {synthesizedPrompt}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(synthesizedPrompt);
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 1500);
                    }}
                    className="btn-ghost"
                    style={{ flex: 1, padding: '10px', fontSize: 12, border: '1px solid var(--border)' }}
                  >
                    {copiedPrompt ? '✓ Copied Prompt!' : '📋 Copy Prompt'}
                  </button>
                  <button
                    onClick={handleSaveOriginalEquivalent}
                    className="btn-primary"
                    style={{ flex: 2, padding: '10px', fontSize: 12, background: 'var(--accent)' }}
                  >
                    ✦ Save as Generated Original
                  </button>
                </div>
              </div>
            )}

            {/* CHOICE C: RECONSTRUCT REFERENCE STILL */}
            {activeChoice === 'reconstruct' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
                    Reconstruct Reference Still (Research Only)
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Remove captions and UI overlays for moodboard and research exploration.
                  </p>
                </div>

                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#F59E0B', fontSize: 11, lineHeight: 1.45 }}>
                  ⚠️ <strong>Research-Only Caveat:</strong> Single-frame still inpainting is for research/moodboard exploration only. It does not produce continuous clean video or grant copyright clearance for the underlying footage.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--base)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={maskCaptions} onChange={e => setMaskCaptions(e.target.checked)} />
                    <span>Infill burnt-in captions / subtitle regions</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={maskWatermark} onChange={e => setMaskWatermark(e.target.checked)} />
                    <span>Infill platform watermarks & stickers</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={cropReframe} onChange={e => setCropReframe(e.target.checked)} />
                    <span>Reframe / punch-in (avoid border captions)</span>
                  </label>
                </div>

                {previewReconstructed ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ borderRadius: 8, overflow: 'hidden', height: 160, background: '#000', position: 'relative' }}>
                      <img src={shot.frame_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', color: '#FFF', fontSize: 10, padding: '2px 8px', borderRadius: 4 }}>
                        Inpainted Sample
                      </div>
                    </div>
                    <button
                      onClick={handleSaveReconstructedStill}
                      className="btn-primary"
                      style={{ padding: '12px', fontSize: 13, background: 'var(--text-primary)', color: '#FFFFFF' }}
                    >
                      ✓ Save as Reconstructed Reference Still
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSimulateInpaint}
                    disabled={isReconstructing}
                    className="btn-primary"
                    style={{ padding: '12px', fontSize: 13, background: 'var(--text-primary)', color: '#FFFFFF', marginTop: 8 }}
                  >
                    {isReconstructing ? '⏳ Inpainting Overlays…' : '⟡ Run Inpainting Preview'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {previewModalOpen && (
        <ClipPreviewModal
          shot={shot}
          referenceVideoUrl={referenceVideoUrl}
          onClose={() => setPreviewModalOpen(false)}
          onResolveThisShot={() => setPreviewModalOpen(false)}
        />
      )}
    </>,
    document.body
  );
}
