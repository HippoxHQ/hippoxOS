import React, { useEffect } from "react";
import { ContentWithLinks } from "./ContentWithLinks";
import { isTerminalResponseEmpty, renderTerminalResponse } from "../terminalrenderer";
import { CopyIcon } from "../../../../icons";
import { isStructuredLLMResponse, parseLLMResponse } from "../../../../llm/utils";
import { UploadFile } from "../../../../core/types";

if (!(window as any).__openedTasks) {
  (window as any).__openedTasks = new Map<string, { map: boolean; chart: boolean }>();
}
const openedTasks = (window as any).__openedTasks as Map<string, { map: boolean; chart: boolean }>;

export const resetAutoOpenState = (taskId?: string) => {
  if (taskId) {
    openedTasks.delete(taskId);
  } else {
    openedTasks.clear();
  }
};

interface TaskOutputProps {
  output: string;
  onCopy: () => void;
  onShowChart: (chartData?: any) => void;
  onShowMap?: (mapData?: any) => void;
  t: (key: string) => string;
  taskId?: string;
  autoOpen?: boolean;
  onFileClick?: (file: UploadFile) => void;
}

export const TaskOutput: React.FC<TaskOutputProps> = ({ output, onCopy, onShowChart, onShowMap, t, taskId, autoOpen = true, onFileClick }) => {
  let renderedContent: React.ReactNode = null;
  let isStructured: boolean = false;
  let shouldHide: boolean = false;
  let hasEarthview: boolean = false;
  let hasCandleview: boolean = false;
  let earthviewData: any = null;
  let candleviewData: any = null;

  if (output && output.trim() !== "") {
    if (isStructuredLLMResponse(output)) {
      const parsed = parseLLMResponse(output);
      if (parsed?.terminalResponse) {
        isStructured = true;
        const tr = parsed.terminalResponse as any;
        hasEarthview = !!tr.earthview && Object.keys(tr.earthview).length > 0;
        hasCandleview = !!tr.candleview && Object.keys(tr.candleview).length > 0;
        earthviewData = tr.earthview || null;
        candleviewData = tr.candleview || null;
        if (isTerminalResponseEmpty(parsed.terminalResponse)) {
          shouldHide = true;
        } else {
          renderedContent = renderTerminalResponse(parsed.terminalResponse, t, onFileClick);
        }
      } else if (parsed?.terminalResponse === null) {
        shouldHide = true;
      }
    }
  }

  const hasExecutedRef = React.useRef(false);

  useEffect(() => {
    if (hasExecutedRef.current) return;
    if (!autoOpen) return;
    if (!taskId) return;
    const taskState = openedTasks.get(taskId);
    if (hasEarthview && earthviewData) {
      if (taskState?.map) {
        hasExecutedRef.current = true;
        return;
      }
      hasExecutedRef.current = true;
      openedTasks.set(taskId, { map: true, chart: taskState?.chart || false });
      onShowMap?.(earthviewData);
    } else if (hasCandleview && candleviewData) {
      if (taskState?.chart) {
        hasExecutedRef.current = true;
        return;
      }
      hasExecutedRef.current = true;
      openedTasks.set(taskId, { map: taskState?.map || false, chart: true });
      onShowChart(candleviewData);
    }
  }, [hasEarthview, hasCandleview, earthviewData, candleviewData, autoOpen, taskId, onShowMap, onShowChart]);

  if (!output || output.trim() === "") {
    return null;
  }

  if (shouldHide) {
    return null;
  }

  const handleShowMap = () => {
    onShowMap?.(earthviewData);
  };

  const handleShowChart = () => {
    onShowChart(candleviewData);
  };

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
          <span className="output-label" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
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
        {(hasCandleview || hasEarthview) && (
          <div
            className="output-content-func"
            style={{
              marginTop: "12px",
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
            }}
          >
            {hasCandleview && (
              <button
                onClick={handleShowChart}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  background: "var(--accent-color, #00aaff)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  // transition: "all 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
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
                <span>{t("terminal.showChart") || "Show Chart"}</span>
              </button>
            )}
            {hasEarthview && (
              <button
                onClick={handleShowMap}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  background: "var(--accent-color, #00aaff)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  // transition: "all 0.2s ease",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
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
                <span>{t("terminal.showMap") || "Show Map"}</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  let hasCandleviewInText: boolean = false;
  let hasEarthviewInText: boolean = false;
  let extractedCandleviewData: any = null;
  let extractedEarthviewData: any = null;
  try {
    const jsonMatch = output.match(/\{[\s\S]*"candleview"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.candleview) {
        hasCandleviewInText = true;
        extractedCandleviewData = parsed.candleview;
      }
      if (parsed.earthview) {
        hasEarthviewInText = true;
        extractedEarthviewData = parsed.earthview;
      }
    }
  } catch {}

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
        <span className="output-label" style={{ color: "var(--text-primary)", fontWeight: 500 }}>
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
      {(hasCandleviewInText || hasEarthviewInText) && (
        <div
          className="output-content-func"
          style={{
            marginTop: "12px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          {hasCandleviewInText && (
            <button
              onClick={() => onShowChart(extractedCandleviewData)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "var(--accent-color, #00aaff)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                // transition: "all 0.2s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
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
              <span>{t("terminal.showChart") || "Show Chart"}</span>
            </button>
          )}
          {hasEarthviewInText && (
            <button
              onClick={() => onShowMap?.(extractedEarthviewData)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                background: "var(--accent-color, #00aaff)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: 500,
                // transition: "all 0.2s ease",
                boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
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
              <span>{t("terminal.showMap") || "Show Map"}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
