import { invoke } from '@tauri-apps/api/core';
import { TaskInfo } from '../../core/types';
import { ChatMessage } from '../../types/types';
export const pixelEditorSessionCommands = {
    async createPixelEditorSession(
        sessionId: string,
        title: string,
        description: string,
        initialChat: ChatMessage[],
        initialTerminal: any[],
        workflowMode?: string,
    ): Promise<string> {
        return await invoke('cmd_create_pixeleditor_dialog_session', {
            sessionId,
            title,
            description,
            initialChatContent: JSON.stringify(initialChat, null, 2),
            initialTerminalContent: JSON.stringify(initialTerminal, null, 2),
            workflowMode,
        });
    },
    async listPixelEditorSessions(): Promise<any[]> {
        return await invoke('cmd_list_pixeleditor_dialog_sessions');
    },
    async loadPixelEditorSessionConfig(sessionId: string): Promise<any | null> {
        return await invoke('cmd_load_pixeleditor_session_config', { sessionId });
    },
    async updatePixelEditorSessionConfig(sessionId: string, updates: Record<string, any>): Promise<void> {
        return await invoke('cmd_update_pixeleditor_session_config', {
            sessionId,
            updates: JSON.stringify(updates),
        });
    },
    async deletePixelEditorSession(sessionId: string): Promise<void> {
        return await invoke('cmd_delete_pixeleditor_dialog_session', { sessionId });
    },
    async saveChatContent(sessionId: string, messages: ChatMessage[]): Promise<void> {
        return await invoke('cmd_save_pixeleditor_chat_content', {
            sessionId,
            content: JSON.stringify(messages, null, 2),
        });
    },
    async saveTerminalContent(sessionId: string, entries: any[]): Promise<void> {
        return await invoke('cmd_save_pixeleditor_terminal_content', {
            sessionId,
            content: JSON.stringify(entries, null, 2),
        });
    },
    async loadChatContent(sessionId: string): Promise<ChatMessage[] | null> {
        const content = await invoke<string | null>('cmd_load_pixeleditor_chat_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
    async loadTerminalContent(sessionId: string): Promise<any[] | null> {
        const content = await invoke<string | null>('cmd_load_pixeleditor_terminal_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
    async updatePinnedPixelEditorSessions(sessionId: string, pinned: boolean): Promise<string[]> {
        return await invoke('cmd_update_pinned_pixeleditor_sessions', { sessionId, pinned });
    },
    async getPinnedPixelEditorSessions(): Promise<string[]> {
        return await invoke('cmd_get_pinned_pixeleditor_sessions');
    },
    async saveTaskContent(sessionId: string, tasks: TaskInfo[]): Promise<void> {
        return await invoke('cmd_save_pixeleditor_task_content', {
            sessionId,
            content: JSON.stringify(tasks, null, 2),
        });
    },
    async loadTaskContent(sessionId: string): Promise<TaskInfo[] | null> {
        const content = await invoke<string | null>('cmd_load_pixeleditor_task_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
};