import { ChevronDown, ChevronUp } from "lucide-react";
import React from "react";
interface StepLogsProps {
  logs: string[];
  stepIndex: number;
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}
export const StepLogs: React.FC<StepLogsProps> = ({ logs, isExpanded, onToggle, t }) => {
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
          gap: "6px",
          flexWrap: "wrap",
          minWidth: 0,
        }}
      >
        <span className="step-parameters-label" style={{ flexShrink: 0 }}>
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
            <ChevronUp size={18} /> {t("terminal.collapse")}
          </button>
        ) : (
          <>
            <span
              className="step-parameters-short"
              style={{
                flex: "1 1 40px",
                minWidth: "20px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "var(--text-primary)",
                fontSize: "11px",
                fontFamily: "monospace",
              }}
            >
              {briefContent}
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flex: "0 1 auto",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {logs.length}
                {t("task.logsCount")}
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
                  whiteSpace: "nowrap",
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
                <ChevronDown size={18} /> {t("terminal.expand")}
              </button>
            </div>
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
              {idx < logs.length - 1 && <div className="task-separator" style={{ margin: "3px 0px" }} />}
            </React.Fragment>
          ))}
        </pre>
      )}
    </div>
  );
};
