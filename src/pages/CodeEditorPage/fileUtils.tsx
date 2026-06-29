import { Icon } from "@iconify/react";

const iconMap: Record<string, string> = {
  // TypeScript / JavaScript
  ts: "vscode-icons:file-type-typescript",
  tsx: "vscode-icons:file-type-typescript",
  js: "vscode-icons:file-type-javascript",
  jsx: "vscode-icons:file-type-javascript",
  mjs: "vscode-icons:file-type-javascript",
  cjs: "vscode-icons:file-type-javascript",
  mts: "vscode-icons:file-type-typescript",
  cts: "vscode-icons:file-type-typescript",
  // Backend
  py: "vscode-icons:file-type-python",
  rs: "vscode-icons:file-type-rust",
  go: "vscode-icons:file-type-go",
  java: "vscode-icons:file-type-java",
  cpp: "vscode-icons:file-type-cpp",
  cc: "vscode-icons:file-type-cpp",
  cxx: "vscode-icons:file-type-cpp",
  c: "vscode-icons:file-type-c",
  h: "vscode-icons:file-type-c",
  hpp: "vscode-icons:file-type-cpp",
  hxx: "vscode-icons:file-type-cpp",
  php: "vscode-icons:file-type-php",
  rb: "vscode-icons:file-type-ruby",
  swift: "vscode-icons:file-type-swift",
  kt: "vscode-icons:file-type-kotlin",
  zig: "vscode-icons:file-type-zig",
  // Frontend
  vue: "vscode-icons:file-type-vue",
  svelte: "vscode-icons:file-type-svelte",
  astro: "vscode-icons:file-type-astro",
  // Web
  html: "vscode-icons:file-type-html",
  css: "vscode-icons:file-type-css",
  scss: "vscode-icons:file-type-scss",
  sass: "vscode-icons:file-type-sass",
  less: "vscode-icons:file-type-less",
  // Config
  json: "vscode-icons:file-type-json",
  json5: "vscode-icons:file-type-json",
  yaml: "vscode-icons:file-type-yaml",
  yml: "vscode-icons:file-type-yaml",
  toml: "vscode-icons:file-type-toml",
  xml: "vscode-icons:file-type-xml",
  env: "vscode-icons:file-type-env",
  // Docs
  md: "vscode-icons:file-type-markdown",
  txt: "vscode-icons:file-type-text",
  log: "vscode-icons:file-type-text",
  pdf: "vscode-icons:file-type-pdf",
  // Database
  sql: "vscode-icons:file-type-sql",
  // Shell
  sh: "vscode-icons:file-type-shell",
  bash: "vscode-icons:file-type-shell",
  zsh: "vscode-icons:file-type-shell",
  fish: "vscode-icons:file-type-shell",
  // Git
  gitignore: "vscode-icons:file-type-git",
  gitattributes: "vscode-icons:file-type-git",
  gitmodules: "vscode-icons:file-type-git",
  // Images
  png: "vscode-icons:file-type-image",
  jpg: "vscode-icons:file-type-image",
  jpeg: "vscode-icons:file-type-image",
  gif: "vscode-icons:file-type-image",
  webp: "vscode-icons:file-type-image",
  svg: "vscode-icons:file-type-svg",
  // Archives
  zip: "vscode-icons:file-type-zip",
  rar: "vscode-icons:file-type-zip",
  "7z": "vscode-icons:file-type-zip",
  tar: "vscode-icons:file-type-zip",
  gz: "vscode-icons:file-type-zip",
  // Audio
  mp3: "vscode-icons:file-type-audio",
  wav: "vscode-icons:file-type-audio",
  flac: "vscode-icons:file-type-audio",
  // Video
  mp4: "vscode-icons:file-type-video",
  mov: "vscode-icons:file-type-video",
  mkv: "vscode-icons:file-type-video",
  avi: "vscode-icons:file-type-video",
  default: "vscode-icons:file-type-text",
};

export const getFileIcon = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return iconMap[ext] || iconMap.default;
};

export const getFileIconComponent = (fileName: string, size: number = 16) => {
  return <Icon icon={getFileIcon(fileName)} width={size} height={size} />;
};

export const getFolderIconComponent = (isExpanded: boolean, size = 16) => (
  <Icon
    icon={
      isExpanded
        ? "vscode-icons:default-folder-opened"
        : "vscode-icons:default-folder"
    }
    width={size}
    height={size}
  />
);

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
