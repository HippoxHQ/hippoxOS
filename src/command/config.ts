import { invoke } from '@tauri-apps/api/core';
import { LlmInstance } from './llm';

export interface HippoxAppConfig {
    language: string;
    theme: string;
    llm_instances: Record<string, LlmInstance>;
    default_llm_instance_id: string;
    workspace: WorkspaceConfig;
    engine: EngineConfig;
    system: SystemConfig;
    disabled_drivers?: string[];
}

export interface EngineConfig {
    container_instances: ContainerInstance[];
    database_instances: DatabaseInstance[];
    network_instances: NetworkInstance[];
    notification_instances: NotificationInstance[];
}

export interface ContainerInstance {
    id: string;
    name: string;
    description: string;
    type: "docker" | "k8s";
    host: string;
    api_version?: string;
    tls_verify?: boolean;
    kubeconfig?: string;
    context?: string;
    namespace?: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface DatabaseInstance {
    id: string;
    name: string;
    description: string;
    type: "postgresql" | "mysql" | "redis" | "sqlite";
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    redis_db?: number;
    sqlite_path?: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface NetworkInstance {
    id: string;
    name: string;
    description: string;
    type: "tcp" | "udp" | "ftp";
    host: string;
    port: number;
    encoding?: string;
    broadcast?: boolean;
    username?: string;
    password?: string;
    remote_dir?: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface NotificationInstance {
    id: string;
    name: string;
    description: string;
    type: "smtp" | "telegram" | "dingtalk" | "feishu" | "wecom" | "github";
    enabled: boolean;
    smtp_host?: string;
    smtp_port?: number;
    smtp_username?: string;
    smtp_password?: string;
    smtp_from?: string;
    telegram_bot_token?: string;
    dingtalk_access_token?: string;
    feishu_webhook?: string;
    wecom_webhook?: string;
    github_token?: string;
    github_api_url?: string;
    created_at: string;
    updated_at: string;
}

export interface SaveContainerInstanceRequest {
    id?: string;
    name: string;
    description: string;
    instance_type: string;
    host: string;
    api_version?: string;
    tls_verify?: boolean;
    kubeconfig?: string;
    context?: string;
    namespace?: string;
    enabled: boolean;
}

export interface SaveDatabaseInstanceRequest {
    id?: string;
    name: string;
    description: string;
    instance_type: string;
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    redis_db?: number;
    sqlite_path?: string;
    enabled: boolean;
}

export interface SaveNetworkInstanceRequest {
    id?: string;
    name: string;
    description: string;
    instance_type: string;
    host: string;
    port: number;
    encoding?: string;
    broadcast?: boolean;
    username?: string;
    password?: string;
    remote_dir?: string;
    enabled: boolean;
}

export interface SaveNotificationInstanceRequest {
    id?: string;
    name: string;
    description: string;
    instance_type: string;
    enabled: boolean;
    smtp_host?: string;
    smtp_port?: number;
    smtp_username?: string;
    smtp_password?: string;
    smtp_from?: string;
    telegram_bot_token?: string;
    dingtalk_access_token?: string;
    feishu_webhook?: string;
    wecom_webhook?: string;
    github_token?: string;
    github_api_url?: string;
}

export interface AddLlmInstanceRequest {
    name: string;
    provider: string;
    api_key: string;
    api_base: string;
    workflow_mode: string;
    default_model: string;
    models: ModelConfig[];
}

export interface ModelConfig {
    name: string;
    api_key: string;
    is_default: boolean;
    provider: string;
}

export interface WorkspaceConfig {
    skills_dir: string;
    logs_path: string;
    data_path: string;
    temp_path: string;
    backup_path: string;
    max_log_size: number;
    max_backup_count: number;
}

export interface SystemConfig {
    auto_update: boolean;
    telemetry: boolean;
    log_level: string;
    max_concurrent_tasks: number;
    request_timeout: number;
}

export interface DiskInfo {
    total: number;
    free: number;
    used: number;
}

export const configCommands = {

    async getSettingsAutoStart(): Promise<boolean> {
        return await invoke('cmd_get_settings_auto_start');
    },

    async saveSettingsAutoStart(enabled: boolean): Promise<void> {
        return await invoke('cmd_save_settings_auto_start', { enabled });
    },

    async getSettingsLayoutSwapMode(): Promise<string> {
        return await invoke('cmd_get_settings_layout_swap_mode');
    },

    async saveSettingsLayoutSwapMode(mode: string): Promise<void> {
        return await invoke('cmd_save_settings_layout_swap_mode', { mode });
    },

    async getSettingsFunctionPanelPosition(): Promise<string> {
        return await invoke('cmd_get_settings_function_panel_position');
    },

    async saveSettingsFunctionPanelPosition(position: string): Promise<void> {
        return await invoke('cmd_save_settings_function_panel_position', { position });
    },

    async getConfig(): Promise<HippoxAppConfig> {
        return await invoke('cmd_get_config');
    },

    async getDisabledDrivers(): Promise<string[]> {
        return await invoke('cmd_get_disabled_drivers');
    },

    async setDisabledDrivers(disabled: string[]): Promise<void> {
        return await invoke('cmd_set_disabled_drivers', { disabled });
    },

    async setConfig(config: HippoxAppConfig): Promise<boolean> {
        return await invoke('cmd_set_config', { config });
    },

    async updateConfig(path: ConfigPath, value: any): Promise<boolean> {
        return await invoke('cmd_update_config', { path, value });
    },

    async getConfigValue(path: ConfigPath): Promise<any> {
        return await invoke('cmd_get_config_value', { path });
    },

    async getLlmInstances(): Promise<Record<string, LlmInstance>> {
        return await invoke('cmd_get_llm_instances');
    },

    async getDefaultLlmInstanceId(): Promise<string> {
        return await invoke('cmd_get_default_llm_instance_id');
    },

    async addLlmInstance(instance: AddLlmInstanceRequest): Promise<string> {
        return await invoke('cmd_add_llm_instance', { request: instance });
    },

    async updateLlmInstance(instanceId: string, instance: LlmInstance): Promise<boolean> {
        return await invoke('cmd_update_llm_instance', { instanceId, instance });
    },

    async deleteLlmInstance(instanceId: string): Promise<boolean> {
        return await invoke('cmd_delete_llm_instance', { instanceId });
    },

    async setDefaultLlmInstance(instanceId: string): Promise<boolean> {
        return await invoke('cmd_set_default_llm_instance', { instanceId });
    },

    async getLlmInstance(instanceId: string): Promise<LlmInstance | null> {
        return await invoke('cmd_get_llm_instance', { instanceId });
    },

    async addLlmModel(model: ModelConfig): Promise<boolean> {
        return await invoke('cmd_add_llm_model', { model });
    },

    async removeLlmModel(modelName: string): Promise<boolean> {
        return await invoke('cmd_remove_llm_model', { modelName });
    },

    async setDefaultLlmModel(modelName: string): Promise<boolean> {
        return await invoke('cmd_set_default_llm_model', { modelName });
    },

    async getSettingsLanguage(): Promise<string> {
        return await invoke('cmd_get_settings_language');
    },

    async saveSettingsLanguage(language: string): Promise<void> {
        return await invoke('cmd_save_settings_language', { language });
    },

    async getSettingsTheme(): Promise<string> {
        return await invoke('cmd_get_settings_theme');
    },

    async saveSettingsTheme(theme: string): Promise<void> {
        return await invoke('cmd_save_settings_theme', { theme });
    },
};

export const storageCommands = {

    async getFavoritesDir(): Promise<string> {
        return await invoke('cmd_get_favorites_dir');
    },

    async getMaxFavoritesSize(): Promise<number> {
        return await invoke('cmd_get_max_favorites_size');
    },

    async setMaxFavoritesSize(maxSizeMb: number): Promise<void> {
        return await invoke('cmd_set_max_favorites_size', { maxSizeMb });
    },

    async clearLogs(): Promise<void> {
        return await invoke('cmd_clear_execution_logs');
    },

    async getDirectorySize(path: string): Promise<number> {
        return await invoke('cmd_get_directory_size', { path });
    },

    async getDiskInfo(path: string): Promise<DiskInfo> {
        return await invoke('cmd_get_disk_info', { path });
    },

    async getMaxLogSize(): Promise<number> {
        return await invoke('cmd_get_max_log_size');
    },

    async setMaxLogSize(maxSizeMb: number): Promise<void> {
        return await invoke('cmd_set_max_log_size', { maxSizeMb });
    },

    async getMaxDialogSize(): Promise<number> {
        return await invoke('cmd_get_max_dialog_size');
    },

    async setMaxDialogSize(maxSizeMb: number): Promise<void> {
        return await invoke('cmd_set_max_dialog_size', { maxSizeMb });
    },
};

export const engineCommands = {
    async saveContainerInstance(request: SaveContainerInstanceRequest): Promise<ContainerInstance> {
        return await invoke('cmd_save_container_instance', { request });
    },
    async deleteContainerInstance(instanceId: string): Promise<boolean> {
        return await invoke('cmd_delete_container_instance', { instanceId });
    },
    async toggleContainerInstance(instanceId: string, enabled: boolean): Promise<boolean> {
        return await invoke('cmd_toggle_container_instance', { instanceId, enabled });
    },
    async getContainerInstances(): Promise<ContainerInstance[]> {
        return await invoke('cmd_get_container_instances');
    },
    async saveDatabaseInstance(request: SaveDatabaseInstanceRequest): Promise<DatabaseInstance> {
        return await invoke('cmd_save_database_instance', { request });
    },
    async deleteDatabaseInstance(instanceId: string): Promise<boolean> {
        return await invoke('cmd_delete_database_instance', { instanceId });
    },
    async toggleDatabaseInstance(instanceId: string, enabled: boolean): Promise<boolean> {
        return await invoke('cmd_toggle_database_instance', { instanceId, enabled });
    },
    async getDatabaseInstances(): Promise<DatabaseInstance[]> {
        return await invoke('cmd_get_database_instances');
    },
    async saveNetworkInstance(request: SaveNetworkInstanceRequest): Promise<NetworkInstance> {
        return await invoke('cmd_save_network_instance', { request });
    },
    async deleteNetworkInstance(instanceId: string): Promise<boolean> {
        return await invoke('cmd_delete_network_instance', { instanceId });
    },
    async toggleNetworkInstance(instanceId: string, enabled: boolean): Promise<boolean> {
        return await invoke('cmd_toggle_network_instance', { instanceId, enabled });
    },
    async getNetworkInstances(): Promise<NetworkInstance[]> {
        return await invoke('cmd_get_network_instances');
    },
    async saveNotificationInstance(request: SaveNotificationInstanceRequest): Promise<NotificationInstance> {
        return await invoke('cmd_save_notification_instance', { request });
    },
    async deleteNotificationInstance(instanceId: string): Promise<boolean> {
        return await invoke('cmd_delete_notification_instance', { instanceId });
    },
    async toggleNotificationInstance(instanceId: string, enabled: boolean): Promise<boolean> {
        return await invoke('cmd_toggle_notification_instance', { instanceId, enabled });
    },
    async getNotificationInstances(): Promise<NotificationInstance[]> {
        return await invoke('cmd_get_notification_instances');
    },
};

export type ConfigPath =
    | { type: 'Language' }
    | { type: 'Theme' }
    | { type: 'Workspace'; key: string }
    | { type: 'System'; key: string }
    | { type: 'Engine'; key: string };