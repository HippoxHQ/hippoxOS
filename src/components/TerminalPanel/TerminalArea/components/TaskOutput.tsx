import React from "react";
import { ContentWithLinks } from "./ContentWithLinks";
import { CopyIcon } from "../../../../icons";
import {
  isStructuredLLMResponse,
  parseLLMResponse,
} from "../../../../llm/utils";
import {
  isTerminalResponseEmpty,
  renderTerminalResponse,
} from "../terminalrenderer";
interface TaskOutputProps {
  output: string;
  onCopy: () => void;
  onShowChart: () => void;
  onShowMap?: () => void;
  t: (key: string) => string;
}

export const TaskOutput: React.FC<TaskOutputProps> = ({
  output,
  onCopy,
  onShowChart,
  onShowMap,
  t,
}) => {
  if (!output || output.trim() === "") {
    return null;
  }
  let renderedContent: React.ReactNode = null;
  let isStructured = false;
  let shouldHide = false;
  if (isStructuredLLMResponse(output)) {
    const parsed = parseLLMResponse(output);
    if (parsed?.terminalResponse) {
      isStructured = true;
      if (isTerminalResponseEmpty(parsed.terminalResponse)) {
        shouldHide = true;
      } else {
        renderedContent = renderTerminalResponse(parsed.terminalResponse, t);
      }
    } else if (parsed?.terminalResponse === null) {
      shouldHide = true;
    }
  }
  if (shouldHide) {
    return null;
  }
  if (isStructured && renderedContent) {
    return (
      <div className="task-final-output">
        <div
          className="output-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            className="output-label"
            style={{ color: "var(--text-primary)", fontWeight: 500 }}
          >
            📝 {t("terminal.response") || "Response:"}
          </span>
          <button
            className="copy-output-btn"
            onClick={onCopy}
            title={t("common.copy")}
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
            <CopyIcon size={12} /> {t("common.copy")}
          </button>
        </div>
        <div className="output-content-structured" style={{ marginTop: "8px" }}>
          {renderedContent}
        </div>
        <div
          className="output-content-func"
          style={{
            marginTop: "10px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "8px",
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
            <span>{t("terminal.showChart")}</span>
          </button>
          {onShowMap && (
            <button
              onClick={onShowMap}
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
              <span>🗺️</span>
              <span>{t("terminal.showMap")}</span>
            </button>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="task-final-output">
      <div
        className="output-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          className="output-label"
          style={{ color: "var(--text-primary)", fontWeight: 500 }}
        >
          📝 {t("terminal.response") || "Response:"}
        </span>
        <button
          className="copy-output-btn"
          onClick={onCopy}
          title={t("common.copy")}
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
          <CopyIcon size={12} /> {t("common.copy")}
        </button>
      </div>
      <div className="output-content-text">
        <ContentWithLinks text={output} t={t} />
      </div>
      <div
        className="output-content-func"
        style={{
          marginTop: "10px",
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
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
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.85";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <span>📊</span>
          <span>{t("terminal.showChart")}</span>
        </button>

        {onShowMap && (
          <button
            onClick={onShowMap}
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
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <span>🗺️</span>
            <span>{t("terminal.showMap")}</span>
          </button>
        )}
      </div>
    </div>
  );
};
