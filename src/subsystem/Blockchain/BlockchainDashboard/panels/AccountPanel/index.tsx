import React, { useState, useEffect, useRef } from "react";
import { Wallet, Coins, Activity, TrendingUp, TrendingDown, Copy, ExternalLink, RefreshCw, ChevronDown, Key, FileKey, AlertTriangle, X, Eye, EyeOff, Settings, Globe, Trash2, Shield, Dices, User, ArrowLeft, Check } from "lucide-react";
interface AccountPanelProps {
  i18n?: "en" | "zh-cn";
}
interface Network {
  id: string;
  name: string;
  nameZh: string;
  chainId: number;
  color: string;
  symbol: string;
  isTestnet?: boolean;
}
interface WalletAccount {
  id: string;
  name: string;
  address: string;
  ens?: string;
  hasMnemonic: boolean;
  hasPrivateKey: boolean;
}
interface Token {
  symbol: string;
  name: string;
  balance: number;
  priceUsd: number;
  icon: string;
  color: string;
}
interface Tx {
  type: string;
  from: string;
  to: string;
  amount: string;
  valueUsd: number;
  time: string;
  status: string;
}
const NETWORKS: Network[] = [
  { id: "eth", name: "Ethereum", nameZh: "以太坊主网", chainId: 1, color: "#627EEA", symbol: "ETH" },
  { id: "bsc", name: "BNB Chain", nameZh: "BSC 主网", chainId: 56, color: "#F0B90B", symbol: "BNB" },
  { id: "base", name: "Base", nameZh: "Base 主网", chainId: 8453, color: "#0052FF", symbol: "ETH" },
  { id: "arb", name: "Arbitrum", nameZh: "Arbitrum One", chainId: 42161, color: "#28A0F0", symbol: "ETH" },
  { id: "sep", name: "Sepolia", nameZh: "Sepolia 测试网", chainId: 11155111, color: "#9CA3AF", symbol: "ETH", isTestnet: true },
];
/**
 * The panel now only deals with the CURRENT wallet.
 */
const MOCK_CURRENT_WALLET: WalletAccount = {
  id: "w1",
  name: "Main Wallet",
  address: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
  ens: "hippox.eth",
  hasMnemonic: true,
  hasPrivateKey: true,
};
const MOCK_TOKENS: Token[] = [
  { symbol: "ETH", name: "Ethereum", balance: 4.2183, priceUsd: 3245.18, icon: "Ξ", color: "#627EEA" },
  { symbol: "HIPPOX", name: "Hippox Token", balance: 128450.0, priceUsd: 0.0421, icon: "H", color: "#8B5CF6" },
  { symbol: "USDC", name: "USD Coin", balance: 5120.55, priceUsd: 1.0, icon: "$", color: "#2775CA" },
  { symbol: "WBTC", name: "Wrapped BTC", balance: 0.0842, priceUsd: 67234.1, icon: "₿", color: "#F7931A" },
];
const MOCK_RECENT_TXS: Tx[] = [
  { type: "swap", from: "ETH", to: "HIPPOX", amount: "0.5", valueUsd: 1622.59, time: "2m ago", status: "success" },
  { type: "buy", from: "ETH", to: "MEME", amount: "0.12", valueUsd: 389.42, time: "15m ago", status: "success" },
  { type: "add", from: "ETH", to: "LP", amount: "1.0", valueUsd: 3245.18, time: "1h ago", status: "success" },
  { type: "swap", from: "USDC", to: "HIPPOX", amount: "500", valueUsd: 500.0, time: "3h ago", status: "success" },
  { type: "remove", from: "LP", to: "ETH", amount: "0.8", valueUsd: 2596.14, time: "5h ago", status: "success" },
];
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
 * Deterministic avatar color derived from the wallet address.
 */
const avatarColor = (addr: string): string => {
  const palette = ["#8B5CF6", "#3fb950", "#58a6ff", "#f0883e", "#f85149", "#F0B90B", "#2775CA"];
  let sum = 0;
  for (let i = 0; i < addr.length; i++) sum += addr.charCodeAt(i);
  return palette[sum % palette.length];
};
/** Reusable dropdown that closes when clicking outside. */
const Dropdown: React.FC<{
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
}> = ({ trigger, children, align = "left" }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            [align]: 0,
            minWidth: 200,
            background: "var(--bg-secondary, #161b22)",
            border: "1px solid var(--border-color, #30363d)",
            borderRadius: 6,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};
type SecurityView = { kind: "root" } | { kind: "password"; purpose: "mnemonic" | "privatekey" } | { kind: "export-mnemonic" } | { kind: "export-privatekey" } | { kind: "delete" };
export const AccountPanel: React.FC<AccountPanelProps> = ({ i18n = "en" }) => {
  const isZh = i18n === "zh-cn";
  // The panel only deals with the current wallet.
  const wallet = MOCK_CURRENT_WALLET;
  // Network state (single current network).
  const [activeNetworkId, setActiveNetworkId] = useState<string>(NETWORKS[0].id);
  const activeNetwork = NETWORKS.find((n) => n.id === activeNetworkId) || NETWORKS[0];
  // Whether the security side panel is open.
  const [securityOpen, setSecurityOpen] = useState(false);
  // Security panel internal view.
  const [securityView, setSecurityView] = useState<SecurityView>({ kind: "root" });
  // Password confirmation (used inside the security panel).
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Export result.
  const [revealedSecret, setRevealedSecret] = useState<string>("");
  const [secretVisible, setSecretVisible] = useState(false);
  // Copy feedback.
  const [copied, setCopied] = useState<string>("");
  // Security panel settings (mock).
  const [nonceMode, setNonceMode] = useState<"auto" | "custom">("auto");
  const [customNonce, setCustomNonce] = useState<string>("");
  const [randomizeGas, setRandomizeGas] = useState(true);
  const [randomizeNonce, setRandomizeNonce] = useState(false);
  // Ref to the security side panel, used for outside-click detection.
  const securityPanelRef = useRef<HTMLDivElement>(null);
  const copyToClipboard = (text: string, tag: string) => {
    navigator.clipboard?.writeText(text);
    setCopied(tag);
    setTimeout(() => setCopied(""), 1200);
  };
  /** Open the security panel and reset its internal view to root. */
  const openSecurity = () => {
    setSecurityView({ kind: "root" });
    setSecurityOpen(true);
  };
  /** Close the security panel and reset its internal state. */
  const closeSecurity = () => {
    setSecurityOpen(false);
    setSecurityView({ kind: "root" });
    setPassword("");
    setPasswordError("");
    setRevealedSecret("");
    setSecretVisible(false);
  };
  /**
   * Close the security panel when clicking outside of it.
   */
  useEffect(() => {
    if (!securityOpen) return;
    const handler = (e: MouseEvent) => {
      if (securityPanelRef.current && !securityPanelRef.current.contains(e.target as Node)) {
        closeSecurity();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [securityOpen]);
  /** Move to the password confirmation view inside the security panel. */
  const openExport = (purpose: "mnemonic" | "privatekey") => {
    setPassword("");
    setPasswordError("");
    setRevealedSecret("");
    setSecretVisible(false);
    setSecurityView({ kind: "password", purpose });
  };
  /** Verify the mock password, then switch to the export view. */
  const confirmPassword = (purpose: "mnemonic" | "privatekey") => {
    if (password.length < 4) {
      setPasswordError(isZh ? "密码至少 4 位" : "Password must be at least 4 characters");
      return;
    }
    setPasswordError("");
    if (purpose === "mnemonic") {
      if (!wallet.hasMnemonic) {
        setPasswordError(isZh ? "该钱包没有助记词（仅导入私钥）" : "This wallet has no mnemonic (private-key import only)");
        return;
      }
      setRevealedSecret("apple river stone light ocean tiger cloud forest silver mountain garden thunder");
      setSecretVisible(false);
      setSecurityView({ kind: "export-mnemonic" });
    } else {
      if (!wallet.hasPrivateKey) {
        setPasswordError(isZh ? "该钱包没有私钥" : "This wallet has no private key");
        return;
      }
      setRevealedSecret("0x" + "a".repeat(64));
      setSecretVisible(false);
      setSecurityView({ kind: "export-privatekey" });
    }
  };
  const confirmDeleteWallet = () => {
    closeSecurity();
  };
  const styles = {
    root: {
      position: "relative" as const,
      display: "flex",
      flexDirection: "column" as const,
      height: "100%",
      overflow: "hidden" as const,
      background: "var(--bg-primary, #0d1117)",
    } as React.CSSProperties,
    scrollBody: {
      flex: 1,
      overflowY: "auto" as const,
      display: "flex",
      flexDirection: "column" as const,
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
    iconButton: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 28,
      height: 28,
      background: "var(--bg-tertiary, #21262d)",
      border: "1px solid var(--border-color, #30363d)",
      borderRadius: 6,
      color: "var(--text-primary, #e6edf3)",
      cursor: "pointer",
      padding: 0,
    } as React.CSSProperties,
    menuItem: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      fontSize: 12,
      color: "var(--text-primary, #e6edf3)",
      cursor: "pointer",
      whiteSpace: "nowrap" as const,
    } as React.CSSProperties,
    input: {
      width: "100%",
      padding: "8px 10px",
      background: "var(--bg-primary, #0d1117)",
      border: "1px solid var(--border-color, #30363d)",
      borderRadius: 6,
      color: "var(--text-primary, #e6edf3)",
      fontSize: 13,
      outline: "none",
      boxSizing: "border-box" as const,
    } as React.CSSProperties,
    primaryBtn: {
      width: "100%",
      padding: "9px",
      background: "var(--accent-color, #58a6ff)",
      color: "white",
      border: "none",
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
    } as React.CSSProperties,
    secondaryBtn: {
      width: "100%",
      padding: "9px",
      background: "transparent",
      color: "var(--text-primary, #e6edf3)",
      border: "1px solid var(--border-color, #30363d)",
      borderRadius: 6,
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
    } as React.CSSProperties,
  };
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
  const renderSecurityPanel = () => {
    const PanelHeader: React.FC<{ title: string; onBack?: () => void }> = ({ title, onBack }) => (
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {onBack && (
          <button onClick={onBack} style={{ ...styles.iconButton, width: 26, height: 26 }}>
            <ArrowLeft size={14} />
          </button>
        )}
        <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, flex: 1 }}>
          {!onBack && <Shield size={14} />}
          {title}
        </span>
        <button
          onClick={closeSecurity}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary, #8b949e)",
            cursor: "pointer",
            display: "flex",
            padding: 2,
          }}
        >
          <X size={14} />
        </button>
      </div>
    );
    const renderRoot = () => (
      <>
        <PanelHeader title={isZh ? "安全" : "Security"} />
        <div style={{ flex: 1, overflowY: "auto", padding: "0 14px 14px 14px" }}>
          {/* Export section */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-secondary, #8b949e)", margin: "14px 0 6px" }}>{isZh ? "导出钱包" : "Export Wallet"}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button
              onClick={() => openExport("mnemonic")}
              disabled={!wallet.hasMnemonic}
              style={{
                ...styles.secondaryBtn,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: wallet.hasMnemonic ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
                cursor: wallet.hasMnemonic ? "pointer" : "not-allowed",
                opacity: wallet.hasMnemonic ? 1 : 0.5,
              }}
            >
              <FileKey size={13} />
              {isZh ? "导出助记词" : "Export Mnemonic"}
            </button>
            <button
              onClick={() => openExport("privatekey")}
              disabled={!wallet.hasPrivateKey}
              style={{
                ...styles.secondaryBtn,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                color: wallet.hasPrivateKey ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
                cursor: wallet.hasPrivateKey ? "pointer" : "not-allowed",
                opacity: wallet.hasPrivateKey ? 1 : 0.5,
              }}
            >
              <Key size={13} />
              {isZh ? "导出私钥" : "Export Private Key"}
            </button>
          </div>
          {/* Nonce / randomization section */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-secondary, #8b949e)", margin: "18px 0 6px" }}>{isZh ? "随机数 / Nonce 设置" : "Randomization / Nonce"}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid var(--border-color, #30363d)",
              fontSize: 12,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Dices size={12} />
              {isZh ? "Nonce 模式" : "Nonce Mode"}
            </span>
            <select
              value={nonceMode}
              onChange={(e) => setNonceMode(e.target.value as "auto" | "custom")}
              style={{
                ...styles.input,
                width: 100,
                padding: "4px 6px",
              }}
            >
              <option value="auto">{isZh ? "自动" : "Auto"}</option>
              <option value="custom">{isZh ? "自定义" : "Custom"}</option>
            </select>
          </div>
          {nonceMode === "custom" && (
            <div style={{ padding: "8px 0", borderBottom: "1px solid var(--border-color, #30363d)" }}>
              <input type="number" value={customNonce} onChange={(e) => setCustomNonce(e.target.value)} placeholder={isZh ? "输入 Nonce" : "Enter nonce"} style={styles.input} />
            </div>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              borderBottom: "1px solid var(--border-color, #30363d)",
              fontSize: 12,
            }}
          >
            <span>{isZh ? "随机化 Gas" : "Randomize Gas"}</span>
            <input type="checkbox" checked={randomizeGas} onChange={(e) => setRandomizeGas(e.target.checked)} style={{ cursor: "pointer" }} />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 0",
              fontSize: 12,
            }}
          >
            <span>{isZh ? "随机化 Nonce" : "Randomize Nonce"}</span>
            <input type="checkbox" checked={randomizeNonce} onChange={(e) => setRandomizeNonce(e.target.checked)} style={{ cursor: "pointer" }} />
          </div>
        </div>
      </>
    );
    const renderPassword = (purpose: "mnemonic" | "privatekey") => (
      <>
        <PanelHeader title={isZh ? "确认密码" : "Confirm Password"} onBack={() => setSecurityView({ kind: "root" })} />
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#f0b90b", fontSize: 11 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{isZh ? "请输入钱包密码以继续。请确保周围没有人，且没有屏幕录制。" : "Enter your wallet password to continue. Make sure nobody is watching and no screen recording is active."}</span>
          </div>
          <div style={{ position: "relative" }}>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isZh ? "钱包密码" : "Wallet password"} style={styles.input} autoFocus />
            <button
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--text-secondary, #8b949e)",
                cursor: "pointer",
                display: "flex",
              }}
            >
              {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
          {passwordError && <div style={{ color: "#f85149", fontSize: 11 }}>{passwordError}</div>}
          <button style={styles.primaryBtn} onClick={() => confirmPassword(purpose)}>
            {isZh ? "确认" : "Confirm"}
          </button>
        </div>
      </>
    );
    const renderExportMnemonic = () => (
      <>
        <PanelHeader title={isZh ? "助记词" : "Mnemonic Phrase"} onBack={() => setSecurityView({ kind: "root" })} />
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#f85149", fontSize: 11 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{isZh ? "切勿分享助记词。任何拿到它的人都能完全控制你的资产。" : "Never share your mnemonic. Anyone with it can fully control your assets."}</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
              padding: 10,
              background: "var(--bg-primary, #0d1117)",
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 6,
              filter: secretVisible ? "none" : "blur(5px)",
              userSelect: secretVisible ? "text" : "none",
              transition: "filter 0.15s",
            }}
          >
            {revealedSecret.split(" ").map((word, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 4,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "var(--text-primary, #e6edf3)",
                }}
              >
                <span style={{ color: "var(--text-secondary, #8b949e)", minWidth: 14 }}>{i + 1}.</span>
                <span>{word}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setSecretVisible((v) => !v)} style={styles.secondaryBtn}>
              {secretVisible ? (isZh ? "隐藏" : "Hide") : isZh ? "显示" : "Reveal"}
            </button>
            <button onClick={() => copyToClipboard(revealedSecret, "mnemonic")} style={styles.primaryBtn}>
              {copied === "mnemonic" ? (isZh ? "已复制" : "Copied") : isZh ? "复制" : "Copy"}
            </button>
          </div>
        </div>
      </>
    );
    const renderExportPrivateKey = () => (
      <>
        <PanelHeader title={isZh ? "私钥" : "Private Key"} onBack={() => setSecurityView({ kind: "root" })} />
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#f85149", fontSize: 11 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{isZh ? "切勿分享私钥。任何拿到它的人都能完全控制该账户。" : "Never share your private key. Anyone with it can fully control this account."}</span>
          </div>
          <div
            style={{
              padding: 10,
              background: "var(--bg-primary, #0d1117)",
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 6,
              fontFamily: "monospace",
              fontSize: 11,
              wordBreak: "break-all",
              filter: secretVisible ? "none" : "blur(5px)",
              userSelect: secretVisible ? "text" : "none",
              transition: "filter 0.15s",
              color: "var(--text-primary, #e6edf3)",
            }}
          >
            {revealedSecret}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setSecretVisible((v) => !v)} style={styles.secondaryBtn}>
              {secretVisible ? (isZh ? "隐藏" : "Hide") : isZh ? "显示" : "Reveal"}
            </button>
            <button onClick={() => copyToClipboard(revealedSecret, "privatekey")} style={styles.primaryBtn}>
              {copied === "privatekey" ? (isZh ? "已复制" : "Copied") : isZh ? "复制" : "Copy"}
            </button>
          </div>
        </div>
      </>
    );
    const renderDelete = () => (
      <>
        <PanelHeader title={isZh ? "删除钱包" : "Delete Wallet"} onBack={() => setSecurityView({ kind: "root" })} />
        <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#f85149", fontSize: 12 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{isZh ? "此操作将永久删除本地钱包数据。请确保你已备份助记词或私钥，否则资产将无法恢复。" : "This will permanently delete the local wallet data. Make sure you have backed up your mnemonic or private key, otherwise the assets cannot be recovered."}</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setSecurityView({ kind: "root" })} style={styles.secondaryBtn}>
              {isZh ? "取消" : "Cancel"}
            </button>
            <button
              onClick={confirmDeleteWallet}
              style={{
                ...styles.primaryBtn,
                background: "#f85149",
              }}
            >
              {isZh ? "确认删除" : "Delete"}
            </button>
          </div>
        </div>
      </>
    );
    return (
      <div
        ref={securityPanelRef}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 300,
          background: "var(--bg-secondary, #161b22)",
          borderLeft: "1px solid var(--border-color, #30363d)",
          display: "flex",
          flexDirection: "column",
          zIndex: 50,
          boxShadow: "-8px 0 24px rgba(0,0,0,0.4)",
        }}
      >
        {securityView.kind === "root" && renderRoot()}
        {securityView.kind === "password" && renderPassword(securityView.purpose)}
        {securityView.kind === "export-mnemonic" && renderExportMnemonic()}
        {securityView.kind === "export-privatekey" && renderExportPrivateKey()}
        {securityView.kind === "delete" && renderDelete()}
      </div>
    );
  };
  return (
    <div style={styles.root}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          flexShrink: 0,
        }}
      >
        {/* Left: avatar + address + actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {/* Default avatar derived from the address */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: avatarColor(wallet.address),
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <User size={16} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{wallet.ens || wallet.name}</span>
            <span style={{ ...styles.subtleText, display: "flex", alignItems: "center", gap: 4 }}>
              {shortenAddress(wallet.address)}
              <Copy size={10} style={{ cursor: "pointer" }} onClick={() => copyToClipboard(wallet.address, "addr")} />
              <ExternalLink
                size={10}
                style={{ cursor: "pointer" }}
                onClick={() => {
                  // Open the explorer in the system browser.
                  // Replace with a Tauri opener command if needed.
                  window.open(`https://etherscan.io/address/${wallet.address}`, "_blank");
                }}
              />
              {copied === "addr" && <span style={{ color: "#3fb950", fontSize: 10 }}>{isZh ? "已复制" : "Copied"}</span>}
            </span>
          </div>
        </div>
        {/* Right: settings + network */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {/* Settings menu */}
          <Dropdown
            align="right"
            trigger={
              <button style={styles.iconButton} title={isZh ? "设置" : "Settings"}>
                <Settings size={14} />
              </button>
            }
          >
            {(close) => (
              <div>
                <div
                  style={styles.menuItem}
                  onClick={() => {
                    close();
                    openSecurity();
                  }}
                >
                  <Shield size={13} />
                  {isZh ? "安全" : "Security"}
                </div>
                <div style={{ height: 1, background: "var(--border-color, #30363d)" }} />
                <div
                  style={{ ...styles.menuItem, color: "#f85149" }}
                  onClick={() => {
                    close();
                    openSecurity();
                    setSecurityView({ kind: "delete" });
                  }}
                >
                  <Trash2 size={13} />
                  {isZh ? "删除钱包" : "Delete Wallet"}
                </div>
              </div>
            )}
          </Dropdown>
          {/* Network switch menu */}
          <Dropdown
            align="right"
            trigger={
              <button style={styles.iconButton} title={isZh ? "切换网络" : "Switch Network"}>
                <Globe size={14} />
              </button>
            }
          >
            {(close) => (
              <div>
                <div
                  style={{
                    padding: "6px 12px",
                    fontSize: 10,
                    color: "var(--text-secondary, #8b949e)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {isZh ? "网络" : "Networks"}
                </div>
                {NETWORKS.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      ...styles.menuItem,
                      background: n.id === activeNetworkId ? "var(--hover-bg, #21262d)" : "transparent",
                    }}
                    onClick={() => {
                      setActiveNetworkId(n.id);
                      close();
                    }}
                  >
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: n.color,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{isZh ? n.nameZh : n.name}</span>
                      <span style={{ fontSize: 10, color: "var(--text-secondary, #8b949e)" }}>Chain ID: {n.chainId}</span>
                    </span>
                    {n.id === activeNetworkId && <Check size={13} style={{ marginLeft: "auto" }} />}
                  </div>
                ))}
              </div>
            )}
          </Dropdown>
        </div>
      </div>
      <div style={styles.scrollBody}>
        {/* ACCOUNT OVERVIEW */}
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
            {/* Address row */}
            <div style={{ ...styles.row, paddingBottom: 8 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 600, fontSize: "13px" }}>{wallet.ens || wallet.name}</span>
                <span style={{ ...styles.subtleText, display: "flex", alignItems: "center", gap: 4 }}>
                  {shortenAddress(wallet.address)}
                  <Copy size={10} style={{ cursor: "pointer" }} onClick={() => copyToClipboard(wallet.address, "addr2")} />
                  <ExternalLink size={10} style={{ cursor: "pointer" }} />
                  {copied === "addr2" && <span style={{ color: "#3fb950", fontSize: 10 }}>{isZh ? "已复制" : "Copied"}</span>}
                </span>
              </div>
              <span style={styles.pill("#3fb950", "rgba(63,185,80,0.15)")}>
                <Activity size={10} /> {isZh ? "已连接" : "Connected"}
              </span>
            </div>
            {/* Current network indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 0",
                borderTop: "1px solid var(--border-color, #30363d)",
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: activeNetwork.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 600 }}>{isZh ? activeNetwork.nameZh : activeNetwork.name}</span>
              {activeNetwork.isTestnet && <span style={styles.pill("#f0b90b", "rgba(240,185,11,0.15)")}>{isZh ? "测试网" : "Testnet"}</span>}
            </div>
            {/* Total value */}
            <div style={{ padding: "10px 0", borderTop: "1px solid var(--border-color, #30363d)" }}>
              <div style={styles.subtleText}>{isZh ? "总资产" : "Total Value"}</div>
              <div style={{ fontSize: "22px", fontWeight: 700, marginTop: 2 }}>$24,891.42</div>
              <div
                style={{
                  ...styles.pill("#3fb950", "rgba(63,185,80,0.15)"),
                  marginTop: 6,
                }}
              >
                <TrendingUp size={10} />
                +3.42% (24h)
              </div>
            </div>
            {/* Native balances */}
            <div style={{ paddingTop: 10, borderTop: "1px solid var(--border-color, #30363d)" }}>
              <div style={styles.row}>
                <span style={styles.subtleText}>{isZh ? "ETH 余额" : "ETH Balance"}</span>
                <span style={{ fontWeight: 600 }}>4.2183 ETH</span>
              </div>
              <div style={styles.row}>
                <span style={styles.subtleText}>{isZh ? "HIPPOX 余额" : "HIPPOX Balance"}</span>
                <span style={{ fontWeight: 600 }}>128.45K HIPPOX</span>
              </div>
            </div>
          </div>
        </div>
        {/* TOKEN HOLDINGS */}
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
        {/* RECENT ACTIVITY */}
        <div style={{ ...styles.section, borderBottom: "none" }}>
          <div style={styles.sectionHeader}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Activity size={13} />
              {isZh ? "最近活动" : "Recent Activity"}
            </span>
          </div>
          <div style={{ ...styles.sectionBody, padding: "6px 14px" }}>
            {MOCK_RECENT_TXS.map((tx, idx) => (
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
            ))}
          </div>
        </div>
      </div>
      {securityOpen && renderSecurityPanel()}
    </div>
  );
};
export default AccountPanel;
