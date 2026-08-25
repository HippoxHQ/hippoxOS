import React, { useState, useEffect } from "react";
import MetricsGrid from "./components/responsearea/MetricsGrid";
import DataTable from "./components/responsearea/DataTable";
import MindMapRenderer from "./components/responsearea/MindMapRenderer";
import ChartRenderer from "./components/responsearea/ChartRenderer";
import TimelineRenderer from "./components/responsearea/TimelineRenderer";
import ComparisonRenderer from "./components/responsearea/ComparisonRenderer";
import AudioPlayer from "./components/responsearea/AudioPlayer";
import VideoPlayer from "./components/responsearea/VideoPlayer";
import WebViewRenderer from "./components/responsearea/WebViewRenderer";
import { urlCommands } from "../../../command/url";
import { openUrl } from "../../../utils";
import { UploadFile } from "../../../core/types";
import { filesCommands } from "../../../command/files";
import { ResourceLink, TerminalResponse } from "../llm/types";
interface LinkMetadata {
  title: string;
  description: string;
  faviconUrl: string;
  image: string | null;
  themeColor: string;
  isLoading: boolean;
}
const getDomainFromUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
const getDefaultThemeColor = (domain: string): string => {
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 55%)`;
};
const getFallbackIcon = (domain: string): string => {
  const iconMap: Record<string, string> = {
    "google.com": "🔍",
    "youtube.com": "📺",
    "github.com": "🐙",
    "twitter.com": "🐦",
    "facebook.com": "📘",
    "instagram.com": "📷",
    "linkedin.com": "🔗",
    "reddit.com": "🤖",
    "amazon.com": "📦",
    "netflix.com": "🎬",
    "spotify.com": "🎵",
    "baidu.com": "🔍",
    "zhihu.com": "❓",
    "bilibili.com": "📺",
    "taobao.com": "🛒",
    "jd.com": "🛍️",
    "douyin.com": "🎵",
    "weibo.com": "🐦",
    "qq.com": "🐧",
    "163.com": "📧",
  };
  if (iconMap[domain]) return iconMap[domain];
  for (const [key, icon] of Object.entries(iconMap)) {
    if (domain.endsWith(key)) return icon;
  }
  return "🌐";
};
const LinkItem: React.FC<{
  link: ResourceLink;
  type: "remote" | "local";
  t: (key: string) => string;
}> = ({ link, type, t }) => {
  const [metadata, setMetadata] = useState<LinkMetadata>({
    title: link.n || "",
    description: link.d || "",
    faviconUrl: "",
    image: null,
    themeColor: "",
    isLoading: true,
  });
  const domain = getDomainFromUrl(link.u);
  useEffect(() => {
    const fetchMetadata = async () => {
      if (type === "local" || !link.u.startsWith("http")) {
        setMetadata((prev) => ({ ...prev, isLoading: false }));
        return;
      }
      try {
        const result = await urlCommands.getUrlMetadata(link.u);
        setMetadata({
          title: result.title || link.n || domain,
          description: result.description || link.d || "",
          faviconUrl: result.favicon_url || "",
          image: result.image || result.background_image || null,
          themeColor: result.theme_color || getDefaultThemeColor(domain),
          isLoading: false,
        });
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
        setMetadata((prev) => ({
          ...prev,
          title: link.n || domain,
          description: link.d || "",
          isLoading: false,
        }));
      }
    };
    fetchMetadata();
  }, [link.u, link.n, link.d, domain, type]);
  const handleClick = async () => {
    if (link.u.startsWith("http://") || link.u.startsWith("https://")) {
      try {
        await openUrl(link.u, t);
      } catch (error) {
        console.error("Failed to open URL:", error);
        window.open(link.u, "_blank");
      }
      return;
    }
    if (link.u.startsWith("file://")) {
      const filePath = link.u.replace("file://", "");
      try {
        await filesCommands.openPath(filePath);
      } catch (error) {
        console.error("Failed to open file:", error);
      }
      return;
    }
    if (/^[a-zA-Z]:\\/.test(link.u) || link.u.startsWith("\\\\")) {
      try {
        await filesCommands.openPath(link.u);
      } catch (error) {
        console.error("Failed to open file:", error);
      }
      return;
    }
    if (link.u.startsWith("/")) {
      try {
        await filesCommands.openPath(link.u);
      } catch (error) {
        console.error("Failed to open file:", error);
      }
      return;
    }
    try {
      await openUrl(link.u, t);
    } catch (error) {
      console.error("Failed to open:", error);
    }
  };
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "none";
    const parent = e.currentTarget.parentElement;
    if (parent) {
      const fallback = parent.querySelector(".link-fallback-icon");
      if (fallback) {
        (fallback as HTMLElement).style.display = "flex";
      }
    }
  };
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = "block";
    const parent = e.currentTarget.parentElement;
    if (parent) {
      const fallback = parent.querySelector(".link-fallback-icon");
      if (fallback) {
        (fallback as HTMLElement).style.display = "none";
      }
    }
  };
  const typeIcon: Record<string, string> = {
    image: "🖼️",
    video: "🎬",
    executable: "⚙️",
    torrent: "🧲",
    document: "📄",
    audio: "🎵",
    archive: "📦",
    code: "💻",
  };
  const tagIcon = typeIcon[link.t] || "🔗";
  if (type === "local") {
    return (
      <div
        className="terminal-link-item terminal-link-item-local"
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          padding: "8px 10px",
          margin: "6px 0",
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-color)",
          borderRadius: "6px",
          cursor: "pointer",
          overflow: "hidden",
          maxWidth: "100%",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "var(--hover-bg)";
          e.currentTarget.style.borderColor = "var(--accent-color)";
          e.currentTarget.style.transform = "translateX(4px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "var(--bg-tertiary)";
          e.currentTarget.style.borderColor = "var(--border-color)";
          e.currentTarget.style.transform = "translateX(0)";
        }}
      >
        <span style={{ fontSize: "18px" }}>📁{tagIcon}</span>
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "2px",
              fontSize: "13px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {link.n}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-secondary)",
              marginBottom: "2px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {link.d}
          </div>
          <div
            style={{
              fontSize: "9px",
              color: "var(--text-tertiary)",
              fontFamily: "monospace",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {link.u}
          </div>
        </div>
        <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>↗</span>
      </div>
    );
  }
  return (
    <div
      className="terminal-link-item terminal-link-item-remote"
      onClick={handleClick}
      style={{
        display: "flex",
        gap: "10px",
        margin: "6px 0",
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-color)",
        borderRadius: "10px",
        cursor: "pointer",
        overflow: "hidden",
        maxWidth: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--hover-bg)";
        e.currentTarget.style.borderColor = "var(--accent-color)";
        e.currentTarget.style.transform = "translateX(4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--bg-tertiary)";
        e.currentTarget.style.borderColor = "var(--border-color)";
        e.currentTarget.style.transform = "translateX(0)";
      }}
    >
      <div
        className="link-image-container"
        style={{
          width: "64px",
          minWidth: "64px",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: metadata.themeColor || getDefaultThemeColor(domain),
          backgroundImage: metadata.image ? `url(${metadata.image})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="link-glass-bg"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backdropFilter: "blur(4px)",
            background: "rgba(255, 255, 255, 0.1)",
            zIndex: 1,
          }}
        />
        <div
          className="link-icon-container"
          style={{
            position: "relative",
            zIndex: 2,
            width: "34px",
            height: "34px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.9)",
            borderRadius: "8px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
          }}
        >
          {!metadata.isLoading && metadata.faviconUrl ? (
            <img
              src={metadata.faviconUrl}
              alt={domain}
              className="link-favicon"
              style={{
                width: "20px",
                height: "20px",
                objectFit: "contain",
                display: "none",
              }}
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          ) : null}
          <span
            className="link-fallback-icon"
            style={{
              fontSize: "18px",
              fontWeight: 500,
              lineHeight: 1,
              display: metadata.isLoading || !metadata.faviconUrl ? "flex" : "none",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {metadata.isLoading ? "⏳" : getFallbackIcon(domain)}
          </span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: "8px 10px 8px 0" }}>
        <div
          style={{
            fontWeight: 600,
            color: "var(--text-primary)",
            fontSize: "12px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
            minWidth: 0,
          }}
        >
          {metadata.title}
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-secondary)",
            marginBottom: "2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            lineHeight: "1.3",
            minWidth: 0,
          }}
        >
          {metadata.description || link.d || t("terminal.clickToVisit") || "Click to visit"}
        </div>
        <div
          style={{
            fontSize: "9px",
            color: "var(--text-tertiary)",
            fontFamily: "monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {domain}
        </div>
      </div>
      <span
        style={{
          fontSize: "11px",
          color: "var(--text-tertiary)",
          padding: "8px 10px 0 0",
          opacity: 0.6,
        }}
      >
        ↗
      </span>
    </div>
  );
};
const CommandsList: React.FC<{
  commands: string[];
  t: (key: string) => string;
}> = ({ commands, t }) => {
  const copyCommand = async (cmd: string) => {
    await navigator.clipboard.writeText(cmd);
    window.dispatchEvent(
      new CustomEvent("show-toast", {
        detail: {
          message: t("common.copied") || "Command Copied",
          type: "success",
        },
      }),
    );
  };
  return (
    <div className="terminal-commands" style={{ margin: "8px 0" }}>
      <div
        style={{
          marginBottom: "6px",
          fontSize: "11px",
          fontWeight: 500,
          color: "var(--text-secondary)",
        }}
      >
        💻 {t("terminal.executableCommands") || "Executable Commands"}
      </div>
      {commands.map((cmd, idx) => (
        <div
          key={idx}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "5px",
            padding: "6px 10px",
            marginBottom: "4px",
            fontFamily: "monospace",
            fontSize: "11px",
          }}
        >
          <code style={{ color: "#4caf50", flex: 1 }}>{cmd}</code>
          <button
            onClick={() => copyCommand(cmd)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-tertiary)",
              padding: "2px 6px",
              borderRadius: "3px",
              fontSize: "12px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            📋
          </button>
        </div>
      ))}
    </div>
  );
};
const CodeBlock: React.FC<{
  block: { language: string; code: string; description?: string };
  t: (key: string) => string;
}> = ({ block, t }) => {
  const [copied, setCopied] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const copyCode = async () => {
    await navigator.clipboard.writeText(block.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const lines = block.code.split("\n");
  const shouldCollapse = lines.length > 15;
  const displayCode = expanded || !shouldCollapse ? block.code : lines.slice(0, 15).join("\n") + "\n...";
  return (
    <div className="terminal-code-block" style={{ margin: "8px 0" }}>
      {block.description && (
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-secondary)",
            marginBottom: "4px",
          }}
        >
          📝 {block.description}
        </div>
      )}
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "var(--bg-secondary)",
            padding: "4px 10px",
            borderTopLeftRadius: "6px",
            borderTopRightRadius: "6px",
            borderBottom: "1px solid var(--border-color)",
            fontSize: "10px",
            color: "var(--text-tertiary)",
          }}
        >
          <span>{block.language}</span>
          <div style={{ display: "flex", gap: "6px" }}>
            {shouldCollapse && (
              <button
                onClick={() => setExpanded(!expanded)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  fontSize: "10px",
                }}
              >
                {expanded ? `▲ ${t("terminal.collapse") || "Collapse"}` : `▼ ${t("terminal.expand") || "Expand"}`}
              </button>
            )}
            <button
              onClick={copyCode}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: copied ? "#4caf50" : "var(--text-tertiary)",
                fontSize: "10px",
              }}
            >
              {copied ? t("common.copied") || "✓ Copied" : t("common.copy") || "📋 Copy"}
            </button>
          </div>
        </div>
        <pre
          style={{
            margin: 0,
            padding: "10px",
            background: "var(--bg-primary)",
            borderBottomLeftRadius: "6px",
            borderBottomRightRadius: "6px",
            overflow: "auto",
            fontSize: "11px",
            fontFamily: "monospace",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
            borderTop: "none",
          }}
        >
          {displayCode}
        </pre>
      </div>
    </div>
  );
};
const WarningsList: React.FC<{
  warnings: string[];
  t: (key: string) => string;
}> = ({ warnings, t }) => {
  return (
    <div
      className="terminal-warnings"
      style={{
        margin: "8px 0",
        padding: "8px 10px",
        background: "rgba(255, 165, 0, 0.1)",
        borderRadius: "6px",
        borderLeft: "3px solid #ffa500",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 500,
          color: "#ffa500",
          marginBottom: "6px",
        }}
      >
        ⚠️ {t("terminal.warnings") || "Warnings"}
      </div>
      {warnings.map((warning, idx) => (
        <div
          key={idx}
          style={{
            fontSize: "10px",
            color: "var(--text-secondary)",
            marginBottom: "2px",
          }}
        >
          • {warning}
        </div>
      ))}
    </div>
  );
};
const StatusBanner: React.FC<{
  status: string;
  message: string;
  t: (key: string) => string;
}> = ({ status, message, t }) => {
  const statusText =
    {
      success: t("terminal.status.completed") || "Success",
      error: t("terminal.status.failed") || "Error",
      warning: t("terminal.warning") || "Warning",
      info: t("terminal.info") || "Info",
    }[status] || status;
  const config = {
    success: { icon: "✅", color: "#4caf50", bg: "rgba(76, 175, 80, 0.1)" },
    error: { icon: "❌", color: "#ff4444", bg: "rgba(255, 68, 68, 0.1)" },
    warning: { icon: "⚠️", color: "#ffa500", bg: "rgba(255, 165, 0, 0.1)" },
    info: { icon: "ℹ️", color: "#2196f3", bg: "rgba(33, 150, 243, 0.1)" },
  }[status] || {
    icon: "📌",
    color: "var(--text-secondary)",
    bg: "var(--bg-tertiary)",
  };
  return (
    <div
      className="terminal-status-banner"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "8px",
        padding: "5px 12px",
        background: config.bg,
        borderRadius: "6px",
        border: `1px solid ${config.color}`,
        maxWidth: "100%",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <span style={{ fontSize: "12px", flexShrink: 0 }}>{config.icon}</span>
      <span
        style={{
          fontSize: "12px",
          color: "var(--text-primary)",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          flex: 1,
          minWidth: 0,
        }}
      >
        {statusText}: {message}
      </span>
    </div>
  );
};
const TextMessage: React.FC<{ text: string }> = ({ text }) => {
  if (!text || !text.trim()) return null;
  return (
    <div
      className="terminal-text-message"
      style={{
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontSize: "12px",
        lineHeight: "1.5",
        color: "var(--text-primary)",
        margin: "8px 0",
      }}
    >
      {text}
    </div>
  );
};
export function renderTerminalResponse(terminalResponse: TerminalResponse | null, t: (key: string) => string, onFileClick?: (file: UploadFile) => void, isZh?: boolean): React.ReactNode {
  if (!terminalResponse) return null;
  const elements: React.ReactNode[] = [];
  // Status banner (shows status and message)
  if (terminalResponse.status && terminalResponse.m) {
    elements.push(<StatusBanner key="status" status={terminalResponse.status} message={terminalResponse.m} t={t} />);
  } else if (terminalResponse.m && terminalResponse.m.trim()) {
    elements.push(<TextMessage key="message" text={terminalResponse.m} />);
  }
  // Warnings
  if (terminalResponse.warnings?.length) {
    elements.push(<WarningsList key="warnings" warnings={terminalResponse.warnings} t={t} />);
  }
  // Metrics grid (shows key metrics with bar chart)
  if (terminalResponse.metrics?.length) {
    elements.push(<MetricsGrid key="metrics" metrics={terminalResponse.metrics} t={t} />);
  }
  // Tables
  if (terminalResponse.tables && terminalResponse.tables.length > 0) {
    terminalResponse.tables.forEach((table, idx) => {
      elements.push(<DataTable key={`table-${idx}`} table={table} t={t} onFileClick={onFileClick} />);
    });
  }
  if (terminalResponse.chart) {
    elements.push(<ChartRenderer key="chart" data={terminalResponse.chart} t={t} isZh={isZh} />);
  }
  if (terminalResponse.timeline) {
    elements.push(<TimelineRenderer key="timeline" data={terminalResponse.timeline} t={t} isZh={isZh} />);
  }
  if (terminalResponse.comparison) {
    elements.push(<ComparisonRenderer key="comparison" data={terminalResponse.comparison} t={t} isZh={isZh} />);
  }
  // Mind map - render using Mermaid
  if (terminalResponse.mindmap) {
    elements.push(<MindMapRenderer key="mindmap" data={terminalResponse.mindmap} t={t} isZh={isZh} />);
  }
  if (terminalResponse.audio && terminalResponse.audio.length > 0) {
    elements.push(<AudioPlayer key="audio" audios={terminalResponse.audio} t={t} isZh={isZh} />);
  }
  if (terminalResponse.video && terminalResponse.video.length > 0) {
    elements.push(<VideoPlayer key="video" videos={terminalResponse.video} t={t} isZh={isZh} />);
  }
  if (terminalResponse.webview && terminalResponse.webview.length > 0) {
    elements.push(<WebViewRenderer key="webview" data={terminalResponse.webview} t={t} isZh={isZh} />);
  }
  // Code blocks
  if (terminalResponse.codeBlocks && terminalResponse.codeBlocks.length > 0) {
    terminalResponse.codeBlocks.forEach((block, idx) => {
      elements.push(<CodeBlock key={`code-${idx}`} block={block} t={t} />);
    });
  }
  // Commands
  if (terminalResponse.commands && terminalResponse.commands.length > 0) {
    elements.push(<CommandsList key="commands" commands={terminalResponse.commands} t={t} />);
  }
  // Remote links
  if (terminalResponse.links && terminalResponse.links.length > 0) {
    elements.push(
      <div
        key="links-title"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginTop: "8px",
        }}
      >
        🌐 {t("terminal.remoteResources") || "Remote Resources"}
      </div>,
    );
    terminalResponse.links.forEach((link, idx) => {
      elements.push(<LinkItem key={`link-${idx}`} link={link} type="remote" t={t} />);
    });
  }
  // Local links
  if (terminalResponse.local && terminalResponse.local.length > 0) {
    elements.push(
      <div
        key="local-title"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginTop: "8px",
        }}
      >
        📁 {t("terminal.localResources") || "Local Resources"}
      </div>,
    );
    terminalResponse.local.forEach((link, idx) => {
      elements.push(<LinkItem key={`local-${idx}`} link={link} type="local" t={t} />);
    });
  }
  return <>{elements}</>;
}
export function isTerminalResponseEmpty(terminalResponse: TerminalResponse | null): boolean {
  if (terminalResponse === null) return true;
  const tr = terminalResponse;
  const hasContent =
    (tr.m && tr.m.trim()) ||
    (tr.links && tr.links.length > 0) ||
    (tr.local && tr.local.length > 0) ||
    (tr.commands && tr.commands.length > 0) ||
    (tr.codeBlocks && tr.codeBlocks.length > 0) ||
    (tr.tables && tr.tables.length > 0) ||
    (tr.metrics && tr.metrics.length > 0) ||
    (tr.warnings && tr.warnings.length > 0) ||
    (tr.mindmap !== undefined && tr.mindmap !== null) ||
    (tr.chart !== undefined && tr.chart !== null) ||
    (tr.timeline !== undefined && tr.timeline !== null) ||
    (tr.comparison !== undefined && tr.comparison !== null) ||
    (tr.audio !== undefined && tr.audio !== null && tr.audio.length > 0) ||
    (tr.video !== undefined && tr.video !== null && tr.video.length > 0) ||
    (tr.webview !== undefined && tr.webview !== null && tr.webview.length > 0);
  return !hasContent;
}
