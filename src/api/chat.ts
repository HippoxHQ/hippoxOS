import { invoke } from '@tauri-apps/api/core';
import { ChatResponse, ExecutionLog } from '../type';

export const hippoxCommands = {
    async setLanguage(language: string): Promise<void> {
        return await invoke('set_hippox_language', { language });
    },

    async getLanguage(): Promise<string> {
        return await invoke('get_hippox_language');
    },

    async sendMessage(message: string, sessionId?: string): Promise<ChatResponse> {
        return await invoke('send_chat_message', {
            message,
            sessionId
        });
    },

    async getLogs(): Promise<ExecutionLog[]> {
        return await invoke('get_execution_logs');
    },

    async clearLogs(): Promise<void> {
        return await invoke('clear_execution_logs');
    },

    async resetSession(sessionId?: string): Promise<void> {
        return await invoke('reset_conversation', { sessionId });
    },

    async isInitialized(): Promise<boolean> {
        return await invoke('is_hippox_initialized');
    },

    async getAtomicSkills(): Promise<string[]> {
        return await invoke('get_atomic_skills_list');
    }
};