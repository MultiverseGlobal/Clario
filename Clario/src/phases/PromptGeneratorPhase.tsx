import { useState } from 'react';
import type { GeneratorCategory, GeneratedAssetPrompt } from '../types/assets';
import { generateCategoryPromptTemplate } from '../lib/gemini';

interface PromptGeneratorPhaseProps {
  onBackToHome: () => void;
}

const CATEGORIES: Array<{ id: GeneratorCategory; label: string; icon: string; desc: string }> = [
  { id: 'anonymous_founders', label: 'Anonymous Founders', icon: '👤', desc: 'Founders & operators in dim modern workspaces' },
  { id: 'tech_systems', label: 'Tech Systems & Servers', icon: '🖥️', desc: 'Fiber-optic data centers & cloud infra' },
  { id: 'code_terminal', label: 'Code & Terminal', icon: '⚡', desc: 'Monospace syntax compiling on dark OLEDs' },
  { id: 'laboratory', label: 'Research Laboratories', icon: '🔬', desc: 'Cryogenics, cleanrooms & robotics labs' },
  { id: 'rockets_aerospace', label: 'Rockets & Aerospace', icon: '🚀', desc: 'Static fire tests, Mach diamonds & telemetry' },
  { id: 'architecture', label: 'Modern Architecture', icon: '🏛️', desc: 'Brutalist cantilevered studios & glass facades' },
  { id: 'crowds', label: 'Atmospheric Crowds', icon: '👥', desc: 'Anonymous commuters in rain & twilight neon' },
  { id: 'artists_musicians', label: 'Artists & Musicians', icon: '🎹', desc: 'Analog modular synths & tactile hardware' },
  { id: 'abstract_particles', label: 'Abstract Particles', icon: '✨', desc: 'Computational fluids & geometric torus fields' },
  { id: 'emotional_metaphors', label: 'Emotional Metaphors', icon: '🏔️', desc: 'Solitary mountain ridge sunrise & scale' },
  { id: 'caption_safe_backgrounds', label: 'Caption-Safe Backgrounds', icon: '🌊', desc: 'Dark negative space gradients for text' },
  { id: 'custom', label: 'Custom Replacement', icon: '🎯', desc: 'Craft bespoke rights-safe prompts' },
];

export function PromptGeneratorPhase({ onBackToHome }: PromptGeneratorPhaseProps) {
  const [selectedCategory, setSelectedCategory] = useState<GeneratorCategory>('anonymous_founders');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '16:9' | '1:1'>('9:16');
  const [targetModel, setTargetModel] = useState<'midjourney' | 'kling' | 'runway' | 'flux' | 'claude'>('midjourney');
  const [subjectDetails, setSubjectDetails] = useState('');
  const [copied, setCopied] = useState(false);

  const currentPrompt: GeneratedAssetPrompt = generateCategoryPromptTemplate(
    selectedCategory,
    aspectRatio,
    subjectDetails
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(currentPrompt.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="phase-enter" style={{ minHeight: '100%', background: '#0A0B0E', color: '#F8FAFC', padding: '36px 32px', fontFamily: 'Inter, sans-serif' }}>
      {/* Top Bar */}
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
        <button
          onClick={onBackToHome}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'transparent', border: 'none',
            color: '#94A3B8', cursor: 'pointer',
            fontSize: 13, fontWeight: 600,
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#F8FAFC'}
          onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
        >
          ← Back to Hub
        </button>

        <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: '1px solid rgba(167,139,250,0.3)', fontWeight: 700, fontFamily: 'Space Mono, monospace' }}>
          MODE C: ASSET GENERATOR & PROMPT STUDIO
        </span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', fontFamily: 'Space Grotesk, sans-serif', color: '#F8FAFC' }}>
            Original Functional Equivalent Prompts
          </h1>
          <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 6 }}>
            Generate functional visual equivalents that preserve camera movement, composition, emotion, and pacing without copying copyrighted characters or brands.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24 }}>
          {/* Left: Category Picker */}
          <div style={{ background: '#10121A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 18, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94A3B8', display: 'block', marginBottom: 12, fontFamily: 'Space Mono, monospace' }}>
              Select Prompt Category
            </span>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {CATEGORIES.map((cat) => {
                const isSelected = cat.id === selectedCategory;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: isSelected ? 'rgba(167,139,250,0.15)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(167,139,250,0.4)' : 'transparent'}`,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#A78BFA' : '#F8FAFC' }}>
                        {cat.label}
                      </div>
                      <div style={{ fontSize: 10, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {cat.desc}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Studio Controls & Generated Prompt */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Aspect Ratio & Target Model Controls */}
            <div style={{ background: '#10121A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20, display: 'flex', gap: 20 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 8, textTransform: 'uppercase', fontFamily: 'Space Mono, monospace' }}>
                  Aspect Ratio
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['9:16', '16:9', '1:1'] as const).map((ar) => (
                    <button
                      key={ar}
                      onClick={() => setAspectRatio(ar)}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: 6,
                        border: '1px solid',
                        borderColor: aspectRatio === ar ? '#A78BFA' : 'rgba(255,255,255,0.1)',
                        background: aspectRatio === ar ? 'rgba(167,139,250,0.15)' : '#0A0B0E',
                        color: aspectRatio === ar ? '#A78BFA' : '#94A3B8',
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {ar} {ar === '9:16' ? '(Reels)' : ar === '16:9' ? '(Landscape)' : '(Square)'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 8, textTransform: 'uppercase', fontFamily: 'Space Mono, monospace' }}>
                  Target Generator Model
                </label>
                <select
                  value={targetModel}
                  onChange={(e) => setTargetModel(e.target.value as any)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 6, background: '#0A0B0E', border: '1px solid rgba(255,255,255,0.12)', color: '#F8FAFC', fontSize: 12, outline: 'none' }}
                >
                  <option value="midjourney">Midjourney v6.1 (Photoreal / Cinematic)</option>
                  <option value="kling">Kling AI (High-Motion Video Generation)</option>
                  <option value="runway">Runway Gen-3 Alpha (Camera Pacing)</option>
                  <option value="flux">FLUX.1 Pro (Ultra-Crisp Composition)</option>
                  <option value="claude">Claude Artifacts (Code / Design Canvas)</option>
                </select>
              </div>
            </div>

            {/* Custom Subject Details */}
            <div style={{ background: '#10121A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', display: 'block', marginBottom: 8, textTransform: 'uppercase', fontFamily: 'Space Mono, monospace' }}>
                Optional Subject Details / Tweaks
              </label>
              <input
                type="text"
                placeholder="e.g. wearing black turtleneck, dark concrete wall, cyan accent rim light"
                value={subjectDetails}
                onChange={e => setSubjectDetails(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#090A0E',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#F8FAFC',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
            </div>

            {/* Formulated Prompt Card */}
            <div style={{ background: 'linear-gradient(180deg, #151824 0%, #0E1018 100%)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 14, padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#F8FAFC', fontFamily: 'Space Grotesk, sans-serif' }}>
                    {currentPrompt.title}
                  </h3>
                  <span style={{ fontSize: 11, color: '#A78BFA', fontFamily: 'Space Mono, monospace' }}>
                    PROVENANCE: GENERATED REPLACEMENT ({aspectRatio})
                  </span>
                </div>

                <button
                  onClick={handleCopy}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 6,
                    background: copied ? '#10B981' : '#A78BFA',
                    border: 'none',
                    color: '#000',
                    fontWeight: 800,
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'Space Grotesk, sans-serif',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {copied ? 'COPIED TO CLIPBOARD ✓' : 'COPY PROMPT'}
                </button>
              </div>

              {/* Main Prompt */}
              <div style={{ background: '#08090E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 14, marginBottom: 14, fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#E2E8F0', lineHeight: 1.5 }}>
                {currentPrompt.prompt}
              </div>

              {/* Negative Prompt & Tokens */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 11 }}>
                <div>
                  <span style={{ color: '#F43F5E', fontWeight: 700, fontFamily: 'Space Mono, monospace' }}>NEGATIVE PROMPT: </span>
                  <span style={{ color: '#94A3B8' }}>{currentPrompt.negative_prompt}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {currentPrompt.style_tokens.map((token, i) => (
                    <span key={i} style={{ padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: '#CBD5E1', fontSize: 10, fontFamily: 'Space Mono, monospace' }}>
                      #{token}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
