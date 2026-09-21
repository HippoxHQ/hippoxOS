import React, { useCallback, useEffect, useRef, useState } from "react";
import RankingPanel from "./RankingPanel";
import TokenCard, { BondingCurveToken } from "./TokenCard";
import TokenDetailPanel from "./TokenDetailPanel";
interface BondingCurvePanelProps {
  i18n?: "en" | "zh-cn";
  theme?: "light" | "dark";
}
/**
 * Mock data - replace with real backend / chain data later.
 */
const MOCK_BONDING_TOKENS: BondingCurveToken[] = [
  {
    id: "0x1a2b...c3d4",
    symbol: "MEME",
    name: "Hippo Meme Coin",
    price: 0.000421,
    priceChange24h: 18.42,
    marketCap: 42.8,
    holders: 1240,
    progress: 78,
    volume24h: 12.4,
    graduated: false,
  },
  {
    id: "0x5e6f...g7h8",
    symbol: "AIX",
    name: "AI Agent X",
    price: 0.0128,
    priceChange24h: -4.21,
    marketCap: 128.5,
    holders: 3820,
    progress: 100,
    volume24h: 89.2,
    graduated: true,
  },
  {
    id: "0x9i0j...k1l2",
    symbol: "DEFI",
    name: "DeFi Protocol",
    price: 0.0342,
    priceChange24h: 6.88,
    marketCap: 342.1,
    holders: 5620,
    progress: 92,
    volume24h: 156.8,
    graduated: false,
  },
  {
    id: "0x3m4n...o5p6",
    symbol: "GAME",
    name: "GameFi Token",
    price: 0.0089,
    priceChange24h: -12.34,
    marketCap: 89.2,
    holders: 2140,
    progress: 45,
    volume24h: 34.6,
    graduated: false,
  },
  {
    id: "0x7q8r...s9t0",
    symbol: "NFTX",
    name: "NFT Index",
    price: 0.156,
    priceChange24h: 2.14,
    marketCap: 678.9,
    holders: 8920,
    progress: 100,
    volume24h: 234.5,
    graduated: true,
  },
];
// Minimum panel width (px) used for the detail panel on the right.
const DETAIL_PANEL_MIN_WIDTH = 460;
// Maximum share of the container width the detail panel can take.
const DETAIL_PANEL_MAX_PERCENT = 50;
/**
 * BondingCurvePanel - Middle column of the blockchain dashboard.
 */
export const BondingCurvePanel: React.FC<BondingCurvePanelProps> = ({ i18n = "en", theme = "dark" }) => {
  const isZh = i18n === "zh-cn";
  // Currently selected token (drives the right detail panel).
  const [selectedToken, setSelectedToken] = useState<BondingCurveToken | null>(null);
  // Width of the detail panel in pixels. Only meaningful when a token
  // is selected.
  const [detailWidth, setDetailWidth] = useState<number>(460);
  // Whether the user is dragging the divider.
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartXRef = useRef(0);
  const dragStartWidthRef = useRef(320);
  // Divider drag handling
  const handleDividerMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragStartXRef.current = e.clientX;
      dragStartWidthRef.current = detailWidth;
      setIsResizing(true);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [detailWidth],
  );
  useEffect(() => {
    if (!isResizing) return;
    const handleMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0) return;
      // The detail panel grows as the mouse moves LEFT.
      const deltaX = dragStartXRef.current - e.clientX;
      let next = dragStartWidthRef.current + deltaX;
      // Clamp between min width and 50% of the container.
      const maxWidth = rect.width * (DETAIL_PANEL_MAX_PERCENT / 100);
      next = Math.max(DETAIL_PANEL_MIN_WIDTH, Math.min(maxWidth, next));
      setDetailWidth(next);
    };
    const handleUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [isResizing]);
  const showDetail = selectedToken !== null;
  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100%",
        overflow: "hidden",
        background: "var(--bg-primary, #0d1117)",
      }}
    >
      {/* ================================================================ */}
      {/* Left region: ranking panel on top + card grid below (single unit) */}
      {/* ================================================================ */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Ranking area */}
        <RankingPanel i18n={i18n} tokens={MOCK_BONDING_TOKENS} onSelect={(token) => setSelectedToken(token)} />
        {/* Card grid */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            padding: 12,
            display: "grid",
            // Up to 5 cards per row, shrinking as the width decreases.
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12,
            alignContent: "start",
          }}
        >
          {MOCK_BONDING_TOKENS.map((token) => (
            <TokenCard key={token.id} i18n={i18n} token={token} isActive={selectedToken?.id === token.id} onClick={(t) => setSelectedToken(t)} />
          ))}
        </div>
      </div>
      {/* ================================================================ */}
      {/* Right region: draggable divider + detail panel                   */}
      {/* ================================================================ */}
      {showDetail && (
        <>
          {/* Draggable divider */}
          <div
            onMouseDown={handleDividerMouseDown}
            style={{
              width: 1,
              flexShrink: 0,
              background: isResizing ? "var(--accent-color, #58a6ff)" : "var(--border-color, #30363d)",
              cursor: "col-resize",
              position: "relative",
              transition: "background 0.15s",
            }}
          >
            {/* Larger invisible hit area */}
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: -4,
                right: -4,
                cursor: "col-resize",
              }}
            />
          </div>
          {/* Detail panel */}
          <div
            style={{
              width: detailWidth,
              minWidth: DETAIL_PANEL_MIN_WIDTH,
              flexShrink: 0,
              overflow: "hidden",
              borderLeft: "1px solid var(--border-color, #30363d)",
            }}
          >
            <TokenDetailPanel i18n={i18n} theme={theme} token={selectedToken} onClose={() => setSelectedToken(null)} />
          </div>
        </>
      )}
    </div>
  );
};
export default BondingCurvePanel;
