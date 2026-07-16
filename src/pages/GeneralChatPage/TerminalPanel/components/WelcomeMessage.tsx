import React, { useState, useEffect } from "react";
import { WELCOME_TASK_ID, styles } from "../constants";
import { basisCommands } from "../../../../command/basis";

interface WelcomeMessageProps {
  isExpanded: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}

const HippoxAsciiLogo: React.FC = () => {
  const asciiArt = [
    "██╗  ██╗██╗██████╗ ██████╗  ██████╗ ██╗  ██╗      ██████╗  ███████╗",
    "██║  ██║██║██╔══██╗██╔══██╗██╔═══██╗╚██╗██╔╝     ██╔═══██╗ ██╔════╝",
    "███████║██║██████╔╝██████╔╝██║   ██║ ╚███╔╝      ██║   ██║ ███████╗",
    "██╔══██║██║██╔═══╝ ██╔═══╝ ██║   ██║ ██╔██╗      ██║   ██║ ╚════██║",
    "██║  ██║██║██║     ██║     ╚██████╔╝██╔╝ ██╗     ╚██████╔╝ ███████║",
    "╚═╝  ╚═╝╚═╝╚═╝     ╚═╝      ╚═════╝ ╚═╝  ╚═╝      ╚═════╝  ╚══════╝",
  ];
  const maxLineLength = Math.max(...asciiArt.map((line) => line.length));
  const charWidth = 10.5;
  const charHeight = 22;
  const padding = 8;
  const svgWidth = maxLineLength * charWidth + padding * 2;
  const svgHeight = asciiArt.length * charHeight + padding * 2;
  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        width: "100%",
        maxWidth: "100%",
        height: "auto",
        display: "block",
        margin: "0 auto",
        overflow: "visible",
        fontFamily: "'Courier New', 'Fira Code', monospace",
        fontVariant: "none",
        shapeRendering: "crispEdges",
      }}
    >
      <defs>
        <linearGradient id="ascii-glow" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#818cf8">
            <animate attributeName="stop-color" values="#818cf8;#a78bfa;#6366f1;#8b5cf6;#818cf8" dur="10s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%" stopColor="#a78bfa">
            <animate attributeName="stop-color" values="#a78bfa;#8b5cf6;#818cf8;#6366f1;#a78bfa" dur="10s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%" stopColor="#6366f1">
            <animate attributeName="stop-color" values="#6366f1;#818cf8;#a78bfa;#8b5cf6;#6366f1" dur="10s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
        <filter id="ascii-glow-filter">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {asciiArt.map((line, lineIndex) => {
        const chars = line.split("");
        const yPos = padding + (lineIndex + 1) * charHeight - 4;
        return (
          <g key={lineIndex}>
            {chars.map((char, charIndex) => {
              if (char === " ") return null;
              const xPos = padding + charIndex * charWidth;
              const delay = (lineIndex * 1.5 + charIndex * 0.25) % 3;
              return (
                <text
                  key={`${lineIndex}-${charIndex}`}
                  x={xPos}
                  y={yPos}
                  fontSize="15"
                  fontWeight="400"
                  fontFamily="'Courier New', 'Fira Code', monospace"
                  fill="url(#ascii-glow)"
                  opacity="0.88"
                  filter="url(#ascii-glow-filter)"
                  style={{
                    textRendering: "geometricPrecision",
                    shapeRendering: "crispEdges",
                  }}
                >
                  <animate attributeName="opacity" values="0.65;1;0.65" dur="3.5s" begin={`${delay}s`} repeatCount="indefinite" />
                  {char}
                </text>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};

export const WelcomeMessage: React.FC<WelcomeMessageProps> = ({ isExpanded, onToggle, t }) => {
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
      <style>{`
        .ascii-art {
          overflow: visible !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .welcome-steps {
          overflow: visible !important;
        }
      `}</style>
      <div
        className="task-row-header"
        style={{
          ...styles.welcomeRowHeader,
          userSelect: "none",
          marginTop: "5px",
        }}
        onClick={onToggle}
      >
        <span className="task-expand-icon">{isExpanded ? "▼" : "▶"}</span>
        <span className="task-status-icon">🦛</span>
        <span className="task-time">[{welcomeTime}]</span>
        <span className="task-input">🎉 {t("terminal.welcome.title")}</span>
        <span className="task-status-text">{t("terminal.welcome.status")}</span>
      </div>
      {isExpanded && (
        <div className="task-steps welcome-steps" style={{ marginLeft: "5px", overflow: "visible" }}>
          <div
            className="step-output ascii-art"
            style={{
              ...styles.asciiArt,
              overflow: "visible",
              width: "100%",
              userSelect: "none",
            }}
          >
            <HippoxAsciiLogo />
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
