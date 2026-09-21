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
  const handlePercentClick = (pct: number) => {
    // percentage of the available balance (quote currency)
    const computed = (availableBalance * (pct / 100)) / midPrice;
    setSize(computed.toFixed(4));
  };
  const handleMaxClick = () => {
    const computed = availableBalance / midPrice;
    setSize(computed.toFixed(4));
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
  const divider: React.CSSProperties = {
    height: 1,
    background: "var(--border-color, #30363d)",
    margin: "4px 0",
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
      <div
        style={{
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
        }}
      >
        {/* Interval grid: 4 square cells, fixed 60px height each */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
            background: "var(--border-color, #30363d)",
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
                  // Fixed 60px height, not square
                  height: 60,
                  background: active ? "var(--bg-tertiary, #21262d)" : "var(--bg-secondary, #161b22)",
                  border: "none",
                  color: active ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  padding: 0,
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--hover-bg, #21262d)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--bg-secondary, #161b22)";
                }}
              >
                <span
                  style={{
                    fontSize: 11,
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
        <div style={{ padding: "8px 14px" }}>
          {/* Volume row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <span style={labelStyle}>{isZh ? "成交额" : "Volume"}</span>
            <span style={{ ...valueStyle, fontWeight: 600, fontSize: 12 }}>${formatNum(stats.volume, 2)}</span>
          </div>
          {/* Buy / Sell split */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 6,
            }}
          >
            {/* Buy side */}
            <div
              style={{
                background: "rgba(63,185,80,0.08)",
                border: "1px solid rgba(63,185,80,0.25)",
                borderRadius: 6,
                padding: "6px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ ...labelStyle, color: "#3fb950", fontWeight: 600 }}>{isZh ? "买入" : "Buy"}</span>
                <span style={{ ...valueStyle, color: "#3fb950", fontWeight: 600 }}>{stats.buyCount}</span>
              </div>
              <div
                style={{
                  ...valueStyle,
                  fontSize: 10,
                  color: "#3fb950",
                  textAlign: "right",
                }}
              >
                ${formatNum(stats.buyVolume, 1)}
              </div>
            </div>
            {/* Sell side */}
            <div
              style={{
                background: "rgba(248,81,73,0.08)",
                border: "1px solid rgba(248,81,73,0.25)",
                borderRadius: 6,
                padding: "6px 8px",
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ ...labelStyle, color: "#f85149", fontWeight: 600 }}>{isZh ? "卖出" : "Sell"}</span>
                <span style={{ ...valueStyle, color: "#f85149", fontWeight: 600 }}>{stats.sellCount}</span>
              </div>
              <div
                style={{
                  ...valueStyle,
                  fontSize: 10,
                  color: "#f85149",
                  textAlign: "right",
                }}
              >
                ${formatNum(stats.sellVolume, 1)}
              </div>
            </div>
          </div>
          {/* Net buy */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
            }}
          >
            <span style={labelStyle}>{isZh ? "净买入" : "Net Buy"}</span>
            <span
              style={{
                ...valueStyle,
                color: netBuy >= 0 ? "#3fb950" : "#f85149",
                fontWeight: 600,
              }}
            >
              {netBuy >= 0 ? "+" : ""}${formatNum(netBuy, 2)} ({netBuyPercent >= 0 ? "+" : ""}
              {netBuyPercent.toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={rowStyle}>
          <span style={labelStyle}>{isZh ? "可用余额" : "Available"}</span>
          <span style={valueStyle}>${formatNum(availableBalance, 2)}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>{isZh ? "持有数量" : "Holdings"}</span>
          <span style={valueStyle}>{formatNum(tokenBalance, 4)}</span>
        </div>
        <div style={divider} />
        <div style={rowStyle}>
          <span style={labelStyle}>{isZh ? "价格" : "Price"}</span>
          <span style={{ ...valueStyle, fontWeight: 600 }}>{formatNum(midPrice, 1)}</span>
        </div>
        <div style={divider} />
        <div style={{ display: "flex", gap: 4 }}>
          {(["buy", "sell"] as const).map((s) => {
            const active = side === s;
            const color = s === "buy" ? "#3fb950" : "#f85149";
            return (
              <button
                key={s}
                onClick={() => setSide(s)}
                style={{
                  flex: 1,
                  padding: "8px 0",
                  background: active ? color : "transparent",
                  color: active ? "white" : "var(--text-secondary, #8b949e)",
                  border: `1px solid ${active ? color : "var(--border-color, #30363d)"}`,
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  transition: "background 0.15s, color 0.15s, border-color 0.15s",
                }}
              >
                {s === "buy" ? (isZh ? "买入" : "Buy") : isZh ? "卖出" : "Sell"}
              </button>
            );
          })}
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={labelStyle}>{isZh ? "数量" : "Size"}</span>
            <span style={{ ...labelStyle, fontFamily: "monospace" }}>
              {isZh ? "最大" : "Max"}: {formatNum(availableBalance / midPrice, 4)}
            </span>
          </div>
          <input type="text" value={size} onChange={(e) => setSize(e.target.value)} placeholder="0.00" style={inputStyle} />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => (pct === 100 ? handleMaxClick() : handlePercentClick(pct))}
              style={{
                flex: 1,
                background: "transparent",
                border: "1px solid var(--border-color, #30363d)",
                color: "var(--text-secondary, #8b949e)",
                borderRadius: 4,
                fontSize: 10,
                padding: "4px 0",
                cursor: "pointer",
              }}
            >
              {pct === 100 ? "MAX" : `${pct}%`}
            </button>
          ))}
        </div>
        <div style={divider} />
        <div style={rowStyle}>
          <span style={labelStyle}>{isZh ? "订单价值" : "Order Value"}</span>
          <span style={valueStyle}>${formatNum(notional, 2)}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>{isZh ? "预估手续费" : "Est. Fee"}</span>
          <span style={valueStyle}>${formatNum(estFee, 3)}</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={!size || parseFloat(size) <= 0}
          style={{
            marginTop: 4,
            padding: "12px",
            background: !size || parseFloat(size) <= 0 ? "var(--bg-tertiary, #21262d)" : accent,
            color: !size || parseFloat(size) <= 0 ? "var(--text-secondary, #8b949e)" : "white",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
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
  );
};
export default OrderTicketPanel;
