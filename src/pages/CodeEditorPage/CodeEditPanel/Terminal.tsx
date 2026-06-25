import React, { useState, useEffect, useRef } from "react";

interface TerminalProps {
  t: (key: string) => string;
}

const Terminal: React.FC<TerminalProps> = ({ t }) => {
  const [logs, setLogs] = useState<string[]>([
    "> Welcome to Hippox Terminal",
    "> Ready",
  ]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    if (trimmed === "clear" || trimmed === "cls") {
      setLogs([]);
      return;
    }

    if (trimmed === "help") {
      setLogs((prev) => [
        ...prev,
        `> ${trimmed}`,
        "Available commands:",
        "  help  - Show this help",
        "  clear - Clear terminal",
        "  echo  - Echo text",
        "  ls    - List files (simulated)",
        "  pwd   - Print working directory (simulated)",
        "",
      ]);
      return;
    }

    if (trimmed.startsWith("echo ")) {
      const msg = trimmed.replace("echo ", "");
      setLogs((prev) => [...prev, `> ${trimmed}`, msg, ""]);
      return;
    }

    if (trimmed === "ls") {
      setLogs((prev) => [
        ...prev,
        `> ${trimmed}`,
        "src/",
        "public/",
        "package.json",
        "tsconfig.json",
        "README.md",
        "",
      ]);
      return;
    }

    if (trimmed === "pwd") {
      setLogs((prev) => [...prev, `> ${trimmed}`, "/workspace", ""]);
      return;
    }

    setLogs((prev) => [
      ...prev,
      `> ${trimmed}`,
      `Command not found: ${trimmed}`,
      "",
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(input);
      setInput("");
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex =
          historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || "");
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || "");
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput("");
      }
      return;
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-secondary)",
        borderTop: "1px solid var(--border-color)",
        overflow: "hidden",
        userSelect: "none",
        minWidth: 0,
      }}
      onClick={handleContainerClick}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "2px 12px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--bg-tertiary)",
          flexShrink: 0,
          minHeight: "26px",
        }}
      >
        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
          💻 {t("terminal.title") || "Terminal"}
        </span>
        <span
          style={{
            fontSize: "9px",
            color: "var(--text-muted)",
            marginLeft: "auto",
          }}
        >
          {t("terminal.ready") || "Ready"}
        </span>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "auto",
          padding: "4px 12px",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
          fontSize: "12px",
          lineHeight: "1.5",
          color: "var(--text-primary)",
          minWidth: 0,
        }}
      >
        {logs.map((log, idx) => (
          <div
            key={idx}
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              opacity: log === "" ? 0 : 1,
              minHeight: log === "" ? "4px" : "auto",
            }}
          >
            {log}
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ color: "var(--accent-color)" }}>$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontFamily: "inherit",
              fontSize: "12px",
              padding: "2px 0",
              minWidth: 0,
            }}
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
};

export default Terminal;
