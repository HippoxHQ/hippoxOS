use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

pub static HIPPOX_APP_CONFIG: Lazy<Arc<RwLock<HippoxAppConfig>>> =
    Lazy::new(|| Arc::new(RwLock::new(HippoxAppConfig::default())));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HippoxAppConfig {
    pub language: String,
    pub theme: String,
    pub llm: LlmConfig,
    pub workspace: WorkspaceConfig,
    pub engine: EngineConfig,
    pub system: SystemConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmConfig {
    pub default_model: String,
    pub api_key: String,
    pub api_base: String,
    pub provider: String,
    pub workflow_mode: String,
    pub models: Vec<ModelConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub name: String,
    pub api_key: String,
    pub is_default: bool,
    pub provider: String,
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
        Self {
            language: "en".to_string(),
            theme: "dark".to_string(),
            llm: LlmConfig {
                default_model: "gpt-4".to_string(),
                api_key: "".to_string(),
                api_base: "https://api.openai.com/v1".to_string(),
                provider: "openai".to_string(),
                workflow_mode: "react".to_string(),
                models: vec![
                    ModelConfig {
                        name: "hippox-default-v1".to_string(),
                        api_key: "".to_string(),
                        is_default: true,
                        provider: "custom".to_string(),
                    },
                    ModelConfig {
                        name: "gpt-4".to_string(),
                        api_key: "".to_string(),
                        is_default: false,
                        provider: "openai".to_string(),
                    },
                    ModelConfig {
                        name: "claude-3-opus".to_string(),
                        api_key: "".to_string(),
                        is_default: false,
                        provider: "anthropic".to_string(),
                    },
                ],
            },
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConfigPath {
    Language,
    Theme,
    Llm(String),
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
        ConfigPath::Llm(key) => match key.as_str() {
            "default_model" => {
                if let Some(v) = value.as_str() {
                    config.llm.default_model = v.to_string();
                }
            }
            "api_key" => {
                if let Some(v) = value.as_str() {
                    config.llm.api_key = v.to_string();
                }
            }
            "api_base" => {
                if let Some(v) = value.as_str() {
                    config.llm.api_base = v.to_string();
                }
            }
            "provider" => {
                if let Some(v) = value.as_str() {
                    config.llm.provider = v.to_string();
                }
            }
            "workflow_mode" => {
                if let Some(v) = value.as_str() {
                    config.llm.workflow_mode = v.to_string();
                }
            }
            _ => {}
        },
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
        ConfigPath::Llm(key) => match key.as_str() {
            "default_model" => serde_json::json!(config.llm.default_model),
            "api_key" => serde_json::json!(config.llm.api_key),
            "api_base" => serde_json::json!(config.llm.api_base),
            "provider" => serde_json::json!(config.llm.provider),
            "workflow_mode" => serde_json::json!(config.llm.workflow_mode),
            "models" => serde_json::json!(config.llm.models),
            _ => serde_json::Value::Null,
        },
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
        ConfigPath::Engine(key) => {
            serde_json::json!({})
        }
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
    let home = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
    home.join(".hippox").join("config.json")
}

#[tauri::command]
pub async fn add_llm_model(model: ModelConfig) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    config.llm.models.push(model);
    save_config_to_file().await?;
    Ok(true)
}

#[tauri::command]
pub async fn remove_llm_model(model_name: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    config.llm.models.retain(|m| m.name != model_name);
    save_config_to_file().await?;
    Ok(true)
}

#[tauri::command]
pub async fn set_default_llm_model(model_name: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    for model in &mut config.llm.models {
        model.is_default = model.name == model_name;
    }
    config.llm.default_model = model_name;
    save_config_to_file().await?;
    Ok(true)
}
