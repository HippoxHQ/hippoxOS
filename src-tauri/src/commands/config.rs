use hippox::Hippox;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::{
    commands::get_settings_dir,
    hippox_core::{
        init_single_hippox, remove_container_instance_from_core,
        remove_database_instance_from_core, remove_network_instance_from_core,
        remove_notification_instance_from_core, sync_all_to_hippox_core,
        sync_container_instance_to_core, sync_database_instance_to_core,
        sync_network_instance_to_core, sync_notification_instance_to_core, ContainerInstance,
        DatabaseInstance, LlmInstance, NetworkInstance, NotificationInstance,
    },
    workspace::{
        add_workspace, delete_workspace, get_all_workspaces, get_default_workspace,
        load_workspace_config, set_default_workspace, update_workspace, WorkspaceConfigData,
        WorkspaceInstance,
    },
};

pub static HIPPOX_APP_CONFIG: Lazy<Arc<RwLock<HippoxAppConfig>>> =
    Lazy::new(|| Arc::new(RwLock::new(HippoxAppConfig::default())));

pub static HIPPOX_INSTANCES: Lazy<Arc<RwLock<HashMap<String, Arc<Hippox>>>>> =
    Lazy::new(|| Arc::new(RwLock::new(HashMap::new())));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HippoxAppConfig {
    pub language: String,
    pub theme: String,
    pub llm_instances: HashMap<String, LlmInstance>,
    pub default_llm_instance_id: String,
    pub workspace: WorkspaceConfig,
    pub engine: EngineConfig,
    pub system: SystemConfig,
    pub workspace_config: WorkspaceConfigData,
    #[serde(default)]
    pub disabled_drivers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EngineConfig {
    pub container_instances: Vec<ContainerInstance>,
    pub database_instances: Vec<DatabaseInstance>,
    pub network_instances: Vec<NetworkInstance>,
    pub notification_instances: Vec<NotificationInstance>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub name: String,
    pub api_key: String,
    pub is_default: bool,
    pub provider: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmInstanceForFrontend {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub api_key: String,
    pub api_base: String,
    pub default_model: String,
    pub models: Vec<ModelConfig>,
    pub created_at: String,
    pub updated_at: String,
    #[serde(default)]
    pub extra: HashMap<String, String>,
    pub is_default: Option<bool>,
}

impl From<&LlmInstance> for LlmInstanceForFrontend {
    fn from(instance: &LlmInstance) -> Self {
        Self {
            id: instance.id.clone().unwrap_or_default(),
            name: instance.name.clone(),
            provider: instance.provider.clone(),
            api_key: instance.api_key.clone(),
            api_base: instance.api_base.clone(),
            default_model: instance.default_model.clone(),
            models: instance.models.clone(),
            created_at: instance.created_at.clone().unwrap_or_default(),
            updated_at: instance.updated_at.clone().unwrap_or_default(),
            extra: instance.extra.clone(),
            is_default: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddLlmInstanceRequest {
    pub name: String,
    pub provider: String,
    pub api_key: String,
    pub api_base: String,
    pub workflow_mode: String,
    pub default_model: String,
    pub models: Vec<ModelConfig>,
    pub is_default: Option<bool>,
    #[serde(default)]
    pub extra: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub skills_dir: String,
    pub logs_path: String,
    pub data_path: String,
    pub temp_path: String,
    pub backup_path: String,
    pub max_log_size: u32,
    pub max_backup_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemConfig {
    pub auto_update: bool,
    pub telemetry: bool,
    pub log_level: String,
    pub max_concurrent_tasks: u32,
    pub request_timeout: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RedisConfig {
    pub host: String,
    pub port: u16,
    pub password: String,
    pub db: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqliteConfig {
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TcpConfig {
    pub host: String,
    pub port: u16,
    pub encoding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UdpConfig {
    pub host: String,
    pub port: u16,
    pub encoding: String,
    pub broadcast: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FtpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub remote_dir: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DockerConfig {
    pub host: String,
    pub api_version: String,
    pub tls_verify: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct K8sConfig {
    pub kubeconfig: String,
    pub context: String,
    pub namespace: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmtpConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub from: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TelegramConfig {
    pub bot_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DingtalkConfig {
    pub access_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeishuConfig {
    pub webhook: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WecomConfig {
    pub webhook: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GithubConfig {
    pub token: String,
    pub api_url: String,
}

impl Default for HippoxAppConfig {
    fn default() -> Self {
        let instances = HashMap::new();
        let default_id = String::new();
        Self {
            language: "en".to_string(),
            theme: "dark".to_string(),
            llm_instances: instances,
            default_llm_instance_id: default_id,
            workspace: WorkspaceConfig {
                skills_dir: "~/.hippox/skills".to_string(),
                logs_path: "~/.hippox/logs".to_string(),
                data_path: "~/.hippox/data".to_string(),
                temp_path: "~/.hippox/tmp".to_string(),
                backup_path: "~/.hippox/backup".to_string(),
                max_log_size: 100,
                max_backup_count: 10,
            },
            engine: EngineConfig::default(),
            system: SystemConfig {
                auto_update: true,
                telemetry: false,
                log_level: "info".to_string(),
                max_concurrent_tasks: 10,
                request_timeout: 30,
            },
            workspace_config: WorkspaceConfigData::default(),
            disabled_drivers: Vec::new(),
        }
    }
}

fn get_hippox_core_config() -> hippox::HippoxConfig {
    hippox::get_hippox_core_config()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveContainerInstanceRequest {
    pub id: Option<String>,
    pub name: String,
    pub description: String,
    pub instance_type: String,
    pub host: String,
    pub api_version: Option<String>,
    pub tls_verify: Option<bool>,
    pub kubeconfig: Option<String>,
    pub context: Option<String>,
    pub namespace: Option<String>,
    pub enabled: bool,
}

#[tauri::command]
pub async fn cmd_save_container_instance(
    request: SaveContainerInstanceRequest,
) -> Result<ContainerInstance, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let now = chrono::Local::now().to_rfc3339();
    let is_new = request.id.is_none();
    let instance_id = request
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let instance = ContainerInstance {
        id: instance_id.clone(),
        name: request.name.clone(),
        description: request.description.clone(),
        instance_type: request.instance_type.clone(),
        host: request.host.clone(),
        api_version: request.api_version.clone(),
        tls_verify: request.tls_verify,
        kubeconfig: request.kubeconfig.clone(),
        context: request.context.clone(),
        namespace: request.namespace.clone(),
        enabled: request.enabled,
        created_at: if is_new { now.clone() } else { now.clone() },
        updated_at: now,
    };
    if let Some(existing_id) = &request.id {
        if let Some(existing) = config
            .engine
            .container_instances
            .iter_mut()
            .find(|i| i.id == *existing_id)
        {
            *existing = instance.clone();
        } else {
            config.engine.container_instances.push(instance.clone());
        }
    } else {
        config.engine.container_instances.push(instance.clone());
    }
    drop(config);
    save_config_to_file().await?;
    sync_container_instance_to_core(&instance).await?;
    Ok(instance)
}

#[tauri::command]
pub async fn cmd_delete_container_instance(instance_id: String) -> Result<bool, String> {
    let instance_type = {
        let config = HIPPOX_APP_CONFIG.read().await;
        config
            .engine
            .container_instances
            .iter()
            .find(|i| i.id == instance_id)
            .map(|i| i.instance_type.clone())
    };
    let mut config = HIPPOX_APP_CONFIG.write().await;
    config
        .engine
        .container_instances
        .retain(|i| i.id != instance_id);
    drop(config);
    save_config_to_file().await?;
    if let Some(inst_type) = instance_type {
        remove_container_instance_from_core(&inst_type, &instance_id).await;
    }
    Ok(true)
}

#[tauri::command]
pub async fn cmd_toggle_container_instance(
    instance_id: String,
    enabled: bool,
) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if let Some(instance) = config
        .engine
        .container_instances
        .iter_mut()
        .find(|i| i.id == instance_id)
    {
        instance.enabled = enabled;
        instance.updated_at = chrono::Local::now().to_rfc3339();
        let instance_clone = instance.clone();
        drop(config);
        save_config_to_file().await?;
        sync_container_instance_to_core(&instance_clone).await?;
        Ok(true)
    } else {
        Err("Instance not found".to_string())
    }
}

#[tauri::command]
pub async fn cmd_get_container_instances() -> Result<Vec<ContainerInstance>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.engine.container_instances.clone())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveDatabaseInstanceRequest {
    pub id: Option<String>,
    pub name: String,
    pub description: String,
    pub instance_type: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub redis_db: Option<i32>,
    pub sqlite_path: Option<String>,
    pub enabled: bool,
}

#[tauri::command]
pub async fn cmd_save_database_instance(
    request: SaveDatabaseInstanceRequest,
) -> Result<DatabaseInstance, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let now = chrono::Local::now().to_rfc3339();
    let is_new = request.id.is_none();
    let instance_id = request
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let instance = DatabaseInstance {
        id: instance_id.clone(),
        name: request.name.clone(),
        description: request.description.clone(),
        instance_type: request.instance_type.clone(),
        host: request.host.clone(),
        port: request.port,
        database: request.database.clone(),
        username: request.username.clone(),
        password: request.password.clone(),
        redis_db: request.redis_db,
        sqlite_path: request.sqlite_path.clone(),
        enabled: request.enabled,
        created_at: if is_new { now.clone() } else { now.clone() },
        updated_at: now,
    };
    if let Some(existing_id) = &request.id {
        if let Some(existing) = config
            .engine
            .database_instances
            .iter_mut()
            .find(|i| i.id == *existing_id)
        {
            *existing = instance.clone();
        } else {
            config.engine.database_instances.push(instance.clone());
        }
    } else {
        config.engine.database_instances.push(instance.clone());
    }
    drop(config);
    save_config_to_file().await?;
    sync_database_instance_to_core(&instance).await?;
    Ok(instance)
}

#[tauri::command]
pub async fn cmd_delete_database_instance(instance_id: String) -> Result<bool, String> {
    let instance_type = {
        let config = HIPPOX_APP_CONFIG.read().await;
        config
            .engine
            .database_instances
            .iter()
            .find(|i| i.id == instance_id)
            .map(|i| i.instance_type.clone())
    };
    let mut config = HIPPOX_APP_CONFIG.write().await;
    config
        .engine
        .database_instances
        .retain(|i| i.id != instance_id);
    drop(config);
    save_config_to_file().await?;
    if let Some(inst_type) = instance_type {
        remove_database_instance_from_core(&inst_type, &instance_id).await;
    }
    Ok(true)
}

#[tauri::command]
pub async fn cmd_toggle_database_instance(
    instance_id: String,
    enabled: bool,
) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if let Some(instance) = config
        .engine
        .database_instances
        .iter_mut()
        .find(|i| i.id == instance_id)
    {
        instance.enabled = enabled;
        instance.updated_at = chrono::Local::now().to_rfc3339();
        let instance_clone = instance.clone();
        drop(config);
        save_config_to_file().await?;
        sync_database_instance_to_core(&instance_clone).await?;
        Ok(true)
    } else {
        Err("Instance not found".to_string())
    }
}

#[tauri::command]
pub async fn cmd_get_database_instances() -> Result<Vec<DatabaseInstance>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.engine.database_instances.clone())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveNetworkInstanceRequest {
    pub id: Option<String>,
    pub name: String,
    pub description: String,
    pub instance_type: String,
    pub host: String,
    pub port: u16,
    pub encoding: Option<String>,
    pub broadcast: Option<bool>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub remote_dir: Option<String>,
    pub enabled: bool,
}

#[tauri::command]
pub async fn cmd_save_network_instance(
    request: SaveNetworkInstanceRequest,
) -> Result<NetworkInstance, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let now = chrono::Local::now().to_rfc3339();
    let is_new = request.id.is_none();
    let instance_id = request
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let instance = NetworkInstance {
        id: instance_id.clone(),
        name: request.name.clone(),
        description: request.description.clone(),
        instance_type: request.instance_type.clone(),
        host: request.host.clone(),
        port: request.port,
        encoding: request.encoding.clone(),
        broadcast: request.broadcast,
        username: request.username.clone(),
        password: request.password.clone(),
        remote_dir: request.remote_dir.clone(),
        enabled: request.enabled,
        created_at: if is_new { now.clone() } else { now.clone() },
        updated_at: now,
    };
    if let Some(existing_id) = &request.id {
        if let Some(existing) = config
            .engine
            .network_instances
            .iter_mut()
            .find(|i| i.id == *existing_id)
        {
            *existing = instance.clone();
        } else {
            config.engine.network_instances.push(instance.clone());
        }
    } else {
        config.engine.network_instances.push(instance.clone());
    }
    drop(config);
    save_config_to_file().await?;
    sync_network_instance_to_core(&instance).await?;
    Ok(instance)
}

#[tauri::command]
pub async fn cmd_delete_network_instance(instance_id: String) -> Result<bool, String> {
    let instance_type = {
        let config = HIPPOX_APP_CONFIG.read().await;
        config
            .engine
            .network_instances
            .iter()
            .find(|i| i.id == instance_id)
            .map(|i| i.instance_type.clone())
    };
    let mut config = HIPPOX_APP_CONFIG.write().await;
    config
        .engine
        .network_instances
        .retain(|i| i.id != instance_id);
    drop(config);
    save_config_to_file().await?;
    if let Some(inst_type) = instance_type {
        remove_network_instance_from_core(&inst_type, &instance_id).await;
    }
    Ok(true)
}

#[tauri::command]
pub async fn cmd_toggle_network_instance(
    instance_id: String,
    enabled: bool,
) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if let Some(instance) = config
        .engine
        .network_instances
        .iter_mut()
        .find(|i| i.id == instance_id)
    {
        instance.enabled = enabled;
        instance.updated_at = chrono::Local::now().to_rfc3339();
        let instance_clone = instance.clone();
        drop(config);
        save_config_to_file().await?;
        sync_network_instance_to_core(&instance_clone).await?;
        Ok(true)
    } else {
        Err("Instance not found".to_string())
    }
}

#[tauri::command]
pub async fn cmd_get_network_instances() -> Result<Vec<NetworkInstance>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.engine.network_instances.clone())
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveNotificationInstanceRequest {
    pub id: Option<String>,
    pub name: String,
    pub description: String,
    pub instance_type: String,
    pub enabled: bool,
    pub smtp_host: Option<String>,
    pub smtp_port: Option<u16>,
    pub smtp_username: Option<String>,
    pub smtp_password: Option<String>,
    pub smtp_from: Option<String>,
    pub telegram_bot_token: Option<String>,
    pub dingtalk_access_token: Option<String>,
    pub feishu_webhook: Option<String>,
    pub wecom_webhook: Option<String>,
    pub github_token: Option<String>,
    pub github_api_url: Option<String>,
}

#[tauri::command]
pub async fn cmd_save_notification_instance(
    request: SaveNotificationInstanceRequest,
) -> Result<NotificationInstance, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let now = chrono::Local::now().to_rfc3339();
    let is_new = request.id.is_none();
    let instance_id = request
        .id
        .clone()
        .unwrap_or_else(|| Uuid::new_v4().to_string());
    let instance = NotificationInstance {
        id: instance_id.clone(),
        name: request.name.clone(),
        description: request.description.clone(),
        instance_type: request.instance_type.clone(),
        enabled: request.enabled,
        smtp_host: request.smtp_host.clone(),
        smtp_port: request.smtp_port,
        smtp_username: request.smtp_username.clone(),
        smtp_password: request.smtp_password.clone(),
        smtp_from: request.smtp_from.clone(),
        telegram_bot_token: request.telegram_bot_token.clone(),
        dingtalk_access_token: request.dingtalk_access_token.clone(),
        feishu_webhook: request.feishu_webhook.clone(),
        wecom_webhook: request.wecom_webhook.clone(),
        github_token: request.github_token.clone(),
        github_api_url: request.github_api_url.clone(),
        created_at: if is_new { now.clone() } else { now.clone() },
        updated_at: now,
    };

    if let Some(existing_id) = &request.id {
        if let Some(existing) = config
            .engine
            .notification_instances
            .iter_mut()
            .find(|i| i.id == *existing_id)
        {
            *existing = instance.clone();
        } else {
            config.engine.notification_instances.push(instance.clone());
        }
    } else {
        config.engine.notification_instances.push(instance.clone());
    }
    drop(config);
    save_config_to_file().await?;
    sync_notification_instance_to_core(&instance).await?;
    Ok(instance)
}

#[tauri::command]
pub async fn cmd_delete_notification_instance(instance_id: String) -> Result<bool, String> {
    let instance_type = {
        let config = HIPPOX_APP_CONFIG.read().await;
        config
            .engine
            .notification_instances
            .iter()
            .find(|i| i.id == instance_id)
            .map(|i| i.instance_type.clone())
    };
    let mut config = HIPPOX_APP_CONFIG.write().await;
    config
        .engine
        .notification_instances
        .retain(|i| i.id != instance_id);
    drop(config);
    save_config_to_file().await?;
    if let Some(inst_type) = instance_type {
        remove_notification_instance_from_core(&inst_type, &instance_id).await;
    }
    Ok(true)
}

#[tauri::command]
pub async fn cmd_toggle_notification_instance(
    instance_id: String,
    enabled: bool,
) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if let Some(instance) = config
        .engine
        .notification_instances
        .iter_mut()
        .find(|i| i.id == instance_id)
    {
        instance.enabled = enabled;
        instance.updated_at = chrono::Local::now().to_rfc3339();
        let instance_clone = instance.clone();
        drop(config);
        save_config_to_file().await?;
        sync_notification_instance_to_core(&instance_clone).await?;
        Ok(true)
    } else {
        Err("Instance not found".to_string())
    }
}

#[tauri::command]
pub async fn cmd_get_notification_instances() -> Result<Vec<NotificationInstance>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.engine.notification_instances.clone())
}

#[tauri::command]
pub async fn cmd_get_llm_instances() -> Result<HashMap<String, LlmInstanceForFrontend>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    let default_id = &config.default_llm_instance_id;
    let mut result = HashMap::new();
    for (key, instance) in config.llm_instances.iter() {
        let mut frontend_instance: LlmInstanceForFrontend = instance.into();
        frontend_instance.is_default = Some(key == default_id);
        result.insert(key.clone(), frontend_instance);
    }
    Ok(result)
}

#[tauri::command]
pub async fn cmd_get_default_llm_instance_id() -> Result<String, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.default_llm_instance_id.clone())
}

#[tauri::command]
pub async fn cmd_add_llm_instance(request: AddLlmInstanceRequest) -> Result<String, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Local::now().to_rfc3339();
    let is_first_instance = config.llm_instances.is_empty();
    let should_be_default = if is_first_instance {
        true
    } else {
        request.is_default.unwrap_or(false)
    };
    let new_instance = LlmInstance {
        id: Some(id.clone()),
        name: request.name,
        provider: request.provider,
        api_key: request.api_key,
        api_base: request.api_base,
        default_model: request.default_model,
        models: request.models,
        created_at: Some(now.clone()),
        updated_at: Some(now),
        extra: request.extra,
        is_default: Some(should_be_default),
    };
    config.llm_instances.insert(id.clone(), new_instance);
    if should_be_default {
        config.default_llm_instance_id = id.clone();
    } else if config.default_llm_instance_id.is_empty() && !config.llm_instances.is_empty() {
        if let Some(first_id) = config.llm_instances.keys().next() {
            config.default_llm_instance_id = first_id.clone();
        }
    }
    drop(config);
    save_config_to_file().await?;
    Ok(id)
}

#[tauri::command]
pub async fn cmd_update_llm_instance(
    instance_id: String,
    instance: LlmInstanceForFrontend,
) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if let Some(existing) = config.llm_instances.get_mut(&instance_id) {
        existing.name = instance.name;
        existing.provider = instance.provider;
        existing.api_key = instance.api_key;
        existing.api_base = instance.api_base;
        existing.default_model = instance.default_model;
        existing.models = instance.models;
        existing.updated_at = Some(chrono::Local::now().to_rfc3339());
        drop(config);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("Instance not found".to_string())
    }
}

#[tauri::command]
pub async fn cmd_delete_llm_instance(instance_id: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if config.llm_instances.len() <= 1 {
        return Err("Cannot delete the last instance".to_string());
    }
    if config.llm_instances.remove(&instance_id).is_some() {
        if config.default_llm_instance_id == instance_id {
            if let Some(first_id) = config.llm_instances.keys().next().cloned() {
                config.default_llm_instance_id = first_id.clone();
                if let Some(instance) = config.llm_instances.get_mut(&first_id) {
                    instance.is_default = Some(true);
                }
            }
        }
        drop(config);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("Instance not found".to_string())
    }
}

#[tauri::command]
pub async fn cmd_set_default_llm_instance(instance_id: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if config.llm_instances.contains_key(&instance_id) {
        for (_, instance) in config.llm_instances.iter_mut() {
            instance.is_default = Some(false);
        }
        if let Some(instance) = config.llm_instances.get_mut(&instance_id) {
            instance.is_default = Some(true);
        }
        config.default_llm_instance_id = instance_id.clone();
        drop(config);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("Instance not found".to_string())
    }
}

#[tauri::command]
pub async fn cmd_get_llm_instance(
    instance_id: String,
) -> Result<Option<LlmInstanceForFrontend>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config
        .llm_instances
        .get(&instance_id)
        .map(|instance| instance.into()))
}

#[tauri::command]
pub async fn cmd_sync_all_to_hippox_core() -> Result<(), String> {
    sync_all_to_hippox_core().await
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConfigPath {
    Language,
    Theme,
    Workspace(String),
    Engine(String),
    System(String),
}

#[tauri::command]
pub async fn cmd_get_config() -> Result<HippoxAppConfig, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.clone())
}

#[tauri::command]
pub async fn cmd_set_config(config: HippoxAppConfig) -> Result<bool, String> {
    let mut global_config = HIPPOX_APP_CONFIG.write().await;
    *global_config = config;
    if let Err(e) = save_config_to_file().await {
        eprintln!("Failed to save config to file: {}", e);
    }
    Ok(true)
}

#[tauri::command]
pub async fn cmd_update_config(path: ConfigPath, value: serde_json::Value) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;

    match path {
        ConfigPath::Language => {
            if let Some(lang) = value.as_str() {
                config.language = lang.to_string();
            }
        }
        ConfigPath::Theme => {
            if let Some(theme) = value.as_str() {
                config.theme = theme.to_string();
            }
        }
        ConfigPath::Workspace(key) => match key.as_str() {
            "skills_dir" => {
                if let Some(v) = value.as_str() {
                    config.workspace.skills_dir = v.to_string();
                }
            }
            "logs_path" => {
                if let Some(v) = value.as_str() {
                    config.workspace.logs_path = v.to_string();
                }
            }
            "data_path" => {
                if let Some(v) = value.as_str() {
                    config.workspace.data_path = v.to_string();
                }
            }
            "temp_path" => {
                if let Some(v) = value.as_str() {
                    config.workspace.temp_path = v.to_string();
                }
            }
            "backup_path" => {
                if let Some(v) = value.as_str() {
                    config.workspace.backup_path = v.to_string();
                }
            }
            "max_log_size" => {
                if let Some(v) = value.as_u64() {
                    config.workspace.max_log_size = v as u32;
                }
            }
            "max_backup_count" => {
                if let Some(v) = value.as_u64() {
                    config.workspace.max_backup_count = v as u32;
                }
            }
            _ => {}
        },
        ConfigPath::System(key) => match key.as_str() {
            "auto_update" => {
                if let Some(v) = value.as_bool() {
                    config.system.auto_update = v;
                }
            }
            "telemetry" => {
                if let Some(v) = value.as_bool() {
                    config.system.telemetry = v;
                }
            }
            "log_level" => {
                if let Some(v) = value.as_str() {
                    config.system.log_level = v.to_string();
                }
            }
            "max_concurrent_tasks" => {
                if let Some(v) = value.as_u64() {
                    config.system.max_concurrent_tasks = v as u32;
                }
            }
            "request_timeout" => {
                if let Some(v) = value.as_u64() {
                    config.system.request_timeout = v as u32;
                }
            }
            _ => {}
        },
        ConfigPath::Engine(_key) => {}
    }
    if let Err(e) = save_config_to_file().await {
        eprintln!("Failed to save config to file: {}", e);
    }
    Ok(true)
}

#[tauri::command]
pub async fn cmd_get_config_value(path: ConfigPath) -> Result<serde_json::Value, String> {
    let config = HIPPOX_APP_CONFIG.read().await;

    let value = match path {
        ConfigPath::Language => serde_json::json!(config.language),
        ConfigPath::Theme => serde_json::json!(config.theme),
        ConfigPath::Workspace(key) => match key.as_str() {
            "skills_dir" => serde_json::json!(config.workspace.skills_dir),
            "logs_path" => serde_json::json!(config.workspace.logs_path),
            "data_path" => serde_json::json!(config.workspace.data_path),
            "temp_path" => serde_json::json!(config.workspace.temp_path),
            "backup_path" => serde_json::json!(config.workspace.backup_path),
            "max_log_size" => serde_json::json!(config.workspace.max_log_size),
            "max_backup_count" => serde_json::json!(config.workspace.max_backup_count),
            _ => serde_json::Value::Null,
        },
        ConfigPath::System(key) => match key.as_str() {
            "auto_update" => serde_json::json!(config.system.auto_update),
            "telemetry" => serde_json::json!(config.system.telemetry),
            "log_level" => serde_json::json!(config.system.log_level),
            "max_concurrent_tasks" => serde_json::json!(config.system.max_concurrent_tasks),
            "request_timeout" => serde_json::json!(config.system.request_timeout),
            _ => serde_json::Value::Null,
        },
        ConfigPath::Engine(_key) => serde_json::json!({}),
    };
    Ok(value)
}

pub async fn load_config_from_file() -> Result<(), String> {
    let config_path = get_config_file_path();
    if let Ok(content) = std::fs::read_to_string(&config_path) {
        let full_config: serde_json::Value =
            serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}));
        if let Ok(mut config) = serde_json::from_str::<HippoxAppConfig>(&content) {
            if let Some(ws_config) = full_config.get("workspace_config") {
                if let Ok(ws) = serde_json::from_value(ws_config.clone()) {
                    config.workspace_config = ws;
                }
            }
            if let Some(disabled) = full_config.get("disabled_drivers") {
                if let Ok(drivers) = serde_json::from_value(disabled.clone()) {
                    config.disabled_drivers = drivers;
                }
            } else {
                config.disabled_drivers = Vec::new();
            }
            let mut updated_full = full_config.clone();
            if let Some(obj) = updated_full.as_object_mut() {
                if !obj.contains_key("disabled_drivers") {
                    obj.insert("disabled_drivers".to_string(), serde_json::json!([]));
                }
            }
            let mut global_config = HIPPOX_APP_CONFIG.write().await;
            *global_config = config;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn cmd_get_disabled_drivers() -> Result<Vec<String>, String> {
    let config_path = get_config_file_path();
    let content = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read config file: {}", e))?;
    let full_config: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse config file: {}", e))?;
    let disabled = full_config
        .get("disabled_drivers")
        .and_then(|v| serde_json::from_value::<Vec<String>>(v.clone()).ok())
        .unwrap_or_default();
    Ok(disabled)
}

#[tauri::command]
pub async fn cmd_set_disabled_drivers(disabled: Vec<String>) -> Result<(), String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    config.disabled_drivers = disabled;
    drop(config);
    save_config_to_file().await?;
    Ok(())
}

pub async fn save_config_to_file() -> Result<(), String> {
    let config_path = get_config_file_path();
    if let Some(parent) = config_path.parent() {
        if !parent.exists() {
            let _ = std::fs::create_dir_all(parent);
        }
    }
    let mut full_config: serde_json::Value = if config_path.exists() {
        let content = std::fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    let config = HIPPOX_APP_CONFIG.read().await;
    let main_config = serde_json::to_value(&*config).map_err(|e| e.to_string())?;
    if let Some(obj) = full_config.as_object_mut() {
        for (key, value) in main_config.as_object().unwrap() {
            obj.insert(key.clone(), value.clone());
        }
        if !obj.contains_key("disabled_drivers") {
            obj.insert("disabled_drivers".to_string(), serde_json::json!([]));
        }
    }
    let content = serde_json::to_string_pretty(&full_config).map_err(|e| e.to_string())?;
    std::fs::write(config_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn get_config_file_path() -> std::path::PathBuf {
    super::paths::get_settings_dir().join("config.json")
}

#[tauri::command]
pub async fn cmd_add_llm_model(model: ModelConfig) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let default_id = config.default_llm_instance_id.clone();
    if let Some(instance) = config.llm_instances.get_mut(&default_id) {
        instance.models.push(model);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("No default instance found".to_string())
    }
}

#[tauri::command]
pub async fn cmd_remove_llm_model(model_name: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let default_id = config.default_llm_instance_id.clone();
    if let Some(instance) = config.llm_instances.get_mut(&default_id) {
        instance.models.retain(|m| m.name != model_name);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("No default instance found".to_string())
    }
}

#[tauri::command]
pub async fn cmd_set_default_llm_model(model_name: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let default_id = config.default_llm_instance_id.clone();
    if let Some(instance) = config.llm_instances.get_mut(&default_id) {
        for model in &mut instance.models {
            model.is_default = model.name == model_name;
        }
        instance.default_model = model_name;
        drop(config);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("No default instance found".to_string())
    }
}

#[tauri::command]
pub fn cmd_get_settings_language() -> Result<String, String> {
    let value = crate::common::get_setting_with_default("language", serde_json::json!("en"))?;
    Ok(value.as_str().unwrap_or("en").to_string())
}

#[tauri::command]
pub fn cmd_save_settings_language(language: String) -> Result<(), String> {
    crate::common::set_setting("language", serde_json::json!(language))
}

#[tauri::command]
pub fn cmd_get_settings_theme() -> Result<String, String> {
    let value = crate::common::get_setting_with_default("theme", serde_json::json!("dark"))?;
    Ok(value.as_str().unwrap_or("dark").to_string())
}

#[tauri::command]
pub fn cmd_save_settings_theme(theme: String) -> Result<(), String> {
    crate::common::set_setting("theme", serde_json::json!(theme))
}

#[tauri::command]
pub async fn cmd_get_workspace_config() -> Result<WorkspaceConfigData, String> {
    load_workspace_config()
}

#[tauri::command]
pub async fn cmd_get_all_workspaces() -> Result<Vec<WorkspaceInstance>, String> {
    get_all_workspaces()
}

#[tauri::command]
pub async fn cmd_get_default_workspace() -> Result<Option<WorkspaceInstance>, String> {
    get_default_workspace()
}

#[tauri::command]
pub async fn cmd_add_workspace(instance: WorkspaceInstance) -> Result<(), String> {
    add_workspace(instance)
}

#[tauri::command]
pub async fn cmd_update_workspace(instance: WorkspaceInstance) -> Result<(), String> {
    update_workspace(instance)
}

#[tauri::command]
pub async fn cmd_delete_workspace(instance_id: String) -> Result<(), String> {
    delete_workspace(&instance_id)
}

#[tauri::command]
pub async fn cmd_set_default_workspace(instance_id: String) -> Result<(), String> {
    set_default_workspace(&instance_id)
}

#[tauri::command]
pub async fn cmd_get_max_log_size() -> Result<u64, String> {
    let settings_dir = crate::commands::paths::get_settings_dir();
    let config_path = settings_dir.join("config.json");
    if config_path.exists() {
        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        let full_config: serde_json::Value =
            serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}));
        if let Some(size) = full_config.get("max_log_size_mb").and_then(|v| v.as_u64()) {
            return Ok(size);
        }
    }
    Ok(500)
}

#[tauri::command]
pub async fn cmd_set_max_log_size(max_size_mb: u64) -> Result<(), String> {
    let settings_dir = crate::commands::paths::get_settings_dir();
    if !settings_dir.exists() {
        std::fs::create_dir_all(&settings_dir)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    let config_path = settings_dir.join("config.json");
    let mut full_config: serde_json::Value = if config_path.exists() {
        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    full_config["max_log_size_mb"] = serde_json::json!(max_size_mb);
    let content = serde_json::to_string_pretty(&full_config)
        .map_err(|e| format!("Failed to serialize settings config: {}", e))?;
    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to save settings config: {}", e))?;
    let _ = crate::commands::paths::cleanup_old_logs(max_size_mb);
    Ok(())
}

#[tauri::command]
pub async fn cmd_get_max_dialog_size() -> Result<u64, String> {
    let settings_dir = crate::commands::paths::get_settings_dir();
    let config_path = settings_dir.join("config.json");
    if config_path.exists() {
        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        let full_config: serde_json::Value =
            serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}));
        if let Some(size) = full_config
            .get("max_dialog_size_mb")
            .and_then(|v| v.as_u64())
        {
            return Ok(size);
        }
    }
    Ok(500)
}

#[tauri::command]
pub async fn cmd_set_max_dialog_size(max_size_mb: u64) -> Result<(), String> {
    let settings_dir = crate::commands::paths::get_settings_dir();
    if !settings_dir.exists() {
        std::fs::create_dir_all(&settings_dir)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    let config_path = settings_dir.join("config.json");
    let mut full_config: serde_json::Value = if config_path.exists() {
        let content = std::fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    full_config["max_dialog_size_mb"] = serde_json::json!(max_size_mb);
    let content = serde_json::to_string_pretty(&full_config)
        .map_err(|e| format!("Failed to serialize settings config: {}", e))?;
    std::fs::write(&config_path, content)
        .map_err(|e| format!("Failed to save settings config: {}", e))?;
    Ok(())
}

pub async fn reinit_single_hippox(instance_id: &str) -> Result<(), String> {
    let (instance, skills_dir) = {
        let config = HIPPOX_APP_CONFIG.read().await;
        let instance = config
            .llm_instances
            .get(instance_id)
            .ok_or_else(|| format!("Instance not found: {}", instance_id))?
            .clone();
        let skills_dir = config.workspace.skills_dir.clone();
        (instance, skills_dir)
    };
    let hippox = init_single_hippox(&instance, &skills_dir).await?;
    let mut instances = HIPPOX_INSTANCES.write().await;
    instances.insert(instance_id.to_string(), Arc::new(hippox));
    Ok(())
}

pub async fn sync_hippox_instance_on_update(instance_id: &str) -> Result<(), String> {
    reinit_single_hippox(instance_id).await
}

pub async fn remove_hippox_instance(instance_id: &str) -> Result<(), String> {
    let mut instances = HIPPOX_INSTANCES.write().await;
    instances.remove(instance_id);
    Ok(())
}

pub async fn add_hippox_instance(instance_id: &str) -> Result<(), String> {
    reinit_single_hippox(instance_id).await
}

pub async fn get_hippox_instance(instance_id: &str) -> Result<Arc<Hippox>, String> {
    {
        let instances = HIPPOX_INSTANCES.read().await;
        if let Some(hippox) = instances.get(instance_id) {
            return Ok(hippox.clone());
        }
    }
    let (instance_config, skills_dir) = {
        let config = HIPPOX_APP_CONFIG.read().await;
        let instance = config
            .llm_instances
            .get(instance_id)
            .ok_or_else(|| format!("LLM instance not found in config: {}", instance_id))?
            .clone();
        let skills_dir = config.workspace.skills_dir.clone();
        (instance, skills_dir)
    };
    let hippox = init_single_hippox(&instance_config, &skills_dir).await?;
    let hippox_arc = Arc::new(hippox);
    let mut instances = HIPPOX_INSTANCES.write().await;
    instances.insert(instance_id.to_string(), hippox_arc.clone());
    Ok(hippox_arc)
}

#[tauri::command]
pub async fn cmd_get_max_favorites_size() -> Result<u64, String> {
    Ok(crate::commands::paths::get_max_favorites_size())
}

#[tauri::command]
pub async fn cmd_set_max_favorites_size(max_size_mb: u64) -> Result<(), String> {
    crate::commands::paths::set_max_favorites_size(max_size_mb)
}

#[tauri::command]
pub fn cmd_get_settings_layout_swap_mode() -> Result<String, String> {
    let value = crate::common::get_setting_with_default(
        "layout_swap_mode",
        serde_json::json!("terminal-left"),
    )?;
    Ok(value.as_str().unwrap_or("terminal-left").to_string())
}

#[tauri::command]
pub fn cmd_save_settings_layout_swap_mode(mode: String) -> Result<(), String> {
    crate::common::set_setting("layout_swap_mode", serde_json::json!(mode))
}

#[tauri::command]
pub fn cmd_get_settings_function_panel_position() -> Result<String, String> {
    let value = crate::common::get_setting_with_default(
        "function_panel_position",
        serde_json::json!("right"),
    )?;
    Ok(value.as_str().unwrap_or("right").to_string())
}

#[tauri::command]
pub fn cmd_save_settings_function_panel_position(position: String) -> Result<(), String> {
    crate::common::set_setting("function_panel_position", serde_json::json!(position))
}

#[tauri::command]
pub fn cmd_get_settings_auto_start() -> Result<bool, String> {
    let value = crate::common::get_setting_with_default("auto_start", serde_json::json!(false))?;
    Ok(value.as_bool().unwrap_or(false))
}

#[tauri::command]
pub fn cmd_save_settings_auto_start(enabled: bool) -> Result<(), String> {
    crate::common::set_setting("auto_start", serde_json::json!(enabled))
}
