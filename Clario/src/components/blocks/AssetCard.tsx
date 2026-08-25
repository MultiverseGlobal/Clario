import { useState } from 'react';
import type { Asset } from '../../types/assets';

interface AssetCardProps {
  asset: Asset;
  selected: boolean;
  onToggle: () => void;
  onPreview?: (asset: Asset) => void;
  delay?: number;
}

function WaveformMini({ waveform }: { waveform: number[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2, padding: '0 4px' }}>
      {waveform.slice(0, 32).map((val, idx) => (
        <div
          key={idx}
          style={{
            flex: 1,
            height: `${Math.max(12, val * 100)}%`,
            background: 'var(--accent)',
            borderRadius: 1,
            opacity: 0.8,
          }}
        />
      ))}
    </div>
  );
}

function PalettePreview({ colors }: { colors: string[] }) {
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {colors.map((c, i) => (
        <div key={i} style={{ flex: 1, height: '100%', background: c }} />
      ))}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    'video-clip': { bg: 'rgba(99,102,241,0.15)', text: '#818CF8' },
    'image-frame': { bg: 'rgba(52,211,153,0.15)', text: '#34D399' },
    'audio': { bg: 'rgba(251,191,36,0.15)', text: '#FBBF24' },
    'slide': { bg: 'rgba(167,139,250,0.15)', text: '#A78BFA' },
    'palette': { bg: 'rgba(244,114,182,0.15)', text: '#F472B6' },
    'text-block': { bg: 'rgba(56,189,248,0.15)', text: '#38BDF8' },
  };
  const badge = colors[type] || { bg: 'var(--surface)', text: 'var(--text-muted)' };
  return (
    <span style={{
      background: badge.bg,
      color: badge.text,
      fontSize: 9,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      padding: '2px 5px',
      borderRadius: 4,
    }}>
      {type.replace('-', ' ')}
    </span>
  );
}

export function AssetCard({ asset, selected, onToggle, onPreview, delay = 0 }: AssetCardProps) {
  const isVideo = asset.type === 'video-clip';
  const isAudio = asset.type === 'audio';
  const isPalette = asset.type === 'palette';
  const hasThumb = 'thumbnail' in asset && asset.thumbnail;
  const [hovered, setHovered] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/clario-asset', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className={`paper-card${selected ? ' selected' : ''} cut-reveal`}
      draggable
      onDragStart={handleDragStart}
      style={{
        cursor: 'grab',
        overflow: 'hidden',
        position: 'relative',
        animationDelay: `${delay}ms`,
        userSelect: 'none',
        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onToggle}
    >
      <div
        style={{
          aspectRatio: asset.type === 'slide' ? '1/1' : asset.type === 'image-frame' ? '4/3' : '16/10',
          background: 'var(--panel)',
          position: 'relative',
          overflow: 'hidden',
          maxHeight: 160,
        }}
      >
        {hasThumb && !isAudio && !isPalette ? (
          <img
            src={(asset as { thumbnail: string }).thumbnail}
            alt={asset.label}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : isAudio && 'waveform' in asset && asset.waveform ? (
          <div style={{ height: '100%', background: 'var(--panel)', padding: '0 8px' }}>
            <WaveformMini waveform={asset.waveform} />
          </div>
        ) : isPalette && 'colors' in asset ? (
          <PalettePreview colors={asset.colors} />
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: 11,
          }}>
            {asset.type}
          </div>
        )}

        {/* Hover Play / Preview Button */}
        {onPreview && (isVideo || hasThumb) && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onPreview(asset);
            }}
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(6,6,10,0.45)',
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.15s ease',
              backdropFilter: 'blur(2px)',
            }}
          >
            <div style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              transform: hovered ? 'scale(1)' : 'scale(0.85)',
              transition: 'transform 0.15s ease',
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginLeft: 2 }}>
                <path d="M4 2.5v11a1 1 0 001.5.86l9-5.5a1 1 0 000-1.72l-9-5.5A1 1 0 004 2.5z"/>
              </svg>
            </div>
          </div>
        )}

        {/* Duration overlay for clips */}
        {isVideo && 'duration' in asset && (
          <div style={{
            position: 'absolute',
            bottom: 5,
            right: 6,
            background: 'rgba(0,0,0,0.75)',
            color: '#fff',
            fontSize: 9,
            fontFamily: 'Space Mono, monospace',
            padding: '2px 5px',
            borderRadius: 4,
          }}>
            {Math.floor((asset as { duration: number }).duration)}s
          </div>
        )}

        {/* Timestamp for frames */}
        {asset.type === 'image-frame' && 'timestamp' in asset && (
          <div style={{
            position: 'absolute',
            bottom: 5,
            left: 6,
            background: 'rgba(99,102,241,0.75)',
            color: '#fff',
            fontSize: 9,
            fontFamily: 'Space Mono, monospace',
            padding: '2px 5px',
            borderRadius: 4,
          }}>
            {(asset as { timestamp: number }).timestamp.toFixed(1)}s
          </div>
        )}

        {/* Selected checkmark */}
        <div
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 20,
            height: 20,
            borderRadius: 6,
            background: selected ? 'var(--accent)' : 'rgba(0,0,0,0.5)',
            border: `1.5px solid ${selected ? 'var(--accent)' : 'rgba(255,255,255,0.2)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            backdropFilter: 'blur(4px)',
            zIndex: 3,
          }}
        >
          {selected && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5.5L4 7.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <TypeBadge type={asset.type} />
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {asset.label}
        </span>
      </div>

      {/* Text content preview for text blocks */}
      {asset.type === 'text-block' && 'content' in asset && (asset as { content: string }).content && (
        <div style={{ padding: '0 10px 8px', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, maxHeight: 48, overflow: 'hidden' }}>
          {(asset as { content: string }).content}
        </div>
      )}
    </div>
  );
}
