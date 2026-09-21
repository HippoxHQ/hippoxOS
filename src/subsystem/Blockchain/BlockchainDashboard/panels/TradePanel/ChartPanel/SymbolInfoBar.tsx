import React, { useEffect, useRef, useState } from "react";
import { ChevronRight, ChevronLeft, Send, Globe, MessageCircle } from "lucide-react";
import { MID_PRICE, formatNum, subtleText } from "../types";
import { XIcon } from "../../../../../../icons";
interface SymbolInfoBarProps {
  i18n?: "en" | "zh-cn";
  /** Trading symbol, e.g. "BTC-PERP" */
  symbol: string;
  /** When true the right order ticket panel is collapsed */
  isRightCollapsed?: boolean;
  /** Toggle the right order ticket panel */
  onToggleRight?: () => void;
}
/**
 * SymbolInfoBar - Instrument header for the trade panel.
 */
export const SymbolInfoBar: React.FC<SymbolInfoBarProps> = ({ i18n = "en", symbol, isRightCollapsed = false, onToggleRight }) => {
  const isZh = i18n === "zh-cn";
  // Mock instrument data - replace with real data from the backend
  const fullName = "Hippox Token";
  const ticker = "HIPPOX";
  const logoText = "H";
  const logoColor = "#8B5CF6";
  // Token spot price (shown as the "Price" metric on the right side)
  const price = MID_PRICE;
  const change = 2.14;
  const isUp = change >= 0;
  const changeColor = isUp ? "#3fb950" : "#f85149";
  // Token price shown next to the identity block
  const tokenPrice = 0.05;
  // Top-row right side values
  const poolA = 4821.6; // e.g. poolA reserve (ETH)
  const poolB = 15842000.0; // e.g. poolB reserve (HIPPOX)
  const totalSupply = 100000000.0;
  // Bottom-row metric values
  const marketCap = 2542180.0;
  const volume24h = 163510.0;
  const holders = 12480;
  const liquidity = 892430.0;
  /**
   * Format a number as "$xxx.xK" style value with a K suffix.
   */
  const formatK = (v: number): string => {
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
    return `$${v.toFixed(2)}`;
  };
  // Social links (icons only)
  const socials = [
    { key: "twitter", icon: <XIcon size={11} />, title: "Twitter" },
    { key: "telegram", icon: <Send size={11} />, title: "Telegram" },
    { key: "website", icon: <Globe size={11} />, title: "Website" },
    { key: "discord", icon: <MessageCircle size={11} />, title: "Discord" },
  ];
  // Responsive behaviour
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(Infinity);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // Width thresholds (px). Tune to taste.
  // Bottom-row metrics (24h Vol / Holders / Liquidity) are hidden below this.
  const SHOW_BOTTOM_METRICS_MIN = 700;
  // Top-row metrics (Price / MCap / Pool / Total Supply) are hidden below this.
  const SHOW_TOP_METRICS_MIN = 500;
  // Bottom row hides first, then the top row, as the container shrinks.
  const showBottomMetrics = containerWidth >= SHOW_BOTTOM_METRICS_MIN;
  const showTopMetrics = containerWidth >= SHOW_TOP_METRICS_MIN;
  /**
   * Shared style for a single metric cell on the right side.
   * All text is centered both horizontally and vertically.
   */
  const metricCellStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    minWidth: 0,
    flexShrink: 1,
    textAlign: "center",
  };
  const metricLabelStyle: React.CSSProperties = {
    ...subtleText,
    fontSize: 10,
    textAlign: "center",
    whiteSpace: "nowrap",
  };
  const metricValueStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "monospace",
    textAlign: "center",
    whiteSpace: "nowrap",
  };
  return (
    <div
      ref={rootRef}
      style={{
        // Fixed 61px height (60px content + 1px border) to match the
        // interval grid on the OrderTicketPanel.
        height: 61,
        minHeight: 61,
        maxHeight: 61,
        display: "flex",
        alignItems: "center",
        // Left group hugs the left; the collapse button hugs the right.
        justifyContent: "space-between",
        padding: "0 10px",
        borderBottom: "1px solid var(--border-color, #30363d)",
        flexShrink: 0,
        background: "var(--bg-secondary, #161b22)",
        gap: 8,
        boxSizing: "border-box",
        width: "100%",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
          // Never allow the left group to be squeezed.
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "5px",
            background: logoColor,
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {logoText}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          {/* Row 1: full name + ticker */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {fullName}
            </span>
            <span style={{ ...subtleText, fontSize: 11, flexShrink: 0 }}>({ticker})</span>
          </div>
          {/* Row 2: age · contract · socials */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              minWidth: 0,
              flexWrap: "nowrap",
            }}
          >
            <span style={{ ...subtleText, fontSize: 10, flexShrink: 0 }}>{isZh ? "3天前" : "3d ago"}</span>
            <span style={{ ...subtleText, fontSize: 10, flexShrink: 0 }}>·</span>
            <span
              style={{
                ...subtleText,
                fontSize: 10,
                fontFamily: "monospace",
                flexShrink: 0,
              }}
            >
              0x1a2b...c3d4
            </span>
            <span style={{ ...subtleText, fontSize: 10, flexShrink: 0 }}>·</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {socials.map((s) => (
                <button
                  key={s.key}
                  title={s.title}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-secondary, #8b949e)",
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary, #e6edf3)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-secondary, #8b949e)")}
                >
                  {s.icon}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          // +5px compared to the previous 6px
          gap: 11,
          flexShrink: 1,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        {showTopMetrics && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              // +5px compared to the previous 6px
              gap: 11,
              flexShrink: 1,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {/* Top metric: price */}
            <div style={metricCellStyle}>
              <span style={metricLabelStyle}>{isZh ? "价格" : "Price"}</span>
              <span style={metricValueStyle}>{tokenPrice.toFixed(2)}</span>
            </div>
            {/* Top metric: market cap, placed directly to the right of Price */}
            <div style={metricCellStyle}>
              <span style={metricLabelStyle}>{isZh ? "市值" : "MCap"}</span>
              <span style={metricValueStyle}>{formatK(marketCap)}</span>
            </div>
            {/* Top metric: pool */}
            <div style={metricCellStyle}>
              <span style={metricLabelStyle}>{isZh ? "池子" : "Pool"}</span>
              <span style={metricValueStyle}>{formatNum(poolB, 0)}</span>
            </div>
            {/* Top metric: total supply */}
            <div style={metricCellStyle}>
              <span style={metricLabelStyle}>{isZh ? "总供应量" : "Total Supply"}</span>
              <span style={metricValueStyle}>{formatNum(totalSupply, 0)}</span>
            </div>
            {/*
              Bottom-row metrics are hidden first as the container shrinks.
              The divider is rendered together with the bottom row so they
              disappear as a single unit.
            */}
            {showBottomMetrics && (
              <>
                {/* Vertical divider between metric groups */}
                <div
                  style={{
                    width: 1,
                    alignSelf: "stretch",
                    background: "var(--border-color, #30363d)",
                    margin: "0 2px",
                    flexShrink: 0,
                  }}
                />
                {/* Bottom-row metrics: Vol / Holders / Liquidity */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    // +5px compared to the previous 6px
                    gap: 11,
                    minWidth: 0,
                    flexShrink: 1,
                  }}
                >
                  <div style={metricCellStyle}>
                    <span style={metricLabelStyle}>{isZh ? "24h量" : "24h Vol"}</span>
                    <span style={metricValueStyle}>${formatNum(volume24h, 0)}</span>
                  </div>
                  <div style={metricCellStyle}>
                    <span style={metricLabelStyle}>{isZh ? "持有人" : "Holders"}</span>
                    <span style={metricValueStyle}>{formatNum(holders, 0)}</span>
                  </div>
                  <div style={metricCellStyle}>
                    <span style={metricLabelStyle}>{isZh ? "流动性" : "Liquidity"}</span>
                    <span style={metricValueStyle}>${formatNum(liquidity, 0)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        {/* Collapse toggle: rightmost, never shrinks */}
        <button
          onClick={onToggleRight}
          title={isRightCollapsed ? (isZh ? "展开交易面板" : "Expand trade panel") : isZh ? "收起交易面板" : "Collapse trade panel"}
          style={{
            background: "transparent",
            border: "1px solid var(--border-color, #30363d)",
            borderRadius: 5,
            color: "var(--text-secondary, #8b949e)",
            cursor: "pointer",
            padding: "4px 6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            // Critical: never allow the collapse button to be squeezed away.
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg, #21262d)";
            e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
          }}
        >
          {isRightCollapsed ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>
      </div>
    </div>
  );
};
export default SymbolInfoBar;
