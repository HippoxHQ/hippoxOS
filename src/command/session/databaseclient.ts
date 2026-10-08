import { invoke } from '@tauri-apps/api/core';
import { TaskInfo } from '../../core/types';
import { ChatMessage } from '../../types/types';
export const databaseClientSessionCommands = {
    async createDataBaseClientSession(
        sessionId: string,
        title: string,
        description: string,
        initialChat: ChatMessage[],
        initialTerminal: any[],
        workflowMode?: string,
    ): Promise<string> {
        return await invoke('cmd_create_databaseclient_dialog_session', {
            sessionId,
            title,
            description,
            initialChatContent: JSON.stringify(initialChat, null, 2),
            initialTerminalContent: JSON.stringify(initialTerminal, null, 2),
            workflowMode,
        });
    },
    async listDataBaseClientSessions(): Promise<any[]> {
        return await invoke('cmd_list_databaseclient_dialog_sessions');
    },
    async loadDataBaseClientSessionConfig(sessionId: string): Promise<any | null> {
        return await invoke('cmd_load_databaseclient_session_config', { sessionId });
    },
    async updateDataBaseClientSessionConfig(sessionId: string, updates: Record<string, any>): Promise<void> {
        return await invoke('cmd_update_databaseclient_session_config', {
            sessionId,
            updates: JSON.stringify(updates),
        });
    },
    async deleteDataBaseClientSession(sessionId: string): Promise<void> {
        return await invoke('cmd_delete_databaseclient_dialog_session', { sessionId });
    },
    async saveChatContent(sessionId: string, messages: ChatMessage[]): Promise<void> {
        return await invoke('cmd_save_databaseclient_chat_content', {
            sessionId,
            content: JSON.stringify(messages, null, 2),
        });
    },
    async saveTerminalContent(sessionId: string, entries: any[]): Promise<void> {
        return await invoke('cmd_save_databaseclient_terminal_content', {
            sessionId,
            content: JSON.stringify(entries, null, 2),
        });
    },
    async loadChatContent(sessionId: string): Promise<ChatMessage[] | null> {
        const content = await invoke<string | null>('cmd_load_databaseclient_chat_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
    async loadTerminalContent(sessionId: string): Promise<any[] | null> {
        const content = await invoke<string | null>('cmd_load_databaseclient_terminal_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
    async updatePinnedDataBaseClientSessions(sessionId: string, pinned: boolean): Promise<string[]> {
        return await invoke('cmd_update_pinned_databaseclient_sessions', { sessionId, pinned });
    },
    async getPinnedDataBaseClientSessions(): Promise<string[]> {
        return await invoke('cmd_get_pinned_databaseclient_sessions');
    },
    async saveTaskContent(sessionId: string, tasks: TaskInfo[]): Promise<void> {
        return await invoke('cmd_save_databaseclient_task_content', {
            sessionId,
            content: JSON.stringify(tasks, null, 2),
        });
    },
    async loadTaskContent(sessionId: string): Promise<TaskInfo[] | null> {
        const content = await invoke<string | null>('cmd_load_databaseclient_task_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
};