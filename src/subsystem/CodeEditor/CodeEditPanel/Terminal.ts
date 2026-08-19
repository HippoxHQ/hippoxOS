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
  isAlive: boolean;
  created_at: string;
  xterm: XTerm;
  fitAddon: FitAddon;
  container: HTMLDivElement;
}
export class Terminal {
  private container: HTMLElement | null = null;
  private terminals: Map<string, TerminalInstance> = new Map();
  private activeTerminalId: string | null = null;
  private isConnecting = false;
  private outputUnlisten: UnlistenFn | null = null;
  private exitUnlisten: UnlistenFn | null = null;
  private workspacePath: string | null;
  private t: (key: string) => string;
  private inputBuffer = "";
  private terminalListRef: HTMLElement | null = null;
  private terminalCounter = 0;
  private xtermWrapper: HTMLElement | null = null;
  private _themeChangeHandler: ((e: CustomEvent) => void) | null = null;
  private _isMounted = false;
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
    if (!this._isMounted) {
      this._isMounted = true;
      requestAnimationFrame(() => {
        this.setupGlobalListeners();
        this.initTerminal();
      });
    }
    this.bindEvents();
    this._themeChangeHandler = (e: CustomEvent) => {
      this.updateTheme();
    };
    window.addEventListener("theme-changed", this._themeChangeHandler as EventListener);
  }
  unmount() {
    this._isMounted = false;
    this.cleanup();
    for (const [id, term] of Array.from(this.terminals)) {
      term.xterm.dispose();
      term.container.remove();
    }
    this.terminals.clear();
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
    for (const [id, term] of Array.from(this.terminals)) {
      terminalCommands.kill(id, true).catch(() => { });
    }
  }
  private updateTheme() {
    const getCSSVar = (name: string) => {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;
    };
    const bgPrimary = getCSSVar("--bg-primary") || "#1e1e1e";
    const textPrimary = getCSSVar("--text-primary") || "#d4d4d4";
    const accentColor = getCSSVar("--accent-color") || "#0078d4";
    const accentGlow = getCSSVar("--accent-glow") || "rgba(0, 120, 212, 0.3)";
    for (const [id, term] of Array.from(this.terminals)) {
      try {
        term.xterm.options.theme = {
          background: bgPrimary,
          foreground: textPrimary,
          cursor: accentColor,
          selectionBackground: accentGlow,
        };
      } catch (e) { }
    }
    if (this.terminalListRef) {
      this.terminalListRef.style.background = bgPrimary;
    }
    this.renderSidebar();
  }
  private async setupGlobalListeners() {
    if (this.outputUnlisten) return;
    this.outputUnlisten = await listen<any>("terminal-output", (event) => {
      const payload = event.payload;
      if (payload && payload.session_id && payload.data) {
        const term = this.terminals.get(payload.session_id);
        if (term) {
          term.xterm.write(payload.data);
        }
      }
    });
    this.exitUnlisten = await listen<any>("terminal-exit", (event) => {
      const payload = event.payload;
      if (payload && payload.session_id) {
        const term = this.terminals.get(payload.session_id);
        if (term) {
          term.isAlive = false;
          term.xterm.writeln(
            `\x1b[90m[Process exited with code ${payload.code ?? "unknown"}]\x1b[0m`,
          );
        }
      }
    });
  }
  private handleXTermData(data: string, sessionId: string) {
    if (this.activeTerminalId !== sessionId) return;
    const term = this.terminals.get(sessionId);
    if (!term) return;
    if (data === "\r") {
      const cmd = this.inputBuffer.trim();
      if (cmd) {
        term.xterm.write("\r\n");
        this.handleCommand(cmd, sessionId);
      }
      this.inputBuffer = "";
      return;
    }
    if (data === "\u007f") {
      if (this.inputBuffer.length > 0) {
        this.inputBuffer = this.inputBuffer.slice(0, -1);
        term.xterm.write("\b \b");
      }
      return;
    }
    if (data === "\u0003") {
      this.inputBuffer = "";
      term.xterm.write("^C\r\n");
      if (term.isAlive) {
        terminalCommands.kill(sessionId, false).catch(() => { });
      }
      return;
    }
    this.inputBuffer += data;
    term.xterm.write(data);
  }
  private async handleCommand(cmd: string, sessionId: string) {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const term = this.terminals.get(sessionId);
    if (!term) return;
    if (!term.isAlive) {
      term.xterm.writeln("\x1b[31mTerminal is already closed\x1b[0m");
      return;
    }
    try {
      await terminalCommands.input({
        session_id: sessionId,
        data: trimmed + "\n",
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      term.xterm.writeln(`\x1b[31mError: ${errorMsg}\x1b[0m`);
    }
  }
  private async createXTermInstance(sessionId: string): Promise<TerminalInstance> {
    const getCSSVar = (name: string) => {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined;
    };
    const bgPrimary = getCSSVar("--bg-primary") || "#1e1e1e";
    const textPrimary = getCSSVar("--text-primary") || "#d4d4d4";
    const accentColor = getCSSVar("--accent-color") || "#0078d4";
    const accentGlow = getCSSVar("--accent-glow") || "rgba(0, 120, 212, 0.3)";
    const container = document.createElement("div");
    container.style.position = "absolute";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.overflow = "hidden";
    container.style.opacity = "0";
    container.style.transition = "opacity 0.15s ease";
    container.style.pointerEvents = "none";
    container.style.background = bgPrimary;
    container.style.minWidth = "100px";
    container.style.minHeight = "100px";
    if (this.xtermWrapper) {
      this.xtermWrapper.appendChild(container);
    }
    await new Promise(resolve => requestAnimationFrame(resolve));
    await new Promise(resolve => setTimeout(resolve, 50));
    const xterm = new XTerm({
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
    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(container);
    const styleId = "xterm-hide-scrollbar-" + sessionId;
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      .xterm-viewport {
        overflow-y: scroll !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      .xterm-viewport::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        background: transparent !important;
      }
    `;
    xterm.onData((data) => {
      this.handleXTermData(data, sessionId);
    });
    try {
      fitAddon.fit();
    } catch (e) {
    }
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon?.fit();
      } catch (e) {
      }
    });
    resizeObserver.observe(container);
    return {
      id: sessionId,
      name: `Terminal ${this.terminalCounter}`,
      pid: 0,
      isAlive: true,
      created_at: new Date().toISOString(),
      xterm,
      fitAddon,
      container,
    };
  }
  private async createTerminal() {
    this.isConnecting = true;
    try {
      const session = await terminalCommands.create({
        cols: 80,
        rows: 24,
        cwd: this.workspacePath || undefined,
      });
      this.terminalCounter += 1;
      const termInstance = await this.createXTermInstance(session.id);
      termInstance.pid = session.pid;
      termInstance.created_at = session.created_at;
      this.terminals.set(session.id, termInstance);
      this.switchTerminal(session.id);
      this.isConnecting = false;
      this.updateUI();
      this.renderSidebar();
    } catch (error) {
      this.isConnecting = false;
      const active = this.terminals.get(this.activeTerminalId!);
      if (active) {
        active.xterm.writeln(`\x1b[31mFailed to create terminal: ${error}\x1b[0m`);
      }
    }
  }
  private async initTerminal() {
    if (this.terminals.size > 0) return;
    await this.createTerminal();
  }
  async createNewTerminal() {
    await this.createTerminal();
  }
  updateWorkspacePath(path: string | null) {
    if (this.workspacePath === path) return;
    this.workspacePath = path;
    if (this.terminals.size > 0) {
      for (const [id, term] of Array.from(this.terminals)) {
        terminalCommands.kill(id, true).catch(() => { });
        term.xterm.dispose();
        term.container.remove();
      }
      this.terminals.clear();
      this.terminalCounter = 0;
      this.activeTerminalId = null;
      if (this.xtermWrapper) {
        this.xtermWrapper.innerHTML = "";
      }
      this.initTerminal();
    }
  }
  private switchTerminal(terminalId: string) {
    if (terminalId === this.activeTerminalId) return;
    for (const [id, term] of Array.from(this.terminals)) {
      term.container.style.opacity = "0";
      term.container.style.pointerEvents = "none";
    }
    const target = this.terminals.get(terminalId);
    if (target) {
      target.container.style.opacity = "1";
      target.container.style.pointerEvents = "auto";
      target.xterm.focus();
      try {
        target.fitAddon.fit();
      } catch (e) { }
    }
    this.activeTerminalId = terminalId;
    this.updateUI();
    this.renderSidebar();
  }
  private render() {
    if (!this.container) return;
    this.container.innerHTML = `
<div style="display:flex;flex-direction:column;height:100%;width:100%;min-height:0;overflow:hidden;background:var(--bg-secondary);">
  <div style="display:flex;align-items:center;gap:8px;padding:2px 12px;border-bottom:1px solid var(--border-color);background:var(--bg-tertiary);flex-shrink:0;min-height:26px;">
    <span style="font-size:11px;color:var(--text-secondary);display:flex;align-items:center;gap:6px;">
      <span>💻</span>
      <span id="terminal-name">Terminal</span>
      <span id="terminal-status" style="font-size:9px;color:var(--text-muted);">Connecting...</span>
    </span>
    <span style="font-size:9px;color:var(--text-muted);margin-left:auto;" id="terminal-pid">PID: N/A</span>
    <button id="terminal-add-btn" style="display:flex;align-items:center;justify-content:center;width:20px;height:20px;background:transparent;border:none;cursor:pointer;color:var(--text-secondary);border-radius:3px;font-size:14px;padding:0;flex-shrink:0;">+</button>
  </div>
  <div style="flex:1;display:flex;overflow:hidden;min-height:0;">
    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;min-height:0;position:relative;">
      <div id="xterm-wrapper" style="flex:1;overflow:hidden;min-width:0;min-height:0;position:relative;background:var(--bg-primary);"></div>
    </div>
    <div id="terminal-sidebar" style="width:160px;min-width:80px;max-width:280px;background:var(--bg-primary);display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;border-left:1px solid var(--border-color);">
      <div style="flex:1;overflow-y:auto;padding:2px 0px;background:var(--bg-primary);">
        <div style="padding:10px 6px;font-size:10px;color:var(--text-muted);text-align:center;">No terminals</div>
      </div>
    </div>
  </div>
</div>
`;
    this.xtermWrapper = document.getElementById("xterm-wrapper");
    this.terminalListRef = document.getElementById("terminal-sidebar");
    const addBtn = document.getElementById("terminal-add-btn");
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        this.createNewTerminal();
      });
    }
  }
  private bindEvents() {
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }
  private handleKeyDown(e: KeyboardEvent) {
    if (!this.activeTerminalId) return;
    if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
      return;
    }
  }
  private updateUI() {
    const nameEl = document.getElementById("terminal-name");
    const statusEl = document.getElementById("terminal-status");
    const pidEl = document.getElementById("terminal-pid");
    const active = this.terminals.get(this.activeTerminalId!);
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
  private renderSidebar() {
    if (!this.terminalListRef) return;
    const container = this.terminalListRef.querySelector("div");
    if (!container) return;
    if (this.terminals.size === 0) {
      container.innerHTML =
        '<div style="padding:10px 6px;font-size:10px;color:var(--text-muted);text-align:center;">No terminals</div>';
      return;
    }
    let html = "";
    for (const [id, term] of Array.from(this.terminals)) {
      const isActive = id === this.activeTerminalId;
      const isDead = !term.isAlive;
      const isOnly = this.terminals.size <= 1;
      html += `
      <div class="terminal-item" data-id="${id}" style="
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
        ${!isOnly ? `<button class="terminal-close-btn" data-id="${id}" style="display:flex;align-items:center;justify-content:center;width:16px;height:16px;background:transparent;border:none;cursor:pointer;color:var(--text-muted);border-radius:3px;font-size:10px;padding:0;flex-shrink:0;">✕</button>` : ""}
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
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          this.closeTerminal(id);
        });
      }
    });
  }
  private async closeTerminal(terminalId: string) {
    if (this.terminals.size <= 1) {
      return;
    }
    const term = this.terminals.get(terminalId);
    if (!term) return;
    if (term.isAlive) {
      try {
        await terminalCommands.kill(terminalId, true);
      } catch (error) {
      }
    }
    term.xterm.dispose();
    term.container.remove();
    this.terminals.delete(terminalId);
    if (this.activeTerminalId === terminalId) {
      const firstId = this.terminals.keys().next().value;
      if (firstId) {
        this.switchTerminal(firstId);
      } else {
        this.activeTerminalId = null;
      }
    }
    this.renderSidebar();
    this.updateUI();
  }
}