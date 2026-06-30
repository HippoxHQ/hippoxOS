import { invoke } from '@tauri-apps/api/core';
import { TaskInfo } from '../../core/types';
import { ChatMessage } from '../../types/types';

export const videoSessionCommands = {
    async createVideoSession(
        sessionId: string,
        title: string,
        description: string,
        initialChat: ChatMessage[],
        initialTerminal: any[],
        workflowMode?: string,
        videoUrl?: string,
        videoTitle?: string,
    ): Promise<string> {
        return await invoke('cmd_create_video_dialog_session', {
            sessionId,
            title,
            description,
            initialChatContent: JSON.stringify(initialChat, null, 2),
            initialTerminalContent: JSON.stringify(initialTerminal, null, 2),
            workflowMode,
            videoUrl,
            videoTitle,
        });
    },

    async listVideoSessions(): Promise<any[]> {
        return await invoke('cmd_list_video_dialog_sessions');
    },

    async loadVideoSessionConfig(sessionId: string): Promise<any | null> {
        return await invoke('cmd_load_video_session_config', { sessionId });
    },

    async updateVideoSessionConfig(sessionId: string, updates: Record<string, any>): Promise<void> {
        return await invoke('cmd_update_video_session_config', {
            sessionId,
            updates: JSON.stringify(updates),
        });
    },

    async deleteVideoSession(sessionId: string): Promise<void> {
        return await invoke('cmd_delete_video_dialog_session', { sessionId });
    },

    async saveChatContent(sessionId: string, messages: ChatMessage[]): Promise<void> {
        return await invoke('cmd_save_video_chat_content', {
            sessionId,
            content: JSON.stringify(messages, null, 2),
        });
    },

    async saveTerminalContent(sessionId: string, entries: any[]): Promise<void> {
        return await invoke('cmd_save_video_terminal_content', {
            sessionId,
            content: JSON.stringify(entries, null, 2),
        });
    },

    async loadChatContent(sessionId: string): Promise<ChatMessage[] | null> {
        const content = await invoke<string | null>('cmd_load_video_chat_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },

    async loadTerminalContent(sessionId: string): Promise<any[] | null> {
        const content = await invoke<string | null>('cmd_load_video_terminal_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },

    async updatePinnedVideoSessions(sessionId: string, pinned: boolean): Promise<string[]> {
        return await invoke('cmd_update_pinned_video_sessions', { sessionId, pinned });
    },

    async getPinnedVideoSessions(): Promise<string[]> {
        return await invoke('cmd_get_pinned_video_sessions');
    },

    async saveTaskContent(sessionId: string, tasks: TaskInfo[]): Promise<void> {
        return await invoke('cmd_save_video_task_content', {
            sessionId,
            content: JSON.stringify(tasks, null, 2),
        });
    },

    async loadTaskContent(sessionId: string): Promise<TaskInfo[] | null> {
        const content = await invoke<string | null>('cmd_load_video_task_content', { sessionId });
        if (content) {
            return JSON.parse(content);
        }
        return null;
    },
};