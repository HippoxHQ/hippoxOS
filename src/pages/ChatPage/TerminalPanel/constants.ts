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
    // transition: "all 0.2s",
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
    // transition: "all 0.2s",
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
    // transition: "all 0.15s",
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
    stepName.includes("application_control") ||
    stepName.includes("launch") ||
    stepName.includes("install") ||
    stepName.includes("uninstall")
  ) return "📱";
  if (
    stepName.includes("audio_control") ||
    stepName.includes("volume") ||
    stepName.includes("mute") ||
    stepName.includes("device")
  ) return "🔊";
  if (
    stepName.includes("blockchain") ||
    stepName.includes("wallet") ||
    stepName.includes("bitcoin") ||
    stepName.includes("evm") ||
    stepName.includes("solana")
  ) return "⛓️";
  if (
    stepName.includes("bluetooth") ||
    stepName.includes("pair") ||
    stepName.includes("scan") ||
    stepName.includes("ble")
  ) return "📶";
  if (
    stepName.includes("browser") ||
    stepName.includes("navigate") ||
    stepName.includes("click") ||
    stepName.includes("screenshot") ||
    stepName.includes("tab")
  ) return "🌐";
  if (
    stepName.includes("hash") ||
    stepName.includes("encrypt") ||
    stepName.includes("decrypt") ||
    stepName.includes("base64") ||
    stepName.includes("rsa") ||
    stepName.includes("aes") ||
    stepName.includes("hmac")
  ) return "🔐";
  if (
    stepName.includes("postgres") ||
    stepName.includes("mysql") ||
    stepName.includes("redis") ||
    stepName.includes("sqlite") ||
    stepName.includes("query") ||
    stepName.includes("execute")
  ) return "🗄️";
  if (
    stepName.includes("docker") ||
    stepName.includes("k8s") ||
    stepName.includes("kubernetes") ||
    stepName.includes("deployment") ||
    stepName.includes("pod") ||
    stepName.includes("github")
  ) return "🐳";
  if (
    stepName.includes("display_control") ||
    stepName.includes("resolution") ||
    stepName.includes("brightness") ||
    stepName.includes("orientation") ||
    stepName.includes("refresh_rate") ||
    stepName.includes("scale")
  ) return "🖥️";
  if (
    stepName.includes("markdown") ||
    stepName.includes("csv") ||
    stepName.includes("xml") ||
    stepName.includes("excel") ||
    stepName.includes("pdf") ||
    stepName.includes("json") ||
    stepName.includes("yaml") ||
    stepName.includes("toml") ||
    stepName.includes("html") ||
    stepName.includes("pptx") ||
    stepName.includes("docx") ||
    stepName.includes("odt") ||
    stepName.includes("ods")
  ) return "📄";
  if (
    stepName.includes("email") ||
    stepName.includes("send_email")
  ) return "📨";
  if (
    stepName.includes("file_") ||
    stepName.includes("archive_") ||
    stepName.includes("zip") ||
    stepName.includes("tar") ||
    stepName.includes("compress") ||
    stepName.includes("signature") ||
    stepName.includes("integrity") ||
    stepName.includes("virus_scan") ||
    stepName.includes("forensic")
  ) return "📁";
  if (
    stepName.includes("keyboard_control") ||
    stepName.includes("press") ||
    stepName.includes("type_text") ||
    stepName.includes("shortcut") ||
    stepName.includes("hotkey")
  ) return "⌨️";
  if (
    stepName.includes("math_") ||
    stepName.includes("calculator") ||
    stepName.includes("power") ||
    stepName.includes("statistics") ||
    stepName.includes("unit_converter")
  ) return "🔢";
  if (
    stepName.includes("image_") ||
    stepName.includes("resize") ||
    stepName.includes("convert") ||
    stepName.includes("rotate") ||
    stepName.includes("crop") ||
    stepName.includes("compress")
  ) return "🖼️";
  if (
    stepName.includes("memory_") ||
    stepName.includes("module_base")
  ) return "🧠";
  if (
    stepName.includes("mouse_control") ||
    stepName.includes("click") ||
    stepName.includes("move") ||
    stepName.includes("drag") ||
    stepName.includes("scroll")
  ) return "🖱️";
  if (
    stepName.includes("ping") ||
    stepName.includes("dns") ||
    stepName.includes("ip_") ||
    stepName.includes("tcp") ||
    stepName.includes("udp") ||
    stepName.includes("ftp") ||
    stepName.includes("port_") ||
    stepName.includes("http_request") ||
    stepName.includes("packet_capture") ||
    stepName.includes("traffic") ||
    stepName.includes("vuln_scan")
  ) return "🌍";
  if (
    stepName.includes("os_") ||
    stepName.includes("system_") ||
    stepName.includes("clipboard") ||
    stepName.includes("reboot") ||
    stepName.includes("shutdown") ||
    stepName.includes("sleep") ||
    stepName.includes("notification") ||
    stepName.includes("battery") ||
    stepName.includes("cpu") ||
    stepName.includes("disk") ||
    stepName.includes("memory")
  ) return "💻";
  if (
    stepName.includes("process_") ||
    stepName.includes("kill") ||
    stepName.includes("pid")
  ) return "⚙️";
  if (
    stepName.includes("security_") ||
    stepName.includes("weak_password") ||
    stepName.includes("cve") ||
    stepName.includes("threat") ||
    stepName.includes("phishing") ||
    stepName.includes("permission") ||
    stepName.includes("baseline") ||
    stepName.includes("registry") ||
    stepName.includes("syslog")
  ) return "🛡️";
  if (
    stepName.includes("service_") ||
    stepName.includes("start") ||
    stepName.includes("stop") ||
    stepName.includes("restart") ||
    stepName.includes("enable") ||
    stepName.includes("disable") ||
    stepName.includes("mask")
  ) return "🔧";
  if (
    stepName.includes("schedule") ||
    stepName.includes("unschedule") ||
    stepName.includes("scheduled_tasks")
  ) return "📅";
  if (
    stepName.includes("telegram") ||
    stepName.includes("dingding") ||
    stepName.includes("feishu") ||
    stepName.includes("wecom")
  ) return "💬";
  if (
    stepName.includes("speech") ||
    stepName.includes("speak")
  ) return "🗣️";
  if (
    stepName.includes("exec_command") ||
    stepName.includes("terminal")
  ) return "💲";
  if (
    stepName.includes("text_") ||
    stepName.includes("regex") ||
    stepName.includes("diff") ||
    stepName.includes("sort") ||
    stepName.includes("deduplicate") ||
    stepName.includes("filter")
  ) return "📝";
  if (
    stepName.includes("time") ||
    stepName.includes("datetime") ||
    stepName.includes("timestamp")
  ) return "⏰";
  if (
    stepName.includes("wifi_") ||
    stepName.includes("hotspot") ||
    stepName.includes("scan") ||
    stepName.includes("connect") ||
    stepName.includes("disconnect")
  ) return "📡";
  if (
    stepName.includes("window_control") ||
    stepName.includes("minimize") ||
    stepName.includes("maximize") ||
    stepName.includes("restore") ||
    stepName.includes("resize") ||
    stepName.includes("move") ||
    stepName.includes("activate") ||
    stepName.includes("screenshot") ||
    stepName.includes("ocr")
  ) return "🪟";
  if (
    stepName.includes("random") ||
    stepName.includes("generate") ||
    stepName.includes("uuid") ||
    stepName.includes("password")
  ) return "🎲";
  return "⚡";
};