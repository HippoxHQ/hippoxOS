export const getFileIcon = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const icons: Record<string, string> = {
    ts: "📘",
    tsx: "📘",
    js: "📜",
    jsx: "📜",
    py: "🐍",
    rs: "🦀",
    go: "🐹",
    java: "☕",
    cpp: "⚙️",
    c: "⚙️",
    html: "🌐",
    css: "🎨",
    json: "📋",
    md: "📝",
    xml: "📄",
    yaml: "📄",
    yml: "📄",
    toml: "📄",
    sh: "📟",
    bash: "📟",
    sql: "🗄️",
    php: "🐘",
    rb: "💎",
    swift: "🦅",
    kt: "📱",
    vue: "🟢",
    svelte: "🟠",
    zig: "⚡",
    txt: "📄",
    log: "📄",
    gitignore: "📄",
    env: "📄",
  };
  return icons[ext] || "📄";
};

export const getDirectoryName = (path: string | null | undefined): string => {
  if (!path) return "No Workspace";
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case "M ":
    case " M":
      return "#ffa500";
    case "A ":
    case "AM":
      return "#4caf50";
    case "D ":
    case " D":
      return "#ff4444";
    case "R ":
      return "#00aaff";
    case "??":
      return "#888";
    default:
      return "var(--text-muted)";
  }
};

export const getStatusLabel = (statusDesc: string): string => {
  switch (statusDesc) {
    case "modified":
      return "已修改";
    case "added":
      return "已添加";
    case "deleted":
      return "已删除";
    case "renamed":
      return "已重命名";
    case "untracked":
      return "未跟踪";
    default:
      return statusDesc;
  }
};