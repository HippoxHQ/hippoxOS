import React, { useState, useEffect } from "react";
import { WELCOME_TASK_ID, styles } from "../constants";
import { HIPPOX_ASCII_LOGO } from "../../../../config";
import { basisCommands } from "../../../../command/basis";

interface WelcomeMessageProps {
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}

const animationStyle = `
  @keyframes asciiBreathing {
    0% { 
      color: var(--text-secondary);
      opacity: 0.7;
    }
    50% { 
      color: var(--accent-color);
      opacity: 0.85;
    }
    100% { 
      color: var(--text-secondary);
      opacity: 0.7;
    }
  }
  
  .ascii-animated {
    animation: asciiBreathing 4s ease-in-out infinite;
  }

  .version-pulse {
    display: inline-block;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({
  isExpanded,
  onToggle,
  t,
}) => {
  const welcomeTime = new Date().toLocaleTimeString();
  const [hippoxVersion, setHippoxVersion] = useState<string>("");
  const [atomicVersion, setAtomicVersion] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVersions = async () => {
      try {
        const result = await basisCommands.getHippoxVersions();
        if (result) {
          setHippoxVersion(result["hippox"] || "");
          setAtomicVersion(result["hippox-atomic-skills"] || "");
        }
      } catch (error) {
        console.error("Failed to fetch versions:", error);
      } finally {
        setLoading(false);
      }
    };
    loadVersions();
  }, []);

  const showVersion = !loading && hippoxVersion;

  return (
    <div key={WELCOME_TASK_ID} className="task-row welcome-row">
      <style>{animationStyle}</style>
      <div
        className="task-row-header"
        style={styles.welcomeRowHeader}
        onClick={onToggle}
      >
        <span className="task-expand-icon">{isExpanded ? "▼" : "▶"}</span>
        <span className="task-status-icon">🦛</span>
        <span className="task-time">[{welcomeTime}]</span>
        <span className="task-input">🎉 {t("terminal.welcome.title")}</span>
        <span className="task-status-text">{t("terminal.welcome.status")}</span>
      </div>
      {isExpanded && (
        <div className="task-steps welcome-steps" style={{ marginLeft: "5px" }}>
          <div className="step-output ascii-art" style={styles.asciiArt}>
            <pre
              className="ascii-animated"
              style={{
                ...styles.asciiPre,
                animation: "asciiBreathing 4s ease-in-out infinite",
              }}
            >
              {HIPPOX_ASCII_LOGO}
            </pre>
          </div>
          {showVersion && (
            <div className="task-step">
              <span className="step-icon">🤖</span>
              <span className="step-name" style={styles.welcomeStepName}>
                {t("terminal.welcome.engineInfo") || "基于 Hippox LLM 引擎"}
                <span
                  style={{
                    marginLeft: "8px",
                    color: "var(--accent-color)",
                    fontWeight: "bold",
                    fontSize: "11px",
                  }}
                >
                  v{hippoxVersion}
                  {atomicVersion && (
                    <span
                      style={{
                        marginLeft: "6px",
                        color: "var(--text-tertiary)",
                        fontSize: "10px",
                        fontWeight: "normal",
                      }}
                    >
                      (atomic-skills v{atomicVersion})
                    </span>
                  )}
                </span>
              </span>
            </div>
          )}

          <div className="task-step">
            <span className="step-icon">🚀</span>
            <span className="step-name" style={styles.welcomeStepName}>
              {t("terminal.welcome.subtitle")}
            </span>
          </div>

          <div className="task-step">
            <span className="step-icon">💡</span>
            <span className="step-name" style={styles.welcomeStepName}>
              {t("terminal.welcome.status")}
            </span>
          </div>
        </div>
      )}
      <div className="task-separator"></div>
    </div>
  );
};
