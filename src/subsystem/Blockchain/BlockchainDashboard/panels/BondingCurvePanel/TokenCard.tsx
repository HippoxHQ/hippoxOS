import React from "react";
/**
 * A single bonding curve token used by the card grid.
 * The same shape as the mock data in index.tsx.
 */
export interface BondingCurveToken {
  id: string;
  symbol: string;
  name: string;
  price: number;
  priceChange24h: number;
  marketCap: number;
  holders: number;
  progress: number;
  volume24h: number;
  graduated: boolean;
  /** Optional cover image URL. When absent a default gradient is shown. */
  image?: string;
}
interface TokenCardProps {
  i18n?: "en" | "zh-cn";
  token: BondingCurveToken;
  /** Whether this card is the currently selected one */
  isActive?: boolean;
  /** Click handler - typically used to open the detail panel */
  onClick?: (token: BondingCurveToken) => void;
}
/**
 * TokenCard - a single token card with a cover image on top and info below.
 *
 * The info block is the priority: it never gets squeezed away, no matter how
 * short the parent makes the card. The cover image is allowed to shrink and
 * is capped with a max height so it cannot eat the whole card.
 *
 * Hover behaviour: NO floating / lift effect. Only the border colour changes
 * to give a subtle "this is hoverable" cue.
 */
export const TokenCard: React.FC<TokenCardProps> = ({ i18n = "en", token, isActive = false, onClick }) => {
  const isZh = i18n === "zh-cn";
  const isUp = token.priceChange24h >= 0;
  // Track hover locally so the border colour can reflect it.
  const [isHovered, setIsHovered] = React.useState(false);
  // Default gradient used when the token has no cover image.
  const defaultGradient = token.graduated ? "linear-gradient(135deg, rgba(63,185,80,0.35), rgba(63,185,80,0.08))" : "linear-gradient(135deg, rgba(88,166,255,0.35), rgba(88,166,255,0.08))";
  // Border colour priority: active > hovered > default.
  const borderColor = isActive ? "var(--accent-color, #58a6ff)" : isHovered ? "var(--border-color-hover, #4d5560)" : "var(--border-color, #30363d)";
  const ellipsis: React.CSSProperties = {
    minWidth: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  return (
    <div
      onClick={() => onClick?.(token)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--bg-secondary, #161b22)",
        border: `1px solid ${borderColor}`,
        cursor: "pointer",
        transition: "border-color 0.12s",
        minWidth: 0,
        minHeight: 0,
        // Let the card stretch to whatever height the grid gives it.
        height: "100%",
      }}
    >
      {/*
        Cover image / default gradient.
        - flexShrink: 1 so it yields space when the card is short.
        - minHeight: 0 so it can actually shrink.
        - maxHeight caps how tall the image can ever be.
        - A fixed aspect-ratio keeps the shape when there is room.
      */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16 / 10",
          maxHeight: 140,
          minHeight: 0,
          flexShrink: 1,
          background: token.image ? `url(${token.image}) center/cover no-repeat` : defaultGradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {!token.image && (
          <span
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: "rgba(255,255,255,0.85)",
              letterSpacing: "1px",
              textShadow: "0 2px 6px rgba(0,0,0,0.35)",
            }}
          >
            {token.symbol.slice(0, 3)}
          </span>
        )}
        {token.graduated && (
          <span
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              padding: "1px 6px",
              borderRadius: 4,
              fontSize: 9,
              fontWeight: 700,
              color: "#3fb950",
              background: "rgba(63,185,80,0.18)",
              border: "1px solid rgba(63,185,80,0.4)",
            }}
          >
            {isZh ? "已毕业" : "Graduated"}
          </span>
        )}
      </div>
      {/*
        Info block. flexShrink: 0 means it NEVER yields, so the required
        fields stay visible no matter how short the card is.
      */}
      <div
        style={{
          padding: "8px 10px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 0,
          flexShrink: 0,
        }}
      >
        {/* Ticker + name. */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: 1 }}>
          <span
            style={{
              ...ellipsis,
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary, #e6edf3)",
            }}
            title={token.symbol}
          >
            {token.symbol}
          </span>
          <span
            style={{
              ...ellipsis,
              fontSize: 10,
              color: "var(--text-secondary, #8b949e)",
            }}
            title={token.name}
          >
            {token.name}
          </span>
        </div>
        {/* Price + 24h change. */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 4,
            minWidth: 0,
          }}
        >
          <span
            style={{
              ...ellipsis,
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "monospace",
              color: "var(--text-primary, #e6edf3)",
            }}
            title={token.price.toFixed(6)}
          >
            {token.price.toFixed(6)}
          </span>
          <span
            style={{
              flexShrink: 0,
              fontSize: 11,
              fontWeight: 700,
              color: isUp ? "#3fb950" : "#f85149",
              whiteSpace: "nowrap",
            }}
          >
            {isUp ? "+" : ""}
            {token.priceChange24h.toFixed(2)}%
          </span>
        </div>
        {/* Progress bar. */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <div
            style={{
              flex: 1,
              minWidth: 20,
              height: 4,
              borderRadius: 2,
              background: "var(--border-color, #30363d)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, token.progress))}%`,
                height: "100%",
                background: token.graduated ? "#3fb950" : "#58a6ff",
                transition: "width 0.3s",
              }}
            />
          </div>
          <span
            style={{
              flexShrink: 0,
              fontSize: 10,
              color: "var(--text-secondary, #8b949e)",
              minWidth: 30,
              textAlign: "right",
            }}
          >
            {token.progress}%
          </span>
        </div>
      </div>
    </div>
  );
};
export default TokenCard;
