import React from "react";
import { Wallet, Coins, Activity, TrendingUp, TrendingDown, Copy, ExternalLink, RefreshCw } from "lucide-react";
interface AccountPanelProps {
  i18n?: "en" | "zh-cn";
}
// Mock data - replace with real backend / chain data later
const MOCK_ACCOUNT = {
  address: "0x0000000000000000",
  ens: "hippox.eth",
  totalValueUsd: 24891.42,
  change24h: 3.42,
  ethBalance: 4.2183,
  ethPriceUsd: 3245.18,
  hippoxBalance: 128450.0,
  hippoxPriceUsd: 0.0421,
};
interface Token {
  symbol: string;
  name: string;
  balance: number;
  priceUsd: number;
  icon: string;
  color: string;
}
const MOCK_TOKENS: Token[] = [
  { symbol: "ETH", name: "Ethereum", balance: 4.2183, priceUsd: 3245.18, icon: "Ξ", color: "#627EEA" },
  { symbol: "HIPPOX", name: "Hippox Token", balance: 128450.0, priceUsd: 0.0421, icon: "H", color: "#8B5CF6" },
  { symbol: "USDC", name: "USD Coin", balance: 5120.55, priceUsd: 1.0, icon: "$", color: "#2775CA" },
  { symbol: "WBTC", name: "Wrapped BTC", balance: 0.0842, priceUsd: 67234.1, icon: "₿", color: "#F7931A" },
];
const MOCK_RECENT_TXS = [
  { type: "swap", from: "ETH", to: "HIPPOX", amount: "0.5", valueUsd: 1622.59, time: "2m ago", status: "success" },
  { type: "buy", from: "ETH", to: "MEME", amount: "0.12", valueUsd: 389.42, time: "15m ago", status: "success" },
  { type: "add", from: "ETH", to: "LP", amount: "1.0", valueUsd: 3245.18, time: "1h ago", status: "success" },
  { type: "swap", from: "USDC", to: "HIPPOX", amount: "500", valueUsd: 500.0, time: "3h ago", status: "success" },
  { type: "remove", from: "LP", to: "ETH", amount: "0.8", valueUsd: 2596.14, time: "5h ago", status: "success" },
];
// Helpers
const formatUsd = (value: number): string => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
};
const formatNumber = (value: number, decimals: number = 2): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(decimals);
};
const shortenAddress = (addr: string): string => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
/**
 * AccountPanel - Left column of the blockchain dashboard.
 * Displays account overview, token holdings and recent activity.
 */
export const AccountPanel: React.FC<AccountPanelProps> = ({ i18n = "en" }) => {
  const isZh = i18n === "zh-cn";
  const styles = {
    root: {
      display: "flex",
      flexDirection: "column" as const,
      height: "100%",
      overflowY: "auto" as const,
      background: "var(--bg-primary, #0d1117)",
    } as React.CSSProperties,
    section: {
      borderBottom: "1px solid var(--border-color, #30363d)",
      display: "flex",
      flexDirection: "column" as const,
    } as React.CSSProperties,
    sectionHeader: {
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "12px",
      fontWeight: 600,
      color: "var(--text-secondary, #8b949e)",
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
    } as React.CSSProperties,
    sectionBody: {
      padding: "10px 14px",
    } as React.CSSProperties,
    row: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "6px 0",
      fontSize: "12px",
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
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Wallet size={13} />
            {isZh ? "账户总览" : "Account Overview"}
          </span>
          <button
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary, #8b949e)",
              cursor: "pointer",
              padding: 2,
              display: "flex",
            }}
            title={isZh ? "刷新" : "Refresh"}
          >
            <RefreshCw size={12} />
          </button>
        </div>
        <div style={styles.sectionBody}>
          {/* Address */}
          <div style={{ ...styles.row, paddingBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontWeight: 600, fontSize: "13px" }}>{MOCK_ACCOUNT.ens}</span>
              <span style={{ ...styles.subtleText, display: "flex", alignItems: "center", gap: 4 }}>
                {shortenAddress(MOCK_ACCOUNT.address)}
                <Copy size={10} style={{ cursor: "pointer" }} />
                <ExternalLink size={10} style={{ cursor: "pointer" }} />
              </span>
            </div>
            <span style={styles.pill("#3fb950", "rgba(63,185,80,0.15)")}>
              <Activity size={10} /> {isZh ? "已连接" : "Connected"}
            </span>
          </div>
          {/* Total value */}
          <div style={{ padding: "10px 0", borderTop: "1px solid var(--border-color, #30363d)" }}>
            <div style={styles.subtleText}>{isZh ? "总资产" : "Total Value"}</div>
            <div style={{ fontSize: "22px", fontWeight: 700, marginTop: 2 }}>{formatUsd(MOCK_ACCOUNT.totalValueUsd)}</div>
            <div
              style={{
                ...styles.pill(MOCK_ACCOUNT.change24h >= 0 ? "#3fb950" : "#f85149", MOCK_ACCOUNT.change24h >= 0 ? "rgba(63,185,80,0.15)" : "rgba(248,81,73,0.15)"),
                marginTop: 6,
              }}
            >
              {MOCK_ACCOUNT.change24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {MOCK_ACCOUNT.change24h >= 0 ? "+" : ""}
              {MOCK_ACCOUNT.change24h.toFixed(2)}% (24h)
            </div>
          </div>
          {/* Native balances */}
          <div style={{ paddingTop: 10, borderTop: "1px solid var(--border-color, #30363d)" }}>
            <div style={styles.row}>
              <span style={styles.subtleText}>{isZh ? "ETH 余额" : "ETH Balance"}</span>
              <span style={{ fontWeight: 600 }}>{MOCK_ACCOUNT.ethBalance.toFixed(4)} ETH</span>
            </div>
            <div style={styles.row}>
              <span style={styles.subtleText}>{isZh ? "HIPPOX 余额" : "HIPPOX Balance"}</span>
              <span style={{ fontWeight: 600 }}>{formatNumber(MOCK_ACCOUNT.hippoxBalance)} HIPPOX</span>
            </div>
          </div>
        </div>
      </div>
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Coins size={13} />
            {isZh ? "代币持有" : "Token Holdings"}
          </span>
          <span style={styles.subtleText}>{MOCK_TOKENS.length}</span>
        </div>
        <div style={{ ...styles.sectionBody, padding: "6px 8px" }}>
          {MOCK_TOKENS.map((token) => (
            <div
              key={token.symbol}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg, #21262d)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: token.color,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {token.icon}
                </div>
                <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>{token.symbol}</span>
                  <span style={styles.subtleText}>{formatNumber(token.balance, 4)}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{formatUsd(token.balance * token.priceUsd)}</div>
                <div style={styles.subtleText}>${token.priceUsd.toLocaleString()}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ ...styles.section, borderBottom: "none" }}>
        <div style={styles.sectionHeader}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Activity size={13} />
            {isZh ? "最近活动" : "Recent Activity"}
          </span>
        </div>
        <div style={{ ...styles.sectionBody, padding: "6px 14px" }}>
          {MOCK_RECENT_TXS.map((tx, idx) => {
            const typeLabel: Record<string, string> = {
              swap: isZh ? "兑换" : "Swap",
              buy: isZh ? "买入" : "Buy",
              add: isZh ? "添加流动性" : "Add LP",
              remove: isZh ? "移除流动性" : "Remove LP",
            };
            const typeColor: Record<string, string> = {
              swap: "#58a6ff",
              buy: "#3fb950",
              add: "#a371f7",
              remove: "#f0883e",
            };
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: idx < MOCK_RECENT_TXS.length - 1 ? "1px solid var(--border-color, #30363d)" : "none",
                  fontSize: 11,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <span style={styles.pill(typeColor[tx.type], `${typeColor[tx.type]}22`)}>{typeLabel[tx.type]}</span>
                  <span style={{ color: "var(--text-secondary, #8b949e)" }}>
                    {tx.from} → {tx.to}
                  </span>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontWeight: 600 }}>{tx.amount}</div>
                  <div style={styles.subtleText}>{tx.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
export default AccountPanel;
