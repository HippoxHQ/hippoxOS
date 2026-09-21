import React from "react";
import { BarChart3, Zap } from "lucide-react";
interface BondingCurvePanelProps {
  i18n?: "en" | "zh-cn";
}
// Mock data - replace with real backend / chain data later
interface BondingCurveToken {
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
}
const MOCK_BONDING_TOKENS: BondingCurveToken[] = [
  { id: "0x1a2b...c3d4", symbol: "MEME", name: "Hippo Meme Coin", price: 0.000421, priceChange24h: 18.42, marketCap: 42.8, holders: 1240, progress: 78, volume24h: 12.4, graduated: false },
  { id: "0x5e6f...g7h8", symbol: "AIX", name: "AI Agent X", price: 0.0128, priceChange24h: -4.21, marketCap: 128.5, holders: 3820, progress: 100, volume24h: 89.2, graduated: true },
  { id: "0x9i0j...k1l2", symbol: "DEFI", name: "DeFi Protocol", price: 0.0342, priceChange24h: 6.88, marketCap: 342.1, holders: 5620, progress: 92, volume24h: 156.8, graduated: false },
  { id: "0x3m4n...o5p6", symbol: "GAME", name: "GameFi Token", price: 0.0089, priceChange24h: -12.34, marketCap: 89.2, holders: 2140, progress: 45, volume24h: 34.6, graduated: false },
  { id: "0x7q8r...s9t0", symbol: "NFTX", name: "NFT Index", price: 0.156, priceChange24h: 2.14, marketCap: 678.9, holders: 8920, progress: 100, volume24h: 234.5, graduated: true },
];
const MOCK_CURVE_ACTIVITY = [
  { action: "Buy", token: "MEME", amount: "0.25 ETH", user: "0x1a2b...3c4d", time: "30s ago" },
  { action: "Sell", token: "AIX", amount: "120 AIX", user: "0x5e6f...7g8h", time: "2m ago" },
  { action: "Buy", token: "DEFI", amount: "0.08 ETH", user: "0x9i0j...1k2l", time: "5m ago" },
  { action: "Buy", token: "GAME", amount: "0.42 ETH", user: "0x3m4n...5o6p", time: "8m ago" },
];
/**
 * BondingCurvePanel - Middle column of the blockchain dashboard.
 * Displays market stats, bonding curve token list and recent curve activity.
 */
export const BondingCurvePanel: React.FC<BondingCurvePanelProps> = ({ i18n = "en" }) => {
  const isZh = i18n === "zh-cn";
  const styles = {
    root: {
      display: "flex",
      flexDirection: "column" as const,
      height: "100%",
      overflow: "hidden",
      background: "var(--bg-primary, #0d1117)",
    } as React.CSSProperties,
    statsBar: {
      display: "flex",
      alignItems: "stretch",
      borderBottom: "1px solid var(--border-color, #30363d)",
      flexShrink: 0,
    } as React.CSSProperties,
    tableHeader: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 1fr 80px",
      gap: 8,
      padding: "8px 14px",
      fontSize: 10,
      fontWeight: 600,
      color: "var(--text-secondary, #8b949e)",
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
      borderBottom: "1px solid var(--border-color, #30363d)",
      flexShrink: 0,
    } as React.CSSProperties,
    tableRow: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr 1fr 80px",
      gap: 8,
      padding: "10px 14px",
      alignItems: "center",
      borderBottom: "1px solid var(--border-color, #30363d)",
      cursor: "pointer",
      transition: "background 0.15s",
      fontSize: 12,
    } as React.CSSProperties,
    subtleText: {
      color: "var(--text-secondary, #8b949e)",
      fontSize: "11px",
    } as React.CSSProperties,
    pill: (color: string, bg: string): React.CSSProperties => ({
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      padding: "2px 6px",
      borderRadius: "4px",
      fontSize: "11px",
      fontWeight: 600,
      color,
      background: bg,
    }),
  };
  return (
    <div style={styles.root}>
      <div style={styles.statsBar}>
        {[
          { label: isZh ? "总市值" : "Total Market Cap", value: "1,281.5 ETH", change: 4.21 },
          { label: isZh ? "24h 交易量" : "24h Volume", value: "527.5 ETH", change: 12.8 },
          { label: isZh ? "活跃代币" : "Active Tokens", value: "5", change: 0 },
          { label: isZh ? "已毕业" : "Graduated", value: "2", change: 0 },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              padding: "12px 14px",
              borderRight: i < 3 ? "1px solid var(--border-color, #30363d)" : "none",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <span style={styles.subtleText}>{stat.label}</span>
            <span style={{ fontSize: 16, fontWeight: 700 }}>{stat.value}</span>
            {stat.change !== 0 && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: stat.change >= 0 ? "#3fb950" : "#f85149",
                }}
              >
                {stat.change >= 0 ? "+" : ""}
                {stat.change.toFixed(2)}%
              </span>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #8b949e)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          <BarChart3 size={13} />
          {isZh ? "联合曲线代币" : "Bonding Curve Tokens"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {["All", "Active", "Graduated"].map((f) => (
            <button
              key={f}
              style={{
                background: f === "All" ? "var(--accent-color, #58a6ff)" : "transparent",
                color: f === "All" ? "white" : "var(--text-secondary, #8b949e)",
                border: "1px solid var(--border-color, #30363d)",
                borderRadius: 4,
                padding: "2px 8px",
                fontSize: 10,
                cursor: "pointer",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.tableHeader}>
        <span>{isZh ? "代币" : "Token"}</span>
        <span style={{ textAlign: "right" }}>{isZh ? "价格" : "Price"}</span>
        <span style={{ textAlign: "right" }}>24h</span>
        <span style={{ textAlign: "right" }}>{isZh ? "市值" : "MCap"}</span>
        <span>{isZh ? "曲线进度" : "Progress"}</span>
        <span style={{ textAlign: "right" }}>{isZh ? "交易量" : "Volume"}</span>
        <span style={{ textAlign: "right" }}>{isZh ? "操作" : "Trade"}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {MOCK_BONDING_TOKENS.map((token) => (
          <div key={token.id} style={styles.tableRow} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg, #21262d)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            {/* Token name */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: token.graduated ? "#3fb95022" : "#58a6ff22",
                  color: token.graduated ? "#3fb950" : "#58a6ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {token.symbol.slice(0, 2)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                  {token.symbol}
                  {token.graduated && <span style={{ ...styles.pill("#3fb950", "rgba(63,185,80,0.15)"), fontSize: 9 }}>✓</span>}
                </span>
                <span style={{ ...styles.subtleText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{token.name}</span>
              </div>
            </div>
            {/* Price */}
            <div style={{ textAlign: "right", fontWeight: 600 }}>{token.price.toFixed(6)} ETH</div>
            {/* 24h change */}
            <div
              style={{
                textAlign: "right",
                fontWeight: 600,
                color: token.priceChange24h >= 0 ? "#3fb950" : "#f85149",
              }}
            >
              {token.priceChange24h >= 0 ? "+" : ""}
              {token.priceChange24h.toFixed(2)}%
            </div>
            {/* Market cap */}
            <div style={{ textAlign: "right" }}>{token.marketCap.toFixed(1)} ETH</div>
            {/* Progress bar */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: "var(--border-color, #30363d)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${token.progress}%`,
                    height: "100%",
                    background: token.graduated ? "#3fb950" : "#58a6ff",
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span style={{ ...styles.subtleText, fontSize: 10, minWidth: 30, textAlign: "right" }}>{token.progress}%</span>
            </div>
            {/* Volume */}
            <div style={{ textAlign: "right" }}>{token.volume24h.toFixed(1)} ETH</div>
            {/* Trade button */}
            <button
              style={{
                background: "var(--accent-color, #58a6ff)",
                color: "white",
                border: "none",
                borderRadius: 4,
                padding: "4px 10px",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
              }}
              onClick={(e) => {
                e.stopPropagation();
                // TODO: hook into swap panel with this token
              }}
            >
              {isZh ? "交易" : "Trade"}
            </button>
          </div>
        ))}
      </div>
      <div
        style={{
          borderTop: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
          maxHeight: 180,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-secondary, #8b949e)",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            borderBottom: "1px solid var(--border-color, #30363d)",
          }}
        >
          <Zap size={13} />
          {isZh ? "曲线动态" : "Curve Activity"}
        </div>
        <div style={{ overflowY: "auto", padding: "6px 14px" }}>
          {MOCK_CURVE_ACTIVITY.map((evt, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "5px 0",
                fontSize: 11,
                borderBottom: i < MOCK_CURVE_ACTIVITY.length - 1 ? "1px solid var(--border-color, #30363d)" : "none",
              }}
            >
              <span style={styles.pill(evt.action === "Buy" ? "#3fb950" : "#f0883e", evt.action === "Buy" ? "rgba(63,185,80,0.15)" : "rgba(240,136,62,0.15)")}>{evt.action}</span>
              <span style={{ flex: 1, marginLeft: 8, fontWeight: 600 }}>{evt.token}</span>
              <span style={{ color: "var(--text-secondary, #8b949e)", marginRight: 8 }}>{evt.amount}</span>
              <span style={styles.subtleText}>{evt.user}</span>
              <span style={{ ...styles.subtleText, marginLeft: 8, minWidth: 50, textAlign: "right" }}>{evt.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default BondingCurvePanel;
