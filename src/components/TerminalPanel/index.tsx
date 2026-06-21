// src/components/TerminalPanel/index.tsx
import React, { useEffect, useState } from "react";
import { ExecutionLog } from "../../types/types";
import TerminalArea from "./TerminalArea";
import { configCommands } from "../../command/config";
import { UploadFile } from "../../core/types";

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

  return (
    <div
      className="terminal-panel"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
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
        />
      </div>
    </div>
  );
};

export default TerminalPanel;
