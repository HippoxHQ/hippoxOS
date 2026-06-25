import React, { useState, useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import { showToast, ToastType } from "../../../components/Toast";

interface CodeEditProps {
  t: (key: string) => string;
  selectedFile: string | null;
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

const CodeEdit: React.FC<CodeEditProps> = ({ t, selectedFile }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [code, setCode] = useState<string>("");
  const [theme, setTheme] = useState<"vs-dark" | "light">("vs-dark");
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const savedTheme = localStorage.getItem("hippox-theme") as "dark" | "light";
    setTheme(savedTheme === "light" ? "light" : "vs-dark");

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    if (editorRef.current) return;

    const content = selectedFile ? mockFileContent[selectedFile] || "" : "";
    const lang = selectedFile ? getFileLanguage(selectedFile) : "plaintext";

    editorRef.current = monaco.editor.create(containerRef.current, {
      value: content,
      language: lang,
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
      if (isMountedRef.current) {
        const value = editorRef.current?.getValue() || "";
        setCode(value);
      }
    });

    return () => {
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

  useEffect(() => {
    if (editorRef.current && selectedFile) {
      const content = mockFileContent[selectedFile] || "";
      const lang = getFileLanguage(selectedFile);
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
  }, [selectedFile]);

  const handleFormat = () => {
    if (editorRef.current) {
      try {
        editorRef.current.getAction("editor.action.formatDocument")?.run();
      } catch (e) {}
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(ToastType.SUCCESS, t("common.copied") || "Copied");
    } catch {
      showToast(ToastType.ERROR, t("common.copyFailed") || "Copy Failed");
    }
  };

  const handleSave = () => {
    showToast(ToastType.SUCCESS, t("common.saved") || "Saved");
  };

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
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          flexShrink: 0,
          minHeight: "28px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleFormat}
          style={{
            padding: "2px 8px",
            background: "transparent",
            border: "none",
            borderRadius: "4px",
            color: "var(--text-secondary)",
            fontSize: "11px",
            cursor: "pointer",
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
          🔧 {t("editor.format") || "Format"}
        </button>
        <button
          onClick={handleCopy}
          style={{
            padding: "2px 8px",
            background: "transparent",
            border: "none",
            borderRadius: "4px",
            color: "var(--text-secondary)",
            fontSize: "11px",
            cursor: "pointer",
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
          📋 {t("common.copy") || "Copy"}
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: "2px 10px",
            background: "var(--accent-color)",
            border: "none",
            borderRadius: "4px",
            color: "white",
            fontSize: "11px",
            cursor: "pointer",
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
        {selectedFile && (
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              marginLeft: "auto",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "200px",
            }}
            title={selectedFile}
          >
            {selectedFile}
          </span>
        )}
      </div>

      <div ref={containerRef} style={{ flex: 1, width: "100%", minWidth: 0 }} />
    </div>
  );
};

export default CodeEdit;
