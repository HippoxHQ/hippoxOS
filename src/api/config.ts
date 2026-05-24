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

export interface EngineConfig {
    postgresql: DatabaseConfig;
    mysql: DatabaseConfig;
    redis: RedisConfig;
    sqlite: SqliteConfig;
    tcp: TcpConfig;
    udp: UdpConfig;
    ftp: FtpConfig;
    docker: DockerConfig;
    k8s: K8sConfig;
    smtp: SmtpConfig;
    telegram: TelegramConfig;
    dingtalk: DingtalkConfig;
    feishu: FeishuConfig;
    wecom: WecomConfig;
    github: GithubConfig;
}

export interface SystemConfig {
    auto_update: boolean;
    telemetry: boolean;
    log_level: string;
    max_concurrent_tasks: number;
    request_timeout: number;
}

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
}

export interface RedisConfig {
    host: string;
    port: number;
    password: string;
    db: number;
}

export interface SqliteConfig {
    path: string;
}

export interface TcpConfig {
    host: string;
    port: number;
    encoding: string;
}

export interface UdpConfig {
    host: string;
    port: number;
    encoding: string;
    broadcast: boolean;
}

export interface FtpConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    remote_dir: string;
}

export interface DockerConfig {
    host: string;
    api_version: string;
    tls_verify: boolean;
}

export interface K8sConfig {
    kubeconfig: string;
    context: string;
    namespace: string;
}

export interface SmtpConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    from: string;
}

export interface TelegramConfig {
    bot_token: string;
}

export interface DingtalkConfig {
    access_token: string;
}

export interface FeishuConfig {
    webhook: string;
}

export interface WecomConfig {
    webhook: string;
}

export interface GithubConfig {
    token: string;
    api_url: string;
}

export type ConfigPath =
    | { type: 'Language' }
    | { type: 'Theme' }
    | { type: 'Workspace'; key: string }
    | { type: 'System'; key: string }
    | { type: 'Engine'; key: string };

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