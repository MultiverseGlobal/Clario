"use client";

// Metaphor — WeavePanel
// The living neural feed panel. Cross-app intelligence substrate stub.
// Data is mocked for visual fidelity — live Supabase reads come in Phase 2.

const MOCK_SIGNALS = [
  {
    id: "sig_001",
    app: "atlas",
    app_label: "Atlas",
    signal_type: "approve",
    description: 'Campaign "Summer Launch" approved — 3 ad variants locked.',
    entity_type: "campaign",
    ts: new Date(Date.now() - 2 * 60 * 1000),
  },
  {
    id: "sig_002",
    app: "clario",
    app_label: "Clario",
    signal_type: "match",
    description: "Script match found — 8 reference clips with >72% similarity to \"Product Reveal\" script.",
    entity_type: "script",
    ts: new Date(Date.now() - 7 * 60 * 1000),
  },
  {
    id: "sig_003",
    app: "metaphor",
    app_label: "Metaphor",
    signal_type: "save",
    description: '"Brand Voice Guidelines" document updated and saved — 3 sections revised.',
    entity_type: "document",
    ts: new Date(Date.now() - 18 * 60 * 1000),
  },
  {
    id: "sig_004",
    app: "atlas",
    app_label: "Atlas",
    signal_type: "export",
    description: "Contact report exported — 142 leads, Q3 segment filter applied.",
    entity_type: "report",
    ts: new Date(Date.now() - 31 * 60 * 1000),
  },
  {
    id: "sig_005",
    app: "clario",
    app_label: "Clario",
    signal_type: "ingest",
    description: "24 reference shots ingested from YouTube — embedded via Gemini text-embedding-004.",
    entity_type: "library",
    ts: new Date(Date.now() - 54 * 60 * 1000),
  },
  {
    id: "sig_006",
    app: "orion",
    app_label: "Orion",
    signal_type: "view",
    description: "Voice brief session completed — 12m 30s, Orion synthesized 4 action items.",
    entity_type: "session",
    ts: new Date(Date.now() - 78 * 60 * 1000),
  },
  {
    id: "sig_007",
    app: "metaphor",
    app_label: "Metaphor",
    signal_type: "edit",
    description: '"Q4 Positioning" draft opened — last edited 3 hours ago.',
    entity_type: "document",
    ts: new Date(Date.now() - 3 * 60 * 60 * 1000),
  },
];

const APP_COLORS: Record<string, string> = {
  atlas:       "#38bdf8",
  clario:      "#f59e0b",
  metaphor:    "#111318",
  orion:       "#a78bfa",
  pseudonymsid: "#22c55e",
};

const SIGNAL_ICONS: Record<string, string> = {
  approve: "✓",
  match:   "◎",
  save:    "▲",
  export:  "↗",
  ingest:  "⊕",
  view:    "○",
  edit:    "✎",
  click:   "·",
  reject:  "✕",
};

function timeAgo(d: Date): string {
  const ms = Date.now() - d.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function WeavePanel() {
  return (
    <aside
      style={{
        width: 300,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid var(--pds-border-subtle, rgba(17,19,24,0.06))",
        background: "var(--pds-surface-1, #fff)",
        flexShrink: 0,
        overflow: "hidden",
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "16px 16px 12px",
          borderBottom: "1px solid var(--pds-border-subtle, rgba(17,19,24,0.06))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Pulsing active dot */}
          <span
            style={{
              display: "inline-block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22c55e",
              animation: "weave-pulse 2.5s infinite",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif",
              letterSpacing: "-0.01em",
              color: "var(--pds-text-primary, #111318)",
            }}
          >
            Weave
          </span>
          <span
            style={{
              fontSize: 9,
              fontFamily: "'JetBrains Mono', monospace",
              color: "var(--pds-text-muted, #9CA3AF)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            · Learning Substrate
          </span>
        </div>

        {/* STUB badge */}
        <span
          style={{
            fontSize: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "2px 6px",
            borderRadius: 99,
            background: "rgba(17,19,24,0.06)",
            color: "var(--pds-text-muted, #9CA3AF)",
            border: "1px solid rgba(17,19,24,0.08)",
          }}
        >
          Preview
        </span>
      </div>

      {/* ── Signal Feed ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {MOCK_SIGNALS.map((signal, i) => {
          const appColor = APP_COLORS[signal.app] || "#111318";
          const icon = SIGNAL_ICONS[signal.signal_type] || "·";
          return (
            <div
              key={signal.id}
              style={{
                display: "flex",
                gap: 10,
                padding: "10px 14px",
                position: "relative",
                transition: "background 150ms",
                cursor: "default",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--pds-surface-2, #F1F0EC)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              {/* App color spine */}
              {i < MOCK_SIGNALS.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    left: 21,
                    top: 30,
                    bottom: -10,
                    width: 1,
                    background: "var(--pds-border-subtle, rgba(17,19,24,0.06))",
                  }}
                />
              )}

              {/* Signal icon badge */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: `${appColor}14`,
                  border: `1px solid ${appColor}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 700,
                  color: appColor,
                  flexShrink: 0,
                  zIndex: 1,
                  position: "relative",
                }}
              >
                {icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  {/* App badge */}
                  <span
                    style={{
                      fontSize: 8,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: appColor,
                    }}
                  >
                    {signal.app_label}
                  </span>
                  <span
                    style={{
                      fontSize: 8,
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--pds-text-muted, #9CA3AF)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {signal.signal_type}
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontFamily: "'Times New Roman MT', 'Times New Roman', Times, serif",
                    color: "var(--pds-text-primary, #111318)",
                    lineHeight: 1.5,
                    letterSpacing: "0.005em",
                  }}
                >
                  {signal.description}
                </p>
                <span
                  style={{
                    fontSize: 9,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "var(--pds-text-muted, #9CA3AF)",
                    marginTop: 3,
                    display: "block",
                  }}
                >
                  {timeAgo(signal.ts)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "10px 14px 12px",
          borderTop: "1px solid var(--pds-border-subtle, rgba(17,19,24,0.06))",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontFamily: "'Times New Roman MT', 'Times New Roman', Times, serif",
            color: "var(--pds-text-muted, #9CA3AF)",
            textAlign: "center",
            lineHeight: 1.5,
            letterSpacing: "0.005em",
            fontStyle: "italic",
          }}
        >
          Weave is watching across the ecosystem.
        </p>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes weave-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.4); }
          50%       { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
        }
      `}</style>
    </aside>
  );
}
