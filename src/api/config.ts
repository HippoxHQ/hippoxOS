import { invoke } from '@tauri-apps/api/core';

export interface HippoxAppConfig {
    language: string;
    theme: string;
    llm_instances: Record<string, LlmInstance>;
    default_llm_instance_id: string;
    workspace: WorkspaceConfig;
    engine: EngineConfig;
    system: SystemConfig;
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

export interface LlmInstance {
    id: string;
    name: string;
    provider: string;
    api_key: string;
    api_base: string;
    workflow_mode: string;
    default_model: string;
    models: ModelConfig[];
    created_at: string;
    updated_at: string;
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
    async getConfig(): Promise<HippoxAppConfig> {
        return await invoke('get_config');
    },

    async setConfig(config: HippoxAppConfig): Promise<boolean> {
        return await invoke('set_config', { config });
    },

    async updateConfig(path: ConfigPath, value: any): Promise<boolean> {
        return await invoke('update_config', { path, value });
    },

    async getConfigValue(path: ConfigPath): Promise<any> {
        return await invoke('get_config_value', { path });
    },

    async getLlmInstances(): Promise<Record<string, LlmInstance>> {
        return await invoke('get_llm_instances');
    },

    async getDefaultLlmInstanceId(): Promise<string> {
        return await invoke('get_default_llm_instance_id');
    },

    async addLlmInstance(instance: AddLlmInstanceRequest): Promise<string> {
        return await invoke('add_llm_instance', { request: instance });
    },

    async updateLlmInstance(instanceId: string, instance: LlmInstance): Promise<boolean> {
        return await invoke('update_llm_instance', { instanceId, instance });
    },

    async deleteLlmInstance(instanceId: string): Promise<boolean> {
        return await invoke('delete_llm_instance', { instanceId });
    },

    async setDefaultLlmInstance(instanceId: string): Promise<boolean> {
        return await invoke('set_default_llm_instance', { instanceId });
    },

    async getLlmInstance(instanceId: string): Promise<LlmInstance | null> {
        return await invoke('get_llm_instance', { instanceId });
    },

    async addLlmModel(model: ModelConfig): Promise<boolean> {
        return await invoke('add_llm_model', { model });
    },

    async removeLlmModel(modelName: string): Promise<boolean> {
        return await invoke('remove_llm_model', { modelName });
    },

    async setDefaultLlmModel(modelName: string): Promise<boolean> {
        return await invoke('set_default_llm_model', { modelName });
    },

    async getSettingsLanguage(): Promise<string> {
        return await invoke('get_settings_language');
    },

    async saveSettingsLanguage(language: string): Promise<void> {
        return await invoke('save_settings_language', { language });
    },

    async getSettingsTheme(): Promise<string> {
        return await invoke('get_settings_theme');
    },

    async saveSettingsTheme(theme: string): Promise<void> {
        return await invoke('save_settings_theme', { theme });
    },
};

export const storageCommands = {
    async getDirectorySize(path: string): Promise<number> {
        return await invoke('get_directory_size', { path });
    },

    async getDiskInfo(path: string): Promise<DiskInfo> {
        return await invoke('get_disk_info', { path });
    },

    async getMaxLogSize(): Promise<number> {
        return await invoke('get_max_log_size');
    },

    async setMaxLogSize(maxSizeMb: number): Promise<void> {
        return await invoke('set_max_log_size', { maxSizeMb });
    },

    async getMaxDialogSize(): Promise<number> {
        return await invoke('get_max_dialog_size');
    },

    async setMaxDialogSize(maxSizeMb: number): Promise<void> {
        return await invoke('set_max_dialog_size', { maxSizeMb });
    },
};

export const engineCommands = {
    async saveContainerInstance(request: SaveContainerInstanceRequest): Promise<ContainerInstance> {
        return await invoke('save_container_instance', { request });
    },
    async deleteContainerInstance(instanceId: string): Promise<boolean> {
        return await invoke('delete_container_instance', { instanceId });
    },
    async toggleContainerInstance(instanceId: string, enabled: boolean): Promise<boolean> {
        return await invoke('toggle_container_instance', { instanceId, enabled });
    },
    async getContainerInstances(): Promise<ContainerInstance[]> {
        return await invoke('get_container_instances');
    },
    async saveDatabaseInstance(request: SaveDatabaseInstanceRequest): Promise<DatabaseInstance> {
        return await invoke('save_database_instance', { request });
    },
    async deleteDatabaseInstance(instanceId: string): Promise<boolean> {
        return await invoke('delete_database_instance', { instanceId });
    },
    async toggleDatabaseInstance(instanceId: string, enabled: boolean): Promise<boolean> {
        return await invoke('toggle_database_instance', { instanceId, enabled });
    },
    async getDatabaseInstances(): Promise<DatabaseInstance[]> {
        return await invoke('get_database_instances');
    },
    async saveNetworkInstance(request: SaveNetworkInstanceRequest): Promise<NetworkInstance> {
        return await invoke('save_network_instance', { request });
    },
    async deleteNetworkInstance(instanceId: string): Promise<boolean> {
        return await invoke('delete_network_instance', { instanceId });
    },
    async toggleNetworkInstance(instanceId: string, enabled: boolean): Promise<boolean> {
        return await invoke('toggle_network_instance', { instanceId, enabled });
    },
    async getNetworkInstances(): Promise<NetworkInstance[]> {
        return await invoke('get_network_instances');
    },
    async saveNotificationInstance(request: SaveNotificationInstanceRequest): Promise<NotificationInstance> {
        return await invoke('save_notification_instance', { request });
    },
    async deleteNotificationInstance(instanceId: string): Promise<boolean> {
        return await invoke('delete_notification_instance', { instanceId });
    },
    async toggleNotificationInstance(instanceId: string, enabled: boolean): Promise<boolean> {
        return await invoke('toggle_notification_instance', { instanceId, enabled });
    },
    async getNotificationInstances(): Promise<NotificationInstance[]> {
        return await invoke('get_notification_instances');
    },
};

export type ConfigPath =
    | { type: 'Language' }
    | { type: 'Theme' }
    | { type: 'Workspace'; key: string }
    | { type: 'System'; key: string }
    | { type: 'Engine'; key: string };