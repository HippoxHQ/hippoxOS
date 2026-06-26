import React, { useState, useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import { showToast, ToastType } from "../../../components/Toast";

interface CodeEditProps {
  t: (key: string) => string;
  selectedFile: string | null;
}

interface TabItem {
  path: string;
  name: string;
}

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

const CodeEdit: React.FC<CodeEditProps> = ({ t, selectedFile }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [code, setCode] = useState<string>("");
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");
  const isMountedRef = useRef(true);
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const [thumbWidth, setThumbWidth] = useState(20);

  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  const addTab = (path: string) => {
    if (!path) return;
    setTabs((prev) => {
      const exists = prev.some((tab) => tab.path === path);
      if (exists) {
        setActiveTab(path);
        return prev;
      }
      const name = path.split("/").pop() || path;
      return [...prev, { path, name }];
    });
  };

  useEffect(() => {
    if (selectedFile) {
      addTab(selectedFile);
    }
  }, [selectedFile]);

  const closeTab = (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newTabs = tabs.filter((tab) => tab.path !== path);
    setTabs(newTabs);

    if (activeTab === path) {
      if (newTabs.length > 0) {
        const currentIndex = tabs.findIndex((tab) => tab.path === path);
        const nextIndex = Math.min(currentIndex, newTabs.length - 1);
        setActiveTab(newTabs[nextIndex].path);
        onFileSwitch(newTabs[nextIndex].path);
      } else {
        setActiveTab(null);
        onFileSwitch(null);
      }
    }
  };

  const onFileSwitch = (path: string | null) => {};

  useEffect(() => {
    if (selectedFile) {
      addTab(selectedFile);
    }
  }, [selectedFile]);

  useEffect(() => {
    if (editorRef.current && activeTab) {
      const content = mockFileContent[activeTab] || "";
      const lang = getFileLanguage(activeTab);
      try {
        editorRef.current.setValue(content);
        const model = editorRef.current.getModel();
        if (model) {
          monaco.editor.setModelLanguage(model, lang);
        }
        if (isMountedRef.current) {
          setCode(content);
        }
      } catch (e) {}
    }
  }, [activeTab]);

  useEffect(() => {
    isMountedRef.current = true;
    const loadTheme = () => {
      const savedTheme = localStorage.getItem("hippox-theme") as
        | "dark"
        | "light";
      setTheme(savedTheme === "light" ? "light" : "vs-dark");
    };
    loadTheme();
    const handleThemeChange = (e: CustomEvent) => {
      const newTheme = e.detail?.theme as "dark" | "light";
      if (newTheme) {
        setTheme(newTheme === "light" ? "light" : "vs-dark");
      }
    };
    window.addEventListener(
      "theme-changed",
      handleThemeChange as EventListener,
    );
    return () => {
      isMountedRef.current = false;
      window.removeEventListener(
        "theme-changed",
        handleThemeChange as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const savedTheme = localStorage.getItem("hippox-theme") as "dark" | "light";
    setTheme(savedTheme === "light" ? "light" : "vs-dark");
    const handleThemeChange = (e: CustomEvent) => {
      const newTheme = e.detail?.theme as "dark" | "light";
      if (newTheme) {
        setTheme(newTheme === "light" ? "light" : "vs-dark");
      }
    };
    window.addEventListener(
      "theme-changed",
      handleThemeChange as EventListener,
    );
    return () => {
      isMountedRef.current = false;
      window.removeEventListener(
        "theme-changed",
        handleThemeChange as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (editorRef.current) return;

    const content = activeTab ? mockFileContent[activeTab] || "" : "";
    const lang = activeTab ? getFileLanguage(activeTab) : "plaintext";

    editorRef.current = monaco.editor.create(containerRef.current, {
      value: content,
      language: lang,
      theme: theme,
      minimap: {
        enabled: true,
        showSlider: "mouseover",
      },
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

    const styleElement = document.createElement("style");
    styleElement.id = "minimap-divider-style";
    styleElement.textContent = `
      .monaco-editor .minimap {
        border-left: 1px solid rgba(128, 128, 128, 0.15) !important;
        box-shadow: -4px 0 8px rgba(0, 0, 0, 0.05) !important;
      }
      .monaco-editor .minimap .minimap-slider {
        opacity: 0.6 !important;
      }
      .monaco-editor .minimap .minimap-slider:hover {
        opacity: 1 !important;
      }
    `;
    document.head.appendChild(styleElement);

    editorRef.current.onDidChangeModelContent(() => {
      if (isMountedRef.current) {
        const value = editorRef.current?.getValue() || "";
        setCode(value);
      }
    });

    return () => {
      const styleEl = document.getElementById("minimap-divider-style");
      if (styleEl) {
        styleEl.remove();
      }
      if (editorRef.current) {
        try {
          const model = editorRef.current.getModel();
          if (model) {
            model.dispose();
          }
          editorRef.current.dispose();
          editorRef.current = null;
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      try {
        monaco.editor.setTheme(theme);
      } catch (e) {}
    }
  }, [theme]);

  const updateScrollbar = () => {
    const container = tabsContainerRef.current;
    if (!container) return;
    const maxScroll = container.scrollWidth - container.clientWidth;
    if (maxScroll <= 0) {
      setScrollPercentage(0);
      setThumbWidth(100);
    } else {
      setScrollPercentage(container.scrollLeft / maxScroll);
      const width = (container.clientWidth / container.scrollWidth) * 100;
      setThumbWidth(Math.max(10, width));
    }
  };

  useEffect(() => {
    const container = tabsContainerRef.current;
    if (!container) return;
    container.addEventListener("scroll", updateScrollbar);
    window.addEventListener("resize", updateScrollbar);
    const observer = new ResizeObserver(updateScrollbar);
    observer.observe(container);
    if (container && container.scrollWidth > 0 && container.clientWidth > 0) {
      setTimeout(updateScrollbar, 50);
    }
    return () => {
      container.removeEventListener("scroll", updateScrollbar);
      window.removeEventListener("resize", updateScrollbar);
      observer.disconnect();
    };
  }, [tabs]);

  useEffect(() => {
    const scrollbar = scrollbarRef.current;
    if (!scrollbar) return;

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    const onMouseDown = (e: MouseEvent) => {
      const container = tabsContainerRef.current;
      if (!container) return;

      const target = e.target as HTMLElement;
      if (!target.classList.contains("scrollbar-thumb")) return;

      isDragging = true;
      startX = e.clientX;
      startScrollLeft = container.scrollLeft;
      document.body.style.cursor = "pointer";
      document.body.style.userSelect = "none";
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const container = tabsContainerRef.current;
      if (!container) return;
      const delta = e.clientX - startX;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const ratio = delta / container.clientWidth;
      container.scrollLeft = Math.max(
        0,
        Math.min(maxScroll, startScrollLeft + ratio * container.clientWidth),
      );
    };

    const onMouseUp = () => {
      isDragging = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    scrollbar.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      scrollbar.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [tabs]);

  const getCurrentBreadcrumbs = (): { name: string; path: string }[] => {
    if (!activeTab) return [];
    const parts = activeTab.split("/").filter(Boolean);
    const result: { name: string; path: string }[] = [];
    let current = "";
    for (let i = 0; i < parts.length; i++) {
      current += "/" + parts[i];
      result.push({
        name: parts[i],
        path: current,
      });
    }
    return result;
  };

  const breadcrumbs = getCurrentBreadcrumbs();
  const showScrollbar = tabs.length > 0 && thumbWidth < 100;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-primary)",
        overflow: "hidden",
        minWidth: 0,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
          minHeight: "40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          ref={tabsContainerRef}
          className="tabs-container"
          style={{
            display: "flex",
            alignItems: "center",
            overflowX: "auto",
            overflowY: "hidden",
            minWidth: 0,
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            flex: 1,
            height: "40px",
          }}
          onWheel={(e) => {
            if (tabsContainerRef.current) {
              tabsContainerRef.current.scrollLeft += e.deltaY;
              e.preventDefault();
            }
          }}
        >
          <style>
            {`
              .tabs-container::-webkit-scrollbar {
                display: none;
              }
              .scrollbar-thumb {
                transition: background 0.15s;
              }
              .scrollbar-thumb:hover {
                background: var(--scrollbar-thumb-hover, var(--scrollbar-thumb)) !important;
              }
            `}
          </style>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.path;
            return (
              <div
                key={tab.path}
                onClick={() => {
                  setActiveTab(tab.path);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "0px 10px",
                  height: "40px",
                  cursor: "pointer",
                  background: isActive ? "var(--bg-primary)" : "transparent",
                  color: isActive
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                  borderBottom: isActive
                    ? "2px solid var(--accent-color)"
                    : "2px solid transparent",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  minWidth: "60px",
                  maxWidth: "160px",
                  position: "relative",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span style={{ fontSize: "12px", flexShrink: 0 }}>
                  {getFileIcon(tab.name)}
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "100px",
                  }}
                >
                  {tab.name}
                </span>
                <button
                  onClick={(e) => closeTab(tab.path, e)}
                  style={{
                    padding: "0 2px",
                    background: "transparent",
                    border: "none",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "11px",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-muted)";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {showScrollbar && (
          <div
            ref={scrollbarRef}
            style={{
              height: "4px",
              width: "100%",
              position: "absolute",
              bottom: 0,
              left: 0,
              background: "transparent",
              cursor: "pointer",
              zIndex: 10,
            }}
          >
            <div
              className="scrollbar-thumb"
              style={{
                height: "4px",
                width: `${thumbWidth}%`,
                minWidth: "10px",
                background: "var(--scrollbar-thumb)",
                position: "absolute",
                left: `${scrollPercentage * (100 - thumbWidth)}%`,
                top: 0,
                borderRadius: 0,
              }}
            />
          </div>
        )}
      </div>

      {activeTab && breadcrumbs.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "0px 12px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-tertiary)",
            flexShrink: 0,
            minHeight: "24px",
            fontSize: "11px",
            color: "var(--text-secondary)",
            overflow: "hidden",
            flexWrap: "nowrap",
          }}
        >
          <span style={{ fontSize: "11px", flexShrink: 0 }}>📂</span>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              <span
                style={{
                  color:
                    index === breadcrumbs.length - 1
                      ? "var(--text-primary)"
                      : "var(--text-secondary)",
                  fontWeight: index === breadcrumbs.length - 1 ? 500 : 400,
                  whiteSpace: "nowrap",
                  cursor:
                    index < breadcrumbs.length - 1 ? "pointer" : "default",
                }}
                onClick={() => {}}
                onMouseEnter={(e) => {
                  if (index < breadcrumbs.length - 1) {
                    e.currentTarget.style.color = "var(--accent-color)";
                    e.currentTarget.style.textDecoration = "underline";
                  }
                }}
                onMouseLeave={(e) => {
                  if (index < breadcrumbs.length - 1) {
                    e.currentTarget.style.color = "var(--text-secondary)";
                    e.currentTarget.style.textDecoration = "none";
                  }
                }}
              >
                {crumb.name}
              </span>
              {index < breadcrumbs.length - 1 && (
                <span style={{ color: "var(--text-muted)", fontSize: "16px" }}>
                  ›
                </span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          width: "100%",
          minWidth: 0,
          minHeight: "300px",
          position: "relative",
        }}
      />
    </div>
  );
};

export default CodeEdit;
