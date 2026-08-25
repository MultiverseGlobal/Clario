import { useState, useRef } from 'react';
import { getBrandKit, saveBrandKit, DEFAULT_BRAND, type BrandKit } from '../../lib/brandKit';

interface BrandKitPanelProps {
  onClose: () => void;
}

const FONT_OPTIONS = ['Space Grotesk', 'Inter', 'DM Sans', 'Plus Jakarta Sans', 'Sora', 'Outfit'];

export function BrandKitPanel({ onClose }: BrandKitPanelProps) {
  const [kit, setKit] = useState<BrandKit>(getBrandKit());
  const [saved, setSaved] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<BrandKit>) => {
    setKit(prev => ({ ...prev, ...patch }));
    setSaved(false);
  };

  const handleSave = () => {
    saveBrandKit(kit);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      update({ logoUrl: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border-strong)',
          borderRadius: 20,
          padding: '28px 32px',
          width: '100%',
          maxWidth: 480,
          boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>
              Brand Kit
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              Saved across all Clario sessions
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
          >
            ✕
          </button>
        </div>

        {/* Brand Name */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
            BRAND NAME
          </label>
          <input
            value={kit.name}
            onChange={e => update({ name: e.target.value })}
            placeholder="e.g. Acme Inc."
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 9, padding: '8px 12px', fontSize: 13, color: 'var(--text-primary)',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Colors */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
            COLORS
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Primary', key: 'primaryColor' as const },
              { label: 'Accent', key: 'accentColor' as const },
              { label: 'Background', key: 'backgroundColor' as const },
              { label: 'Text', key: 'textColor' as const },
            ].map(({ label, key }) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 10px' }}>
                <input
                  type="color"
                  value={kit[key]}
                  onChange={e => update({ [key]: e.target.value })}
                  style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 4, padding: 0 }}
                />
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{kit[key]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fonts */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
            FONTS
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Display / Headlines', key: 'fontDisplay' as const },
              { label: 'Body / Captions', key: 'fontBody' as const },
            ].map(({ label, key }) => (
              <div key={key}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                <select
                  value={kit[key]}
                  onChange={e => update({ [key]: e.target.value })}
                  style={{
                    width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 9, padding: '7px 10px', fontSize: 12, color: 'var(--text-primary)',
                    outline: 'none', cursor: 'pointer',
                  }}
                >
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>

        {/* Logo */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
            LOGO
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {kit.logoUrl ? (
              <img src={kit.logoUrl} alt="logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', padding: 4 }} />
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--surface)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--text-muted)' }}>
                □
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            <button
              onClick={() => logoInputRef.current?.click()}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500 }}
            >
              {kit.logoUrl ? 'Change Logo' : 'Upload Logo'}
            </button>
            {kit.logoUrl && (
              <button
                onClick={() => update({ logoUrl: undefined })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11 }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {/* Footer: preview swatch + save */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {[kit.primaryColor, kit.accentColor, kit.backgroundColor, kit.textColor].map((c, i) => (
              <div key={i} style={{ width: 18, height: 18, borderRadius: 4, background: c, border: '1px solid var(--border)' }} />
            ))}
            <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>
              {kit.fontDisplay}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setKit({ ...DEFAULT_BRAND }); setSaved(false); }}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 14px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              style={{
                background: saved ? 'var(--emerald)' : 'var(--accent)',
                border: 'none', borderRadius: 9, padding: '8px 20px',
                cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700,
                transition: 'background 0.2s',
              }}
            >
              {saved ? '✓ Saved' : 'Save Brand Kit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
