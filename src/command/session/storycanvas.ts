import { invoke } from '@tauri-apps/api/core';
import { TaskInfo } from '../../core/types';
import { ChatMessage } from '../../types/types';

/**
 * Session commands for the Story Canvas subsystem.
 */
export const storyCanvasSessionCommands = {
    /**
     * Create a new Story Canvas dialog session.
     */
    async createStoryCanvasSession(
        sessionId: string,
        title: string,
        description: string,
        initialChat: ChatMessage[],
        initialTerminal: any[],
        workflowMode?: string,
    ): Promise<string> {
        return await invoke('cmd_create_storycanvas_dialog_session', {
            sessionId,
            title,
            description,
            initialChatContent: JSON.stringify(initialChat, null, 2),
            initialTerminalContent: JSON.stringify(initialTerminal, null, 2),
            workflowMode,
        });
    },
    /**
     * List all Story Canvas dialog sessions.
     */
    async listStoryCanvasSessions(): Promise<any[]> {
        return await invoke('cmd_list_storycanvas_dialog_sessions');
    },
    /**
     * Load the config of a Story Canvas session.
     */
    async loadStoryCanvasSessionConfig(sessionId: string): Promise<any | null> {
        return await invoke('cmd_load_storycanvas_session_config', { sessionId });
    },
    /**
     * Update the config of a Story Canvas session.
     */
    async updateStoryCanvasSessionConfig(sessionId: string, updates: Record<string, any>): Promise<void> {
        return await invoke('cmd_update_storycanvas_session_config', {
            sessionId,
            updates: JSON.stringify(updates),
        });
    },
    /**
     * Delete a Story Canvas session.
     */
    async deleteStoryCanvasSession(sessionId: string): Promise<void> {
        return await invoke('cmd_delete_storycanvas_dialog_session', { sessionId });
    },
    /**
     * Save chat content for a Story Canvas session.
     */
    async saveChatContent(sessionId: string, messages: ChatMessage[]): Promise<void> {
        return await invoke('cmd_save_storycanvas_chat_content', {
            sessionId,
            content: JSON.stringify(messages, null, 2),
        });
    },
    /**
     * Save terminal content for a Story Canvas session.
     */
    async saveTerminalContent(sessionId: string, entries: any[]): Promise<void> {
        return await invoke('cmd_save_storycanvas_terminal_content', {
            sessionId,
            content: JSON.stringify(entries, null, 2),
        });
    },
    /**
     * Load chat content for a Story Canvas session.
     */
    async loadChatContent(sessionId: string): Promise<ChatMessage[] | null> {
        const content = await invoke<string | null>('cmd_load_storycanvas_chat_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
    /**
     * Load terminal content for a Story Canvas session.
     */
    async loadTerminalContent(sessionId: string): Promise<any[] | null> {
        const content = await invoke<string | null>('cmd_load_storycanvas_terminal_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
    /**
     * Update pinned state for Story Canvas sessions.
     */
    async updatePinnedStoryCanvasSessions(sessionId: string, pinned: boolean): Promise<string[]> {
        return await invoke('cmd_update_pinned_storycanvas_sessions', { sessionId, pinned });
    },
    /**
     * Get pinned Story Canvas sessions.
     */
    async getPinnedStoryCanvasSessions(): Promise<string[]> {
        return await invoke('cmd_get_pinned_storycanvas_sessions');
    },
    /**
     * Save task content for a Story Canvas session.
     */
    async saveTaskContent(sessionId: string, tasks: TaskInfo[]): Promise<void> {
        return await invoke('cmd_save_storycanvas_task_content', {
            sessionId,
            content: JSON.stringify(tasks, null, 2),
        });
    },
    /**
     * Load task content for a Story Canvas session.
     */
    async loadTaskContent(sessionId: string): Promise<TaskInfo[] | null> {
        const content = await invoke<string | null>('cmd_load_storycanvas_task_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
};