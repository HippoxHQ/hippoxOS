import React from "react";
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
  if (!error || error.trim() === "") {
    return null;
  }
  const isTerminalEmpty = (() => {
    try {
      const parsed = JSON.parse(error);
      if (parsed && parsed.terminalResponse === null && parsed.chatResponse) {
        return true;
      }
      if (
        parsed &&
        parsed.terminalResponse &&
        parsed.terminalResponse.m === ""
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  })();

  if (isTerminalEmpty) {
    return null;
  }

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
          display: "flex",
          justifyContent: "flex-end",
        }}
      ></div>
    </div>
  );
};
