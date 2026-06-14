import React from "react";
import { WELCOME_TASK_ID, styles } from "../constants";
import { HIPPOX_ASCII_LOGO } from "../../../../config";

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
`;

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({
  isExpanded,
  onToggle,
  t,
}) => {
  const welcomeTime = new Date().toLocaleTimeString();

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
          <div className="task-step">
            <span className="step-icon">🚀</span>
            <span className="step-name" style={styles.welcomeStepName}>
              {t("terminal.welcome.subtitle")}
            </span>
          </div>
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