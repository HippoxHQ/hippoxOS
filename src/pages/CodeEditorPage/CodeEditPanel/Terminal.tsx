import React, { useState, useEffect, useRef } from "react";

interface TerminalProps {
  t: (key: string) => string;
}

interface TerminalInstance {
  id: string;
  name: string;
  logs: string[];
  history: string[];
  historyIndex: number;
}

const Terminal: React.FC<TerminalProps> = ({ t }) => {
  const [terminals, setTerminals] = useState<TerminalInstance[]>([
    {
      id: "terminal-1",
      name: "Terminal 1",
      logs: ["> Welcome to Hippox Terminal", "> Ready"],
      history: [],
      historyIndex: -1,
    },
  ]);
  const [activeTerminalId, setActiveTerminalId] =
    useState<string>("terminal-1");
  const [input, setInput] = useState("");
  const [terminalListWidth, setTerminalListWidth] = useState(160);
  const [isDragging, setIsDragging] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalListRef = useRef<HTMLDivElement>(null);

  const activeTerminal = terminals.find((t) => t.id === activeTerminalId);

  const scrollToBottom = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeTerminal?.logs]);

  const updateTerminal = (id: string, updates: Partial<TerminalInstance>) => {
    setTerminals((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    );
  };

  const handleCommand = (cmd: string) => {
    if (!activeTerminal) return;
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const newHistory = [...activeTerminal.history, trimmed];
    updateTerminal(activeTerminal.id, {
      history: newHistory,
      historyIndex: -1,
    });

    let newLogs = [...activeTerminal.logs];

    if (trimmed === "clear" || trimmed === "cls") {
      newLogs = [];
    } else if (trimmed === "help") {
      newLogs = [
        ...newLogs,
        `> ${trimmed}`,
        "Available commands:",
        "  help  - Show this help",
        "  clear - Clear terminal",
        "  echo  - Echo text",
        "  ls    - List files (simulated)",
        "  pwd   - Print working directory (simulated)",
        "",
      ];
    } else if (trimmed.startsWith("echo ")) {
      const msg = trimmed.replace("echo ", "");
      newLogs = [...newLogs, `> ${trimmed}`, msg, ""];
    } else if (trimmed === "ls") {
      newLogs = [
        ...newLogs,
        `> ${trimmed}`,
        "src/",
        "public/",
        "package.json",
        "tsconfig.json",
        "README.md",
        "",
      ];
    } else if (trimmed === "pwd") {
      newLogs = [...newLogs, `> ${trimmed}`, "/workspace", ""];
    } else {
      newLogs = [
        ...newLogs,
        `> ${trimmed}`,
        `Command not found: ${trimmed}`,
        "",
      ];
    }

    updateTerminal(activeTerminal.id, { logs: newLogs });
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeTerminal) return;
    if (e.key === "Enter") {
      handleCommand(input);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIndex =
        activeTerminal.historyIndex < activeTerminal.history.length - 1
          ? activeTerminal.historyIndex + 1
          : activeTerminal.historyIndex;
      updateTerminal(activeTerminal.id, { historyIndex: newIndex });
      setInput(
        activeTerminal.history[activeTerminal.history.length - 1 - newIndex] ||
          "",
      );
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (activeTerminal.historyIndex > 0) {
        const newIndex = activeTerminal.historyIndex - 1;
        updateTerminal(activeTerminal.id, { historyIndex: newIndex });
        setInput(
          activeTerminal.history[
            activeTerminal.history.length - 1 - newIndex
          ] || "",
        );
      } else if (activeTerminal.historyIndex === 0) {
        updateTerminal(activeTerminal.id, { historyIndex: -1 });
        setInput("");
      }
      return;
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  const addNewTerminal = () => {
    const newId = `terminal-${terminals.length + 1}`;
    const newTerminal: TerminalInstance = {
      id: newId,
      name: `Terminal ${terminals.length + 1}`,
      logs: ["> Welcome to Hippox Terminal", "> Ready"],
      history: [],
      historyIndex: -1,
    };
    setTerminals((prev) => [...prev, newTerminal]);
    setActiveTerminalId(newId);
  };

  const closeTerminal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (terminals.length <= 1) return;
    setTerminals((prev) => prev.filter((t) => t.id !== id));
    if (activeTerminalId === id) {
      const remaining = terminals.filter((t) => t.id !== id);
      if (remaining.length > 0) {
        setActiveTerminalId(remaining[0].id);
      }
    }
  };

  const switchTerminal = (id: string) => {
    setActiveTerminalId(id);
    setInput("");
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = terminalListWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = dragStartX.current - e.clientX;
      const newWidth = Math.min(
        280,
        Math.max(80, dragStartWidth.current + delta),
      );
      setTerminalListWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

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
          💻 {activeTerminal?.name || "Terminal"}
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
        <button
          onClick={addNewTerminal}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "20px",
            height: "20px",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--text-secondary)",
            borderRadius: "3px",
            fontSize: "14px",
            padding: 0,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
            e.currentTarget.style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          title="新建终端"
        >
          +
        </button>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <div
            ref={containerRef}
            style={{
              flex: 1,
              overflow: "auto",
              padding: "4px 12px",
              fontFamily:
                "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
              fontSize: "12px",
              lineHeight: "1.5",
              color: "var(--text-primary)",
              minWidth: 0,
            }}
          >
            {activeTerminal?.logs.map((log, idx) => (
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

        <div
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setIsHover(true)}
          onMouseLeave={() => setIsHover(false)}
          style={{
            width: isDragging ? "4px" : isHover ? "4px" : "1px",
            background: isDragging
              ? "var(--scrollbar-thumb)"
              : isHover
                ? "var(--scrollbar-thumb)"
                : "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
            transition: "width 0.15s, background 0.15s",
          }}
        >
          {isDragging && (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "2px",
                height: "40px",
                background: "var(--text-muted)",
                borderRadius: "2px",
                opacity: 0.5,
                zIndex: 11,
              }}
            />
          )}
        </div>

        <div
          ref={terminalListRef}
          style={{
            width: terminalListWidth,
            minWidth: "80px",
            maxWidth: "280px",
            background: "var(--bg-secondary)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "2px 0px",
            }}
          >
            {terminals.map((term) => {
              const isActive = term.id === activeTerminalId;
              const isOnly = terminals.length <= 1;

              return (
                <div
                  key={term.id}
                  onClick={() => switchTerminal(term.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "4px 6px",
                    borderRadius: "0px",
                    cursor: "pointer",
                    background: isActive ? "var(--accent-glow)" : "transparent",
                    border: isActive
                      ? "1px solid transparent"
                      : "1px solid transparent",
                    borderTop: isActive
                      ? "1px solid var(--accent-color)"
                      : "1px solid transparent",
                    borderBottom: isActive
                      ? "1px solid var(--accent-color)"
                      : "1px solid transparent",
                    marginBottom: "0px",
                    transition: "all 0.1s ease",
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: isActive
                          ? "var(--accent-color)"
                          : "var(--text-secondary)",
                        fontWeight: isActive ? 500 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {term.name}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          fontSize: "8px",
                          color: "var(--accent-color)",
                          flexShrink: 0,
                        }}
                      >
                        ●
                      </span>
                    )}
                  </div>
                  {!isOnly && (
                    <button
                      onClick={(e) => closeTerminal(term.id, e)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "16px",
                        height: "16px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        borderRadius: "3px",
                        fontSize: "10px",
                        padding: 0,
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--hover-bg)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-muted)";
                      }}
                      title="关闭终端"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terminal;
