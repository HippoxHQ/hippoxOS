import React from "react";
import { ResourceLink, TerminalResponse } from "../../../llm/types";
import { openUrl } from "../../../utils";

const LinkItem: React.FC<{
  link: ResourceLink;
  type: "remote" | "local";
  t: (key: string) => string;
}> = ({ link, type, t }) => {
  const handleClick = async () => {
    if (link.u.startsWith("http://") || link.u.startsWith("https://")) {
      try {
        await openUrl(link.u, t);
      } catch (error) {
        console.error("Failed to open URL:", error);
        window.open(link.u, "_blank");
      }
    } else if (link.u.startsWith("file://")) {
      const filePath = link.u.replace("file://", "");
      window.dispatchEvent(
        new CustomEvent("open-file-path", { detail: { path: filePath } }),
      );
    }
  };
  const icon = type === "remote" ? "🌐" : "📁";
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

  return (
    <div
      className="terminal-link-item"
      onClick={handleClick}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "10px 12px",
        margin: "8px 0",
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "all 0.2s ease",
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
      <span style={{ fontSize: "20px" }}>
        {icon}
        {tagIcon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "4px",
          }}
        >
          {link.n}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-secondary)",
            marginBottom: "2px",
          }}
        >
          {link.d}
        </div>
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-tertiary)",
            fontFamily: "monospace",
            wordBreak: "break-all",
          }}
        >
          {link.u}
        </div>
      </div>
      <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>↗</span>
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
    <div className="terminal-commands" style={{ margin: "12px 0" }}>
      <div
        style={{
          marginBottom: "8px",
          fontSize: "12px",
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
            borderRadius: "6px",
            padding: "8px 12px",
            marginBottom: "6px",
            fontFamily: "monospace",
            fontSize: "12px",
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
              padding: "4px 8px",
              borderRadius: "4px",
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
  const displayCode =
    expanded || !shouldCollapse
      ? block.code
      : lines.slice(0, 15).join("\n") + "\n...";

  return (
    <div className="terminal-code-block" style={{ margin: "12px 0" }}>
      {block.description && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-secondary)",
            marginBottom: "6px",
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
            padding: "6px 12px",
            borderTopLeftRadius: "8px",
            borderTopRightRadius: "8px",
            borderBottom: "1px solid var(--border-color)",
            fontSize: "11px",
            color: "var(--text-tertiary)",
          }}
        >
          <span>{block.language}</span>
          <div style={{ display: "flex", gap: "8px" }}>
            {shouldCollapse && (
              <button
                onClick={() => setExpanded(!expanded)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-tertiary)",
                  fontSize: "11px",
                }}
              >
                {expanded
                  ? `▲ ${t("terminal.collapse") || "Collapse"}`
                  : `▼ ${t("terminal.expand") || "Expand"}`}
              </button>
            )}
            <button
              onClick={copyCode}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: copied ? "#4caf50" : "var(--text-tertiary)",
                fontSize: "11px",
              }}
            >
              {copied
                ? t("common.copied") || "✓ Copied"
                : t("common.copy") || "📋 Copy"}
            </button>
          </div>
        </div>
        <pre
          style={{
            margin: 0,
            padding: "12px",
            background: "var(--bg-primary)",
            borderBottomLeftRadius: "8px",
            borderBottomRightRadius: "8px",
            overflow: "auto",
            fontSize: "12px",
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

const DataTable: React.FC<{
  table: { headers: string[]; rows: (string | number)[][]; title?: string };
  t: (key: string) => string;
}> = ({ table, t }) => {
  const MAX_DISPLAY_ROWS = 100;
  const displayRows = table.rows.slice(0, MAX_DISPLAY_ROWS);
  const hasMoreRows = table.rows.length > MAX_DISPLAY_ROWS;

  return (
    <div
      className="terminal-table"
      style={{ margin: "12px 0", overflowX: "auto" }}
    >
      {table.title && (
        <div
          style={{
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: "8px",
          }}
        >
          📊 {table.title} ({t("terminal.tableRows") || "rows"}:{" "}
          {table.rows.length})
        </div>
      )}
      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
          }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              background: "var(--bg-tertiary)",
            }}
          >
            <tr>
              {table.headers.map((header, idx) => (
                <th
                  key={idx}
                  style={{
                    padding: "10px 12px",
                    textAlign: "left",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    borderBottom: "1px solid var(--border-color)",
                    borderRight:
                      idx !== table.headers.length - 1
                        ? "1px solid var(--border-color)"
                        : "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                style={{
                  borderBottom:
                    rowIdx === displayRows.length - 1
                      ? "none"
                      : "1px solid var(--border-color)",
                }}
              >
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    style={{
                      padding: "8px 12px",
                      color: "var(--text-secondary)",
                      borderRight:
                        cellIdx !== row.length - 1
                          ? "1px solid var(--border-color)"
                          : "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {hasMoreRows && (
          <div
            style={{
              textAlign: "center",
              padding: "8px",
              color: "var(--text-tertiary)",
              fontSize: "11px",
            }}
          >
            {t("terminal.tableMoreRows") || "More rows"} (
            {table.rows.length - MAX_DISPLAY_ROWS})
          </div>
        )}
      </div>
    </div>
  );
};

const MetricsGrid: React.FC<{
  metrics: { key: string; value: string | number; unit?: string }[];
  t: (key: string) => string;
}> = ({ metrics, t }) => {
  return (
    <div
      className="terminal-metrics"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
        gap: "12px",
        margin: "12px 0",
      }}
    >
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          style={{
            background: "var(--bg-tertiary)",
            borderRadius: "10px",
            padding: "12px",
            border: "1px solid var(--border-color)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-tertiary)",
              marginBottom: "6px",
            }}
          >
            {metric.key}
          </div>
          <div
            style={{
              fontSize: "24px",
              fontWeight: 600,
              color: "var(--accent-color)",
            }}
          >
            {metric.value}
          </div>
          {metric.unit && (
            <div style={{ fontSize: "10px", color: "var(--text-tertiary)" }}>
              {metric.unit}
            </div>
          )}
        </div>
      ))}
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
        margin: "12px 0",
        padding: "10px 12px",
        background: "rgba(255, 165, 0, 0.1)",
        borderRadius: "8px",
        borderLeft: "3px solid #ffa500",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 500,
          color: "#ffa500",
          marginBottom: "8px",
        }}
      >
        ⚠️ {t("terminal.warnings") || "Warnings"}
      </div>
      {warnings.map((warning, idx) => (
        <div
          key={idx}
          style={{
            fontSize: "11px",
            color: "var(--text-secondary)",
            marginBottom: "4px",
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
        alignItems: "center",
        gap: "10px",
        padding: "10px 14px",
        background: config.bg,
        borderRadius: "8px",
        margin: "12px 0",
        border: `1px solid ${config.color}`,
      }}
    >
      <span style={{ fontSize: "18px" }}>{config.icon}</span>
      <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
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
        fontSize: "13px",
        lineHeight: "1.6",
        color: "var(--text-primary)",
        margin: "12px 0",
      }}
    >
      {text}
    </div>
  );
};

export function renderTerminalResponse(
  terminalResponse: TerminalResponse | null,
  t: (key: string) => string,
): React.ReactNode {
  if (!terminalResponse) return null;
  const elements: React.ReactNode[] = [];

  if (terminalResponse.status && terminalResponse.m) {
    elements.push(
      <StatusBanner
        key="status"
        status={terminalResponse.status}
        message={terminalResponse.m}
        t={t}
      />,
    );
  } else if (terminalResponse.m && terminalResponse.m.trim()) {
    elements.push(<TextMessage key="message" text={terminalResponse.m} />);
  }

  if (terminalResponse.warnings?.length) {
    elements.push(
      <WarningsList
        key="warnings"
        warnings={terminalResponse.warnings}
        t={t}
      />,
    );
  }

  if (terminalResponse.metrics?.length) {
    elements.push(
      <MetricsGrid key="metrics" metrics={terminalResponse.metrics} t={t} />,
    );
  }

  if (terminalResponse.tables && terminalResponse.tables.length > 0) {
    terminalResponse.tables.forEach((table, idx) => {
      elements.push(<DataTable key={`table-${idx}`} table={table} t={t} />);
    });
  }

  if (terminalResponse.codeBlocks && terminalResponse.codeBlocks.length > 0) {
    terminalResponse.codeBlocks.forEach((block, idx) => {
      elements.push(<CodeBlock key={`code-${idx}`} block={block} t={t} />);
    });
  }

  if (terminalResponse.commands && terminalResponse.commands.length > 0) {
    elements.push(
      <CommandsList
        key="commands"
        commands={terminalResponse.commands}
        t={t}
      />,
    );
  }

  if (terminalResponse.links && terminalResponse.links.length > 0) {
    elements.push(
      <div
        key="links-title"
        style={{
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginTop: "12px",
        }}
      >
        🌐 {t("terminal.remoteResources") || "Remote Resources"}
      </div>,
    );
    terminalResponse.links.forEach((link, idx) => {
      elements.push(
        <LinkItem key={`link-${idx}`} link={link} type="remote" t={t} />,
      );
    });
  }

  if (terminalResponse.local && terminalResponse.local.length > 0) {
    elements.push(
      <div
        key="local-title"
        style={{
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginTop: "12px",
        }}
      >
        📁 {t("terminal.localResources") || "Local Resources"}
      </div>,
    );
    terminalResponse.local.forEach((link, idx) => {
      elements.push(
        <LinkItem key={`local-${idx}`} link={link} type="local" t={t} />,
      );
    });
  }

  return <>{elements}</>;
}

export function isTerminalResponseEmpty(
  terminalResponse: TerminalResponse | null,
): boolean {
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
    (tr.warnings && tr.warnings.length > 0);

  return !hasContent;
}
