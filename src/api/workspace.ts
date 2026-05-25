import { invoke } from "@tauri-apps/api/core";

export interface WorkspaceInstance {
    id: string;
    name: string;
    workspace_path: string;
    max_log_size: number;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

export interface WorkspaceConfigData {
    instances: WorkspaceInstance[];
    default_instance_id: string;
}

export const workspaceCommands = {
    async getWorkspaceConfig(): Promise<WorkspaceConfigData> {
        return await invoke('cmd_get_workspace_config');
    },

    async getAllWorkspaces(): Promise<WorkspaceInstance[]> {
        return await invoke('cmd_get_all_workspaces');
    },

    async getDefaultWorkspace(): Promise<WorkspaceInstance | null> {
        return await invoke('cmd_get_default_workspace');
    },

    async addWorkspace(instance: WorkspaceInstance): Promise<void> {
        return await invoke('cmd_add_workspace', { instance });
    },

    async updateWorkspace(instance: WorkspaceInstance): Promise<void> {
        return await invoke('cmd_update_workspace', { instance });
    },

    async deleteWorkspace(instanceId: string): Promise<void> {
        return await invoke('cmd_delete_workspace', { instanceId });
    },

    async setDefaultWorkspace(instanceId: string): Promise<void> {
        return await invoke('cmd_set_default_workspace', { instanceId });
    },
};