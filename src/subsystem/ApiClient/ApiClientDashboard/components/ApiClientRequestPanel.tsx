import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Send, Plus, Trash2, Lock, Globe, CheckCircle2, AlertCircle, X } from "lucide-react";
/** Raw body format options. */
const RAW_FORMATS = ["JSON", "Text", "JavaScript", "XML", "HTML"];
/** Fixed height of the request tab bar (px). */
const TAB_BAR_HEIGHT = 41;
/** Fixed height of the URL input row (px). */
const URL_BAR_HEIGHT = 40;
/**
 * HTTP methods supported by the request builder.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
/**
 * A single key/value row used by Params and Headers tables.
 */
interface KeyValueRow {
  id: string;
  enabled: boolean;
  key: string;
  value: string;
  description: string;
}
/**
 * Body mode options.
 */
type BodyMode = "none" | "form-data" | "x-www-form-urlencoded" | "raw" | "binary" | "GraphQL";
/**
 * Authorization types.
 */
type AuthType = "No Auth" | "API Key" | "Bearer Token" | "Basic Auth" | "OAuth 2.0" | "Digest Auth" | "Hawk Authentication" | "AWS Signature" | "NTLM Authentication" | "Akamai EdgeGrid";
/** Top tabs inside the request area. */
type RequestTab = "params" | "authorization" | "headers" | "body" | "settings";
/** Tabs inside the response area. */
type ResponseTab = "body" | "cookies" | "headers" | "results";
/** Method color mapping, matching Postman's color language. */
const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "#22c55e",
  POST: "#f59e0b",
  PUT: "#3b82f6",
  PATCH: "#a855f7",
  DELETE: "#ef4444",
  HEAD: "#14b8a6",
  OPTIONS: "#8b5cf6",
};
/** Default empty row helper. */
const makeRow = (): KeyValueRow => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  enabled: true,
  key: "",
  value: "",
  description: "",
});
/**
 * A single request document opened in its own tab.
 */
interface RequestDocument {
  id: string;
  title: string;
  method: HttpMethod;
  url: string;
  protocol: "http" | "https";
  params: KeyValueRow[];
  headers: KeyValueRow[];
  authType: AuthType;
  authFields: Record<string, string>;
  bodyMode: BodyMode;
  bodyRawText: string;
  rawFormat: string;
  settings: {
    enableSslVerification: boolean;
    followRedirects: boolean;
    followOriginalMethod: boolean;
    removeRefererHeader: boolean;
    encodeUrlAutomatically: boolean;
  };
  responseStatus: number | null;
  responseTime: number | null;
  responseSize: number | null;
  responseBody: string;
  isSending: boolean;
  activeRequestTab: RequestTab;
  activeResponseTab: ResponseTab;
}
/** Build a fresh request document. */
const makeDocument = (index: number): RequestDocument => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  title: `Request ${index}`,
  method: "GET",
  url: "",
  protocol: "https",
  params: [makeRow()],
  headers: [makeRow()],
  authType: "No Auth",
  authFields: {},
  bodyMode: "none",
  bodyRawText: "",
  rawFormat: "JSON",
  settings: {
    enableSslVerification: true,
    followRedirects: true,
    followOriginalMethod: true,
    removeRefererHeader: false,
    encodeUrlAutomatically: true,
  },
  responseStatus: null,
  responseTime: null,
  responseSize: null,
  responseBody: "",
  isSending: false,
  activeRequestTab: "params",
  activeResponseTab: "body",
});
interface ApiClientRequestPanelProps {
  /** Translation function. */
  t: (key: string, params?: any) => string;
}
/**
 * ApiClientRequestPanel.
 */
export const ApiClientRequestPanel: React.FC<ApiClientRequestPanelProps> = ({ t }) => {
  const isZh = t("i18n") === "zh";
  const [documents, setDocuments] = useState<RequestDocument[]>(() => [makeDocument(1)]);
  const [activeDocId, setActiveDocId] = useState<string>(() => documents[0].id);
  const [contextMenu, setContextMenu] = useState<{ docId: string; x: number; y: number } | null>(null);
  const [methodDropdownOpenId, setMethodDropdownOpenId] = useState<string | null>(null);
  const [isResponseCollapsed, setIsResponseCollapsed] = useState<boolean>(false);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const requestTabStripRef = useRef<HTMLDivElement>(null);
  // Arrow visibility for the request tabs strip.
  const [requestTabCanScrollLeft, setRequestTabCanScrollLeft] = useState(false);
  const [requestTabCanScrollRight, setRequestTabCanScrollRight] = useState(false);
  const activeDoc = useMemo(() => documents.find((d) => d.id === activeDocId) ?? documents[0], [documents, activeDocId]);
  const patchActiveDoc = useCallback(
    (patch: Partial<RequestDocument>) => {
      setDocuments((prev) => prev.map((d) => (d.id === activeDocId ? { ...d, ...patch } : d)));
    },
    [activeDocId],
  );
  const addDocument = useCallback(() => {
    const next = makeDocument(documents.length + 1);
    // Activate the new tab immediately so it is selected on first render.
    setActiveDocId(next.id);
    setDocuments((prev) => [...prev, next]);
  }, [documents.length]);
  const closeDocument = useCallback(
    (docId: string) => {
      setDocuments((prev) => {
        if (prev.length <= 1) return prev;
        const idx = prev.findIndex((d) => d.id === docId);
        const next = prev.filter((d) => d.id !== docId);
        if (docId === activeDocId) {
          const fallback = next[Math.max(0, idx - 1)] ?? next[0];
          setActiveDocId(fallback.id);
        }
        return next;
      });
      setContextMenu(null);
    },
    [activeDocId],
  );
  const closeOthers = useCallback((docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id === docId));
    setActiveDocId(docId);
    setContextMenu(null);
  }, []);
  const closeToTheRight = useCallback(
    (docId: string) => {
      setDocuments((prev) => {
        const idx = prev.findIndex((d) => d.id === docId);
        if (idx < 0) return prev;
        const next = prev.slice(0, idx + 1);
        if (!next.some((d) => d.id === activeDocId)) {
          setActiveDocId(next[next.length - 1].id);
        }
        return next;
      });
      setContextMenu(null);
    },
    [activeDocId],
  );
  const closeAll = useCallback(() => {
    const fresh = makeDocument(1);
    setDocuments([fresh]);
    setActiveDocId(fresh.id);
    setContextMenu(null);
  }, []);
  useEffect(() => {
    if (!contextMenu) return;
    const handleClose = () => setContextMenu(null);
    window.addEventListener("mousedown", handleClose);
    window.addEventListener("scroll", handleClose, true);
    return () => {
      window.removeEventListener("mousedown", handleClose);
      window.removeEventListener("scroll", handleClose, true);
    };
  }, [contextMenu]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [requestPaneHeightRatio, setRequestPaneHeightRatio] = useState(0.55);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartRatioRef = useRef(0.55);
  const [isSplitHover, setIsSplitHover] = useState(false);
  const handleSplitMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartRatioRef.current = requestPaneHeightRatio;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };
  const handleSplitMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.height <= 0) return;
    const deltaY = e.clientY - dragStartYRef.current;
    const deltaRatio = deltaY / rect.height;
    const next = Math.max(0.2, Math.min(0.8, dragStartRatioRef.current + deltaRatio));
    setRequestPaneHeightRatio(next);
  }, []);
  const handleSplitMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);
  useEffect(() => {
    window.addEventListener("mousemove", handleSplitMouseMove);
    window.addEventListener("mouseup", handleSplitMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleSplitMouseMove);
      window.removeEventListener("mouseup", handleSplitMouseUp);
    };
  }, [handleSplitMouseMove, handleSplitMouseUp]);
  /**
   * Recompute arrow visibility for the request tab strip.
   */
  const updateRequestTabScrollState = useCallback(() => {
    const el = requestTabStripRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setRequestTabCanScrollLeft(scrollLeft > 0);
    setRequestTabCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  }, []);
  // Refresh arrow visibility on mount / resize / document data changes.
  useEffect(() => {
    updateRequestTabScrollState();
    window.addEventListener("resize", updateRequestTabScrollState);
    return () => window.removeEventListener("resize", updateRequestTabScrollState);
  }, [updateRequestTabScrollState]);
  useEffect(() => {
    updateRequestTabScrollState();
  }, [activeDoc.params, activeDoc.headers, updateRequestTabScrollState]);
  const handleSend = async () => {
    if (!activeDoc.url.trim()) return;
    patchActiveDoc({
      isSending: true,
      responseStatus: null,
      responseTime: null,
      responseSize: null,
      responseBody: "",
    });
    const startedAt = performance.now();
    try {
      await new Promise((r) => setTimeout(r, 300));
      const elapsed = Math.round(performance.now() - startedAt);
      const demo = {
        message: "This is a demo response",
        method: activeDoc.method,
        url: activeDoc.url,
        protocol: activeDoc.protocol,
        params: activeDoc.params.filter((p) => p.enabled && p.key),
        headers: activeDoc.headers.filter((h) => h.enabled && h.key),
        authType: activeDoc.authType,
        bodyMode: activeDoc.bodyMode,
      };
      const text = JSON.stringify(demo, null, 2);
      patchActiveDoc({
        responseStatus: 200,
        responseTime: elapsed,
        responseSize: new Blob([text]).size,
        responseBody: text,
        isSending: false,
      });
    } catch (error) {
      const text = String(error);
      patchActiveDoc({
        responseStatus: 0,
        responseBody: text,
        responseSize: new Blob([text]).size,
        isSending: false,
      });
    }
  };
  const updateRow = (rows: KeyValueRow[], id: string, patch: Partial<KeyValueRow>) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r));
  const removeRow = (rows: KeyValueRow[], id: string) => rows.filter((r) => r.id !== id);
  const addRow = (rows: KeyValueRow[]) => [...rows, makeRow()];
  const enabledCount = (rows: KeyValueRow[]) => rows.filter((r) => r.enabled && r.key).length;
  const methodColor = METHOD_COLORS[activeDoc.method];
  /** Small helper: request-tab scroll arrow button. */
  const RequestTabScrollArrow: React.FC<{
    direction: "left" | "right";
    onClick: () => void;
  }> = ({ direction, onClick }) => (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        flexShrink: 0,
        border: "none",
        background: "transparent",
        color: "var(--text-secondary, #8b949e)",
        cursor: "pointer",
        padding: 0,
        borderBottom: "1px solid var(--border-color, #30363d)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--hover-bg, #21262d)";
        e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
      }}
      title={direction === "left" ? (isZh ? "向左滚动" : "Scroll left") : isZh ? "向右滚动" : "Scroll right"}
    >
      {direction === "left" ? <ChevronDown size={14} style={{ transform: "rotate(90deg)" }} /> : <ChevronDown size={14} style={{ transform: "rotate(-90deg)" }} />}
    </button>
  );
  const renderKeyValueTable = (rows: KeyValueRow[], setRows: (updater: (prev: KeyValueRow[]) => KeyValueRow[]) => void, keyPlaceholder: string, valuePlaceholder: string) => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "6px 12px",
          borderBottom: "1px solid var(--border-color, #30363d)",
          fontSize: 11,
          fontWeight: 600,
          color: "var(--text-tertiary, #6e7681)",
          textTransform: "uppercase",
          letterSpacing: 0.6,
          flexShrink: 0,
        }}
      >
        <div style={{ width: 32, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>{isZh ? "键" : "Key"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>{isZh ? "值" : "Value"}</div>
        <div style={{ flex: 1, minWidth: 0 }}>{isZh ? "描述" : "Description"}</div>
        <div style={{ width: 32, flexShrink: 0 }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "4px 12px",
              borderBottom: "1px solid var(--border-color, #30363d)",
            }}
          >
            <div style={{ width: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <input type="checkbox" checked={row.enabled} onChange={(e) => setRows((prev) => updateRow(prev, row.id, { enabled: e.target.checked }))} style={{ cursor: "pointer" }} />
            </div>
            <input
              type="text"
              value={row.key}
              onChange={(e) => setRows((prev) => updateRow(prev, row.id, { key: e.target.value }))}
              placeholder={keyPlaceholder}
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary, #e6edf3)",
                fontSize: 12,
                padding: "4px 6px",
              }}
            />
            <input
              type="text"
              value={row.value}
              onChange={(e) => setRows((prev) => updateRow(prev, row.id, { value: e.target.value }))}
              placeholder={valuePlaceholder}
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-primary, #e6edf3)",
                fontSize: 12,
                padding: "4px 6px",
              }}
            />
            <input
              type="text"
              value={row.description}
              onChange={(e) => setRows((prev) => updateRow(prev, row.id, { description: e.target.value }))}
              placeholder={isZh ? "描述" : "Description"}
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--text-secondary, #8b949e)",
                fontSize: 12,
                padding: "4px 6px",
              }}
            />
            <div style={{ width: 32, flexShrink: 0, display: "flex", justifyContent: "center" }}>
              <button
                title={isZh ? "移除" : "Remove"}
                onClick={() => setRows((prev) => removeRow(prev, row.id))}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary, #8b949e)",
                  padding: 4,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
        <div style={{ padding: "6px 12px" }}>
          <button
            onClick={() => setRows((prev) => addRow(prev))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 4,
              border: "none",
              background: "transparent",
              color: "var(--text-secondary, #8b949e)",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            <Plus size={13} /> {isZh ? "添加行" : "Add row"}
          </button>
        </div>
      </div>
    </div>
  );
  const renderParamsTab = () => renderKeyValueTable(activeDoc.params, (updater) => patchActiveDoc({ params: updater(activeDoc.params) }), isZh ? "参数" : "Parameter", isZh ? "值" : "Value");
  const renderHeadersTab = () => renderKeyValueTable(activeDoc.headers, (updater) => patchActiveDoc({ headers: updater(activeDoc.headers) }), isZh ? "请求头" : "Header", isZh ? "值" : "Value");
  const renderAuthorizationTab = () => {
    const authTypes: AuthType[] = ["No Auth", "API Key", "Bearer Token", "Basic Auth", "OAuth 2.0", "Digest Auth", "Hawk Authentication", "AWS Signature", "NTLM Authentication", "Akamai EdgeGrid"];
    const authFields = activeDoc.authFields;
    const setAuthField = (key: string, value: string) => patchActiveDoc({ authFields: { ...authFields, [key]: value } });
    const field = (label: string, key: string, placeholder: string, secret = false) => (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text-secondary, #8b949e)", marginBottom: 4 }}>{label}</div>
        <input
          type={secret ? "password" : "text"}
          value={authFields[key] ?? ""}
          onChange={(e) => setAuthField(key, e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            background: "var(--bg-tertiary, #21262d)",
            border: "1px solid var(--border-color, #30363d)",
            borderRadius: 4,
            padding: "6px 8px",
            color: "var(--text-primary, #e6edf3)",
            fontSize: 12,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
    );
    const renderAuthFields = () => {
      switch (activeDoc.authType) {
        case "No Auth":
          return <div style={{ color: "var(--text-muted, #6e7681)", fontSize: 12 }}>{isZh ? "此请求不使用任何授权。" : "This request does not use any authorization."}</div>;
        case "API Key":
          return (
            <>
              {field(isZh ? "键" : "Key", "apiKeyKey", "e.g. X-API-Key")}
              {field(isZh ? "值" : "Value", "apiKeyValue", "e.g. your-api-key", true)}
              {field(isZh ? "添加到" : "Add to", "apiKeyAddTo", "Header / Query Params")}
            </>
          );
        case "Bearer Token":
          return (
            <>
              {field(isZh ? "令牌" : "Token", "bearerToken", "e.g. eyJhbGciOi...", true)}
              <div style={{ fontSize: 11, color: "var(--text-muted, #6e7681)" }}>{isZh ? "令牌将作为 Authorization: Bearer <token> 发送。" : "The token is sent as Authorization: Bearer <token>."}</div>
            </>
          );
        case "Basic Auth":
          return (
            <>
              {field(isZh ? "用户名" : "Username", "basicUsername", "username")}
              {field(isZh ? "密码" : "Password", "basicPassword", "password", true)}
            </>
          );
        case "OAuth 2.0":
          return (
            <>
              {field(isZh ? "访问令牌" : "Access Token", "oauthAccessToken", "access token", true)}
              {field(isZh ? "令牌类型" : "Token Type", "oauthTokenType", "Bearer")}
              {field(isZh ? "头部前缀" : "Header Prefix", "oauthHeaderPrefix", "Bearer")}
            </>
          );
        case "Digest Auth":
          return (
            <>
              {field(isZh ? "用户名" : "Username", "digestUsername", "username")}
              {field(isZh ? "密码" : "Password", "digestPassword", "password", true)}
            </>
          );
        case "Hawk Authentication":
          return (
            <>
              {field(isZh ? "认证 ID" : "Auth ID", "hawkAuthId", "auth id")}
              {field(isZh ? "认证密钥" : "Auth Key", "hawkAuthKey", "auth key", true)}
              {field(isZh ? "算法" : "Algorithm", "hawkAlgorithm", "sha256")}
            </>
          );
        case "AWS Signature":
          return (
            <>
              {field(isZh ? "访问密钥" : "Access Key", "awsAccessKey", "access key")}
              {field(isZh ? "密钥" : "Secret Key", "awsSecretKey", "secret key", true)}
              {field(isZh ? "区域" : "Region", "awsRegion", "e.g. us-east-1")}
              {field(isZh ? "服务" : "Service", "awsService", "e.g. execute-api")}
            </>
          );
        case "NTLM Authentication":
          return (
            <>
              {field(isZh ? "用户名" : "Username", "ntlmUsername", "username")}
              {field(isZh ? "密码" : "Password", "ntlmPassword", "password", true)}
              {field(isZh ? "域" : "Domain", "ntlmDomain", "domain")}
            </>
          );
        case "Akamai EdgeGrid":
          return (
            <>
              {field(isZh ? "访问令牌" : "Access Token", "akamaiAccessToken", "access token", true)}
              {field(isZh ? "客户端令牌" : "Client Token", "akamaiClientToken", "client token")}
              {field(isZh ? "客户端密钥" : "Client Secret", "akamaiClientSecret", "client secret", true)}
            </>
          );
        default:
          return null;
      }
    };
    return (
      <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
        <div
          style={{
            width: 220,
            minWidth: 220,
            borderRight: "1px solid var(--border-color, #30363d)",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          {authTypes.map((type) => {
            const isActive = activeDoc.authType === type;
            return (
              <div
                key={type}
                onClick={() => patchActiveDoc({ authType: type })}
                style={{
                  padding: "8px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                  color: isActive ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
                  background: isActive ? "rgba(88,166,255,0.1)" : "transparent",
                  borderLeft: isActive ? "2px solid var(--accent-color, #58a6ff)" : "2px solid transparent",
                }}
              >
                {type}
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: 16, overflowY: "auto" }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{activeDoc.authType}</div>
          {renderAuthFields()}
        </div>
      </div>
    );
  };
  const renderBodyTab = () => {
    const bodyModes: BodyMode[] = ["none", "form-data", "x-www-form-urlencoded", "raw", "binary", "GraphQL"];
    const renderBodyEditor = () => {
      switch (activeDoc.bodyMode) {
        case "none":
          return <div style={{ color: "var(--text-muted, #6e7681)", fontSize: 12, padding: 16 }}>{isZh ? "此请求没有 body。" : "This request does not have a body."}</div>;
        case "form-data":
        case "x-www-form-urlencoded":
          return <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{renderKeyValueTable(activeDoc.params, (updater) => patchActiveDoc({ params: updater(activeDoc.params) }), isZh ? "键" : "Key", isZh ? "值" : "Value")}</div>;
        case "raw":
          return (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
              <div style={{ display: "flex", gap: 8, padding: "8px 12px", flexShrink: 0 }}>
                {RAW_FORMATS.map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => patchActiveDoc({ rawFormat: fmt })}
                    style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--border-color, #30363d)",
                      background: activeDoc.rawFormat === fmt ? "var(--accent-color, #58a6ff)" : "transparent",
                      color: activeDoc.rawFormat === fmt ? "white" : "var(--text-secondary, #8b949e)",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <textarea
                value={activeDoc.bodyRawText}
                onChange={(e) => patchActiveDoc({ bodyRawText: e.target.value })}
                placeholder={isZh ? "输入原始 body..." : "Enter raw body..."}
                style={{
                  flex: 1,
                  minHeight: 0,
                  background: "var(--bg-tertiary, #21262d)",
                  border: "1px solid var(--border-color, #30363d)",
                  borderRadius: 4,
                  margin: "0 12px 12px",
                  padding: 12,
                  color: "var(--text-primary, #e6edf3)",
                  fontFamily: "monospace",
                  fontSize: 12,
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          );
        case "binary":
          return (
            <div style={{ padding: 16 }}>
              <button
                style={{
                  padding: "6px 12px",
                  borderRadius: 4,
                  border: "1px solid var(--border-color, #30363d)",
                  background: "var(--bg-tertiary, #21262d)",
                  color: "var(--text-primary, #e6edf3)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {isZh ? "选择文件" : "Select File"}
              </button>
            </div>
          );
        case "GraphQL":
          return (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, padding: 12 }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary, #8b949e)", marginBottom: 4 }}>{isZh ? "查询" : "Query"}</div>
              <textarea
                placeholder="query { ... }"
                style={{
                  flex: 1,
                  minHeight: 0,
                  background: "var(--bg-tertiary, #21262d)",
                  border: "1px solid var(--border-color, #30363d)",
                  borderRadius: 4,
                  padding: 8,
                  color: "var(--text-primary, #e6edf3)",
                  fontFamily: "monospace",
                  fontSize: 12,
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                  marginBottom: 8,
                }}
              />
              <div style={{ fontSize: 11, color: "var(--text-secondary, #8b949e)", marginBottom: 4 }}>{isZh ? "变量" : "Variables"}</div>
              <textarea
                placeholder="{ }"
                style={{
                  flex: 1,
                  minHeight: 0,
                  background: "var(--bg-tertiary, #21262d)",
                  border: "1px solid var(--border-color, #30363d)",
                  borderRadius: 4,
                  padding: 8,
                  color: "var(--text-primary, #e6edf3)",
                  fontFamily: "monospace",
                  fontSize: 12,
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          );
        default:
          return null;
      }
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "10px 12px",
            borderBottom: "1px solid var(--border-color, #30363d)",
            flexShrink: 0,
            flexWrap: "wrap",
          }}
        >
          {bodyModes.map((mode) => (
            <label
              key={mode}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: activeDoc.bodyMode === mode ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
                cursor: "pointer",
              }}
            >
              <input type="radio" name={`bodyMode-${activeDoc.id}`} checked={activeDoc.bodyMode === mode} onChange={() => patchActiveDoc({ bodyMode: mode })} style={{ cursor: "pointer" }} />
              {mode}
            </label>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>{renderBodyEditor()}</div>
      </div>
    );
  };
  const renderSettingsTab = () => {
    const toggles: Array<{ key: keyof RequestDocument["settings"]; label: string }> = [
      { key: "enableSslVerification", label: isZh ? "启用 SSL 证书校验" : "Enable SSL certificate verification" },
      { key: "followRedirects", label: isZh ? "跟随重定向" : "Follow redirects" },
      { key: "followOriginalMethod", label: isZh ? "跟随原始 HTTP 方法" : "Follow original HTTP Method" },
      { key: "removeRefererHeader", label: isZh ? "重定向时移除 Referer 头" : "Remove referer header on redirect" },
      { key: "encodeUrlAutomatically", label: isZh ? "自动编码 URL" : "Encode URL automatically" },
    ];
    return (
      <div style={{ padding: 16 }}>
        {toggles.map((t2) => (
          <label
            key={t2.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              color: "var(--text-primary, #e6edf3)",
              cursor: "pointer",
              marginBottom: 12,
            }}
          >
            <input type="checkbox" checked={activeDoc.settings[t2.key]} onChange={(e) => patchActiveDoc({ settings: { ...activeDoc.settings, [t2.key]: e.target.checked } })} style={{ cursor: "pointer" }} />
            {t2.label}
          </label>
        ))}
      </div>
    );
  };
  const renderRequestTabContent = () => {
    switch (activeDoc.activeRequestTab) {
      case "params":
        return renderParamsTab();
      case "authorization":
        return renderAuthorizationTab();
      case "headers":
        return renderHeadersTab();
      case "body":
        return renderBodyTab();
      case "settings":
        return renderSettingsTab();
      default:
        return null;
    }
  };
  const renderResponseTabContent = () => {
    switch (activeDoc.activeResponseTab) {
      case "body":
        return (
          <pre
            style={{
              margin: 0,
              padding: 12,
              color: "var(--text-primary, #e6edf3)",
              fontFamily: "monospace",
              fontSize: 12,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {activeDoc.responseBody || (isZh ? "// 发送请求以查看响应" : "// Send a request to see the response")}
          </pre>
        );
      case "cookies":
        return <div style={{ padding: 12, color: "var(--text-muted, #6e7681)", fontSize: 12 }}>{isZh ? "无 Cookie。" : "No cookies."}</div>;
      case "headers":
        return <div style={{ padding: 12, color: "var(--text-muted, #6e7681)", fontSize: 12 }}>{isZh ? "无响应头。" : "No response headers."}</div>;
      case "results":
        return <div style={{ padding: 12, color: "var(--text-muted, #6e7681)", fontSize: 12 }}>{isZh ? "无测试。" : "No tests."}</div>;
      default:
        return null;
    }
  };
  const requestTabList: Array<{ key: RequestTab; label: string }> = [
    { key: "params", label: isZh ? "参数" : "Params" },
    { key: "authorization", label: isZh ? "授权" : "Authorization" },
    { key: "headers", label: isZh ? "请求头" : "Headers" },
    { key: "body", label: isZh ? "Body" : "Body" },
    { key: "settings", label: isZh ? "设置" : "Settings" },
  ];
  const responseTabList: Array<{ key: ResponseTab; label: string }> = [
    { key: "body", label: "Body" },
    { key: "cookies", label: isZh ? "Cookie" : "Cookies" },
    { key: "headers", label: isZh ? "响应头" : "Headers" },
    { key: "results", label: isZh ? "结果" : "Results" },
  ];
  const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
  const renderTabBar = () => (
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        background: "var(--bg-secondary, #161b22)",
        borderBottom: "1px solid var(--border-color, #30363d)",
        display: "flex",
        alignItems: "stretch",
        height: TAB_BAR_HEIGHT,
      }}
    >
      <style>{`
        .apiclient-tab-strip {
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-behavior: auto;
        }
        .apiclient-tab-strip::-webkit-scrollbar {
          display: none;
        }
        .apiclient-request-tab-strip {
          scrollbar-width: none;
          -ms-overflow-style: none;
          scroll-behavior: auto;
        }
        .apiclient-request-tab-strip::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div
        ref={tabBarRef}
        className="apiclient-tab-strip"
        onWheel={(e) => {
          const el = tabBarRef.current;
          if (!el) return;
          if (el.scrollWidth <= el.clientWidth) return;
          const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          if (delta === 0) return;
          el.scrollLeft += delta;
          e.preventDefault();
        }}
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "stretch",
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        {documents.map((doc) => {
          const isActive = doc.id === activeDocId;
          return (
            <div
              key={doc.id}
              onClick={() => setActiveDocId(doc.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ docId: doc.id, x: e.clientX, y: e.clientY });
              }}
              title={doc.title}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "0 10px",
                minWidth: 120,
                maxWidth: 200,
                flexShrink: 0,
                cursor: "pointer",
                userSelect: "none",
                color: isActive ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
                background: isActive ? "var(--bg-tertiary, #21262d)" : "transparent",
                borderRight: "1px solid var(--border-color, #30363d)",
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: "var(--accent-color, #58a6ff)",
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: METHOD_COLORS[doc.method],
                  flexShrink: 0,
                }}
              >
                {doc.method}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: 12,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {doc.title}
              </span>
              <button
                title={isZh ? "关闭" : "Close"}
                onClick={(e) => {
                  e.stopPropagation();
                  closeDocument(doc.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 16,
                  height: 16,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  color: "inherit",
                  cursor: "pointer",
                  borderRadius: 3,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg, #21262d)";
                  e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "inherit";
                }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <button
        title={isZh ? "新建请求" : "New request"}
        onClick={addDocument}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 41,
          flexShrink: 0,
          border: "none",
          borderLeft: "1px solid var(--border-color, #30363d)",
          background: "var(--bg-secondary, #161b22)",
          color: "var(--text-secondary, #8b949e)",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--hover-bg, #21262d)";
          e.currentTarget.style.color = "var(--text-primary, #e6edf3)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--bg-secondary, #161b22)";
          e.currentTarget.style.color = "var(--text-secondary, #8b949e)";
        }}
      >
        <Plus size={16} />
      </button>
      <TabBarScrollbar scrollRef={tabBarRef} version={documents.length} />
      {contextMenu && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
            background: "var(--bg-secondary, #161b22)",
            border: "1px solid var(--border-color, #30363d)",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
            minWidth: 160,
            overflow: "hidden",
          }}
        >
          {[
            { label: isZh ? "关闭全部" : "Close All", action: () => closeAll() },
            { label: isZh ? "关闭右侧" : "Close to the Right", action: () => closeToTheRight(contextMenu.docId) },
            { label: isZh ? "关闭其他" : "Close Others", action: () => closeOthers(contextMenu.docId) },
            { label: isZh ? "关闭" : "Close", action: () => closeDocument(contextMenu.docId) },
          ].map((item) => (
            <div
              key={item.label}
              onClick={item.action}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                color: "var(--text-primary, #e6edf3)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg, #21262d)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary, #161b22)",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      <style>{`
        .apiclient-split-row {
          position: relative;
          z-index: 1;
        }
        .apiclient-split-row::after {
          content: '';
          position: absolute;
          top: -6px;
          left: 0;
          right: 0;
          bottom: -6px;
          cursor: row-resize;
          z-index: 10;
        }
      `}</style>
      {renderTabBar()}
      <div
        style={
          isResponseCollapsed
            ? {
                flex: 1,
                minHeight: 160,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }
            : {
                height: `${requestPaneHeightRatio * 100}%`,
                minHeight: 160,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                flexShrink: 0,
              }
        }
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px 4px",
            flexShrink: 0,
          }}
        >
          <div
            title={activeDoc.protocol}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: activeDoc.protocol === "https" ? "#22c55e" : "var(--text-secondary, #8b949e)",
              fontSize: 12,
            }}
          >
            {activeDoc.protocol === "https" ? <Lock size={14} /> : <Globe size={14} />}
            <span style={{ textTransform: "uppercase", fontWeight: 600 }}>{activeDoc.protocol}</span>
          </div>
          <div
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 12,
              color: "var(--text-secondary, #8b949e)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={activeDoc.url}
          >
            {activeDoc.url || (isZh ? "无 URL" : "No URL")}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            gap: 8,
            padding: "4px 12px 10px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              height: URL_BAR_HEIGHT,
              display: "flex",
              alignItems: "stretch",
              background: "transparent",
              border: "1px solid var(--border-color, #30363d)",
              borderRadius: 6,
              overflow: "visible",
            }}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => {
                  const next = methodDropdownOpenId === activeDoc.id ? null : activeDoc.id;
                  setMethodDropdownOpenId(next);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  minWidth: 100,
                  height: "100%",
                  borderRadius: "5px 0 0 5px",
                  border: "none",
                  borderRight: "1px solid var(--border-color, #30363d)",
                  background: "transparent",
                  color: methodColor,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {activeDoc.method}
                <ChevronDown size={14} />
              </button>
              {methodDropdownOpenId === activeDoc.id && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    marginTop: 4,
                    background: "var(--bg-secondary, #161b22)",
                    border: "1px solid var(--border-color, #30363d)",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
                    zIndex: 100,
                    minWidth: 120,
                    overflow: "hidden",
                  }}
                >
                  {methods.map((m) => (
                    <div
                      key={m}
                      onClick={() => {
                        patchActiveDoc({ method: m });
                        setMethodDropdownOpenId(null);
                      }}
                      style={{
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: METHOD_COLORS[m],
                        cursor: "pointer",
                        background: m === activeDoc.method ? "rgba(88,166,255,0.1)" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--hover-bg, #21262d)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = m === activeDoc.method ? "rgba(88,166,255,0.1)" : "transparent";
                      }}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              value={activeDoc.url}
              onChange={(e) => {
                const v = e.target.value;
                const protocol: "http" | "https" = v.startsWith("http://") ? "http" : v.startsWith("https://") ? "https" : activeDoc.protocol;
                patchActiveDoc({ url: v, protocol });
              }}
              placeholder={isZh ? "输入请求 URL" : "Enter request URL"}
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                padding: "6px 10px",
                color: "var(--text-primary, #e6edf3)",
                fontSize: 12,
              }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={activeDoc.isSending}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 6,
              border: "none",
              background: "var(--accent-color, #58a6ff)",
              color: "white",
              fontSize: 12,
              fontWeight: 600,
              cursor: activeDoc.isSending ? "wait" : "pointer",
              opacity: activeDoc.isSending ? 0.7 : 1,
              flexShrink: 0,
            }}
          >
            <Send size={14} /> {activeDoc.isSending ? (isZh ? "发送中..." : "Sending...") : isZh ? "发送" : "Send"}
          </button>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            borderBottom: "1px solid var(--border-color, #30363d)",
            flexShrink: 0,
            position: "relative",
          }}
        >
          {requestTabCanScrollLeft && (
            <RequestTabScrollArrow
              direction="left"
              onClick={() => {
                const el = requestTabStripRef.current;
                if (el) el.scrollLeft -= 80;
              }}
            />
          )}
          <div
            ref={requestTabStripRef}
            className="apiclient-request-tab-strip"
            onScroll={updateRequestTabScrollState}
            onWheel={(e) => {
              const el = requestTabStripRef.current;
              if (!el) return;
              if (el.scrollWidth <= el.clientWidth) return;
              const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
              if (delta === 0) return;
              el.scrollLeft += delta;
              e.preventDefault();
            }}
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "0 12px",
              overflowX: "auto",
              overflowY: "hidden",
            }}
          >
            {requestTabList.map((tab) => {
              const isActive = activeDoc.activeRequestTab === tab.key;
              const count = tab.key === "params" ? enabledCount(activeDoc.params) : tab.key === "headers" ? enabledCount(activeDoc.headers) : 0;
              return (
                <button
                  key={tab.key}
                  onClick={() => patchActiveDoc({ activeRequestTab: tab.key })}
                  style={{
                    padding: "8px 10px",
                    border: "none",
                    background: "transparent",
                    color: isActive ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
                    fontSize: 12,
                    cursor: "pointer",
                    borderBottom: isActive ? "2px solid var(--accent-color, #58a6ff)" : "2px solid transparent",
                    marginBottom: -1,
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 10,
                        padding: "1px 5px",
                        borderRadius: 8,
                        background: "rgba(88,166,255,0.2)",
                        color: "var(--accent-color, #58a6ff)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Right arrow, only shown when scrollable to the right */}
          {requestTabCanScrollRight && (
            <RequestTabScrollArrow
              direction="right"
              onClick={() => {
                const el = requestTabStripRef.current;
                if (el) el.scrollLeft += 80;
              }}
            />
          )}
        </div>
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>{renderRequestTabContent()}</div>
      </div>
      <div
        className="apiclient-split-row"
        onMouseDown={handleSplitMouseDown}
        style={{
          height: "1px",
          flexShrink: 0,
          cursor: "row-resize",
          background: isSplitHover ? "var(--scrollbar-thumb)" : "var(--border-color, #30363d)",
          position: "relative",
          transition: "background 0.15s",
        }}
        onMouseEnter={() => setIsSplitHover(true)}
        onMouseLeave={() => setIsSplitHover(false)}
      />
      <div
        style={{
          flex: isResponseCollapsed ? "0 0 auto" : 1,
          minHeight: isResponseCollapsed ? 0 : 120,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            borderBottom: "1px solid var(--border-color, #30363d)",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "0 12px",
              flex: 1,
              minWidth: 0,
            }}
          >
            {responseTabList.map((tab) => {
              const isActive = activeDoc.activeResponseTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => {
                    if (isResponseCollapsed) {
                      // Expanding on tab click as well.
                      setIsResponseCollapsed(false);
                    }
                    patchActiveDoc({ activeResponseTab: tab.key });
                  }}
                  style={{
                    padding: "8px 10px",
                    border: "none",
                    background: "transparent",
                    color: isActive ? "var(--text-primary, #e6edf3)" : "var(--text-secondary, #8b949e)",
                    fontSize: 12,
                    cursor: "pointer",
                    borderBottom: isActive ? "2px solid var(--accent-color, #58a6ff)" : "2px solid transparent",
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <button
            title={isResponseCollapsed ? (isZh ? "展开响应区" : "Expand response") : isZh ? "折叠响应区" : "Collapse response"}
            onClick={() => setIsResponseCollapsed((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              flexShrink: 0,
              border: "none",
              background: "transparent",
              color: "var(--text-secondary, #8b949e)",
              cursor: "pointer",
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
            {isResponseCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
        {/* Response body, hidden when collapsed */}
        {!isResponseCollapsed && <div style={{ flex: 1, minHeight: 0, overflow: "auto", background: "var(--bg-secondary, #161b22)" }}>{renderResponseTabContent()}</div>}
      </div>
    </div>
  );
};
/**
 * Custom 5px scrollbar overlaying the bottom of a horizontally scrollable element.
 */
const TabBarScrollbar: React.FC<{
  scrollRef: React.RefObject<HTMLDivElement | null>;
  version?: number;
}> = ({ scrollRef, version }) => {
  const [thumb, setThumb] = useState<{ left: number; width: number; visible: boolean }>({
    left: 0,
    width: 0,
    visible: false,
  });
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollRef = useRef(0);
  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el || !track) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    const trackWidth = track.clientWidth;
    if (scrollWidth <= clientWidth || trackWidth <= 0) {
      setThumb({ left: 0, width: 0, visible: false });
      return;
    }
    const width = Math.max(20, (clientWidth / scrollWidth) * trackWidth);
    const maxLeft = trackWidth - width;
    const ratio = scrollLeft / (scrollWidth - clientWidth);
    setThumb({ left: ratio * maxLeft, width, visible: true });
  }, [scrollRef]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateThumb();
    const onScroll = () => updateThumb();
    const onResize = () => updateThumb();
    el.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateThumb());
      observer.observe(el);
    }
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      observer?.disconnect();
    };
  }, [scrollRef, updateThumb, version]);
  const handleThumbMouseDown = (e: React.MouseEvent) => {
    draggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartScrollRef.current = scrollRef.current?.scrollLeft ?? 0;
    document.body.style.cursor = "default";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track) return;
      const trackWidth = track.clientWidth;
      const thumbWidth = Math.max(20, (el.clientWidth / el.scrollWidth) * trackWidth);
      const maxLeft = trackWidth - thumbWidth;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const deltaX = e.clientX - dragStartXRef.current;
      const scrollDelta = maxLeft > 0 ? (deltaX / maxLeft) * maxScroll : 0;
      el.scrollLeft = dragStartScrollRef.current + scrollDelta;
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [scrollRef]);
  return (
    <div
      ref={trackRef}
      style={{
        position: "absolute",
        left: 0,
        right: 32,
        bottom: 0,
        height: 5,
        pointerEvents: thumb.visible ? "auto" : "none",
      }}
    >
      {thumb.visible && (
        <div
          onMouseDown={handleThumbMouseDown}
          style={{
            position: "absolute",
            top: 0,
            left: thumb.left,
            width: thumb.width,
            height: 5,
            borderRadius: 3,
            background: "var(--scrollbar-thumb, #484f58)",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--scrollbar-thumb-hover, #6e7681)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--scrollbar-thumb, #484f58)";
          }}
        />
      )}
    </div>
  );
};
export default ApiClientRequestPanel;
