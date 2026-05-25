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
        WorkspaceConfigData, WorkspaceInstance, add_workspace, delete_workspace, get_all_workspaces, get_default_workspace, load_workspace_config, set_default_workspace, update_workspace
    },
};

pub static HIPPOX_APP_CONFIG: Lazy<Arc<RwLock<HippoxAppConfig>>> =
    Lazy::new(|| Arc::new(RwLock::new(HippoxAppConfig::default())));

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
pub struct EngineConfig {
    pub postgresql: DatabaseConfig,
    pub mysql: DatabaseConfig,
    pub redis: RedisConfig,
    pub sqlite: SqliteConfig,
    pub tcp: TcpConfig,
    pub udp: UdpConfig,
    pub ftp: FtpConfig,
    pub docker: DockerConfig,
    pub k8s: K8sConfig,
    pub smtp: SmtpConfig,
    pub telegram: TelegramConfig,
    pub dingtalk: DingtalkConfig,
    pub feishu: FeishuConfig,
    pub wecom: WecomConfig,
    pub github: GithubConfig,
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
        let mut instances = HashMap::new();
        let default_id = Uuid::new_v4().to_string();
        instances.insert(
            default_id.clone(),
            LlmInstance {
                id: Some(default_id.clone()),
                name: "Default Instance".to_string(),
                provider: "openai".to_string(),
                api_key: "".to_string(),
                api_base: "https://api.openai.com/v1".to_string(),
                workflow_mode: "react".to_string(),
                default_model: "gpt-4".to_string(),
                models: vec![ModelConfig {
                    name: "gpt-4".to_string(),
                    api_key: "".to_string(),
                    is_default: true,
                    provider: "openai".to_string(),
                }],
                created_at: Some(chrono::Local::now().to_rfc3339()),
                updated_at: Some(chrono::Local::now().to_rfc3339()),
            },
        );

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
            engine: EngineConfig {
                postgresql: DatabaseConfig {
                    host: "localhost".to_string(),
                    port: 5432,
                    database: "".to_string(),
                    username: "".to_string(),
                    password: "".to_string(),
                },
                mysql: DatabaseConfig {
                    host: "localhost".to_string(),
                    port: 3306,
                    database: "".to_string(),
                    username: "".to_string(),
                    password: "".to_string(),
                },
                redis: RedisConfig {
                    host: "localhost".to_string(),
                    port: 6379,
                    password: "".to_string(),
                    db: 0,
                },
                sqlite: SqliteConfig {
                    path: "".to_string(),
                },
                tcp: TcpConfig {
                    host: "127.0.0.1".to_string(),
                    port: 8888,
                    encoding: "utf8".to_string(),
                },
                udp: UdpConfig {
                    host: "127.0.0.1".to_string(),
                    port: 9999,
                    encoding: "utf8".to_string(),
                    broadcast: false,
                },
                ftp: FtpConfig {
                    host: "".to_string(),
                    port: 21,
                    username: "anonymous".to_string(),
                    password: "".to_string(),
                    remote_dir: "/".to_string(),
                },
                docker: DockerConfig {
                    host: "unix:///var/run/docker.sock".to_string(),
                    api_version: "".to_string(),
                    tls_verify: false,
                },
                k8s: K8sConfig {
                    kubeconfig: "".to_string(),
                    context: "".to_string(),
                    namespace: "default".to_string(),
                },
                smtp: SmtpConfig {
                    host: "".to_string(),
                    port: 587,
                    username: "".to_string(),
                    password: "".to_string(),
                    from: "".to_string(),
                },
                telegram: TelegramConfig {
                    bot_token: "".to_string(),
                },
                dingtalk: DingtalkConfig {
                    access_token: "".to_string(),
                },
                feishu: FeishuConfig {
                    webhook: "".to_string(),
                },
                wecom: WecomConfig {
                    webhook: "".to_string(),
                },
                github: GithubConfig {
                    token: "".to_string(),
                    api_url: "https://api.github.com".to_string(),
                },
            },
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

#[tauri::command]
pub async fn get_llm_instances() -> Result<HashMap<String, LlmInstanceForFrontend>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    let mut result = HashMap::new();
    for (key, instance) in config.llm_instances.iter() {
        result.insert(key.clone(), instance.into());
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
    println!("add_llm_instance called with request: {:?}", request);
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Local::now().to_rfc3339();

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
    };
    config.llm_instances.insert(id.clone(), new_instance);
    if config.llm_instances.len() == 1 {
        config.default_llm_instance_id = id.clone();
    }
    // unlock
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
            if let Some(first_id) = config.llm_instances.keys().next() {
                config.default_llm_instance_id = first_id.clone();
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
        config.default_llm_instance_id = instance_id;
        // unlock
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
        ConfigPath::Engine(key) => {}
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
        ConfigPath::Engine(key) => serde_json::json!({}),
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
        // unlock
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
