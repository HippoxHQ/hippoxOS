import React from "react";
import { copyToClipboard } from "../utils";
import { ContentWithLinks } from "./ContentWithLinks";
import { CopyIcon } from "../../../../icons";

interface TaskErrorProps {
  error: string;
  onCopy: () => void;
  onShowChart: () => void;
  t: (key: string) => string;
}

export const TaskError: React.FC<TaskErrorProps> = ({
  error,
  onCopy,
  onShowChart,
  t,
}) => {
  return (
    <div className="task-error">
      <div
        className="error-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          className="error-label"
          style={{ color: "#ff6666", fontWeight: 500 }}
        >
          ❌ Error:
        </span>
        <button
          className="copy-error-btn"
          onClick={onCopy}
          title={t("common.copy") || "Copy"}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            fontSize: "12px",
            padding: "4px 8px",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
        >
          <CopyIcon size={12} /> {t("common.copy") || "Copy"}
        </button>
      </div>
      <div className="error-content-text">
        <ContentWithLinks text={error} t={t} />
      </div>
      <div
        className="error-content-func"
        style={{
          marginTop: "10px",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={onShowChart}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            background: "var(--accent-color)",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 500,
          }}
        >
          <span>📊</span>
          <span>{t("terminal.showChart") || "View Chart"}</span>
        </button>
      </div>
    </div>
  );
};
