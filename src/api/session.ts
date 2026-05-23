import { invoke } from '@tauri-apps/api/core';
import { ChatMessage, DialogSession } from '../type';

export const sessionCommands = {
    async createSession(
        sessionId: string,
        title: string,
        description: string,
        initialChat: ChatMessage[],
        initialTerminal: any[]
    ): Promise<string> {
        return await invoke('create_dialog_session', {
            sessionId,
            title,
            description,
            initialChatContent: JSON.stringify(initialChat, null, 2),
            initialTerminalContent: JSON.stringify(initialTerminal, null, 2),
        });
    },

    async listSessions(): Promise<DialogSession[]> {
        return await invoke('list_dialog_sessions');
    },

    async updateSessionConfig(sessionId: string, updates: Partial<DialogSession>): Promise<void> {
        return await invoke('update_session_config', {
            sessionId,
            updates: JSON.stringify(updates),
        });
    },

    async deleteSession(sessionId: string): Promise<void> {
        return await invoke('delete_dialog_session', { sessionId });
    },

    async saveChatContent(sessionId: string, messages: ChatMessage[]): Promise<void> {
        return await invoke('save_chat_content', {
            sessionId,
            content: JSON.stringify(messages, null, 2),
        });
    },

    async saveTerminalContent(sessionId: string, entries: any[]): Promise<void> {
        return await invoke('save_terminal_content', {
            sessionId,
            content: JSON.stringify(entries, null, 2),
        });
    },

    async loadChatContent(sessionId: string): Promise<ChatMessage[] | null> {
        const content = await invoke<string | null>('load_chat_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },

    async loadTerminalContent(sessionId: string): Promise<any[] | null> {
        const content = await invoke<string | null>('load_terminal_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
};