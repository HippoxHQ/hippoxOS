import { invoke } from '@tauri-apps/api/core';
import { TaskInfo } from '../../core/types';
import { ChatMessage } from '../../types/types';

/**
 * Session commands for the Office subsystem.
 */
export const officeSessionCommands = {
    /**
     * Create a new Office dialog session.
     */
    async createOfficeSession(
        sessionId: string,
        title: string,
        description: string,
        initialChat: ChatMessage[],
        initialTerminal: any[],
        workflowMode?: string,
    ): Promise<string> {
        return await invoke('cmd_create_office_dialog_session', {
            sessionId,
            title,
            description,
            initialChatContent: JSON.stringify(initialChat, null, 2),
            initialTerminalContent: JSON.stringify(initialTerminal, null, 2),
            workflowMode,
        });
    },
    /**
     * List all Office dialog sessions.
     */
    async listOfficeSessions(): Promise<any[]> {
        return await invoke('cmd_list_office_dialog_sessions');
    },
    /**
     * Load the config of an Office session.
     */
    async loadOfficeSessionConfig(sessionId: string): Promise<any | null> {
        return await invoke('cmd_load_office_session_config', { sessionId });
    },
    /**
     * Update the config of an Office session.
     */
    async updateOfficeSessionConfig(sessionId: string, updates: Record<string, any>): Promise<void> {
        return await invoke('cmd_update_office_session_config', {
            sessionId,
            updates: JSON.stringify(updates),
        });
    },
    /**
     * Delete an Office session.
     */
    async deleteOfficeSession(sessionId: string): Promise<void> {
        return await invoke('cmd_delete_office_dialog_session', { sessionId });
    },
    /**
     * Save chat content for an Office session.
     */
    async saveChatContent(sessionId: string, messages: ChatMessage[]): Promise<void> {
        return await invoke('cmd_save_office_chat_content', {
            sessionId,
            content: JSON.stringify(messages, null, 2),
        });
    },
    /**
     * Save terminal content for an Office session.
     */
    async saveTerminalContent(sessionId: string, entries: any[]): Promise<void> {
        return await invoke('cmd_save_office_terminal_content', {
            sessionId,
            content: JSON.stringify(entries, null, 2),
        });
    },
    /**
     * Load chat content for an Office session.
     */
    async loadChatContent(sessionId: string): Promise<ChatMessage[] | null> {
        const content = await invoke<string | null>('cmd_load_office_chat_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
    /**
     * Load terminal content for an Office session.
     */
    async loadTerminalContent(sessionId: string): Promise<any[] | null> {
        const content = await invoke<string | null>('cmd_load_office_terminal_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
    /**
     * Update pinned state for Office sessions.
     */
    async updatePinnedOfficeSessions(sessionId: string, pinned: boolean): Promise<string[]> {
        return await invoke('cmd_update_pinned_office_sessions', { sessionId, pinned });
    },
    /**
     * Get pinned Office sessions.
     */
    async getPinnedOfficeSessions(): Promise<string[]> {
        return await invoke('cmd_get_pinned_office_sessions');
    },
    /**
     * Save task content for an Office session.
     */
    async saveTaskContent(sessionId: string, tasks: TaskInfo[]): Promise<void> {
        return await invoke('cmd_save_office_task_content', {
            sessionId,
            content: JSON.stringify(tasks, null, 2),
        });
    },
    /**
     * Load task content for an Office session.
     */
    async loadTaskContent(sessionId: string): Promise<TaskInfo[] | null> {
        const content = await invoke<string | null>('cmd_load_office_task_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
};