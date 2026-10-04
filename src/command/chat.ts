import { invoke } from '@tauri-apps/api/core';
import { TaskInfo } from '../core/types';
import { ChatResponse, ExecutionLog } from '../types/types';
/**
 * Chat subsystem identifier.
 */
export enum SubSystemEnum {
    General = "general",
    Finance = "finance",
    Map = "map",
    CodeEditor = "code_editor",
    Video = "video",
    SandBox3D = "sandbox3d",
    BlockChain = "block_chain",
}
/**
 * Human-readable display names for each subsystem.
 */
export const SubSystemDisplayName: Record<SubSystemEnum, string> = {
    [SubSystemEnum.General]: "General",
    [SubSystemEnum.Finance]: "Finance",
    [SubSystemEnum.Map]: "Map",
    [SubSystemEnum.CodeEditor]: "Code Editor",
    [SubSystemEnum.Video]: "Video",
    [SubSystemEnum.SandBox3D]: "SandBox3D",
    [SubSystemEnum.BlockChain]: "BlockChain",
};
export const hippoxCommands = {
    async setLanguage(language: string): Promise<void> {
        return await invoke('cmd_set_hippox_language', { language });
    },
    async getLanguage(): Promise<string> {
        return await invoke('cmd_get_hippox_language');
    },
    /**
     * Send a chat message asynchronously.
     *
     * @param rawMessage    Original user text (used for memory storage).
     * @param message       Full prompt (system prompt + user text) sent to the LLM.
     * @param subsystem     Which chat subsystem this call belongs to.
     *                      When omitted, the backend falls back to `General`.
     * @param sessionId     Frontend session id.
     * @param workflowMode  Workflow mode, e.g. "ReAct".
     */
    async sendMessageAsync(
        rawMessage: string,
        message: string,
        subsystem: SubSystemEnum,
        sessionId?: string,
        workflowMode?: string,
    ): Promise<string> {
        return await invoke('cmd_send_chat_message_async', {
            rawMessage,
            message,
            sessionId,
            workflowMode,
            subsystem,
        });
    },
    async getTaskStatus(taskId: string): Promise<TaskInfo> {
        return await invoke('cmd_get_task_status', { taskId });
    },
    async getSessionTasks(sessionId?: string): Promise<TaskInfo[]> {
        return await invoke('cmd_get_session_tasks', { sessionId });
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