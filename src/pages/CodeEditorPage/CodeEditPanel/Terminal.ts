import { terminalCommands } from "../../../command/terminal";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "@xterm/addon-fit";
// @ts-ignore
import "xterm/css/xterm.css";

export interface TerminalInstance {
  id: string;
  name: string;
  pid: number;
  logs: string[];
  isAlive: boolean;
  created_at: string;
}

export class Terminal {
  private container: HTMLElement | null = null;
  private xterm: XTerm | null = null;
  private fitAddon: FitAddon | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private xtermContainer: HTMLElement | null = null;
  private _themeChangeHandler: ((e: CustomEvent) => void) | null = null;
  private terminals: TerminalInstance[] = [];
  private activeTerminalId: string | null = null;
  private isConnecting = false;
  private outputUnlisten: UnlistenFn | null = null;
  private exitUnlisten: UnlistenFn | null = null;
  private isCreated = false;
  private workspacePath: string | null;
  private t: (key: string) => string;
  private inputBuffer = "";
  private lastOutput: Record<string, string> = {};
  private terminalListWidth = 160;
  private isDragging = false;
  private isHover = false;
  private dragStartX = 0;
  private dragStartWidth = 0;
  private logsContainerRef: HTMLElement | null = null;
  private terminalListRef: HTMLElement | null = null;

  constructor(t: (key: string) => string, workspacePath?: string | null) {
    this.t = t;
    this.workspacePath = workspacePath || null;
  }

  mount(container: HTMLElement) {
    this.container = container;
    this.container.style.width = "100%";
    this.container.style.height = "100%";
    this.container.style.display = "block";
    this.container.style.position = "relative";
    this.container.style.minHeight = "80px";
    this.container.style.overflow = "hidden";
    this.render();
    requestAnimationFrame(() => {
      this.initXTerm();
      this.createTerminal();
    });
    this.bindEvents();
    this._themeChangeHandler = (e: CustomEvent) => {
      this.updateTheme();
    };
    window.addEventListener("theme-changed", this._themeChangeHandler as EventListener);
  }

  unmount() {
    this.cleanup();
    if (this.xterm) {
      this.xterm.dispose();
      this.xterm = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.container = null;
    if (this._themeChangeHandler) {
      window.removeEventListener("theme-changed", this._themeChangeHandler as EventListener);
      this._themeChangeHandler = null;
    }
  }

  private cleanup() {
    if (this.outputUnlisten) {
      this.outputUnlisten();
      this.outputUnlisten = null;
    }
    if (this.exitUnlisten) {
      this.exitUnlisten();
      this.exitUnlisten = null;
    }
    this.terminals.forEach((term) => {
      terminalCommands.kill(term.id, true).catch(() => { });
    });
    this.isCreated = false;
  }

  private updateTheme() {
    const getCSSVar = (name: string) => {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;
    };
    const bgPrimary = getCSSVar("--bg-primary") || "#1e1e1e";
    const textPrimary = getCSSVar("--text-primary") || "#d4d4d4";
    const accentColor = getCSSVar("--accent-color") || "#0078d4";
    const accentGlow = getCSSVar("--accent-glow") || "rgba(0, 120, 212, 0.3)";
    if (this.xterm) {
      try {
        this.xterm.options.theme = {
          background: bgPrimary,
          foreground: textPrimary,
          cursor: accentColor,
          selectionBackground: accentGlow,
        };
      } catch (e) { }
    }
    if (this.terminalListRef) {
      this.terminalListRef.style.background = bgPrimary;
      const container = this.terminalListRef.querySelector("div");
      if (container) {
        container.style.background = bgPrimary;
      }
    }
    if (this.xtermContainer) {
      this.xtermContainer.style.background = bgPrimary;
    }
    this.renderSidebar();
  }

  private hideScrollbar() {
    if (!this.xtermContainer) return;
    const styleId = "xterm-hide-scrollbar";
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
    .xterm .xterm-viewport {
      overflow-y: scroll !important;
      scrollbar-width: none !important; /* Firefox */
      -ms-overflow-style: none !important; /* IE/Edge */
    }
    .xterm .xterm-viewport::-webkit-scrollbar {
      display: none !important; /* Chrome/Safari/Opera */
      width: 0 !important;
      height: 0 !important;
      background: transparent !important;
    }
    .xterm .xterm-viewport::-webkit-scrollbar-track {
      display: none !important;
      background: transparent !important;
    }
    .xterm .xterm-viewport::-webkit-scrollbar-thumb {
      display: none !important;
      background: transparent !important;
    }
  `;
  }

  private initXTerm() {
    if (!this.xtermContainer) return;
    this.xtermContainer.innerHTML = "";
    this.xtermContainer.style.width = "100%";
    this.xtermContainer.style.height = "100%";
    this.xtermContainer.style.overflow = "hidden";

    const getCSSVar = (name: string) => {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;
    };

    const bgPrimary = getCSSVar("--bg-primary") || "#1e1e1e";
    const textPrimary = getCSSVar("--text-primary") || "#d4d4d4";
    const accentColor = getCSSVar("--accent-color") || "#0078d4";
    const accentGlow = getCSSVar("--accent-glow") || "rgba(0, 120, 212, 0.3)";

    try {
      this.xterm = new XTerm({
        theme: {
          background: bgPrimary,
          foreground: textPrimary,
          cursor: accentColor,
          selectionBackground: accentGlow,
        },
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
        cursorBlink: true,
        scrollback: 10000,
        allowProposedApi: true,
        cols: 80,
        rows: 24,
      });

      this.fitAddon = new FitAddon();
      this.xterm.loadAddon(this.fitAddon);
      this.xterm.open(this.xtermContainer);

      this.hideScrollbar();

      const doFit = () => {
        try {
          if (this.fitAddon && this.xtermContainer) {
            const rect = this.xtermContainer.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              this.fitAddon.fit();
            }
          }
        } catch (e) {
        }
      };
      setTimeout(doFit, 0);
      setTimeout(doFit, 100);
      setTimeout(doFit, 300);
      if (this.terminalListRef) {
        this.terminalListRef.style.background = bgPrimary;
        const container = this.terminalListRef.querySelector("div");
        if (container) {
          container.style.background = bgPrimary;
        }
      }
      this.xtermContainer.style.background = bgPrimary;
      this.resizeObserver = new ResizeObserver(() => {
        try {
          this.fitAddon?.fit();
        } catch (e) { }
      });
      this.resizeObserver.observe(this.xtermContainer);
      this.xterm.onData((data) => {
        this.handleXTermData(data);
      });
    } catch (e) {
    }
  }

  private handleXTermData(data: string) {
    if (!this.activeTerminalId) return;
    if (data === "\r") {
      const cmd = this.inputBuffer.trim();
      if (cmd) {
        this.xterm?.write("\r\n");
        this.handleCommand(cmd);
      }
      this.inputBuffer = "";
      return;
    }
    if (data === "\u007f") {
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        this.xterm?.write("\b \b");
      }
      return;
    }
    if (data === "\u0003") {
      this.inputBuffer = "";
      this.xterm?.write("^C\r\n");
      const terminal = this.terminals.find(
        (t) => t.id === this.activeTerminalId,
      );
      if (terminal && terminal.isAlive) {
        terminalCommands.kill(terminal.id, false).catch(() => { });
      }
      return;
    }
    this.inputBuffer += data;
    this.xterm?.write(data);
  }

  private async handleCommand(cmd: string) {
    if (!this.activeTerminalId) return;
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const terminal = this.terminals.find((t) => t.id === this.activeTerminalId);
    if (!terminal) return;
    if (!terminal.isAlive) {
      this.xterm?.writeln("\x1b[31mTerminal is already closed\x1b[0m");
      return;
    }
    try {
      await terminalCommands.input({
        session_id: this.activeTerminalId,
        data: trimmed + "\n",
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.xterm?.writeln(`\x1b[31mError: ${errorMsg}\x1b[0m`);
    }
  }

  private async createTerminal() {
    if (this.isCreated) return;
    this.isCreated = true;
    this.isConnecting = true;
    try {
      const session = await terminalCommands.create({
        cols: 80,
        rows: 24,
        cwd: this.workspacePath || undefined,
      });
      if (this.outputUnlisten) {
        this.outputUnlisten();
        this.outputUnlisten = null;
      }
      if (this.exitUnlisten) {
        this.exitUnlisten();
        this.exitUnlisten = null;
      }
      this.outputUnlisten = await listen<any>("terminal-output", (event) => {
        const payload = event.payload;
        if (payload && payload.session_id === session.id && payload.data) {
          const key = session.id;
          if (this.lastOutput[key] !== payload.data) {
            this.lastOutput[key] = payload.data;
            this.xterm?.write(payload.data);
          }
        }
      });
      this.exitUnlisten = await listen<any>("terminal-exit", (event) => {
        const payload = event.payload;
        if (payload && payload.session_id === session.id) {
          this.xterm?.writeln(
            `\x1b[90m[Process exited with code ${payload.code ?? "unknown"}]\x1b[0m`,
          );
          const term = this.terminals.find((t) => t.id === session.id);
          if (term) {
            term.isAlive = false;
          }
        }
      });
      const newTerminal: TerminalInstance = {
        id: session.id,
        name: `Terminal 1`,
        pid: session.pid,
        logs: [],
        isAlive: true,
        created_at: session.created_at,
      };
      this.terminals = [newTerminal];
      this.activeTerminalId = session.id;
      this.isConnecting = false;
      this.xterm?.focus();
      this.updateUI();
      this.renderSidebar();
      this.updateInput();
    } catch (error) {
      this.isConnecting = false;
      this.xterm?.writeln(`\x1b[31mFailed to create terminal: ${error}\x1b[0m`);
    }
  }

  updateWorkspacePath(path: string | null) {
    this.workspacePath = path;
    this.cleanup();
    this.isCreated = false;
    this.terminals = [];
    this.activeTerminalId = null;
    this.lastOutput = {};
    this.xterm?.clear();
    this.createTerminal();
  }

  private render() {
    if (!this.container) return;
    this.container.innerHTML = `
<div style="display:flex;flex-direction:column;height:100%;width:100%;min-height:0;overflow:hidden;background:var(--bg-secondary);border-top:1px solid var(--border-color);">
  <!-- Header -->
  <div style="display:flex;align-items:center;gap:8px;padding:2px 12px;border-bottom:1px solid var(--border-color);background:var(--bg-tertiary);flex-shrink:0;min-height:26px;">
    <span style="font-size:11px;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
      <span>💻</span>
      <span id="terminal-name">Terminal</span>
      <span id="terminal-status" style="font-size:9px;color:var(--text-muted);">Connecting...</span>
    </span>
    <span style="font-size:9px;color:var(--text-muted);margin-left:auto;" id="terminal-pid">PID: N/A</span>
    <button id="terminal-add-btn" style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:transparent;border:none;cursor:pointer;color:var(--text-secondary);border-radius:3px;font-size:14px;padding:0;flex-shrink:0;">+</button>
  </div>
  <!-- Body -->
  <div style="flex:1;display:flex;overflow:hidden;min-height:0;">
    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;min-height:0;">
      <!-- xterm 容器 -->
      <div id="xterm-container" style="flex:1;overflow:hidden;min-width:0;min-height:0;background:var(--bg-primary);"></div>
    </div>
    <!-- Sidebar -->
    <div id="terminal-sidebar" style="width:160px;min-width:80px;max-width:280px;background:var(--bg-primary);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;border-left:1px solid var(--border-color);">
      <div style="flex:1;overflow-y:auto;padding:2px 0px;background:var(--bg-primary);">
        <div style="padding:10px 6px;font-size:10px;color:var(--text-muted);text-align:center;">No terminals</div>
      </div>
    </div>
  </div>
</div>
`;

    this.xtermContainer = document.getElementById("xterm-container");
    this.terminalListRef = document.getElementById("terminal-sidebar");

    const addBtn = document.getElementById("terminal-add-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        this.showToast("info", "Multi-terminal support coming soon");
      });
    }
  }

  private bindEvents() {
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.activeTerminalId) return;
    if (!this.xterm) return;
    if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
      return;
    }
  }

  private showToast(type: "success" | "error" | "warning" | "info", message: string) {
  }

  private updateUI() {
    const nameEl = document.getElementById("terminal-name");
    const statusEl = document.getElementById("terminal-status");
    const pidEl = document.getElementById("terminal-pid");
    const active = this.terminals.find((t) => t.id === this.activeTerminalId);
    if (nameEl) {
      nameEl.textContent = active?.name || "Terminal";
    }
    if (statusEl) {
      if (this.isConnecting) {
        statusEl.textContent = "Connecting...";
        statusEl.style.color = "var(--text-muted)";
      } else if (active?.isAlive) {
        statusEl.textContent = "Ready";
        statusEl.style.color = "var(--success-color)";
      } else {
        statusEl.textContent = "Exited";
        statusEl.style.color = "var(--error-color)";
      }
    }
    if (pidEl) {
      if (active?.pid) {
        pidEl.textContent = `PID: ${active.pid}`;
      } else {
        pidEl.textContent = "PID: N/A";
      }
    }
  }

  private updateInput() {
  }

  private renderSidebar() {
    if (!this.terminalListRef) return;
    const container = this.terminalListRef.querySelector("div");
    if (!container) return;
    const sidebar = this.terminalListRef;
    sidebar.style.background = "var(--bg-secondary)";
    if (this.terminals.length === 0) {
      container.innerHTML =
        '<div style="padding:10px 6px;font-size:10px;color:var(--text-muted);text-align:center;">No terminals</div>';
      return;
    }
    let html = "";
    for (const term of this.terminals) {
      const isActive = term.id === this.activeTerminalId;
      const isDead = !term.isAlive;
      const isOnly = this.terminals.length <= 1;
      html += `
      <div class="terminal-item" data-id="${term.id}" style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 6px;
        border-radius: 0px;
        cursor: pointer;
        background: ${isActive ? "var(--accent-glow)" : "transparent"};
        border: 1px solid transparent;
        border-top: ${isActive ? "1px solid var(--accent-color)" : "1px solid transparent"};
        border-bottom: ${isActive ? "1px solid var(--accent-color)" : "1px solid transparent"};
        margin-bottom: 0px;
        transition: all 0.1s ease;
        opacity: ${isDead ? 0.5 : 1};
      ">
        <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">
          <span style="
            font-size:11px;
            color: ${isActive ? "var(--accent-color)" : isDead ? "var(--text-muted)" : "var(--text-secondary)"};
            font-weight: ${isActive ? 500 : 400};
            overflow:hidden;
            text-overflow:ellipsis;
            white-space:nowrap;
          ">${term.name}</span>
          ${isActive && term.isAlive ? '<span style="font-size:8px;color:var(--accent-color);flex-shrink:0;">●</span>' : ""}
          ${isDead ? '<span style="font-size:8px;color:var(--error-color);flex-shrink:0;">✕</span>' : ""}
        </div>
        ${!isOnly ? `<button class="terminal-close-btn" data-id="${term.id}" style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;background:transparent;border:none;cursor:pointer;color:var(--text-muted);border-radius:3px;font-size:10px;padding:0;flex-shrink:0;">✕</button>` : ""}
      </div>
    `;
    }
    container.innerHTML = html;
    container.querySelectorAll(".terminal-item").forEach((el) => {
      const id = el.getAttribute("data-id");
      if (id) {
        el.addEventListener("click", () => this.switchTerminal(id));
      }
    });
    container.querySelectorAll(".terminal-close-btn").forEach((el) => {
      const id = el.getAttribute("data-id");
      if (id) {
        el.addEventListener("click", (e) => this.closeTerminal(id, e as MouseEvent));
      }
    });
  }

  private switchTerminal(terminalId: string) {
    if (terminalId === this.activeTerminalId) return;
    this.activeTerminalId = terminalId;
    this.updateUI();
    this.renderSidebar();
  }

  private async closeTerminal(terminalId: string, e?: MouseEvent) {
    e?.stopPropagation();
    if (this.terminals.length <= 1) {
      this.showToast("warning", "Cannot close the last terminal");
      return;
    }
    const terminal = this.terminals.find((t) => t.id === terminalId);
    if (terminal && terminal.isAlive) {
      try {
        await terminalCommands.kill(terminalId, true);
      } catch (error) {
      }
    }
    this.terminals = this.terminals.filter((t) => t.id !== terminalId);
    if (this.activeTerminalId === terminalId) {
      if (this.terminals.length > 0) {
        this.activeTerminalId = this.terminals[0].id;
      } else {
        this.activeTerminalId = null;
      }
    }
    this.renderSidebar();
    this.updateUI();
  }
}