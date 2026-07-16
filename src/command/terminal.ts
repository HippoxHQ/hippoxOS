import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
export interface TerminalSession {
    id: string;
    pid: number;
    cwd: string;
    cols: number;
    rows: number;
    created_at: string;
    is_alive: boolean;
}
export interface TerminalCreateRequest {
    cols: number;
    rows: number;
    cwd?: string;
    shell?: string;
}
export interface TerminalInputRequest {
    session_id: string;
    data: string;
}
export interface TerminalResizeRequest {
    session_id: string;
    cols: number;
    rows: number;
}
export interface TerminalOutputEvent {
    session_id: string;
    data: string;
}
export interface TerminalExitEvent {
    session_id: string;
    code: number | null;
}
export const terminalCommands = {
    create: async (request: TerminalCreateRequest): Promise<TerminalSession> => {
        return await invoke('cmd_terminal_create', { request });
    },
    input: async (request: TerminalInputRequest): Promise<boolean> => {
        return await invoke('cmd_terminal_input', { request });
    },
    resize: async (request: TerminalResizeRequest): Promise<boolean> => {
        return await invoke('cmd_terminal_resize', { request });
    },
    kill: async (session_id: string, force?: boolean): Promise<boolean> => {
        return await invoke('cmd_terminal_kill', { sessionId: session_id, force });
    },
    list: async (): Promise<TerminalSession[]> => {
        return await invoke('cmd_terminal_list');
    },
    isAlive: async (session_id: string): Promise<boolean> => {
        return await invoke('cmd_terminal_is_alive', { sessionId: session_id });
    },
};
export class TerminalEventManager {
    private unlistenOutput: UnlistenFn | null = null;
    private unlistenExit: UnlistenFn | null = null;
    async onOutput(callback: (event: TerminalOutputEvent) => void): Promise<void> {
        if (this.unlistenOutput) {
            await this.unlistenOutput();
        }
        this.unlistenOutput = await listen<TerminalOutputEvent>('terminal-output', (event) => {
            callback(event.payload);
        });
    }
    async onExit(callback: (event: TerminalExitEvent) => void): Promise<void> {
        if (this.unlistenExit) {
            await this.unlistenExit();
        }
        this.unlistenExit = await listen<TerminalExitEvent>('terminal-exit', (event) => {
            callback(event.payload);
        });
    }
    async onSessionOutput(sessionId: string, callback: (data: string) => void): Promise<void> {
        await this.onOutput((event) => {
            if (event.session_id === sessionId) {
                callback(event.data);
            }
        });
    }
    async onSessionExit(sessionId: string, callback: (code: number | null) => void): Promise<void> {
        await this.onExit((event) => {
            if (event.session_id === sessionId) {
                callback(event.code);
            }
        });
    }
    async cleanup(): Promise<void> {
        if (this.unlistenOutput) {
            await this.unlistenOutput();
            this.unlistenOutput = null;
        }
        if (this.unlistenExit) {
            await this.unlistenExit();
            this.unlistenExit = null;
        }
    }
}
export const terminalEventManager = new TerminalEventManager();