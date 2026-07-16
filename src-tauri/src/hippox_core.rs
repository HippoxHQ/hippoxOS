use crate::commands::{get_hippox_instance, ModelConfig, HIPPOX_APP_CONFIG, HIPPOX_INSTANCES};
use hippox::{Hippox, HippoxConfig, IdentityInformation};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, sync::Arc};
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
        (config.workspace.skills_dir.clone(), config.llm_instances.clone())
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
pub(crate) async fn init_single_hippox(instance: &LlmInstance, skills_dir: &str) -> Result<Hippox, String> {
    use hippox::{ModelProvider, WorkflowMode};
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
    let mut extra_keys = instance.extra.clone();
    if !instance.api_base.is_empty() && !extra_keys.contains_key("api_base") {
        extra_keys.insert("api_base".to_string(), instance.api_base.clone());
    }
    if instance.provider.to_lowercase() == "custom" && !extra_keys.contains_key("api_base") {
        if !instance.api_base.is_empty() {
            extra_keys.insert("api_base".to_string(), instance.api_base.clone());
        }
    }
    let api_key_to_use = if instance.api_key.is_empty() { None } else { Some(instance.api_key.clone()) };
    let hippox = Hippox::with_workflow_mode(
        model_provider,
        api_key_to_use,
        if extra_keys.is_empty() { None } else { Some(extra_keys) },
        Some(HippoxConfig::default()),
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
                id.tone_style = Some("inspirational, gentle and encouraging, always using warm words".to_string());
                id.knowledge_scope = Some("computer science, omniscient across all domains, from science to arts".to_string());
                id.catchphrase = Some("Don't worry, I'll wholeheartedly help you better control your computer~ 🦛".to_string());
            });
            Ok(hippox)
        }
        Err(e) => return Err(format!("Failed to initialize Hippox for {}: {}", instance.name, e)),
    }
}
pub(crate) async fn get_default_hippox() -> Result<Arc<Hippox>, String> {
    let default_instance_id = {
        let config = HIPPOX_APP_CONFIG.read().await;
        if config.llm_instances.is_empty() {
            return Err("No LLM instance configured. Please add an LLM configuration in settings.".to_string());
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
pub(crate) async fn sync_database_instance_to_core(instance: &DatabaseInstance) -> Result<(), String> {
    Ok(())
}
pub(crate) async fn sync_container_instance_to_core(instance: &ContainerInstance) -> Result<(), String> {
    Ok(())
}
pub(crate) async fn sync_network_instance_to_core(instance: &NetworkInstance) -> Result<(), String> {
    Ok(())
}
pub(crate) async fn sync_notification_instance_to_core(instance: &NotificationInstance) -> Result<(), String> {
    Ok(())
}
pub(crate) async fn remove_database_instance_from_core(instance_type: &str, instance_id: &str) {}
pub(crate) async fn remove_container_instance_from_core(instance_type: &str, instance_id: &str) {}
pub(crate) async fn remove_network_instance_from_core(instance_type: &str, instance_id: &str) {}
pub(crate) async fn remove_notification_instance_from_core(instance_type: &str, instance_id: &str) {}
