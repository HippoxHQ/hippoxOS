import { invoke } from '@tauri-apps/api/core';
import { ChatResponse, ExecutionLog, TaskInfo } from '../types/type';

export const hippoxCommands = {
    async setLanguage(language: string): Promise<void> {
        return await invoke('cmd_set_hippox_language', { language });
    },

    async getLanguage(): Promise<string> {
        return await invoke('cmd_get_hippox_language');
    },

    async sendMessageAsync(message: string, sessionId?: string): Promise<string> {
        return await invoke('cmd_send_chat_message_async', { message, sessionId });
    },

    async getTaskStatus(taskId: string): Promise<TaskInfo> {
        return await invoke('cmd_get_task_status', { taskId });
    },

    async getSessionTasks(sessionId?: string): Promise<TaskInfo[]> {
        return await invoke('cmd_get_session_tasks', { sessionId });
    },

    async sendMessage(message: string, sessionId?: string): Promise<ChatResponse> {
        return await invoke('cmd_send_chat_message', { message, sessionId });
    },

    async getLogs(): Promise<ExecutionLog[]> {
        return await invoke('cmd_get_execution_logs');
    },

    async clearLogs(): Promise<void> {
        return await invoke('cmd_clear_execution_logs');
    },

    async resetSession(sessionId?: string): Promise<void> {
        return await invoke('cmd_reset_conversation', { sessionId });
    },

    async isInitialized(): Promise<boolean> {
        return await invoke('cmd_is_hippox_initialized');
    },

    async getAtomicSkills(): Promise<string[]> {
        return await invoke('cmd_get_atomic_skills_list');
    }
};