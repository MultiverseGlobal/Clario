import { useState } from 'react';
import type { ShotRecord, ReplacementRecord } from '../../types/assets';
import { RightsBadge } from '../ui/RightsBadge';

interface CleanOverlayModalProps {
  shot: ShotRecord | null;
  onClose: () => void;
  onSaveCleanedAsset: (asset: ReplacementRecord) => void;
}

export function CleanOverlayModal({ shot, onClose, onSaveCleanedAsset }: CleanOverlayModalProps) {
  const [maskCaptions, setMaskCaptions] = useState(true);
  const [maskWatermark, setMaskWatermark] = useState(true);
  const [cropReframe, setCropReframe] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewCleaned, setPreviewCleaned] = useState(false);

  if (!shot) return null;

  const handleSimulateInpaint = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setPreviewCleaned(true);
    }, 800);
  };

  const handleSave = () => {
    const cleanedAsset: ReplacementRecord = {
      id: `cleaned_${shot.shot_id}_${Date.now()}`,
      shot_id: shot.shot_id,
      replacement_type: cropReframe ? 'crop_reframe' : 'ai_cleaned_reference',
      title: `Reconstructed Research Still (${shot.shot_id.toUpperCase()})`,
      url: shot.frame_url,
      prompt: `Inpainted overlay regions: ${[maskCaptions && 'captions', maskWatermark && 'watermarks', cropReframe && 'crop'].filter(Boolean).join(', ')}`,
      model_provider: 'Clario Research Inpainter v1',
      dimensions: '1080x1920 (9:16)',
      rights_status: 'ai_cleaned_reference',
      transformation_history: [
        'Detected burnt-in overlay bounding boxes',
        'Inpainted background texture with contextual blend',
        'Tagged as Reconstructed Reference Still (Research Only)',
      ],
      created_at: Date.now(),
    };

    onSaveCleanedAsset(cleanedAsset);
    onClose();
  };

  return (
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
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 880,
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                Experimental Still Inpainting — Research Only
              </span>
              <RightsBadge status="reference_only" size="sm" />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              Infill burnt-in editor text & watermark regions on a single frame still for moodboard / pitch research.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* Warning Banner */}
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
            padding: '10px 24px',
            fontSize: 12,
            color: '#B45309',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>⚠️</span>
          <span>
            <strong>Research Boundary:</strong> Inpainting this frame generates a reference still only. It does not restore continuous clean video and does not grant commercial copyright clearance.
          </span>
        </div>

        {/* Content Body */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', padding: 24, gap: 24, overflowY: 'auto' }}>
          {/* Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
              Inpainting Directives
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={maskCaptions}
                onChange={e => setMaskCaptions(e.target.checked)}
              />
              <span>Infill Editor Captions ({shot.editor_text ? 'Detected' : 'None'})</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={maskWatermark}
                onChange={e => setMaskWatermark(e.target.checked)}
              />
              <span>Infill Creator Watermarks / Logos</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13 }}>
              <input
                type="checkbox"
                checked={cropReframe}
                onChange={e => setCropReframe(e.target.checked)}
              />
              <span>Crop & Center (Remove Periphery)</span>
            </label>

            <button
              onClick={handleSimulateInpaint}
              disabled={isProcessing}
              className="btn-primary"
              style={{ marginTop: 12, padding: '10px 16px', fontSize: 13 }}
            >
              {isProcessing ? 'Simulating Inpaint…' : 'Run Inpaint Preview'}
            </button>
          </div>

          {/* Preview Canvas */}
          <div
            style={{
              background: '#07090D',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              minHeight: 280,
            }}
          >
            <div
              style={{
                width: 160,
                height: 284,
                borderRadius: 8,
                overflow: 'hidden',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <img
                src={shot.frame_url}
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: previewCleaned ? 'brightness(1.05) contrast(1.02)' : 'none',
                }}
              />
              {previewCleaned && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    right: 8,
                    background: 'rgba(0,0,0,0.7)',
                    color: '#FFF',
                    fontSize: 10,
                    padding: '2px 4px',
                    borderRadius: 4,
                    textAlign: 'center',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  STILL RECONSTRUCTED
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            background: 'var(--panel)',
          }}
        >
          <button onClick={onClose} className="btn-ghost" style={{ padding: '8px 16px', fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!previewCleaned}
            className="btn-primary"
            style={{
              padding: '8px 20px',
              fontSize: 13,
              background: previewCleaned ? 'var(--text-primary)' : 'var(--surface-2)',
              color: previewCleaned ? '#FFFFFF' : 'var(--text-muted)',
              cursor: previewCleaned ? 'pointer' : 'not-allowed',
            }}
          >
            Save Reconstructed Still
          </button>
        </div>
      </div>
    </div>
  );
}
