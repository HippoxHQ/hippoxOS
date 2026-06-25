import React, { useState, useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import { showToast, ToastType } from "../../components/Toast";

interface CodeEditorPageProps {
  t: (key: string) => string;
  onClose?: () => void;
}

interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
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

const mockFileContent: Record<string, string> = {
  "/src/App.tsx": `import React from 'react';
import { Header } from './components/Header';
import { Home } from './pages/Home';

function App() {
  return (
    <div className="app">
      <Header />
      <Home />
    </div>
  );
}

export default App;`,

  "/src/components/Button.tsx": `import React from 'react';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  variant = 'primary'
}) => {
  return (
    <button
      className={\`btn btn-\${variant}\`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};`,

  "/src/components/Header.tsx": `import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="header">
      <h1>My App</h1>
      <nav>
        <a href="/">Home</a>
        <a href="/settings">Settings</a>
      </nav>
    </header>
  );
};`,

  "/src/pages/Home.tsx": `import React from 'react';
import { Button } from '../components/Button';

export const Home: React.FC = () => {
  const handleClick = () => {
    console.log('Button clicked!');
  };

  return (
    <div className="home">
      <h2>Welcome to My App</h2>
      <Button onClick={handleClick}>
        Click me
      </Button>
    </div>
  );
};`,

  "/src/pages/Settings.tsx": `import React, { useState } from 'react';

export const Settings: React.FC = () => {
  const [theme, setTheme] = useState('dark');

  return (
    <div className="settings">
      <h2>Settings</h2>
      <div>
        <label>Theme:</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value)}>
          <option value="dark">Dark</option>
          <option value="light">Light</option>
        </select>
      </div>
    </div>
  );
};`,

  "/src/utils/helpers.ts": `export const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};`,

  "/src/utils/constants.ts": `export const API_URL = 'https://api.example.com';
export const MAX_RETRIES = 3;
export const DEFAULT_TIMEOUT = 5000;`,

  "/src/index.tsx": `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,

  "/public/index.html": `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My App</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`,

  "/package.json": `{
  "name": "my-app",
  "version": "1.0.0",
  "description": "My React application",
  "main": "index.js",
  "scripts": {
    "start": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "typescript": "^5.0.0",
    "vite": "^4.0.0"
  }
}`,

  "/tsconfig.json": `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}`,

  "/README.md": `# My App

A modern React application built with TypeScript and Vite.

## Features

- ⚡️ Lightning fast development
- 🔥 Hot module replacement
- 📦 Optimized production builds
- 🎨 Modern UI components

## Getting Started

\`\`\`bash
npm install
npm run start
\`\`\`

## Building

\`\`\`bash
npm run build
\`\`\`
`,
};

const getFileLanguage = (fileName: string): string => {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    c: "c",
    h: "cpp",
    hpp: "cpp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    kt: "kotlin",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    vue: "vue",
    svelte: "svelte",
    zig: "zig",
  };
  return map[ext] || "plaintext";
};

const CodeEditorPage: React.FC<CodeEditorPageProps> = ({ t, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [currentFile, setCurrentFile] = useState<FileNode | null>(null);
  const [code, setCode] = useState<string>("");
  const [language, setLanguage] = useState<string>("plaintext");
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    new Set(["/src"]),
  );
  const [fileTree] = useState<FileNode[]>(mockFileTree);

  useEffect(() => {
    const savedTheme = localStorage.getItem("hippox-theme") as "dark" | "light";
    setTheme(savedTheme === "light" ? "light" : "vs-dark");
    const defaultFile = mockFileTree[0].children?.find(
      (c) => c.name === "App.tsx",
    );
    if (defaultFile) {
      openFile(defaultFile);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    editorRef.current = monaco.editor.create(containerRef.current, {
      value: code,
      language: language,
      theme: theme,
      minimap: { enabled: true },
      fontSize: 14,
      tabSize: 2,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      lineNumbers: "on",
      automaticLayout: true,
      wordWrap: "on",
      formatOnPaste: true,
      formatOnType: true,
      scrollbar: {
        vertical: "visible",
        horizontal: "visible",
      },
      suggest: {
        showKeywords: true,
        showSnippets: true,
      },
    });

    editorRef.current.onDidChangeModelContent(() => {
      const value = editorRef.current?.getValue() || "";
      setCode(value);
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme(theme);
    }
  }, [theme]);

  const openFile = (node: FileNode) => {
    if (node.isDirectory) {
      setExpandedPaths((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(node.path)) {
          newSet.delete(node.path);
        } else {
          newSet.add(node.path);
        }
        return newSet;
      });
      return;
    }

    const content =
      mockFileContent[node.path] || `// ${node.name}\n// No content available`;
    setCurrentFile(node);
    setCode(content);
    setLanguage(getFileLanguage(node.name));

    if (editorRef.current) {
      editorRef.current.setValue(content);
      const model = editorRef.current.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, getFileLanguage(node.name));
      }
    }
  };

  const handleSave = () => {
    if (!currentFile) {
      showToast(ToastType.WARNING, t("editor.noFileOpen") || "No file open");
      return;
    }
    showToast(ToastType.SUCCESS, t("common.saved") || "Saved");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(ToastType.SUCCESS, t("common.copied") || "Copied");
    } catch {
      showToast(ToastType.ERROR, t("common.copyFailed") || "Copy Failed");
    }
  };

  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction("editor.action.formatDocument")?.run();
    }
  };

  const renderFileTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedPaths.has(node.path);
      const isSelected = currentFile?.path === node.path;

      return (
        <div key={node.path}>
          <div
            onClick={() => openFile(node)}
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
              {node.isDirectory ? (isExpanded ? "📂" : "📁") : "📄"}
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
          {node.isDirectory && isExpanded && node.children && (
            <div>{renderFileTree(node.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      {/* 工具栏 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 12px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
          gap: "8px",
          flexWrap: "wrap",
          minHeight: "36px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
            }}
          >
            📝 {t("menu.codeEditor") || "Code Editor"}
          </span>
          {currentFile && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                background: "var(--bg-tertiary)",
                padding: "2px 8px",
                borderRadius: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "200px",
              }}
              title={currentFile.path}
            >
              {currentFile.name}
            </span>
          )}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleFormat}
            style={{
              padding: "3px 8px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              fontSize: "11px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-tertiary)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            🔧 {t("editor.format") || "Format"}
          </button>
          <button
            onClick={handleCopy}
            style={{
              padding: "3px 8px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              fontSize: "11px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--bg-tertiary)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            📋 {t("common.copy") || "Copy"}
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: "3px 10px",
              background: "var(--accent-color)",
              border: "none",
              borderRadius: "4px",
              color: "white",
              fontSize: "11px",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.85";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            💾 {t("settings.save") || "Save"}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "2px 6px",
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: "16px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* 主区域：文件树 + 编辑器 */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* 左侧文件树 */}
        <div
          style={{
            width: "240px",
            minWidth: "160px",
            maxWidth: "360px",
            borderRight: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
            overflow: "auto",
            padding: "8px 4px",
            flexShrink: 0,
          }}
        >
          {fileTree.length === 0 ? (
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
            renderFileTree(fileTree)
          )}
        </div>

        {/* 右侧编辑器 */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>
    </div>
  );
};

export default CodeEditorPage;
