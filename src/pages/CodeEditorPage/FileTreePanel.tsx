import React, { useState } from "react";

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

interface FileTreePanelProps {
  t: (key: string) => string;
  onFileSelect: (path: string) => void;
  selectedFile: string | null;
}

const mockFileTree: FileNode[] = [
  {
    name: "src",
    path: "/src",
    isDirectory: true,
    children: [
      {
        name: "components",
        path: "/src/components",
        isDirectory: true,
        children: [
          {
            name: "Button.tsx",
            path: "/src/components/Button.tsx",
            isDirectory: false,
          },
          {
            name: "Header.tsx",
            path: "/src/components/Header.tsx",
            isDirectory: false,
          },
          {
            name: "Sidebar.tsx",
            path: "/src/components/Sidebar.tsx",
            isDirectory: false,
          },
        ],
      },
      {
        name: "pages",
        path: "/src/pages",
        isDirectory: true,
        children: [
          { name: "Home.tsx", path: "/src/pages/Home.tsx", isDirectory: false },
          {
            name: "Settings.tsx",
            path: "/src/pages/Settings.tsx",
            isDirectory: false,
          },
        ],
      },
      {
        name: "utils",
        path: "/src/utils",
        isDirectory: true,
        children: [
          {
            name: "helpers.ts",
            path: "/src/utils/helpers.ts",
            isDirectory: false,
          },
          {
            name: "constants.ts",
            path: "/src/utils/constants.ts",
            isDirectory: false,
          },
        ],
      },
      { name: "App.tsx", path: "/src/App.tsx", isDirectory: false },
      { name: "index.tsx", path: "/src/index.tsx", isDirectory: false },
    ],
  },
  {
    name: "public",
    path: "/public",
    isDirectory: true,
    children: [
      { name: "index.html", path: "/public/index.html", isDirectory: false },
      { name: "favicon.ico", path: "/public/favicon.ico", isDirectory: false },
    ],
  },
  {
    name: "package.json",
    path: "/package.json",
    isDirectory: false,
  },
  {
    name: "tsconfig.json",
    path: "/tsconfig.json",
    isDirectory: false,
  },
  {
    name: "README.md",
    path: "/README.md",
    isDirectory: false,
  },
];

const getFileIcon = (fileName: string): string => {
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
  };
  return icons[ext] || "📄";
};

const FileTreePanel: React.FC<FileTreePanelProps> = ({
  t,
  onFileSelect,
  selectedFile,
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(["/src"]),
  );

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderFileTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedPaths.has(node.path);
      const isSelected = selectedFile === node.path;

      if (node.isDirectory) {
        return (
          <div key={node.path}>
            <div
              onClick={() => toggleExpand(node.path)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                paddingLeft: `${level * 16 + 8}px`,
                cursor: "pointer",
                borderRadius: "4px",
                color: "var(--text-primary)",
                fontSize: "13px",
                userSelect: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span style={{ fontSize: "14px", flexShrink: 0 }}>
                {isExpanded ? "📂" : "📁"}
              </span>
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {node.name}
              </span>
            </div>
            {isExpanded && node.children && (
              <div>{renderFileTree(node.children, level + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <div
          key={node.path}
          onClick={() => onFileSelect(node.path)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 8px",
            paddingLeft: `${level * 16 + 8}px`,
            cursor: "pointer",
            borderRadius: "4px",
            background: isSelected ? "var(--accent-glow)" : "transparent",
            color: isSelected ? "var(--accent-color)" : "var(--text-primary)",
            fontSize: "13px",
            userSelect: "none",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = "var(--hover-bg)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <span style={{ fontSize: "14px", flexShrink: 0 }}>
            {getFileIcon(node.name)}
          </span>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {node.name}
          </span>
        </div>
      );
    });
  };

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        padding: "8px 4px",
        background: "var(--bg-secondary)",
        userSelect: "none",
      }}
    >
      {mockFileTree.length === 0 ? (
        <div
          style={{
            color: "var(--text-muted)",
            fontSize: "12px",
            textAlign: "center",
            padding: "20px",
          }}
        >
          {t("editor.noWorkspace") || "No workspace loaded"}
        </div>
      ) : (
        renderFileTree(mockFileTree)
      )}
    </div>
  );
};

export default FileTreePanel;
