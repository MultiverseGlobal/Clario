import type { Asset } from '../../types/assets';
import { AssetCard } from './AssetCard';

interface AssetGridProps {
  assets: Asset[];
  onToggle: (id: string) => void;
  onPreview?: (asset: Asset) => void;
  filterType?: Asset['type'];
  label?: string;
}

const TYPE_ORDER: Asset['type'][] = ['video-clip', 'audio', 'image-frame', 'slide', 'palette', 'text-block'];

export function AssetGrid({ assets, onToggle, onPreview, label }: AssetGridProps) {
  // Group by type
  const grouped = TYPE_ORDER.reduce<Record<string, Asset[]>>((acc, type) => {
    const group = assets.filter(a => a.type === type);
    if (group.length > 0) acc[type] = group;
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    'video-clip': '🎬 Clips',
    'audio': '🎵 Audio',
    'image-frame': '🖼 Frames',
    'slide': '📄 Slides',
    'palette': '🎨 Palette',
    'text-block': '📝 Text',
  };

  const colsMap: Record<string, string> = {
    'video-clip':   'repeat(auto-fill, minmax(220px, 1fr))',
    'image-frame':  'repeat(auto-fill, minmax(160px, 1fr))',
    'slide':        'repeat(auto-fill, minmax(160px, 1fr))',
    'palette':      'repeat(auto-fill, minmax(260px, 1fr))',
    'text-block':   'repeat(auto-fill, minmax(240px, 1fr))',
  };

  let globalDelay = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {label && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {label}
          </span>
          <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Space Mono, monospace' }}>
            {assets.filter(a => a.selected).length}/{assets.length} selected
          </span>
        </div>
      )}

      {Object.entries(grouped).map(([type, groupAssets]) => {
        const sectionDelay = globalDelay;
        globalDelay += groupAssets.length * 40;

        return (
          <div key={type}>
            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                {typeLabels[type] ?? type}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'Space Mono, monospace' }}>
                {groupAssets.length}
              </span>
            </div>

            {/* Grid */}
            {type === 'audio' ? (
              // Audio is full width, stacked
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {groupAssets.map((asset, i) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    selected={asset.selected}
                    onToggle={() => onToggle(asset.id)}
                    onPreview={onPreview}
                    delay={sectionDelay + i * 40}
                  />
                ))}
              </div>
            ) : type === 'palette' ? (
              // Palettes: horizontal strip
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                {groupAssets.map((asset, i) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    selected={asset.selected}
                    onToggle={() => onToggle(asset.id)}
                    onPreview={onPreview}
                    delay={sectionDelay + i * 40}
                  />
                ))}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: colsMap[type] ?? 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 8,
              }}>
                {groupAssets.map((asset, i) => (
                  <AssetCard
                    key={asset.id}
                    asset={asset}
                    selected={asset.selected}
                    onToggle={() => onToggle(asset.id)}
                    onPreview={onPreview}
                    delay={sectionDelay + i * 40}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
