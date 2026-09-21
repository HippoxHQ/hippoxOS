import React, { useState } from "react";
import { MID_PRICE, formatNum, subtleText, inputStyle } from "./types";
interface OrderTicketPanelProps {
  i18n?: "en" | "zh-cn";
  symbol: string;
  midPrice?: number;
  onSubmit?: (params: { symbol: string; side: "buy" | "sell"; type: "market" | "limit"; price: number; size: number; leverage: number }) => void;
}
export const OrderTicketPanel: React.FC<OrderTicketPanelProps> = ({ i18n = "en", symbol, midPrice = MID_PRICE, onSubmit }) => {
  const isZh = i18n === "zh-cn";
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [size, setSize] = useState<string>("");
  const [interval, setInterval] = useState("1m");
  // Track which percentage button is currently active.
  // null means no preset is selected (e.g. user typed a custom amount).
  const [sizePercent, setSizePercent] = useState<number | null>(null);
  const isBuy = side === "buy";
  const accent = isBuy ? "#3fb950" : "#f85149";
  // Mock account state
  const availableBalance = 10000;
  const tokenBalance = 4.2183;
  // Mock per-interval flow stats.
  // Each interval has its own volume / buy / sell / net-buy numbers.
  // Replace with real feed from the backend.
  interface IntervalStats {
    volume: number;
    buyCount: number;
    buyVolume: number;
    sellCount: number;
    sellVolume: number;
  }
  const intervalStats: Record<string, IntervalStats> = {
    "1m": { volume: 0, buyCount: 0, buyVolume: 0, sellCount: 0, sellVolume: 0 },
    "5m": { volume: 12.4, buyCount: 3, buyVolume: 8.2, sellCount: 2, sellVolume: 4.2 },
    "1h": { volume: 163.51, buyCount: 18, buyVolume: 109.0, sellCount: 15, sellVolume: 54.9 },
    "24h": { volume: 4821.6, buyCount: 512, buyVolume: 2940.4, sellCount: 431, sellVolume: 1881.2 },
  };
  // Resolve the active interval's stats and derive net-buy values.
  const stats = intervalStats[interval] || intervalStats["1m"];
  const netBuy = stats.buyVolume - stats.sellVolume;
  const totalVolume = stats.buyVolume + stats.sellVolume;
  const netBuyPercent = totalVolume > 0 ? (netBuy / totalVolume) * 100 : 0;
  const notional = (parseFloat(size) || 0) * midPrice;
  const estFee = notional * 0.003;
  // Mock token safety / audit data for the blocks appended below the ticket.
  // Replace with real values from the backend when available.
  const safetyGrid = [
    { key: "top10", labelZh: "前10持有", labelEn: "Top 10", value: "23.4%", risk: "warn" },
    { key: "devHold", labelZh: "DEV 持有", labelEn: "DEV Hold", value: "5.2%", risk: "warn" },
    { key: "holders", labelZh: "持有者", labelEn: "Holders", value: "12,480", risk: "ok" },
    { key: "snipers", labelZh: "狙击手", labelEn: "Snipers", value: "8", risk: "warn" },
    { key: "insiders", labelZh: "老鼠仓", labelEn: "Insiders", value: "3", risk: "warn" },
    { key: "phishing", labelZh: "钓鱼钱包", labelEn: "Phishing", value: "0", risk: "ok" },
    { key: "bundled", labelZh: "捆绑交易", labelEn: "Bundled", value: "12.1%", risk: "warn" },
    { key: "blacklist", labelZh: "黑名单", labelEn: "Blacklist", value: "0", risk: "ok" },
    { key: "lowLiquidity", labelZh: "低池子", labelEn: "Low LP", value: "No", risk: "ok" },
    { key: "mintable", labelZh: "可增发", labelEn: "Mintable", value: "No", risk: "ok" },
    { key: "freezable", labelZh: "可冻结", labelEn: "Freezable", value: "No", risk: "ok" },
    { key: "renounced", labelZh: "放弃所有权", labelEn: "Renounced", value: "Yes", risk: "ok" },
    { key: "proxy", labelZh: "代理合约", labelEn: "Proxy", value: "No", risk: "ok" },
    { key: "honeypot", labelZh: "蜜罐检测", labelEn: "Honeypot", value: "Safe", risk: "ok" },
    { key: "taxBuy", labelZh: "买入税", labelEn: "Buy Tax", value: "0%", risk: "ok" },
    { key: "taxSell", labelZh: "卖出税", labelEn: "Sell Tax", value: "0%", risk: "ok" },
  ] as const;
  const devInfo = {
    address: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    holdings: "5.2%",
    created: "2025-01-12 08:34",
    deployCount: 14,
    rugCount: 0,
    verified: true,
  };
  const basicData = {
    marketCap: "$2.54M",
    totalSupply: "100,000,000",
    poolAddress: "0x9f8e7d6c5b4a39281706f5e4d3c2b1a0",
    holders: "12,480",
    tokenCreated: "2025-01-12 08:34",
    poolCreated: "2025-01-12 08:36",
  };
  const safetyChecks = [
    { labelZh: "合约已验证", labelEn: "Contract Verified", passed: true },
    { labelZh: "无恶意函数", labelEn: "No Malicious Functions", passed: true },
    { labelZh: "流动性已锁定", labelEn: "Liquidity Locked", passed: true },
    { labelZh: "无黑名单功能", labelEn: "No Blacklist", passed: true },
    { labelZh: "无交易限制", labelEn: "No Trading Limits", passed: true },
    { labelZh: "所有权已放弃", labelEn: "Ownership Renounced", passed: true },
    { labelZh: "非蜜罐", labelEn: "Not a Honeypot", passed: true },
    { labelZh: "无代理升级", labelEn: "No Proxy Upgrade", passed: true },
  ];
  const handlePercentClick = (pct: number) => {
    // percentage of the available balance (quote currency)
    const computed = (availableBalance * (pct / 100)) / midPrice;
    setSize(computed.toFixed(4));
    // Mark this preset as active.
    setSizePercent(pct);
  };
  const handleMaxClick = () => {
    const computed = availableBalance / midPrice;
    setSize(computed.toFixed(4));
    // MAX is treated as the 100% preset.
    setSizePercent(100);
  };
  // Clear the active preset when the user types a custom size.
  const handleSizeChange = (value: string) => {
    setSize(value);
    setSizePercent(null);
  };
  const handleSubmit = () => {
    const s = parseFloat(size);
    if (!s || s <= 0) return;
    onSubmit?.({ symbol, side, type: "market", price: midPrice, size: s, leverage: 1 });
  };
  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 11,
    lineHeight: 1.5,
  };
  const labelStyle: React.CSSProperties = {
    color: "var(--text-secondary, #8b949e)",
    fontSize: 11,
  };
  const valueStyle: React.CSSProperties = {
    color: "var(--text-primary, #e6edf3)",
    fontSize: 11,
    fontFamily: "monospace",
  };
  // Explicit full-width divider so it is never collapsed to zero width
  // inside a flex column container.
  const divider: React.CSSProperties = {
    width: "100%",
    height: 1,
    minHeight: 1,
    flexShrink: 0,
    background: "var(--border-color, #30363d)",
    // margin: "4px 0",
  };
  // Zero-margin divider used inside the info blocks below the ticket.
  const rowDivider: React.CSSProperties = {
    width: "100%",
    height: 1,
    minHeight: 1,
    flexShrink: 0,
    background: "var(--border-color, #30363d)",
    margin: 0,
  };
  // Section title style for the new blocks.
  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
    color: "var(--text-secondary, #8b949e)",
    marginBottom: 6,
  };
  // Risk color helper for the safety grid.
  const riskColor = (risk: string): string => {
    if (risk === "ok") return "#3fb950";
    if (risk === "warn") return "#f0b90b";
    return "#f85149";
  };
  // Truncate a long hex address for display.
  const shortAddr = (addr: string): string => {
    if (addr.length <= 14) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  };
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-secondary, #161b22)",
      }}
    >
      {/* FIXED TOP AREA (does not scroll)  Interval cards + stats row + ticket + submit button */}
      <div
        style={{
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
        }}
      >
        {/* Interval grid: 4 card cells, fixed 44px height each.
            Cards show a border when active, radius 5px. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
            padding: "8px 10px",
            borderBottom: "1px solid var(--border-color, #30363d)",
          }}
        >
          {["1m", "5m", "1h", "24h"].map((tf) => {
            const active = interval === tf;
            const tfVolume = intervalStats[tf]?.volume ?? 0;
            return (
              <button
                key={tf}
                onClick={() => setInterval(tf)}
                style={{
                  // Card: fixed 44px height, 5px radius, border visible when active.
                  height: 44,
                  background: "var(--bg-secondary, #161b22)",
                  border: active ? "1px solid var(--accent-color, #58a6ff)" : "1px solid var(--border-color, #30363d)",
                  borderRadius: 5,
                  color: active ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: 0,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                  }
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    letterSpacing: "0.3px",
                  }}
                >
                  {tf}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: active ? "#58a6ff" : "var(--text-secondary, #8b949e)",
                  }}
                >
                  {formatNum(tfVolume, 1)}
                </span>
              </button>
            );
          })}
        </div>
        {/* Stats row: 4 cells in a single row.
            No borders, no background separators between cells.
            Volume / Net Buy / Buy / Sell. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            padding: "8px 10px",
            borderBottom: "1px solid var(--border-color, #30363d)",
          }}
        >
          {/* Volume */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <span style={{ ...labelStyle, fontSize: 12 }}>{isZh ? "成交额" : "Volume"}</span>
            <span style={{ ...valueStyle, fontWeight: 600, fontSize: 11 }}>${formatNum(stats.volume, 2)}</span>
          </div>
          {/* Net buy */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <span style={{ ...labelStyle, fontSize: 12 }}>{isZh ? "净买入" : "Net Buy"}</span>
            <span
              style={{
                ...valueStyle,
                fontWeight: 600,
                fontSize: 12,
                color: netBuy >= 0 ? "#3fb950" : "#f85149",
              }}
            >
              {netBuy >= 0 ? "+" : ""}${formatNum(netBuy, 2)}
            </span>
          </div>
          {/* Buy */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <span style={{ ...labelStyle, fontSize: 12, color: "#3fb950", fontWeight: 600 }}>{isZh ? "买入" : "Buy"}</span>
            <span style={{ ...valueStyle, color: "#3fb950", fontWeight: 600, fontSize: 11 }}>
              {stats.buyCount}/${formatNum(stats.buyVolume, 1)}
            </span>
          </div>
          {/* Sell */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
            }}
          >
            <span style={{ ...labelStyle, fontSize: 12, color: "#f85149", fontWeight: 600 }}>{isZh ? "卖出" : "Sell"}</span>
            <span style={{ ...valueStyle, color: "#f85149", fontWeight: 600, fontSize: 11 }}>
              {stats.sellCount}/${formatNum(stats.sellVolume, 1)}
            </span>
          </div>
        </div>
        {/* TICKET FORM (also fixed, does not scroll) */}
        <div
          style={{
            padding: "12px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderBottom: "1px solid var(--border-color, #30363d)",
          }}
        >
          {/*
            Buy / Sell toggle.
            Wrapped in a single container so it reads as one grouped button,
            separated by a 1px divider line. Size and colors are unchanged.
          */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 5,
              overflow: "hidden",
            }}
          >
            {(["buy", "sell"] as const).map((s, idx) => {
              const active = side === s;
              const color = s === "buy" ? "#3fb950" : "#f85149";
              return (
                <React.Fragment key={s}>
                  {/* Vertical divider between the two buttons. */}
                  {idx > 0 && (
                    <div
                      style={{
                        width: 1,
                        flexShrink: 0,
                        background: "var(--border-color, #30363d)",
                      }}
                    />
                  )}
                  <button
                    onClick={() => setSide(s)}
                    style={{
                      flex: 1,
                      padding: "5px 0",
                      // Active side keeps its solid color; inactive stays transparent.
                      background: active ? color : "transparent",
                      color: active ? "white" : "var(--text-secondary, #8b949e)",
                      // Outer wrapper owns the border; the button itself has none.
                      border: "none",
                      borderRadius: 0,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      transition: "background 0.15s, color 0.15s",
                    }}
                  >
                    {s === "buy" ? (isZh ? "买入" : "Buy") : isZh ? "卖出" : "Sell"}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
          {/*
            Size input + percentage presets grouped into one bordered box.
            The four presets are laid out as four equal segments inside a
            segmented control: no separate buttons, just a full-width row of
            four cells separated by thin vertical dividers.
          */}
          <div
            style={{
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 5,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Row 1: size label + max hint + input */}
            <div style={{ padding: "8px 10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={labelStyle}>{isZh ? "数量" : "Size"}</span>
                <span style={{ ...labelStyle, fontFamily: "monospace" }}>
                  {isZh ? "最大" : "Max"}: {formatNum(availableBalance / midPrice, 4)}
                </span>
              </div>
              <input
                type="text"
                value={size}
                onChange={(e) => handleSizeChange(e.target.value)}
                placeholder="0.00"
                // Remove the standalone border/radius so the wrapper owns the frame.
                style={{
                  ...inputStyle,
                  border: "none",
                  borderRadius: 0,
                  padding: 0,
                  background: "transparent",
                }}
              />
            </div>
            {/* Horizontal divider between input row and preset row */}
            <div style={rowDivider} />
            {/*
              Row 2: percentage presets as a segmented control.
              Four equal-width segments fill the whole row; vertical 1px
              dividers separate them. The active segment is highlighted.
            */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                alignItems: "stretch",
              }}
            >
              {[25, 50, 75, 100].map((pct, idx) => {
                const active = sizePercent === pct;
                return (
                  <React.Fragment key={pct}>
                    {/* Vertical divider between segments (no divider on the first). */}
                    {idx > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          // Positioned by the grid cell via a wrapper below.
                        }}
                      />
                    )}
                    <button
                      onClick={() => (pct === 100 ? handleMaxClick() : handlePercentClick(pct))}
                      style={{
                        // Fill the whole grid cell; no border, no radius.
                        width: "100%",
                        padding: "6px 0",
                        background: active ? "var(--accent-color, #58a6ff)" : "transparent",
                        color: active ? "#fff" : "var(--text-secondary, #8b949e)",
                        border: "none",
                        // Only add a left border between segments.
                        borderLeft: idx > 0 ? "1px solid var(--border-color, #30363d)" : "none",
                        borderRadius: 0,
                        fontSize: 10,
                        fontWeight: active ? 700 : 500,
                        cursor: "pointer",
                        transition: "background 0.15s, color 0.15s",
                      }}
                    >
                      {pct === 100 ? "MAX" : `${pct}%`}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          <div style={divider} />
          {/* Available + Holdings, moved right above Order Value */}
          <div style={rowStyle}>
            <span style={labelStyle}>{isZh ? "可用余额" : "Available"}</span>
            <span style={valueStyle}>${formatNum(availableBalance, 2)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>{isZh ? "持有数量" : "Holdings"}</span>
            <span style={valueStyle}>{formatNum(tokenBalance, 4)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>{isZh ? "订单价值" : "Order Value"}</span>
            <span style={valueStyle}>${formatNum(notional, 2)}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>{isZh ? "预估手续费" : "Est. Fee"}</span>
            <span style={valueStyle}>${formatNum(estFee, 3)}</span>
          </div>
          {/* Submit button. Small, 5px radius. */}
          <button
            onClick={handleSubmit}
            disabled={!size || parseFloat(size) <= 0}
            style={{
              marginTop: 4,
              padding: "8px",
              background: !size || parseFloat(size) <= 0 ? "var(--bg-tertiary, #21262d)" : accent,
              color: !size || parseFloat(size) <= 0 ? "var(--text-secondary, #8b949e)" : "white",
              border: "none",
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 700,
              cursor: !size || parseFloat(size) <= 0 ? "not-allowed" : "pointer",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {isBuy ? (isZh ? "买入" : "Buy") : isZh ? "卖出" : "Sell"} {symbol}
          </button>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 10,
              color: "var(--text-secondary, #8b949e)",
              marginTop: 4,
            }}
          >
            <span>{isZh ? "最小变动" : "Tick"}: 0.1</span>
            <span>{isZh ? "手续费率" : "Fee"}: 0.3%</span>
          </div>
        </div>
      </div>
      {/*  SCROLLABLE INFO BLOCKS, Starts from Token Safety and goes all the way down. */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0px 0px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div>
          {/* <div style={sectionTitleStyle}>{isZh ? "代币安全" : "Token Safety"}</div> */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              // gap: 1,
              background: "var(--border-color, #30363d)",
              // border: "1px solid var(--border-color, #30363d)",
              // borderRadius: 6,
              overflow: "hidden",
              marginBottom: "-7px",
            }}
          >
            {safetyGrid.map((item) => (
              <div
                key={item.key}
                style={{
                  background: "var(--bg-secondary, #161b22)",
                  padding: "6px 4px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  textAlign: "center",
                  minHeight: 46,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    color: "var(--text-secondary, #8b949e)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isZh ? item.labelZh : item.labelEn}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: riskColor(item.risk),
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Inner flex column with gap: 0 so the rowDivider sits flush */}
        <div style={divider} />
        <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "0px 10px" }}>
          <div style={sectionTitleStyle}>{isZh ? "开发者信息" : "Developer Info"}</div>
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "地址" : "Address"}</span>
            <span style={{ ...valueStyle, fontSize: 10 }} title={devInfo.address}>
              {shortAddr(devInfo.address)}
            </span>
          </div>
          <div style={rowDivider} />
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "持有量" : "Holdings"}</span>
            <span style={valueStyle}>{devInfo.holdings}</span>
          </div>
          <div style={rowDivider} />
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "创建时间" : "Created"}</span>
            <span style={valueStyle}>{devInfo.created}</span>
          </div>
          <div style={rowDivider} />
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "部署次数" : "Deploys"}</span>
            <span style={valueStyle}>{devInfo.deployCount}</span>
          </div>
          <div style={rowDivider} />
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "跑路历史" : "Rug History"}</span>
            <span
              style={{
                ...valueStyle,
                color: devInfo.rugCount > 0 ? "#f85149" : "#3fb950",
              }}
            >
              {devInfo.rugCount}
            </span>
          </div>
          <div style={rowDivider} />
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "已验证" : "Verified"}</span>
            <span
              style={{
                ...valueStyle,
                color: devInfo.verified ? "#3fb950" : "var(--text-secondary, #8b949e)",
              }}
            >
              {devInfo.verified ? (isZh ? "是" : "Yes") : isZh ? "否" : "No"}
            </span>
          </div>
        </div>
        <div style={divider} />
        <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "0px 10px" }}>
          <div style={sectionTitleStyle}>{isZh ? "基础数据" : "Basic Data"}</div>
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "市值" : "Market Cap"}</span>
            <span style={valueStyle}>{basicData.marketCap}</span>
          </div>
          <div style={rowDivider} />
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "总供应量" : "Total Supply"}</span>
            <span style={valueStyle}>{basicData.totalSupply}</span>
          </div>
          <div style={rowDivider} />
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "池子地址" : "Pool Address"}</span>
            <span style={{ ...valueStyle, fontSize: 10 }} title={basicData.poolAddress}>
              {shortAddr(basicData.poolAddress)}
            </span>
          </div>
          <div style={rowDivider} />
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "持有者" : "Holders"}</span>
            <span style={valueStyle}>{basicData.holders}</span>
          </div>
          <div style={rowDivider} />
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "代币创建时间" : "Token Created"}</span>
            <span style={valueStyle}>{basicData.tokenCreated}</span>
          </div>
          <div style={rowDivider} />
          <div style={{ ...rowStyle, padding: "5px 0" }}>
            <span style={labelStyle}>{isZh ? "池子创建时间" : "Pool Created"}</span>
            <span style={valueStyle}>{basicData.poolCreated}</span>
          </div>
        </div>
        <div style={divider} />
        <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "0px 10px", paddingBottom: 8 }}>
          <div style={sectionTitleStyle}>{isZh ? "安全检测" : "Safety Checks"}</div>
          {safetyChecks.map((check, idx) => (
            <React.Fragment key={idx}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 11,
                  lineHeight: 1.5,
                  padding: "5px 0",
                }}
              >
                <span style={{ color: "var(--text-secondary, #8b949e)" }}>{isZh ? check.labelZh : check.labelEn}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: check.passed ? "#3fb950" : "#f85149",
                    fontFamily: "monospace",
                  }}
                >
                  {check.passed ? "✓ PASS" : "✗ FAIL"}
                </span>
              </div>
              {idx < safetyChecks.length - 1 && <div style={rowDivider} />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};
export default OrderTicketPanel;
