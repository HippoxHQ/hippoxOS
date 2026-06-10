use std::{collections::HashMap, sync::Arc};

use hippox::{Hippox, IdentityInformation};
use serde::{Deserialize, Serialize};

use crate::commands::{get_hippox_instance, ModelConfig, HIPPOX_APP_CONFIG, HIPPOX_INSTANCES};

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

pub(crate) async fn init_all_hippox_instances() -> Result<(), String> {
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

pub(crate) async fn init_single_hippox(
    instance: &LlmInstance,
    skills_dir: &str,
) -> Result<Hippox, String> {
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
    let hippox = Hippox::with_workflow_mode(
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
    .map_err(|e| format!("Failed to initialize Hippox for {}: {}", instance.name, e));
    match hippox {
        Ok(hippox) => {
            hippox.update_identity(|id: &mut IdentityInformation| {
                id.name = Some("HippoxOS".to_string());
                id.age = Some("18".to_string());
                id.species = Some("hippo".to_string());
                id.sex = Some("woman".to_string());
                id.role = Some("Omniscient and omnipotent AI Hippo".to_string());
                id.personality = Some("warm, patient, and endlessly caring".to_string());
                id.tone_style = Some(
                    "inspirational, gentle and encouraging, always using warm words".to_string(),
                );
                id.knowledge_scope = Some(
                    "computer science, omniscient across all domains, from science to arts"
                        .to_string(),
                );
                id.catchphrase = Some(
                    "Don't worry, I'll wholeheartedly help you better control your computer~ 🦛"
                        .to_string(),
                );
            });
            Ok(hippox)
        }
        Err(e) => {
            return Err(format!(
                "Failed to initialize Hippox for {}: {}",
                instance.name, e
            ))
        }
    }
}

pub(crate) async fn get_default_hippox() -> Result<Arc<Hippox>, String> {
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

pub(crate) async fn sync_all_to_hippox_core() -> Result<(), String> {
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

pub(crate) async fn sync_database_instance_to_core(
    instance: &DatabaseInstance,
) -> Result<(), String> {
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

pub(crate) async fn sync_container_instance_to_core(
    instance: &ContainerInstance,
) -> Result<(), String> {
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

pub(crate) async fn sync_network_instance_to_core(
    instance: &NetworkInstance,
) -> Result<(), String> {
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

pub(crate) async fn sync_notification_instance_to_core(
    instance: &NotificationInstance,
) -> Result<(), String> {
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

pub(crate) async fn remove_database_instance_from_core(instance_type: &str, instance_id: &str) {
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

pub(crate) async fn remove_container_instance_from_core(instance_type: &str, instance_id: &str) {
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

pub(crate) async fn remove_network_instance_from_core(instance_type: &str, instance_id: &str) {
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

pub(crate) async fn remove_notification_instance_from_core(instance_type: &str, instance_id: &str) {
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
