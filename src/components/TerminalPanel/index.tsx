import React, { useRef, useEffect, useState, useCallback } from "react";
import { ExecutionLog, TaskInfo, UploadFile } from "../../type";
import { configCommands } from "../../api/config";
import FunctionArea from "./FunctionArea";
import TerminalArea from "./TerminalArea";

interface TerminalPanelProps {
  logs: ExecutionLog[];
  onClearLogs: () => void;
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
  onFileClick?: (file: UploadFile) => void;
}

const TerminalPanel: React.FC<TerminalPanelProps> = ({
  logs,
  onClearLogs,
  t,
  currentSessionId,
  onFileClick,
}) => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [i18n, setI18n] = useState<"en" | "zh-cn">("zh-cn");
  const [functionAreaHeight, setFunctionAreaHeight] = useState<number>(400);
  const [isFunctionAreaVisible, setIsFunctionAreaVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await configCommands.getSettingsTheme();
        setTheme(savedTheme as "light" | "dark");
      } catch (error) {
        console.error("Failed to load theme:", error);
      }
    };
    const loadLanguage = async () => {
      try {
        const savedLanguage = await configCommands.getSettingsLanguage();
        const candleViewLang = savedLanguage === "zh" ? "zh-cn" : "en";
        setI18n(candleViewLang as "en" | "zh-cn");
      } catch (error) {
        console.error("Failed to load language:", error);
      }
    };
    loadLanguage();
    loadTheme();
    const handleThemeChange = () => {
      configCommands
        .getSettingsTheme()
        .then((theme) => setTheme(theme as "light" | "dark"))
        .catch(console.error);
    };
    const handleLanguageChange = () => {
      configCommands
        .getSettingsLanguage()
        .then((lang) => {
          const candleViewLang = lang === "zh" ? "zh-cn" : "en";
          setI18n(candleViewLang as "en" | "zh-cn");
        })
        .catch(console.error);
    };
    window.addEventListener("theme-changed", handleThemeChange);
    window.addEventListener("language-changed", handleLanguageChange);
    return () => {
      window.removeEventListener("theme-changed", handleThemeChange);
      window.removeEventListener("language-changed", handleLanguageChange);
    };
  }, []);

  const handleCloseFunctionArea = () => {
    setIsFunctionAreaVisible(false);
  };

  const handleOpenFunctionArea = () => {
    setIsFunctionAreaVisible(true);
  };

  return (
    <div
      ref={containerRef}
      className="terminal-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {isFunctionAreaVisible && (
        <>
          <div
            className="function-area"
            style={{
              height: functionAreaHeight,
              flexShrink: 0,
              overflow: "hidden",
              borderBottom: "1px solid var(--border-color, #333)",
            }}
          >
            <FunctionArea
              theme={theme}
              i18n={i18n}
              t={t}
              currentSessionId={currentSessionId}
              onClose={handleCloseFunctionArea}
              containerHeight={functionAreaHeight}
            />
          </div>
          <div
            className="resize-handle resize-handle-horizontal"
            onMouseDown={(e) => {
              e.preventDefault();
              const startY = e.clientY;
              const startHeight = functionAreaHeight;
              const onMouseMove = (moveEvent: MouseEvent) => {
                const newHeight = startHeight + (moveEvent.clientY - startY);
                if (newHeight >= 150 && newHeight <= 800) {
                  setFunctionAreaHeight(newHeight);
                }
              };
              const onMouseUp = () => {
                document.removeEventListener("mousemove", onMouseMove);
                document.removeEventListener("mouseup", onMouseUp);
                document.body.style.cursor = "";
                document.body.style.userSelect = "";
              };
              document.body.style.cursor = "row-resize";
              document.body.style.userSelect = "none";
              document.addEventListener("mousemove", onMouseMove);
              document.addEventListener("mouseup", onMouseUp);
            }}
          >
            <div className="handle-line"></div>
          </div>
        </>
      )}
      <div
        className="terminal-area"
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <TerminalArea
          logs={logs}
          onClearLogs={onClearLogs}
          t={t}
          currentSessionId={currentSessionId}
          onFileClick={onFileClick}
          theme={theme}
          i18n={i18n}
          onOpenFunctionArea={handleOpenFunctionArea}
        />
      </div>
    </div>
  );
};

export default TerminalPanel;
