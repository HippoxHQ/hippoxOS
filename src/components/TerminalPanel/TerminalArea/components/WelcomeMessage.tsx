import React from "react";
import { WELCOME_TASK_ID, styles } from "../constants";
import { HIPPOX_ASCII_LOGO } from "../../../../config";

interface WelcomeMessageProps {
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({
  isExpanded,
  onToggle,
  t,
}) => {
  const welcomeTime = new Date().toLocaleTimeString();

  return (
    <div key={WELCOME_TASK_ID} className="task-row welcome-row">
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
            <pre style={styles.asciiPre}>{HIPPOX_ASCII_LOGO}</pre>
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
