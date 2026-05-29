use hippox::{FTPConfig, Hippox, SMTPConfig};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::{
    commands::get_settings_dir,
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
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EngineConfig {
    pub container_instances: Vec<ContainerInstance>,
    pub database_instances: Vec<DatabaseInstance>,
    pub network_instances: Vec<NetworkInstance>,
    pub notification_instances: Vec<NotificationInstance>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContainerInstance {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
    pub instance_type: String,
    pub host: String,
    pub api_version: Option<String>,
    pub tls_verify: Option<bool>,
    pub kubeconfig: Option<String>,
    pub context: Option<String>,
    pub namespace: Option<String>,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseInstance {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
    pub instance_type: String,
    pub host: String,
    pub port: u16,
    pub database: String,
    pub username: String,
    pub password: String,
    pub redis_db: Option<i32>,
    pub sqlite_path: Option<String>,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInstance {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
    pub instance_type: String,
    pub host: String,
    pub port: u16,
    pub encoding: Option<String>,
    pub broadcast: Option<bool>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub remote_dir: Option<String>,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationInstance {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "type")]
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
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmInstance {
    pub id: Option<String>,
    pub name: String,
    pub provider: String,
    pub api_key: String,
    pub api_base: String,
    pub workflow_mode: String,
    pub default_model: String,
    pub models: Vec<ModelConfig>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    #[serde(default)]
    pub extra: HashMap<String, String>,
    pub is_default: Option<bool>,
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
    pub workflow_mode: String,
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
            workflow_mode: instance.workflow_mode.clone(),
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
        }
    }
}

fn get_hippox_core_config() -> hippox::HippoxConfig {
    hippox::get_hippox_core_config()
}

pub async fn sync_all_to_hippox_core() -> Result<(), String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    for instance in &config.engine.database_instances {
        sync_database_instance_to_core(instance).await?;
    }
    for instance in &config.engine.container_instances {
        sync_container_instance_to_core(instance).await?;
    }
    for instance in &config.engine.network_instances {
        sync_network_instance_to_core(instance).await?;
    }
    for instance in &config.engine.notification_instances {
        sync_notification_instance_to_core(instance).await?;
    }
    Ok(())
}

async fn sync_database_instance_to_core(instance: &DatabaseInstance) -> Result<(), String> {
    match instance.instance_type.to_lowercase().as_str() {
        "postgresql" | "postgres" => {
            let core_instance = hippox::PostgreSQLConfig::new(
                instance.id.clone(),
                Some(instance.name.clone()),
                Some(instance.description.clone()),
                instance.host.clone(),
                instance.port,
                instance.database.clone(),
                instance.username.clone(),
                instance.password.clone(),
            );
            hippox::add_postgresql_instance(core_instance);
        }
        "mysql" | "mariadb" => {
            let core_instance = hippox::MySQLConfig::new(
                instance.id.clone(),
                Some(instance.name.clone()),
                Some(instance.description.clone()),
                instance.host.clone(),
                instance.port,
                instance.database.clone(),
                instance.username.clone(),
                instance.password.clone(),
            );
            hippox::add_mysql_instance(core_instance);
        }
        "redis" => {
            let core_instance = hippox::RedisConfig::new(
                instance.id.clone(),
                Some(instance.name.clone()),
                Some(instance.description.clone()),
                instance.host.clone(),
                instance.port,
            )
            .with_password(instance.password.clone())
            .with_db(instance.redis_db.unwrap_or(0) as usize);
            hippox::add_redis_instance(core_instance);
        }
        "sqlite" => {
            if let Some(path) = &instance.sqlite_path {
                let core_instance = hippox::SQLiteConfig::new(
                    instance.id.clone(),
                    Some(instance.name.clone()),
                    Some(instance.description.clone()),
                    path.clone(),
                );
                hippox::add_sqlite_instance(core_instance);
            }
        }
        _ => {
            eprintln!("Unknown database type: {}", instance.instance_type);
        }
    }
    Ok(())
}

async fn sync_container_instance_to_core(instance: &ContainerInstance) -> Result<(), String> {
    match instance.instance_type.to_lowercase().as_str() {
        "docker" => {
            let mut core_instance = hippox::DockerConfig::new(
                instance.id.clone(),
                Some(instance.name.clone()),
                Some(instance.description.clone()),
                instance.host.clone(),
            );
            if let Some(api_version) = &instance.api_version {
                core_instance = core_instance.with_api_version(api_version.clone());
            }
            let verify = instance.tls_verify.unwrap_or(false);
            let cert_path = instance.kubeconfig.clone().unwrap_or_default();
            core_instance = core_instance.with_tls(verify, cert_path);
            hippox::add_docker_instance(core_instance);
        }
        "kubernetes" | "k8s" => {
            let mut core_instance = hippox::K8sConfig::new(
                instance.id.clone(),
                Some(instance.name.clone()),
                Some(instance.description.clone()),
            );
            if let Some(kubeconfig) = &instance.kubeconfig {
                core_instance = core_instance.with_kubeconfig(kubeconfig.clone());
            }
            if let Some(context) = &instance.context {
                core_instance = core_instance.with_context(context.clone());
            }
            if let Some(namespace) = &instance.namespace {
                core_instance = core_instance.with_namespace(namespace.clone());
            }
            hippox::add_k8s_instance(core_instance);
        }
        _ => {
            eprintln!("Unknown container type: {}", instance.instance_type);
        }
    }
    Ok(())
}

async fn sync_network_instance_to_core(instance: &NetworkInstance) -> Result<(), String> {
    match instance.instance_type.to_lowercase().as_str() {
        "tcp" => {
            let encoding = instance
                .encoding
                .clone()
                .unwrap_or_else(|| "utf8".to_string());
            let core_instance = hippox::TCPConfig::new(
                instance.id.clone(),
                Some(instance.name.clone()),
                Some(instance.description.clone()),
                instance.host.clone(),
                instance.port,
            )
            .with_encoding(encoding);
            hippox::add_tcp_instance(core_instance);
        }
        "udp" => {
            let encoding = instance
                .encoding
                .clone()
                .unwrap_or_else(|| "utf8".to_string());
            let broadcast = instance.broadcast.unwrap_or(false);
            let core_instance = hippox::UDPConfig::new(
                instance.id.clone(),
                Some(instance.name.clone()),
                Some(instance.description.clone()),
                instance.host.clone(),
                instance.port,
            )
            .with_encoding(encoding)
            .with_broadcast(broadcast);
            hippox::add_udp_instance(core_instance);
        }
        "ftp" => {
            let username = instance
                .username
                .clone()
                .unwrap_or_else(|| "anonymous".to_string());
            let password = instance.password.clone().unwrap_or_default();
            let remote_dir = instance
                .remote_dir
                .clone()
                .unwrap_or_else(|| "/".to_string());
            let core_instance = hippox::FTPConfig::new(
                instance.id.clone(),
                Some(instance.name.clone()),
                Some(instance.description.clone()),
                instance.host.clone(),
                instance.port,
            )
            .with_credentials(username, password)
            .with_remote_dir(remote_dir);
            hippox::add_ftp_instance(core_instance);
        }
        _ => {
            eprintln!("Unknown network type: {}", instance.instance_type);
        }
    }
    Ok(())
}

async fn sync_notification_instance_to_core(instance: &NotificationInstance) -> Result<(), String> {
    match instance.instance_type.to_lowercase().as_str() {
        "smtp" | "email" => {
            if let (Some(host), Some(port), Some(from)) =
                (&instance.smtp_host, instance.smtp_port, &instance.smtp_from)
            {
                let mut core_instance = hippox::SMTPConfig::new(
                    instance.id.clone(),
                    Some(instance.name.clone()),
                    Some(instance.description.clone()),
                    host.clone(),
                    port,
                    from.clone(),
                );
                if let (Some(username), Some(password)) =
                    (&instance.smtp_username, &instance.smtp_password)
                {
                    core_instance =
                        core_instance.with_credentials(username.clone(), password.clone());
                }
                hippox::add_smtp_instance(core_instance);
            }
        }
        "telegram" => {
            if let Some(token) = &instance.telegram_bot_token {
                let core_instance = hippox::TelegramConfig::new(
                    instance.id.clone(),
                    Some(instance.name.clone()),
                    Some(instance.description.clone()),
                    token.clone(),
                );
                hippox::add_telegram_instance(core_instance);
            }
        }
        "dingtalk" => {
            if let Some(token) = &instance.dingtalk_access_token {
                let core_instance = hippox::DingTalkConfig::new(
                    instance.id.clone(),
                    Some(instance.name.clone()),
                    Some(instance.description.clone()),
                    token.clone(),
                );
                hippox::add_dingtalk_instance(core_instance);
            }
        }
        "feishu" => {
            if let Some(webhook) = &instance.feishu_webhook {
                let core_instance = hippox::FeishuConfig::new(
                    instance.id.clone(),
                    Some(instance.name.clone()),
                    Some(instance.description.clone()),
                    webhook.clone(),
                );
                hippox::add_feishu_instance(core_instance);
            }
        }
        "wecom" => {
            if let Some(webhook) = &instance.wecom_webhook {
                let core_instance = hippox::WeComConfig::new(
                    instance.id.clone(),
                    Some(instance.name.clone()),
                    Some(instance.description.clone()),
                    webhook.clone(),
                );
                hippox::add_wecom_instance(core_instance);
            }
        }
        "github" => {
            if let Some(token) = &instance.github_token {
                let api_url = instance
                    .github_api_url
                    .clone()
                    .unwrap_or_else(|| "https://api.github.com".to_string());
                let core_instance = hippox::GitHubConfig::new(
                    instance.id.clone(),
                    Some(instance.name.clone()),
                    Some(instance.description.clone()),
                    token.clone(),
                )
                .with_api_url(api_url);
                hippox::add_github_instance(core_instance);
            }
        }
        _ => {
            eprintln!("Unknown notification type: {}", instance.instance_type);
        }
    }
    Ok(())
}

async fn remove_database_instance_from_core(instance_type: &str, instance_id: &str) {
    match instance_type.to_lowercase().as_str() {
        "postgresql" | "postgres" => {
            let _ = hippox::remove_postgresql_instance(instance_id);
        }
        "mysql" | "mariadb" => {
            let _ = hippox::remove_mysql_instance(instance_id);
        }
        "redis" => {
            let _ = hippox::remove_redis_instance(instance_id);
        }
        "sqlite" => {
            let _ = hippox::remove_sqlite_instance(instance_id);
        }
        _ => {}
    }
}

async fn remove_container_instance_from_core(instance_type: &str, instance_id: &str) {
    match instance_type.to_lowercase().as_str() {
        "docker" => {
            let _ = hippox::remove_docker_instance(instance_id);
        }
        "kubernetes" | "k8s" => {
            let _ = hippox::remove_k8s_instance(instance_id);
        }
        _ => {}
    }
}

async fn remove_network_instance_from_core(instance_type: &str, instance_id: &str) {
    match instance_type.to_lowercase().as_str() {
        "tcp" => {
            let _ = hippox::remove_tcp_instance(instance_id);
        }
        "udp" => {
            let _ = hippox::remove_udp_instance(instance_id);
        }
        "ftp" => {
            let _ = hippox::remove_ftp_instance(instance_id);
        }
        _ => {}
    }
}

async fn remove_notification_instance_from_core(instance_type: &str, instance_id: &str) {
    match instance_type.to_lowercase().as_str() {
        "smtp" | "email" => {
            let _ = hippox::remove_smtp_instance(instance_id);
        }
        "telegram" => {
            let _ = hippox::remove_telegram_instance(instance_id);
        }
        "dingtalk" => {
            let _ = hippox::remove_dingtalk_instance(instance_id);
        }
        "feishu" => {
            let _ = hippox::remove_feishu_instance(instance_id);
        }
        "wecom" => {
            let _ = hippox::remove_wecom_instance(instance_id);
        }
        "github" => {
            let _ = hippox::remove_github_instance(instance_id);
        }
        _ => {}
    }
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
pub async fn save_container_instance(
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
pub async fn delete_container_instance(instance_id: String) -> Result<bool, String> {
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
pub async fn toggle_container_instance(instance_id: String, enabled: bool) -> Result<bool, String> {
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
pub async fn get_container_instances() -> Result<Vec<ContainerInstance>, String> {
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
pub async fn save_database_instance(
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
pub async fn delete_database_instance(instance_id: String) -> Result<bool, String> {
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
pub async fn toggle_database_instance(instance_id: String, enabled: bool) -> Result<bool, String> {
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
pub async fn get_database_instances() -> Result<Vec<DatabaseInstance>, String> {
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
pub async fn save_network_instance(
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
pub async fn delete_network_instance(instance_id: String) -> Result<bool, String> {
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
pub async fn toggle_network_instance(instance_id: String, enabled: bool) -> Result<bool, String> {
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
pub async fn get_network_instances() -> Result<Vec<NetworkInstance>, String> {
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
pub async fn save_notification_instance(
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
pub async fn delete_notification_instance(instance_id: String) -> Result<bool, String> {
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
pub async fn toggle_notification_instance(
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
pub async fn get_notification_instances() -> Result<Vec<NotificationInstance>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.engine.notification_instances.clone())
}

#[tauri::command]
pub async fn get_llm_instances() -> Result<HashMap<String, LlmInstanceForFrontend>, String> {
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
pub async fn get_default_llm_instance_id() -> Result<String, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.default_llm_instance_id.clone())
}

#[tauri::command]
pub async fn add_llm_instance(request: AddLlmInstanceRequest) -> Result<String, String> {
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
        workflow_mode: request.workflow_mode,
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
pub async fn update_llm_instance(
    instance_id: String,
    instance: LlmInstanceForFrontend,
) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if let Some(existing) = config.llm_instances.get_mut(&instance_id) {
        existing.name = instance.name;
        existing.provider = instance.provider;
        existing.api_key = instance.api_key;
        existing.api_base = instance.api_base;
        existing.workflow_mode = instance.workflow_mode;
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
pub async fn delete_llm_instance(instance_id: String) -> Result<bool, String> {
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
pub async fn set_default_llm_instance(instance_id: String) -> Result<bool, String> {
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
pub async fn get_llm_instance(
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
pub async fn get_config() -> Result<HippoxAppConfig, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.clone())
}

#[tauri::command]
pub async fn set_config(config: HippoxAppConfig) -> Result<bool, String> {
    let mut global_config = HIPPOX_APP_CONFIG.write().await;
    *global_config = config;
    if let Err(e) = save_config_to_file().await {
        eprintln!("Failed to save config to file: {}", e);
    }
    Ok(true)
}

#[tauri::command]
pub async fn update_config(path: ConfigPath, value: serde_json::Value) -> Result<bool, String> {
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
pub async fn get_config_value(path: ConfigPath) -> Result<serde_json::Value, String> {
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
        if let Ok(config) = serde_json::from_str::<HippoxAppConfig>(&content) {
            let mut global_config = HIPPOX_APP_CONFIG.write().await;
            *global_config = config;
        }
    }
    Ok(())
}

pub async fn save_config_to_file() -> Result<(), String> {
    let config_path = get_config_file_path();
    if let Some(parent) = config_path.parent() {
        if !parent.exists() {
            let _ = std::fs::create_dir_all(parent);
        }
    }
    let config = HIPPOX_APP_CONFIG.read().await;
    let content = serde_json::to_string_pretty(&*config).map_err(|e| e.to_string())?;
    std::fs::write(config_path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn get_config_file_path() -> std::path::PathBuf {
    super::paths::get_settings_dir().join("config.json")
}

#[tauri::command]
pub async fn add_llm_model(model: ModelConfig) -> Result<bool, String> {
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
pub async fn remove_llm_model(model_name: String) -> Result<bool, String> {
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
pub async fn set_default_llm_model(model_name: String) -> Result<bool, String> {
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
pub fn get_settings_language() -> Result<String, String> {
    let value = crate::common::get_setting_with_default("language", serde_json::json!("en"))?;
    Ok(value.as_str().unwrap_or("en").to_string())
}

#[tauri::command]
pub fn save_settings_language(language: String) -> Result<(), String> {
    crate::common::set_setting("language", serde_json::json!(language))
}

#[tauri::command]
pub fn get_settings_theme() -> Result<String, String> {
    let value = crate::common::get_setting_with_default("theme", serde_json::json!("dark"))?;
    Ok(value.as_str().unwrap_or("dark").to_string())
}

#[tauri::command]
pub fn save_settings_theme(theme: String) -> Result<(), String> {
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

pub async fn init_all_hippox_instances() -> Result<(), String> {
    if let Err(e) = sync_all_to_hippox_core().await {
        eprintln!("Failed to sync config to Hippox core: {}", e);
    }
    let (skills_dir, llm_instances) = {
        let config = HIPPOX_APP_CONFIG.read().await;
        (
            config.workspace.skills_dir.clone(),
            config.llm_instances.clone(),
        )
    };
    let mut instances = HIPPOX_INSTANCES.write().await;
    for (id, instance) in llm_instances {
        match init_single_hippox(&instance, &skills_dir).await {
            Ok(hippox) => {
                instances.insert(id.clone(), Arc::new(hippox));
            }
            Err(e) => {
                eprintln!("Failed to initialize {} ({}): {}", instance.name, id, e);
            }
        }
    }
    Ok(())
}

async fn init_single_hippox(instance: &LlmInstance, skills_dir: &str) -> Result<Hippox, String> {
    use hippox::{ConfigInitMethod, ModelProvider, WorkflowMode};
    let model_provider = match instance.provider.to_lowercase().as_str() {
        "openai" => ModelProvider::OpenAI,
        "anthropic" => ModelProvider::Anthropic,
        "azure" => ModelProvider::Azure,
        "google" => ModelProvider::Google,
        "deepseek" => ModelProvider::DeepSeek,
        "alibaba" => ModelProvider::Alibaba,
        "zhipu" => ModelProvider::Zhipu,
        "moonshot" => ModelProvider::Moonshot,
        "cohere" => ModelProvider::Cohere,
        "mistral" => ModelProvider::Mistral,
        "groq" => ModelProvider::Groq,
        "together" => ModelProvider::Together,
        "baichuan" => ModelProvider::Baichuan,
        "yi" => ModelProvider::Yi,
        "baidu" => ModelProvider::Baidu,
        "tencent" => ModelProvider::Tencent,
        "minimax" => ModelProvider::MiniMax,
        "custom" => ModelProvider::Custom,
        _ => ModelProvider::OpenAI,
    };
    let mode = match instance.workflow_mode.to_lowercase().as_str() {
        "batch" => WorkflowMode::Batch,
        "chain" => WorkflowMode::Chain,
        "plan_and_execute" => WorkflowMode::PlanAndExecute,
        "react" => WorkflowMode::ReAct,
        _ => WorkflowMode::ReAct,
    };
    let mut extra_keys = instance.extra.clone();
    if !instance.api_base.is_empty() && !extra_keys.contains_key("api_base") {
        extra_keys.insert("api_base".to_string(), instance.api_base.clone());
    }
    if instance.provider.to_lowercase() == "custom" && !extra_keys.contains_key("api_base") {
        if !instance.api_base.is_empty() {
            extra_keys.insert("api_base".to_string(), instance.api_base.clone());
        }
    }
    let api_key_to_use = if instance.api_key.is_empty() {
        None
    } else {
        Some(instance.api_key.clone())
    };
    Hippox::with_workflow_mode(
        model_provider,
        api_key_to_use,
        if extra_keys.is_empty() {
            None
        } else {
            Some(extra_keys)
        },
        ConfigInitMethod::ParamsJsonStr("{}".to_string()),
        mode,
    )
    .await
    .map_err(|e| format!("Failed to initialize Hippox for {}: {}", instance.name, e))
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

pub async fn get_default_hippox() -> Result<Arc<Hippox>, String> {
    let default_instance_id = {
        let config = HIPPOX_APP_CONFIG.read().await;
        if config.llm_instances.is_empty() {
            return Err(
                "No LLM instance configured. Please add an LLM configuration in settings."
                    .to_string(),
            );
        }
        config
            .llm_instances
            .iter()
            .find(|(_, instance)| instance.is_default == Some(true))
            .map(|(id, _)| id.clone())
            .or_else(|| config.llm_instances.keys().next().cloned())
            .unwrap()
    };
    get_hippox_instance(&default_instance_id).await
}
