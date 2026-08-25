import type { RightsStatus, LicenseStatus } from '../../types/assets';

interface RightsBadgeProps {
  status: RightsStatus | LicenseStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

export function RightsBadge({ status, size = 'md', showTooltip = true }: RightsBadgeProps) {
  // Normalize string/license values to standard RightsStatus
  const normalize = (st: string): { label: string; textClass: string; bg: string; border: string; color: string; desc: string; icon: string } => {
    switch (st) {
      case 'user_owned':
        return {
          label: 'USER-OWNED',
          textClass: 'badge-emerald',
          bg: 'rgba(16, 185, 129, 0.1)',
          border: 'rgba(16, 185, 129, 0.3)',
          color: '#10B981',
          desc: 'Verified user-owned footage. Cleared for export.',
          icon: '✓',
        };
      case 'licensed_clean_source':
      case 'licensed_clean_available':
        return {
          label: 'LICENSED CLEAN SOURCE',
          textClass: 'badge-emerald',
          bg: 'rgba(16, 185, 129, 0.1)',
          border: 'rgba(16, 185, 129, 0.3)',
          color: '#10B981',
          desc: 'Commercial stock / authorized clean source verified.',
          icon: '✓',
        };
      case 'public_domain_candidate':
        return {
          label: 'PUBLIC-DOMAIN CANDIDATE',
          textClass: 'badge-cyan',
          bg: 'rgba(6, 182, 212, 0.1)',
          border: 'rgba(6, 182, 212, 0.3)',
          color: '#06B6D4',
          desc: 'NASA / government archive candidate. Verify license before broadcast.',
          icon: '🏛',
        };
      case 'generated_original':
        return {
          label: 'GENERATED ORIGINAL',
          textClass: 'badge-emerald',
          bg: 'rgba(16, 185, 129, 0.1)',
          border: 'rgba(16, 185, 129, 0.3)',
          color: '#10B981',
          desc: 'Synthesized original asset matching visual function without copying likeness.',
          icon: '✦',
        };
      case 'ai_cleaned_reference':
        return {
          label: 'AI-CLEANED REFERENCE',
          textClass: 'badge-blue',
          bg: 'rgba(78, 108, 242, 0.1)',
          border: 'rgba(78, 108, 242, 0.3)',
          color: '#4E6CF2',
          desc: 'Burnt-in text infilled. Use only where authorized.',
          icon: '⟡',
        };
      case 'not_cleared':
        return {
          label: 'NOT CLEARED',
          textClass: 'badge-rose',
          bg: 'rgba(239, 68, 68, 0.1)',
          border: 'rgba(239, 68, 68, 0.3)',
          color: '#EF4444',
          desc: 'Protected material without clearance. Do not export as clean asset.',
          icon: '⊘',
        };
      case 'unresolved':
      case 'original_replacement_needed':
        return {
          label: 'RIGHTS UNRESOLVED',
          textClass: 'badge-amber',
          bg: 'rgba(245, 158, 11, 0.1)',
          border: 'rgba(245, 158, 11, 0.3)',
          color: '#F59E0B',
          desc: 'Source rights unknown. Attach clean master or create original equivalent.',
          icon: '?',
        };
      case 'reference_only':
      case 'copyrighted_reference_only':
      default:
        return {
          label: 'REFERENCE ONLY',
          textClass: 'badge-neutral',
          bg: 'rgba(100, 116, 139, 0.12)',
          border: 'rgba(100, 116, 139, 0.25)',
          color: '#64748B',
          desc: 'Explanatory research excerpt. Not cleared for clean distribution.',
          icon: '•',
        };
    }
  };

  const info = normalize(status);

  const padding = size === 'sm' ? '2px 6px' : size === 'lg' ? '6px 12px' : '3px 8px';
  const fontSize = size === 'sm' ? 9 : size === 'lg' ? 12 : 10;

  return (
    <span
      title={showTooltip ? info.desc : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding,
        borderRadius: 4,
        background: info.bg,
        border: `1px solid ${info.border}`,
        color: info.color,
        fontSize,
        fontWeight: 700,
        fontFamily: 'var(--font-mono, monospace)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <span style={{ fontSize: fontSize - 1, opacity: 0.85 }}>{info.icon}</span>
      <span>{info.label}</span>
    </span>
  );
}
