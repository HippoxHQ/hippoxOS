import { invoke } from '@tauri-apps/api/core';
import { ChatMessage, DialogSession } from '../../types/types';
import { TaskInfo } from '../../core/types';

export const sessionCommands = {
    async createSession(
        sessionId: string,
        title: string,
        description: string,
        initialChat: ChatMessage[],
        initialTerminal: any[],
        workflowMode?: string,
    ): Promise<string> {
        return await invoke('cmd_create_dialog_session', {
            sessionId,
            title,
            description,
            initialChatContent: JSON.stringify(initialChat, null, 2),
            initialTerminalContent: JSON.stringify(initialTerminal, null, 2),
            workflowMode,
        });
    },

    async listSessions(): Promise<DialogSession[]> {
        return await invoke('cmd_list_dialog_sessions');
    },

    async loadSessionConfig(sessionId: string): Promise<any | null> {
        return await invoke('cmd_load_session_config', { sessionId });
    },

    async updateSessionConfig(sessionId: string, updates: Record<string, any>): Promise<void> {
        return await invoke('cmd_update_session_config', {
            sessionId,
            updates: JSON.stringify(updates),
        });
    },

    async deleteSession(sessionId: string): Promise<void> {
        return await invoke('cmd_delete_dialog_session', { sessionId });
    },

    async saveChatContent(sessionId: string, messages: ChatMessage[]): Promise<void> {
        return await invoke('cmd_save_chat_content', {
            sessionId,
            content: JSON.stringify(messages, null, 2),
        });
    },

    async saveTerminalContent(sessionId: string, entries: any[]): Promise<void> {
        return await invoke('cmd_save_terminal_content', {
            sessionId,
            content: JSON.stringify(entries, null, 2),
        });
    },

    async loadChatContent(sessionId: string): Promise<ChatMessage[] | null> {
        const content = await invoke<string | null>('cmd_load_chat_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },

    async loadTerminalContent(sessionId: string): Promise<any[] | null> {
        const content = await invoke<string | null>('cmd_load_terminal_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },

    async updatePinnedSessions(sessionId: string, pinned: boolean): Promise<string[]> {
        return await invoke('cmd_update_pinned_sessions', { sessionId, pinned });
    },

    async getPinnedSessions(): Promise<string[]> {
        return await invoke('cmd_get_pinned_sessions');
    },

    async saveTaskContent(sessionId: string, tasks: TaskInfo[]): Promise<void> {
        return await invoke('cmd_save_task_content', {
            sessionId,
            content: JSON.stringify(tasks, null, 2),
        });
    },

    async loadTaskContent(sessionId: string): Promise<TaskInfo[] | null> {
        const content = await invoke<string | null>('cmd_load_task_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
};