import React from "react";
interface HoldersPanelProps {
  i18n?: "en" | "zh-cn";
  symbol: string;
}
/**
 * A single holder row.
 */
interface HolderRow {
  rank: number;
  address: string;
  /** Share of total supply, in percent. */
  share: number;
  /** USD value of the holding. */
  value: number;
  /** Tag describing the wallet type. */
  tag: string;
}
const MOCK_HOLDERS: HolderRow[] = [
  { rank: 1, address: "0x9f8e…c2b1", share: 12.4, value: 315_000, tag: "LP" },
  { rank: 2, address: "0x1a2b…9a0b", share: 8.2, value: 208_000, tag: "DEV" },
  { rank: 3, address: "0x3c4d…7e8f", share: 5.6, value: 142_000, tag: "Whale" },
  { rank: 4, address: "0x5a6b…3c4d", share: 4.1, value: 104_000, tag: "Fund" },
  { rank: 5, address: "0x7e8f…1a2b", share: 3.3, value: 84_000, tag: "Whale" },
  { rank: 6, address: "0x9c0d…5e6f", share: 2.8, value: 71_000, tag: "Retail" },
  { rank: 7, address: "0x1f2a…8b9c", share: 2.1, value: 53_000, tag: "Retail" },
  { rank: 8, address: "0x3d4e…6f7a", share: 1.9, value: 48_000, tag: "Retail" },
  { rank: 9, address: "0x5b6c…9d0e", share: 1.6, value: 41_000, tag: "Retail" },
  { rank: 10, address: "0x7a8b…2c3d", share: 1.4, value: 36_000, tag: "Retail" },
];
/**
 * HoldersPanel - top holders table.
 */
export const HoldersPanel: React.FC<HoldersPanelProps> = ({ i18n = "en" }) => {
  const isZh = i18n === "zh-cn";
  const formatUsd = (v: number): string => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(2)}K`;
    return `$${v.toFixed(2)}`;
  };
  const headerCell: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.5px",
    color: "var(--text-secondary, #8b949e)",
    textAlign: "right",
    whiteSpace: "nowrap",
  };
  const bodyCell: React.CSSProperties = {
    padding: "6px 8px",
    fontSize: 11,
    fontFamily: "monospace",
    textAlign: "right",
    whiteSpace: "nowrap",
    color: "var(--text-primary, #e6edf3)",
  };
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.6fr 1.6fr 1fr 1fr 1fr",
          padding: "0 8px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
          background: "var(--bg-tertiary, #21262d)",
        }}
      >
        <span style={{ ...headerCell, textAlign: "left" }}>#</span>
        <span style={{ ...headerCell, textAlign: "left" }}>{isZh ? "地址" : "Address"}</span>
        <span style={headerCell}>{isZh ? "占比" : "Share"}</span>
        <span style={headerCell}>{isZh ? "价值" : "Value"}</span>
        <span style={headerCell}>{isZh ? "标签" : "Tag"}</span>
      </div>
      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {MOCK_HOLDERS.map((row) => (
          <div
            key={row.rank}
            // Hover highlight: use CSS variables so the effect follows the theme.
            style={{
              display: "grid",
              gridTemplateColumns: "0.6fr 1.6fr 1fr 1fr 1fr",
              padding: "0 8px",
              borderBottom: "1px solid var(--border-color, #30363d)",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg, rgba(255,255,255,0.04))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <span style={{ ...bodyCell, textAlign: "left", color: "var(--text-secondary, #8b949e)" }}>{row.rank}</span>
            <span style={{ ...bodyCell, textAlign: "left" }}>{row.address}</span>
            <span style={bodyCell}>{row.share.toFixed(2)}%</span>
            <span style={bodyCell}>{formatUsd(row.value)}</span>
            <span
              style={{
                ...bodyCell,
                color: row.tag === "LP" ? "#58a6ff" : row.tag === "DEV" ? "#f0b90b" : "var(--text-secondary, #8b949e)",
              }}
            >
              {row.tag}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
export default HoldersPanel;
