import { invoke } from '@tauri-apps/api/core';
import { TaskInfo } from '../../core/types';
import { ChatMessage } from '../../types/types';

export const sandbox3dSessionCommands = {
    async createSandBox3DSession(
        sessionId: string,
        title: string,
        description: string,
        initialChat: ChatMessage[],
        initialTerminal: any[],
        workflowMode?: string,
        scenePath?: string,
        sceneName?: string,
    ): Promise<string> {
        return await invoke('cmd_create_sandbox3d_dialog_session', {
            sessionId,
            title,
            description,
            initialChatContent: JSON.stringify(initialChat, null, 2),
            initialTerminalContent: JSON.stringify(initialTerminal, null, 2),
            workflowMode,
            scenePath,
            sceneName,
        });
    },

    async listSandBox3DSessions(): Promise<any[]> {
        return await invoke('cmd_list_sandbox3d_dialog_sessions');
    },

    async loadSandBox3DSessionConfig(sessionId: string): Promise<any | null> {
        return await invoke('cmd_load_sandbox3d_session_config', { sessionId });
    },

    async updateSandBox3DSessionConfig(sessionId: string, updates: Record<string, any>): Promise<void> {
        return await invoke('cmd_update_sandbox3d_session_config', {
            sessionId,
            updates: JSON.stringify(updates),
        });
    },

    async deleteSandBox3DSession(sessionId: string): Promise<void> {
        return await invoke('cmd_delete_sandbox3d_dialog_session', { sessionId });
    },

    async saveChatContent(sessionId: string, messages: ChatMessage[]): Promise<void> {
        return await invoke('cmd_save_sandbox3d_chat_content', {
            sessionId,
            content: JSON.stringify(messages, null, 2),
        });
    },

    async saveTerminalContent(sessionId: string, entries: any[]): Promise<void> {
        return await invoke('cmd_save_sandbox3d_terminal_content', {
            sessionId,
            content: JSON.stringify(entries, null, 2),
        });
    },

    async loadChatContent(sessionId: string): Promise<ChatMessage[] | null> {
        const content = await invoke<string | null>('cmd_load_sandbox3d_chat_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },

    async loadTerminalContent(sessionId: string): Promise<any[] | null> {
        const content = await invoke<string | null>('cmd_load_sandbox3d_terminal_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },

    async updatePinnedSandBox3DSessions(sessionId: string, pinned: boolean): Promise<string[]> {
        return await invoke('cmd_update_pinned_sandbox3d_sessions', { sessionId, pinned });
    },

    async getPinnedSandBox3DSessions(): Promise<string[]> {
        return await invoke('cmd_get_pinned_sandbox3d_sessions');
    },

    async saveTaskContent(sessionId: string, tasks: TaskInfo[]): Promise<void> {
        return await invoke('cmd_save_sandbox3d_task_content', {
            sessionId,
            content: JSON.stringify(tasks, null, 2),
        });
    },

    async loadTaskContent(sessionId: string): Promise<TaskInfo[] | null> {
        const content = await invoke<string | null>('cmd_load_sandbox3d_task_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
};