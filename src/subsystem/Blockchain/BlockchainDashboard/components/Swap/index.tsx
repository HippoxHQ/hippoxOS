import React, { useState, useMemo, useCallback } from "react";
import { ArrowDownUp, Settings, ChevronDown } from "lucide-react";
/**
 * A tradable token descriptor.
 * Consumers pass their own token list; the component is chain-agnostic.
 */
export interface SwapToken {
  /** Unique symbol used as identity, e.g. "ETH" */
  symbol: string;
  /** Human-readable name, e.g. "Ethereum" */
  name: string;
  /** User's current balance of this token */
  balance: number;
  /** USD price used for display and mock rate calculation */
  priceUsd: number;
  /** Short glyph shown inside the token circle, e.g. "Ξ" */
  icon: string;
  /** Brand color used for the token circle background */
  color: string;
}
/**
 * Props for the reusable Swap component.
 * All behavior can be customized by the consumer.
 */
export interface SwapProps {
  /** Language for labels: "en" or "zh-cn" */
  i18n?: "en" | "zh-cn";
  /** Available tokens to select from */
  tokens: SwapToken[];
  /**
   * Initial "from" token. Defaults to tokens[0] if not provided.
   * Uses symbol as the identity key.
   */
  defaultFromSymbol?: string;
  /**
   * Initial "to" token. Defaults to tokens[1] if not provided.
   * Uses symbol as the identity key.
   */
  defaultToSymbol?: string;
  /** Slippage percentage, default 0.5 */
  defaultSlippage?: number;
  /** Estimated network fee in USD, default 2.45 */
  networkFeeUsd?: number;
  /**
   * Called when the user clicks Swap with a valid amount.
   * Receives the resolved from/to tokens and the numeric amount.
   */
  onSwap?: (params: { fromToken: SwapToken; toToken: SwapToken; fromAmount: number; toAmount: number; slippage: number }) => void;
  /**
   * Optional custom rate resolver. If omitted, the component falls back
   * to a USD-price based rate (fromToken.priceUsd / toToken.priceUsd).
   */
  resolveRate?: (fromToken: SwapToken, toToken: SwapToken) => number;
  /** Optional className for the outer container */
  className?: string;
  /** Optional inline style overrides for the outer container */
  style?: React.CSSProperties;
}
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
// Component
/**
 * Swap - Reusable Uniswap-style swap widget.
 *
 * Fully self-contained:
 *   - Owns its own amount / token / slippage state
 *   - Owns its own token selector modal (rendered inline, not via portal)
 *   - Exposes swap intent to the caller via `onSwap`
 *
 * Consumers only need to supply the token list and an `onSwap` handler.
 * No extra mounting, portals, or wrapper is required.
 *
 * Usage:
 *   <Swap
 *     tokens={myTokens}
 *     defaultFromSymbol="ETH"
 *     defaultToSymbol="USDC"
 *     onSwap={({ fromToken, toToken, fromAmount }) => { ... }}
 *   />
 */
export const Swap: React.FC<SwapProps> = ({ i18n = "en", tokens, defaultFromSymbol, defaultToSymbol, defaultSlippage = 0.5, networkFeeUsd = 2.45, onSwap, resolveRate, className, style }) => {
  const isZh = i18n === "zh-cn";
  // ---- Resolve initial tokens from symbols ---------------------------------
  const initialFrom = useMemo(() => {
    if (defaultFromSymbol) {
      const found = tokens.find((t) => t.symbol === defaultFromSymbol);
      if (found) return found;
    }
    return tokens[0];
  }, [tokens, defaultFromSymbol]);
  const initialTo = useMemo(() => {
    if (defaultToSymbol) {
      const found = tokens.find((t) => t.symbol === defaultToSymbol);
      if (found) return found;
    }
    // Pick a token different from initialFrom
    return tokens.find((t) => t.symbol !== initialFrom?.symbol) || tokens[0];
  }, [tokens, defaultToSymbol, initialFrom]);
  // ---- State ---------------------------------------------------------------
  const [fromToken, setFromToken] = useState<SwapToken>(initialFrom);
  const [toToken, setToToken] = useState<SwapToken>(initialTo);
  const [fromAmount, setFromAmount] = useState<string>("");
  const [slippage] = useState<number>(defaultSlippage);
  // Token selector modal state (internal, no external wiring needed)
  const [showTokenSelect, setShowTokenSelect] = useState<"from" | "to" | null>(null);
  // Search query for the token selector modal
  const [tokenSearch, setTokenSearch] = useState<string>("");
  // ---- Derived values ------------------------------------------------------
  /** Rate between the two tokens. Prefer consumer-provided resolver. */
  const rate = useMemo(() => {
    if (resolveRate) return resolveRate(fromToken, toToken);
    if (!fromToken.priceUsd || !toToken.priceUsd) return 0;
    return fromToken.priceUsd / toToken.priceUsd;
  }, [fromToken, toToken, resolveRate]);
  /** Computed output amount (string for the read-only input). */
  const toAmount = useMemo(() => {
    const amt = parseFloat(fromAmount);
    if (isNaN(amt) || amt <= 0) return "";
    return (amt * rate).toFixed(6);
  }, [fromAmount, rate]);
  /** USD value of the input amount, for display. */
  const usdValue = useMemo(() => {
    const amt = parseFloat(fromAmount);
    if (isNaN(amt) || amt <= 0) return 0;
    return amt * fromToken.priceUsd;
  }, [fromAmount, fromToken]);
  const isSwapEnabled = !!fromAmount && parseFloat(fromAmount) > 0;
  /** Tokens shown in the modal: filtered by search, excluding the opposite side. */
  const filteredTokens = useMemo(() => {
    const oppositeSymbol = showTokenSelect === "from" ? toToken.symbol : fromToken.symbol;
    const q = tokenSearch.trim().toLowerCase();
    return tokens.filter((t) => {
      if (t.symbol === oppositeSymbol) return false;
      if (!q) return true;
      return t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q);
    });
  }, [tokens, tokenSearch, showTokenSelect, fromToken, toToken]);
  // ---- Handlers ------------------------------------------------------------
  const handleSwapDirection = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount("");
  }, [fromToken, toToken]);
  const handleSelectToken = useCallback(
    (token: SwapToken) => {
      if (showTokenSelect === "from") {
        if (token.symbol === toToken.symbol) return;
        setFromToken(token);
      } else if (showTokenSelect === "to") {
        if (token.symbol === fromToken.symbol) return;
        setToToken(token);
      }
      setShowTokenSelect(null);
      setTokenSearch("");
    },
    [showTokenSelect, fromToken, toToken],
  );
  const handleOpenTokenSelect = useCallback((side: "from" | "to") => {
    setShowTokenSelect(side);
    setTokenSearch("");
  }, []);
  const handleCloseTokenSelect = useCallback(() => {
    setShowTokenSelect(null);
    setTokenSearch("");
  }, []);
  const handlePercentClick = useCallback(
    (pct: number) => {
      setFromAmount(((fromToken.balance * pct) / 100).toString());
    },
    [fromToken],
  );
  const handleSwapClick = useCallback(() => {
    if (!isSwapEnabled) return;
    const amt = parseFloat(fromAmount);
    onSwap?.({
      fromToken,
      toToken,
      fromAmount: amt,
      toAmount: amt * rate,
      slippage,
    });
  }, [isSwapEnabled, fromAmount, onSwap, fromToken, toToken, rate, slippage]);
  const styles = {
    root: {
      display: "flex",
      flexDirection: "column" as const,
      background: "var(--bg-primary, #0d1117)",
      color: "var(--text-primary, #e6edf3)",
      fontSize: 13,
      fontFamily: "system-ui, -apple-system, sans-serif",
      ...style,
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
    tokenBox: {
      background: "var(--bg-tertiary, #0d1117)",
      border: "1px solid var(--border-color, #30363d)",
      borderRadius: 10,
      padding: "12px",
    } as React.CSSProperties,
  };
  // ---- Render --------------------------------------------------------------
  return (
    <div className={className} style={styles.root}>
      {/* --- Swap card --- */}
      <div>
        <div style={styles.sectionHeader}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowDownUp size={13} />
            {isZh ? "兑换" : "Swap"}
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
            title="Settings"
          >
            <Settings size={13} />
          </button>
        </div>
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* ---- From token ---- */}
          <div style={styles.tokenBox}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={styles.subtleText}>{isZh ? "支付" : "From"}</span>
              <span style={styles.subtleText}>
                {isZh ? "余额" : "Balance"}: {formatNumber(fromToken.balance, 4)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="text"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                placeholder="0.0"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary, #e6edf3)",
                  fontSize: 24,
                  fontWeight: 600,
                  width: "100%",
                  minWidth: 0,
                }}
              />
              <button
                onClick={() => handleOpenTokenSelect("from")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--bg-secondary, #161b22)",
                  border: "1px solid var(--border-color, #30363d)",
                  borderRadius: 20,
                  padding: "6px 10px",
                  cursor: "pointer",
                  color: "var(--text-primary, #e6edf3)",
                  fontSize: 13,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: fromToken.color,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {fromToken.icon}
                </div>
                {fromToken.symbol}
                <ChevronDown size={12} />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <span style={styles.subtleText}>≈ {formatUsd(usdValue)}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handlePercentClick(pct)}
                    style={{
                      background: "transparent",
                      border: "1px solid var(--border-color, #30363d)",
                      color: "var(--text-secondary, #8b949e)",
                      borderRadius: 4,
                      fontSize: 10,
                      padding: "2px 6px",
                      cursor: "pointer",
                    }}
                  >
                    {pct === 100 ? "MAX" : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* ---- Swap direction button ---- */}
          <div style={{ display: "flex", justifyContent: "center", margin: "-4px 0" }}>
            <button
              onClick={handleSwapDirection}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--bg-secondary, #161b22)",
                border: "3px solid var(--bg-primary, #0d1117)",
                color: "var(--text-primary, #e6edf3)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title={isZh ? "切换方向" : "Switch direction"}
            >
              <ArrowDownUp size={16} />
            </button>
          </div>
          {/* ---- To token ---- */}
          <div style={styles.tokenBox}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={styles.subtleText}>{isZh ? "接收" : "To"}</span>
              <span style={styles.subtleText}>
                {isZh ? "余额" : "Balance"}: {formatNumber(toToken.balance, 4)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="text"
                value={toAmount}
                readOnly
                placeholder="0.0"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary, #e6edf3)",
                  fontSize: 24,
                  fontWeight: 600,
                  width: "100%",
                  minWidth: 0,
                }}
              />
              <button
                onClick={() => handleOpenTokenSelect("to")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--bg-secondary, #161b22)",
                  border: "1px solid var(--border-color, #30363d)",
                  borderRadius: 20,
                  padding: "6px 10px",
                  cursor: "pointer",
                  color: "var(--text-primary, #e6edf3)",
                  fontSize: 13,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: toToken.color,
                    color: "white",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {toToken.icon}
                </div>
                {toToken.symbol}
                <ChevronDown size={12} />
              </button>
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={styles.subtleText}>≈ {formatUsd((parseFloat(toAmount) || 0) * toToken.priceUsd)}</span>
            </div>
          </div>
          {/* ---- Rate info ---- */}
          {fromAmount && toAmount && (
            <div
              style={{
                background: "var(--bg-tertiary, #0d1117)",
                border: "1px solid var(--border-color, #30363d)",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 11,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={styles.row}>
                <span style={styles.subtleText}>{isZh ? "汇率" : "Rate"}</span>
                <span>
                  1 {fromToken.symbol} = {rate.toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div style={styles.row}>
                <span style={styles.subtleText}>{isZh ? "价格影响" : "Price Impact"}</span>
                <span style={{ color: "#3fb950" }}>{"<0.01%"}</span>
              </div>
              <div style={styles.row}>
                <span style={styles.subtleText}>{isZh ? "最小接收" : "Min. Received"}</span>
                <span>
                  {(parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6)} {toToken.symbol}
                </span>
              </div>
              <div style={styles.row}>
                <span style={styles.subtleText}>{isZh ? "滑点" : "Slippage"}</span>
                <span>{slippage}%</span>
              </div>
              <div style={styles.row}>
                <span style={styles.subtleText}>{isZh ? "网络费用" : "Network Fee"}</span>
                <span>~{formatUsd(networkFeeUsd)}</span>
              </div>
            </div>
          )}
          {/* ---- Swap button ---- */}
          <button
            style={{
              marginTop: 4,
              padding: "14px",
              background: isSwapEnabled ? "var(--accent-color, #58a6ff)" : "var(--bg-tertiary, #21262d)",
              color: isSwapEnabled ? "white" : "var(--text-secondary, #8b949e)",
              border: "none",
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 700,
              cursor: isSwapEnabled ? "pointer" : "not-allowed",
              transition: "background 0.15s",
            }}
            disabled={!isSwapEnabled}
            onClick={handleSwapClick}
          >
            {!isSwapEnabled ? (isZh ? "输入金额" : "Enter an amount") : isZh ? "兑换" : "Swap"}
          </button>
        </div>
      </div>
      {/* ---- Token selector overlay (fully self-contained) ---- */}
      {showTokenSelect && (
        <div
          onClick={handleCloseTokenSelect}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 380,
              maxHeight: "70vh",
              background: "var(--bg-secondary, #161b22)",
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 12,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={styles.sectionHeader}>
              <span>{isZh ? "选择代币" : "Select a token"}</span>
              <button
                onClick={handleCloseTokenSelect}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary, #8b949e)",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: 12 }}>
              <input
                value={tokenSearch}
                onChange={(e) => setTokenSearch(e.target.value)}
                placeholder={isZh ? "搜索名称或符号" : "Search name or symbol"}
                autoFocus
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary, #0d1117)",
                  border: "1px solid var(--border-color, #30363d)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: "var(--text-primary, #e6edf3)",
                  outline: "none",
                  fontSize: 13,
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 12px" }}>
              {filteredTokens.length === 0 ? (
                <div
                  style={{
                    padding: "24px 12px",
                    textAlign: "center",
                    color: "var(--text-secondary, #8b949e)",
                    fontSize: 12,
                  }}
                >
                  {isZh ? "未找到代币" : "No tokens found"}
                </div>
              ) : (
                filteredTokens.map((token) => (
                  <div
                    key={token.symbol}
                    onClick={() => handleSelectToken(token)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--hover-bg, #21262d)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          background: token.color,
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        {token.icon}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{token.symbol}</div>
                        <div style={styles.subtleText}>{token.name}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600 }}>{formatNumber(token.balance, 4)}</div>
                      <div style={styles.subtleText}>{formatUsd(token.balance * token.priceUsd)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default Swap;
