export const WELCOME_TASK_ID = "welcome";

export const styles = {
  asciiArt: {
    margin: "0px 0px",
  },
  // asciiPre: {
  //   fontFamily: "'Courier New', 'Fira Code', monospace",
  //   fontSize: "11px",
  //   lineHeight: 1.2,
  //   color: "var(--text-secondary)",
  //   margin: 0,
  //   padding: "4px 0",
  //   whiteSpace: "pre" as const,
  //   background: "transparent",
  //   border: "none",
  //   textShadow: "none",
  // },
  asciiPre: {
    fontFamily: "'Courier New', 'Fira Code', monospace",
    fontSize: "11px",
    lineHeight: 1.2,
    color: "var(--accent-color)",
    opacity: 0.85,
    margin: 0,
    padding: "4px 0",
    whiteSpace: "pre" as const,
    background: "transparent",
    border: "none",
    textShadow: "none",
  },
  welcomeRowHeader: {
    cursor: "pointer" as const,
  },
  welcomeStepName: {
    color: "var(--terminal-dim, #888)",
  },
  linksContainer: {
    marginTop: "8px",
    paddingTop: "4px",
    borderTop: "1px solid var(--border-color, #333)",
  },
  link: {
    color: "var(--link-color, #00aaff)",
    textDecoration: "none",
    cursor: "pointer",
    marginRight: "16px",
    fontSize: "12px",
    display: "inline-flex" as const,
    alignItems: "center",
    gap: "4px",
  },
  linkHover: {
    textDecoration: "underline",
  },
  scrollButtonsContainer: {
    position: "absolute" as const,
    right: "12px",
    bottom: "12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "8px",
    zIndex: 10,
  },
  taskListButton: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    background: "var(--bg-tertiary, #2d2d2d)",
    border: "1px solid var(--border-color, #444)",
    color: "var(--text-secondary, #aaa)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    transition: "all 0.2s",
    flexShrink: 0,
  },
  scrollButton: {
    width: "32px",
    height: "32px",
    borderRadius: "16px",
    background: "var(--bg-tertiary, #2d2d2d)",
    border: "1px solid var(--border-color, #444)",
    color: "var(--text-secondary, #aaa)",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    transition: "all 0.2s",
    backdropFilter: "blur(4px)",
  },
  bubbleContainer: {
    position: "absolute" as const,
    right: "0px",
    top: "40px",
    minWidth: "300px",
    maxWidth: "360px",
    maxHeight: "600px",
    background: "var(--bg-secondary, #1e1e1e)",
    border: "1px solid var(--border-color, #333)",
    borderRadius: "12px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    overflow: "hidden",
    zIndex: 100,
    pointerEvents: "auto" as const,
  },
  bubbleHeader: {
    padding: "10px 12px",
    borderBottom: "1px solid var(--border-color, #333)",
    fontSize: "12px",
    fontWeight: 600,
    color: "var(--text-secondary, #aaa)",
    background: "var(--bg-tertiary, #252525)",
  },
  bubbleContent: {
    maxHeight: "340px",
    overflowY: "auto" as const,
    padding: "8px 0",
  },
  bubbleItem: {
    padding: "8px 12px",
    fontSize: "12px",
    cursor: "pointer",
    transition: "all 0.15s",
    borderLeft: "2px solid transparent",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  bubbleItemActive: {
    background: "var(--hover-bg, #2a2a2a)",
    borderLeftColor: "var(--accent-color, #00aaff)",
  },
  bubbleItemIcon: {
    fontSize: "14px",
    flexShrink: 0,
  },
  bubbleItemText: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    color: "var(--text-primary, #fff)",
  },
  bubbleItemStatus: {
    fontSize: "10px",
    color: "var(--text-tertiary, #888)",
    flexShrink: 0,
  },
};

export const getStepEmoji = (stepName: string): string => {
  if (
    stepName.includes("file") ||
    stepName.includes("read") ||
    stepName.includes("write")
  ) return "📁";
  if (stepName.includes("calculator") || stepName.includes("math")) return "🔢";
  if (stepName.includes("random")) return "🎲";
  if (stepName.includes("http") || stepName.includes("request")) return "🌐";
  if (
    stepName.includes("database") ||
    stepName.includes("postgres") ||
    stepName.includes("mysql")
  ) return "🗄️";
  if (stepName.includes("docker") || stepName.includes("k8s")) return "🐳";
  if (
    stepName.includes("send") ||
    stepName.includes("email") ||
    stepName.includes("telegram")
  ) return "📨";
  if (stepName.includes("search")) return "🔍";
  if (stepName.includes("time") || stepName.includes("date")) return "⏰";
  if (stepName.includes("convert") || stepName.includes("transform")) return "🔄";
  return "⚡";
};