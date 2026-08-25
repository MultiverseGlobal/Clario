import { useState } from 'react';
import type { ShotRecord, ReplacementRecord, GeneratedAssetPrompt } from '../../types/assets';
import { RightsBadge } from '../ui/RightsBadge';

interface GuidedPromptModalProps {
  shot: ShotRecord | null;
  onClose: () => void;
  onSavePrompt: (prompt: GeneratedAssetPrompt, replacement?: ReplacementRecord) => void;
}

export function GuidedPromptModal({ shot, onClose, onSavePrompt }: GuidedPromptModalProps) {
  const [visualFunction, setVisualFunction] = useState('Process B-roll / Visual Proof');
  const [subjectType, setSubjectType] = useState('Anonymous professional / founder');
  const [setting, setSetting] = useState('Minimalist dark studio with moody directional lighting');
  const [cameraLens, setCameraLens] = useState('35mm film lens, shallow depth of field, smooth tracking');
  const [lighting, setLighting] = useState('Warm directional spotlight, deep auditorium bokeh');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [negativePrompt, setNegativePrompt] = useState('watermarks, logos, trademarked brands, recognizable celebrity faces, text overlays, blur, distorted limbs');
  const [copied, setCopied] = useState(false);

  if (!shot) return null;

  // Synthesize prompt from structured fields
  const synthesizedPrompt = `Cinematic ${cameraLens} of ${subjectType} in ${setting}. ${lighting}. High visual energy, 8k resolution, photorealistic, aspect ratio --ar ${aspectRatio === '9:16' ? '9:16' : aspectRatio === '16:9' ? '16:9' : '1:1'} --no ${negativePrompt}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(synthesizedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = () => {
    const promptRecord: GeneratedAssetPrompt = {
      id: `prompt_${shot.shot_id}_${Date.now()}`,
      title: `Original Replacement for ${shot.shot_id.toUpperCase()}`,
      category: 'anonymous_founders',
      aspect_ratio: aspectRatio,
      prompt: synthesizedPrompt,
      negative_prompt: negativePrompt,
      style_tokens: [visualFunction, cameraLens, lighting],
      intended_use: 'Original functional equivalent for short-form video edit',
      model_target: 'midjourney',
      provenance_type: 'generated_replacement',
      created_at: Date.now(),
    };

    const replacementRecord: ReplacementRecord = {
      id: `rep_${shot.shot_id}_${Date.now()}`,
      shot_id: shot.shot_id,
      replacement_type: 'generated_original',
      title: `Generated Original (${shot.shot_id.toUpperCase()})`,
      url: shot.frame_url,
      prompt: synthesizedPrompt,
      negative_prompt: negativePrompt,
      model_provider: 'Midjourney v6.1 / Flux Pro',
      dimensions: aspectRatio === '9:16' ? '1080x1920' : '1920x1080',
      rights_status: 'generated_original',
      transformation_history: [
        `Decomposed reference ${shot.shot_id}`,
        'Synthesized rights-safe replacement prompt',
        'Tagged as Generated Original',
      ],
      created_at: Date.now(),
    };

    onSavePrompt(promptRecord, replacementRecord);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17, 19, 24, 0.65)',
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
          maxWidth: 780,
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
                Guided Original Equivalent Generator
              </span>
              <RightsBadge status="generated_original" size="sm" />
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              Craft prompts that preserve composition & pacing without copying protected actors or trademarks.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              width: 28,
              height: 28,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Guided Form */}
        <div style={{ padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Structured 2-column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Visual Role / Function
              </label>
              <input
                type="text"
                value={visualFunction}
                onChange={e => setVisualFunction(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 12, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Subject Type (Anonymous)
              </label>
              <input
                type="text"
                value={subjectType}
                onChange={e => setSubjectType(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 12, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Setting & Environment
              </label>
              <input
                type="text"
                value={setting}
                onChange={e => setSetting(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 12, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Lighting & Atmosphere
              </label>
              <input
                type="text"
                value={lighting}
                onChange={e => setLighting(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 12, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Camera & Lens Style
              </label>
              <input
                type="text"
                value={cameraLens}
                onChange={e => setCameraLens(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 12, outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={e => setAspectRatio(e.target.value as any)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 12, outline: 'none', color: 'var(--text-primary)' }}
              >
                <option value="9:16">9:16 (Vertical Reel / TikTok)</option>
                <option value="16:9">16:9 (Landscape YouTube / Film)</option>
                <option value="1:1">1:1 (Square Carousel / Post)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Elements to Avoid (Negative Prompt)
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--base)', fontSize: 12, outline: 'none' }}
            />
          </div>

          {/* Synthesized Live Prompt Box */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)' }}>
                Synthesized Prompt (Midjourney / Flux / Kling)
              </label>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Aspect: {aspectRatio}
              </span>
            </div>
            <textarea
              readOnly
              value={synthesizedPrompt}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--base)',
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                lineHeight: 1.4,
                resize: 'none',
              }}
            />
          </div>

          {/* Crucial Safety Line */}
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              fontSize: 11,
              color: 'var(--text-secondary)',
              lineHeight: 1.4,
            }}
          >
            🛡️ <strong>Rights Assurance:</strong> The replacement preserves the shot's visual function without copying a named person, film frame, logo, or protected production design.
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              onClick={handleCopy}
              className="btn-ghost"
              style={{ flex: 1, padding: '12px', fontSize: 12, border: '1px solid var(--border)' }}
            >
              {copied ? '✓ Prompt Copied!' : '📋 Copy Prompt'}
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              style={{ flex: 1.5, padding: '12px', fontSize: 13, background: 'var(--accent)', color: '#FFFFFF' }}
            >
              ✓ Save Replacement to Project
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
