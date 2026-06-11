import { invoke } from '@tauri-apps/api/core';

export interface ScheduledTaskData {
    id: string;
    name: string;
    schedule_type: "fixed" | "interval";
    schedule_config: any;
    enabled: boolean;
    action_type: "naturalLanguage" | "skillFile";
    action_content: string;
    action_file_name?: string;
    created_at: string;
    updated_at: string;
    last_executed_at?: string;
    completed?: boolean;
}

export const scheduledCommands = {
    async listTasks(): Promise<string> {
        return await invoke('scheduled_list');
    },

    async saveTask(taskJson: string): Promise<void> {
        return await invoke('scheduled_save', { taskJson });
    },

    async deleteTask(taskId: string): Promise<void> {
        return await invoke('scheduled_delete', { taskId });
    },
};