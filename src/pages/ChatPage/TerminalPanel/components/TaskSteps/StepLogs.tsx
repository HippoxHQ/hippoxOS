import React from "react";

interface StepLogsProps {
  logs: string[];
  stepIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}

export const StepLogs: React.FC<StepLogsProps> = ({
  logs,
  isExpanded,
  onToggle,
  t,
}) => {
  if (!logs || logs.length === 0) return null;

  const briefContent = logs[logs.length - 1];

  return (
    <div
      className="step-parameters-row"
      style={{
        marginTop: "0px",
        padding: "6px 10px",
        background: "var(--bg-tertiary)",
        borderRadius: "6px",
        width: "calc(100% - 10px)",
        boxSizing: "border-box",
      }}
    >
      <div
        className="step-parameters-header"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span className="step-parameters-label">
          {t("task.logs") || "Logs"}:
        </span>
        {isExpanded ? (
          <button
            className="step-parameters-toggle"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            title={t("terminal.collapse")}
            style={{
              background: "transparent",
              border: "1px solid var(--border-color, #444)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontSize: "10px",
              padding: "2px 8px",
              borderRadius: "4px",
              flexShrink: 0,
              // transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.borderColor = "var(--accent-color)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "var(--border-color, #444)";
            }}
          >
            ▲ {t("terminal.collapse")}
          </button>
        ) : (
          <>
            <span
              className="step-parameters-short"
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                margin: "0 8px",
                color: "var(--text-primary)",
                fontSize: "11px",
                fontFamily: "monospace",
              }}
            >
              {briefContent}
            </span>
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                flexShrink: 0,
                userSelect: "none",
              }}
            >
              {logs.length} {t("task.logsCount")}
            </span>
            <button
              className="step-parameters-toggle"
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              title={t("terminal.expand")}
              style={{
                background: "transparent",
                border: "1px solid var(--border-color, #444)",
                color: "var(--text-primary)",
                cursor: "pointer",
                fontSize: "10px",
                padding: "2px 8px",
                borderRadius: "4px",
                flexShrink: 0,
                // transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
                e.currentTarget.style.borderColor = "var(--accent-color)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "var(--border-color, #444)";
              }}
            >
              ▼ {t("terminal.expand")}
            </button>
          </>
        )}
      </div>
      {isExpanded && (
        <pre
          className="step-parameters-code"
          style={{
            padding: "5px 0px",
            background: "var(--bg-secondary, #1a1a1a)",
            borderRadius: "6px",
            color: "var(--text-primary)",
            fontFamily: "'Courier New', 'Fira Code', monospace",
            fontSize: "11px",
            lineHeight: "1.6",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            overflowX: "auto",
            maxHeight: "258px",
            overflowY: "auto",
            border: "1px solid var(--border-color, #333)",
          }}
        >
          {logs.map((log, idx) => (
            <React.Fragment key={idx}>
              <div style={{ padding: "0 8px" }}>{log}</div>
              {idx < logs.length - 1 && (
                <div className="task-separator" style={{ margin: "3px 0px" }} />
              )}
            </React.Fragment>
          ))}
        </pre>
      )}
    </div>
  );
};
