import { useState, useEffect, useCallback } from 'react';
import { listProjects, queryVaultAssets, type ClarioProject } from '../lib/projectStore';
import type { AssetRecord } from '../types/assets';
import { RightsBadge } from '../components/ui/RightsBadge';

interface ProvenanceLibraryPhaseProps {
  onOpenProject: (project: ClarioProject) => void;
  onBackToHome: () => void;
}

export function ProvenanceLibraryPhase({ onOpenProject, onBackToHome }: ProvenanceLibraryPhaseProps) {
  const [projects, setProjects] = useState<ClarioProject[]>([]);
  const [vaultAssets, setVaultAssets] = useState<AssetRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'production_eligible' | 'generated_originals' | 'reconstructed_stills' | 'unresolved' | 'reference_evidence'
  >('all');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const projList = await listProjects();
      setProjects(projList);
      const assets = await queryVaultAssets({ query: searchQuery, category: categoryFilter });
      setVaultAssets(assets);
    } catch (err) {
      console.warn('Failed to load vault data:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getProjectForAsset = (projectId: string): ClarioProject | undefined => {
    return projects.find(p => p.id === projectId);
  };

  return (
    <div
      className="phase-enter"
      style={{
        minHeight: '100%',
        background: 'var(--base)',
        color: 'var(--text-primary)',
        padding: '36px 32px 80px',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 36,
        }}
      >
        <button
          onClick={onBackToHome}
          className="btn-ghost"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
          }}
        >
          ← Back to Studio Hub
        </button>

        <span
          style={{
            fontSize: 11,
            padding: '3px 10px',
            borderRadius: 20,
            background: 'rgba(78,108,242,0.1)',
            color: 'var(--accent)',
            border: '1px solid rgba(78,108,242,0.3)',
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
          }}
        >
          GLOBAL ASSET VAULT & PROVENANCE REGISTRY
        </span>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              letterSpacing: '-0.03em',
              fontFamily: 'var(--font-display)',
              margin: 0,
            }}
          >
            Global Asset Vault & Provenance Registry
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>
            Index and search all attached clean masters, generated originals, and research stills across all harvests with strict rights classification.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
            <input
              type="text"
              placeholder="Search by title, filename, project name, shot ID, prompt, source URL, or rights note…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: 8,
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              background: 'var(--surface-2)',
              padding: 3,
              borderRadius: 8,
              border: '1px solid var(--border)',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            {[
              { id: 'all', label: 'All Saved Outputs' },
              { id: 'production_eligible', label: 'Production-Eligible' },
              { id: 'generated_originals', label: 'Generated Originals' },
              { id: 'reconstructed_stills', label: 'Reconstructed Stills' },
              { id: 'unresolved', label: 'Unresolved' },
              { id: 'reference_evidence', label: 'Reference Evidence' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setCategoryFilter(f.id as any)}
                style={{
                  padding: '7px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: categoryFilter === f.id ? 'var(--panel)' : 'transparent',
                  color: categoryFilter === f.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: categoryFilter === f.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vault Asset Table */}
        <div
          className="paper-card"
          style={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
            <thead>
              <tr
                style={{
                  background: 'var(--surface-2)',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                }}
              >
                <th style={{ padding: '12px 16px', width: 64 }}>THUMB</th>
                <th style={{ padding: '12px 16px', width: 150 }}>PROJECT</th>
                <th style={{ padding: '12px 16px', width: 80 }}>SHOT</th>
                <th style={{ padding: '12px 16px' }}>ASSET TITLE & METADATA</th>
                <th style={{ padding: '12px 16px', width: 140 }}>KIND</th>
                <th style={{ padding: '12px 16px', width: 160 }}>RIGHTS STATUS</th>
                <th style={{ padding: '12px 16px', width: 90 }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Loading vault assets…
                  </td>
                </tr>
              ) : vaultAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {projects.length === 0
                      ? 'No harvested assets in vault yet. Complete a harvest to populate records.'
                      : 'No indexed assets match the current search or category filter.'}
                  </td>
                </tr>
              ) : (
                vaultAssets.map(asset => {
                  const parentProj = getProjectForAsset(asset.projectId);

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => parentProj && onOpenProject(parentProj)}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        cursor: parentProj ? 'pointer' : 'default',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px 16px' }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 6,
                            overflow: 'hidden',
                            background: 'var(--base)',
                            border: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 14,
                          }}
                        >
                          {asset.url ? (
                            <img src={asset.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            '📄'
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {asset.projectName || 'Project'}
                      </td>

                      <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>
                        {asset.shotId?.toUpperCase() || '—'}
                      </td>

                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                          {asset.title}
                        </div>
                        {asset.prompt ? (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--text-secondary)',
                              fontFamily: 'var(--font-mono)',
                              maxWidth: 360,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {asset.prompt}
                          </div>
                        ) : asset.rightsNote ? (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            Note: {asset.rightsNote}
                          </div>
                        ) : null}
                      </td>

                      <td style={{ padding: '10px 16px' }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background:
                              asset.assetKind === 'attached_master'
                                ? 'rgba(16,185,129,0.1)'
                                : asset.assetKind === 'generated_original'
                                ? 'rgba(78,108,242,0.1)'
                                : asset.assetKind === 'reconstructed_still'
                                ? 'rgba(245,158,11,0.1)'
                                : 'rgba(100,116,139,0.1)',
                            color:
                              asset.assetKind === 'attached_master'
                                ? 'var(--emerald)'
                                : asset.assetKind === 'generated_original'
                                ? 'var(--accent)'
                                : asset.assetKind === 'reconstructed_still'
                                ? '#F59E0B'
                                : 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase',
                          }}
                        >
                          {asset.assetKind.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td style={{ padding: '10px 16px' }}>
                        <RightsBadge status={asset.rightsStatus} size="sm" />
                      </td>

                      <td style={{ padding: '10px 16px' }}>
                        {asset.url && (
                          <a
                            href={asset.url}
                            download={asset.filename || `${asset.title}.png`}
                            onClick={e => e.stopPropagation()}
                            className="btn-ghost"
                            style={{ padding: '4px 8px', fontSize: 11, border: '1px solid var(--border)', textDecoration: 'none' }}
                          >
                            ⬇ File
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
