use crate::{
    commands::{save_config_to_file, LlmInstanceForFrontend, ModelConfig, HIPPOX_APP_CONFIG},
    hippox_core::LlmInstance,
};
use hippox::{AudioModelProvider, ImageModelProvider, ModelProvider, VideoModelProvider};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddLlmInstanceRequest {
    pub name: String,
    pub provider: String,
    pub api_key: String,
    pub api_base: String,
    pub default_model: String,
    pub models: Vec<ModelConfig>,
    pub is_default: Option<bool>,
    #[serde(default)]
    pub extra: HashMap<String, String>,
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
    let should_be_default = if is_first_instance { true } else { request.is_default.unwrap_or(false) };
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
pub async fn cmd_update_llm_instance(instance_id: String, instance: LlmInstanceForFrontend) -> Result<bool, String> {
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
pub async fn cmd_get_llm_instance(instance_id: String) -> Result<Option<LlmInstanceForFrontend>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.llm_instances.get(&instance_id).map(|instance| instance.into()))
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
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub provider_name: String,
    pub description: String,
    pub streaming: bool,
    pub context_length: Option<usize>,
    pub recommended: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub requires_api_key: bool,
    pub requires_extra_config: bool,
    pub extra_config_fields: Vec<ExtraConfigField>,
    /// Short English description of what this provider is good at.
    pub description: String,
    /// Short Chinese description of what this provider is good at.
    pub description_zh: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtraConfigField {
    pub key: String,
    pub name: String,
    pub placeholder: String,
    pub required: bool,
}
fn get_language() -> String {
    crate::commons::get_setting_with_default("language", serde_json::json!("en"))
        .map(|v| v.as_str().unwrap_or("en").to_string())
        .unwrap_or_else(|_| "en".to_string())
}
#[tauri::command]
pub fn cmd_get_all_models() -> Vec<ModelInfo> {
    let lang = get_language();
    let is_zh = lang == "zh";
    vec![
        ModelInfo {
            id: "gpt-4".to_string(),
            name: if is_zh { "GPT-4".to_string() } else { "GPT-4".to_string() },
            provider: "openai".to_string(),
            provider_name: if is_zh { "OpenAI".to_string() } else { "OpenAI".to_string() },
            description: if is_zh {
                "最强大的GPT-4模型，适合复杂任务".to_string()
            } else {
                "The most powerful GPT-4 model, suitable for complex tasks".to_string()
            },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "claude-3-opus".to_string(),
            name: if is_zh { "Claude 3 Opus".to_string() } else { "Claude 3 Opus".to_string() },
            provider: "anthropic".to_string(),
            provider_name: if is_zh { "Anthropic".to_string() } else { "Anthropic".to_string() },
            description: if is_zh { "最强大的Claude 3模型".to_string() } else { "The most powerful Claude 3 model".to_string() },
            streaming: true,
            context_length: Some(200000),
            recommended: true,
        },
        ModelInfo {
            id: "deepseek-chat".to_string(),
            name: if is_zh { "DeepSeek Chat".to_string() } else { "DeepSeek Chat".to_string() },
            provider: "deepseek".to_string(),
            provider_name: if is_zh { "DeepSeek".to_string() } else { "DeepSeek".to_string() },
            description: if is_zh { "DeepSeek对话模型".to_string() } else { "DeepSeek chat model".to_string() },
            streaming: true,
            context_length: Some(64000),
            recommended: true,
        },
        ModelInfo {
            id: "gemini-1.5-pro".to_string(),
            name: if is_zh { "Gemini 1.5 Pro".to_string() } else { "Gemini 1.5 Pro".to_string() },
            provider: "google".to_string(),
            provider_name: if is_zh { "Google".to_string() } else { "Google".to_string() },
            description: if is_zh { "Gemini 1.5 Pro，百万级上下文".to_string() } else { "Gemini 1.5 Pro, million-level context".to_string() },
            streaming: true,
            context_length: Some(1000000),
            recommended: true,
        },
        ModelInfo {
            id: "mixtral-8x7b-32k".to_string(),
            name: if is_zh { "Mixtral 8x7B".to_string() } else { "Mixtral 8x7B".to_string() },
            provider: "groq".to_string(),
            provider_name: if is_zh { "Groq".to_string() } else { "Groq".to_string() },
            description: if is_zh { "Groq加速的Mixtral模型".to_string() } else { "Groq-accelerated Mixtral model".to_string() },
            streaming: true,
            context_length: Some(32768),
            recommended: true,
        },
        ModelInfo {
            id: "llama3-70b".to_string(),
            name: if is_zh { "Llama 3 70B".to_string() } else { "Llama 3 70B".to_string() },
            provider: "together".to_string(),
            provider_name: if is_zh { "Together.ai".to_string() } else { "Together.ai".to_string() },
            description: if is_zh { "Together.ai托管的Llama 3 70B".to_string() } else { "Together.ai hosted Llama 3 70B".to_string() },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "mistral-large".to_string(),
            name: if is_zh { "Mistral Large".to_string() } else { "Mistral Large".to_string() },
            provider: "mistral".to_string(),
            provider_name: if is_zh { "Mistral AI".to_string() } else { "Mistral AI".to_string() },
            description: if is_zh { "Mistral Large模型".to_string() } else { "Mistral Large model".to_string() },
            streaming: true,
            context_length: Some(32768),
            recommended: true,
        },
        ModelInfo {
            id: "command-r-plus".to_string(),
            name: if is_zh { "Command R+".to_string() } else { "Command R+".to_string() },
            provider: "cohere".to_string(),
            provider_name: if is_zh { "Cohere".to_string() } else { "Cohere".to_string() },
            description: if is_zh { "Cohere Command R+模型".to_string() } else { "Cohere Command R+ model".to_string() },
            streaming: true,
            context_length: Some(128000),
            recommended: true,
        },
        ModelInfo {
            id: "qwen-plus".to_string(),
            name: if is_zh { "通义千问 Plus".to_string() } else { "Qwen Plus".to_string() },
            provider: "alibaba".to_string(),
            provider_name: if is_zh { "阿里云".to_string() } else { "Alibaba Cloud".to_string() },
            description: if is_zh { "阿里云通义千问Plus模型".to_string() } else { "Alibaba Tongyi Qianwen Plus model".to_string() },
            streaming: true,
            context_length: Some(32768),
            recommended: true,
        },
        ModelInfo {
            id: "glm-4".to_string(),
            name: if is_zh { "GLM-4".to_string() } else { "GLM-4".to_string() },
            provider: "zhipu".to_string(),
            provider_name: if is_zh { "智谱 AI".to_string() } else { "Zhipu AI".to_string() },
            description: if is_zh { "智谱AI GLM-4模型".to_string() } else { "Zhipu AI GLM-4 model".to_string() },
            streaming: true,
            context_length: Some(128000),
            recommended: true,
        },
        ModelInfo {
            id: "moonshot-v1-128k".to_string(),
            name: if is_zh { "Moonshot V1".to_string() } else { "Moonshot V1".to_string() },
            provider: "moonshot".to_string(),
            provider_name: if is_zh { "月之暗面".to_string() } else { "Moonshot AI".to_string() },
            description: if is_zh { "月之暗面Kimi模型".to_string() } else { "Moonshot Kimi model".to_string() },
            streaming: true,
            context_length: Some(128000),
            recommended: true,
        },
        ModelInfo {
            id: "baichuan4".to_string(),
            name: if is_zh { "Baichuan 4".to_string() } else { "Baichuan 4".to_string() },
            provider: "baichuan".to_string(),
            provider_name: if is_zh { "百川智能".to_string() } else { "Baichuan AI".to_string() },
            description: if is_zh { "百川智能Baichuan 4模型".to_string() } else { "Baichuan AI Baichuan 4 model".to_string() },
            streaming: true,
            context_length: Some(32768),
            recommended: false,
        },
        ModelInfo {
            id: "yi-34b-chat".to_string(),
            name: if is_zh { "Yi-34B-Chat".to_string() } else { "Yi-34B-Chat".to_string() },
            provider: "yi".to_string(),
            provider_name: if is_zh { "零一万物".to_string() } else { "01.AI".to_string() },
            description: if is_zh { "零一万物Yi-34B对话模型".to_string() } else { "01.AI Yi-34B chat model".to_string() },
            streaming: true,
            context_length: Some(32768),
            recommended: false,
        },
        ModelInfo {
            id: "gpt-4".to_string(),
            name: if is_zh { "GPT-4".to_string() } else { "GPT-4".to_string() },
            provider: "azure".to_string(),
            provider_name: if is_zh { "Azure OpenAI".to_string() } else { "Azure OpenAI".to_string() },
            description: if is_zh { "Azure托管的GPT-4".to_string() } else { "Azure hosted GPT-4".to_string() },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "ernie-4.0".to_string(),
            name: if is_zh { "ERNIE 4.0".to_string() } else { "ERNIE 4.0".to_string() },
            provider: "baidu".to_string(),
            provider_name: if is_zh { "百度文心".to_string() } else { "Baidu".to_string() },
            description: if is_zh { "百度文心一言ERNIE 4.0".to_string() } else { "Baidu Wenxin ERNIE 4.0".to_string() },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "hunyuan-pro".to_string(),
            name: if is_zh { "Hunyuan Pro".to_string() } else { "Hunyuan Pro".to_string() },
            provider: "tencent".to_string(),
            provider_name: if is_zh { "腾讯混元".to_string() } else { "Tencent".to_string() },
            description: if is_zh { "腾讯混元Pro模型".to_string() } else { "Tencent Hunyuan Pro model".to_string() },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
        ModelInfo {
            id: "abab6.5".to_string(),
            name: if is_zh { "abab6.5".to_string() } else { "abab6.5".to_string() },
            provider: "minimax".to_string(),
            provider_name: if is_zh { "MiniMax".to_string() } else { "MiniMax".to_string() },
            description: if is_zh { "MiniMax abab6.5模型".to_string() } else { "MiniMax abab6.5 model".to_string() },
            streaming: true,
            context_length: Some(8192),
            recommended: true,
        },
    ]
}
/// Maps a `ModelProvider` variant to its provider id string used by the
/// frontend (lowercase, matching the historical hard-coded ids below).
fn model_provider_id(provider: &ModelProvider) -> &'static str {
    match provider {
        ModelProvider::OpenAI => "openai",
        ModelProvider::Anthropic => "anthropic",
        ModelProvider::Google => "google",
        ModelProvider::DeepSeek => "deepseek",
        ModelProvider::Cohere => "cohere",
        ModelProvider::HuggingFace => "huggingface",
        ModelProvider::Azure => "azure",
        ModelProvider::Mistral => "mistral",
        ModelProvider::Groq => "groq",
        ModelProvider::Together => "together",
        ModelProvider::Replicate => "replicate",
        ModelProvider::Fireworks => "fireworks",
        ModelProvider::Perplexity => "perplexity",
        ModelProvider::Baidu => "baidu",
        ModelProvider::Alibaba => "alibaba",
        ModelProvider::Tencent => "tencent",
        ModelProvider::Zhipu => "zhipu",
        ModelProvider::MiniMax => "minimax",
        ModelProvider::Moonshot => "moonshot",
        ModelProvider::Baichuan => "baichuan",
        ModelProvider::Yi => "yi",
        ModelProvider::Custom => "custom",
    }
}
#[tauri::command]
pub fn cmd_get_all_providers() -> Vec<ProviderInfo> {
    vec![
        ProviderInfo {
            id: "openai".to_string(),
            name: "OpenAI".to_string(),
            icon: "🔵".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::OpenAI.description().to_string(),
            description_zh: ModelProvider::OpenAI.description_zh().to_string(),
        },
        ProviderInfo {
            id: "anthropic".to_string(),
            name: "Anthropic".to_string(),
            icon: "🟣".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::Anthropic.description().to_string(),
            description_zh: ModelProvider::Anthropic.description_zh().to_string(),
        },
        ProviderInfo {
            id: "deepseek".to_string(),
            name: "DeepSeek".to_string(),
            icon: "🟢".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::DeepSeek.description().to_string(),
            description_zh: ModelProvider::DeepSeek.description_zh().to_string(),
        },
        ProviderInfo {
            id: "google".to_string(),
            name: "Google".to_string(),
            icon: "🔴".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::Google.description().to_string(),
            description_zh: ModelProvider::Google.description_zh().to_string(),
        },
        ProviderInfo {
            id: "groq".to_string(),
            name: "Groq".to_string(),
            icon: "⚡".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::Groq.description().to_string(),
            description_zh: ModelProvider::Groq.description_zh().to_string(),
        },
        ProviderInfo {
            id: "together".to_string(),
            name: "Together.ai".to_string(),
            icon: "🤝".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::Together.description().to_string(),
            description_zh: ModelProvider::Together.description_zh().to_string(),
        },
        ProviderInfo {
            id: "mistral".to_string(),
            name: "Mistral AI".to_string(),
            icon: "🪶".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::Mistral.description().to_string(),
            description_zh: ModelProvider::Mistral.description_zh().to_string(),
        },
        ProviderInfo {
            id: "cohere".to_string(),
            name: "Cohere".to_string(),
            icon: "📐".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::Cohere.description().to_string(),
            description_zh: ModelProvider::Cohere.description_zh().to_string(),
        },
        ProviderInfo {
            id: "alibaba".to_string(),
            name: "阿里云".to_string(),
            icon: "☁️".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::Alibaba.description().to_string(),
            description_zh: ModelProvider::Alibaba.description_zh().to_string(),
        },
        ProviderInfo {
            id: "zhipu".to_string(),
            name: "智谱 AI".to_string(),
            icon: "🧠".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::Zhipu.description().to_string(),
            description_zh: ModelProvider::Zhipu.description_zh().to_string(),
        },
        ProviderInfo {
            id: "moonshot".to_string(),
            name: "月之暗面".to_string(),
            icon: "🌙".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::Moonshot.description().to_string(),
            description_zh: ModelProvider::Moonshot.description_zh().to_string(),
        },
        ProviderInfo {
            id: "baichuan".to_string(),
            name: "百川智能".to_string(),
            icon: "🌊".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::Baichuan.description().to_string(),
            description_zh: ModelProvider::Baichuan.description_zh().to_string(),
        },
        ProviderInfo {
            id: "yi".to_string(),
            name: "零一万物".to_string(),
            icon: "1️⃣".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: ModelProvider::Yi.description().to_string(),
            description_zh: ModelProvider::Yi.description_zh().to_string(),
        },
        ProviderInfo {
            id: "azure".to_string(),
            name: "Azure OpenAI".to_string(),
            icon: "☁️".to_string(),
            requires_api_key: true,
            requires_extra_config: true,
            extra_config_fields: vec![
                ExtraConfigField {
                    key: "endpoint".to_string(),
                    name: "Endpoint URL".to_string(),
                    placeholder: "https://your-resource.openai.azure.com/".to_string(),
                    required: true,
                },
                ExtraConfigField {
                    key: "deployment_name".to_string(),
                    name: "Deployment Name".to_string(),
                    placeholder: "gpt-4".to_string(),
                    required: true,
                },
            ],
            description: ModelProvider::Azure.description().to_string(),
            description_zh: ModelProvider::Azure.description_zh().to_string(),
        },
        ProviderInfo {
            id: "baidu".to_string(),
            name: "百度文心".to_string(),
            icon: "🔍".to_string(),
            requires_api_key: true,
            requires_extra_config: true,
            extra_config_fields: vec![ExtraConfigField {
                key: "secret_key".to_string(),
                name: "Secret Key".to_string(),
                placeholder: "your secret key".to_string(),
                required: true,
            }],
            description: ModelProvider::Baidu.description().to_string(),
            description_zh: ModelProvider::Baidu.description_zh().to_string(),
        },
        ProviderInfo {
            id: "tencent".to_string(),
            name: "腾讯混元".to_string(),
            icon: "🐧".to_string(),
            requires_api_key: true,
            requires_extra_config: true,
            extra_config_fields: vec![
                ExtraConfigField {
                    key: "secret_id".to_string(),
                    name: "Secret ID".to_string(),
                    placeholder: "your secret id".to_string(),
                    required: true,
                },
                ExtraConfigField {
                    key: "secret_key".to_string(),
                    name: "Secret Key".to_string(),
                    placeholder: "your secret key".to_string(),
                    required: true,
                },
            ],
            description: ModelProvider::Tencent.description().to_string(),
            description_zh: ModelProvider::Tencent.description_zh().to_string(),
        },
        ProviderInfo {
            id: "minimax".to_string(),
            name: "MiniMax".to_string(),
            icon: "🎯".to_string(),
            requires_api_key: true,
            requires_extra_config: true,
            extra_config_fields: vec![ExtraConfigField {
                key: "group_id".to_string(),
                name: "Group ID".to_string(),
                placeholder: "your group id".to_string(),
                required: true,
            }],
            description: ModelProvider::MiniMax.description().to_string(),
            description_zh: ModelProvider::MiniMax.description_zh().to_string(),
        },
        ProviderInfo {
            id: "custom".to_string(),
            name: "Custom API".to_string(),
            icon: "🦛".to_string(),
            requires_api_key: true,
            requires_extra_config: true,
            extra_config_fields: vec![ExtraConfigField {
                key: "api_base".to_string(),
                name: "API Base URL".to_string(),
                placeholder: "https://api.example.com/v1".to_string(),
                required: true,
            }],
            description: ModelProvider::Custom.description().to_string(),
            description_zh: ModelProvider::Custom.description_zh().to_string(),
        },
    ]
}
#[tauri::command]
pub fn cmd_get_models_by_provider(provider: String) -> Vec<ModelInfo> {
    cmd_get_all_models().into_iter().filter(|m| m.provider == provider).collect()
}
#[tauri::command]
pub fn cmd_get_recommended_models() -> Vec<ModelInfo> {
    cmd_get_all_models().into_iter().filter(|m| m.recommended).collect()
}
// ---------------------------------------------------------------------------
// Image (text-to-image) model & provider catalog
// ---------------------------------------------------------------------------
/// Returns all supported text-to-image models.
#[tauri::command]
pub fn cmd_get_all_image_models() -> Vec<ModelInfo> {
    let lang = get_language();
    let is_zh = lang == "zh";
    let mut result = Vec::new();
    for provider in ImageModelProvider::all() {
        let provider_id = provider.to_string();
        let provider_name = provider.to_string();
        for (model_id, display_name, recommended) in provider.models() {
            let description = if is_zh { format!("{} 文生图模型", display_name) } else { format!("{} text-to-image model", display_name) };
            result.push(ModelInfo {
                id: model_id,
                name: display_name,
                provider: provider_id.clone(),
                provider_name: provider_name.clone(),
                description,
                streaming: false,
                context_length: None,
                recommended,
            });
        }
    }
    result
}
/// Returns all supported image generation providers.
#[tauri::command]
pub fn cmd_get_all_image_providers() -> Vec<ProviderInfo> {
    ImageModelProvider::all()
        .into_iter()
        .map(|provider| ProviderInfo {
            id: provider.to_string(),
            name: provider.to_string(),
            icon: "🖼️".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: provider.description().to_string(),
            description_zh: provider.description_zh().to_string(),
        })
        .collect()
}
/// Returns image models filtered by provider.
#[tauri::command]
pub fn cmd_get_image_models_by_provider(provider: String) -> Vec<ModelInfo> {
    cmd_get_all_image_models().into_iter().filter(|m| m.provider == provider).collect()
}
/// Returns recommended image models.
#[tauri::command]
pub fn cmd_get_recommended_image_models() -> Vec<ModelInfo> {
    cmd_get_all_image_models().into_iter().filter(|m| m.recommended).collect()
}
// ---------------------------------------------------------------------------
// Video (text-to-video) model & provider catalog
// ---------------------------------------------------------------------------
/// Returns all supported text-to-video models.
#[tauri::command]
pub fn cmd_get_all_video_models() -> Vec<ModelInfo> {
    let lang = get_language();
    let is_zh = lang == "zh";
    let mut result = Vec::new();
    for provider in VideoModelProvider::all() {
        let provider_id = provider.to_string();
        let provider_name = provider.to_string();
        for (model_id, display_name, recommended) in provider.models() {
            let description = if is_zh { format!("{} 文生视频模型", display_name) } else { format!("{} text-to-video model", display_name) };
            result.push(ModelInfo {
                id: model_id,
                name: display_name,
                provider: provider_id.clone(),
                provider_name: provider_name.clone(),
                description,
                streaming: false,
                context_length: None,
                recommended,
            });
        }
    }
    result
}
/// Returns all supported video generation providers.
#[tauri::command]
pub fn cmd_get_all_video_providers() -> Vec<ProviderInfo> {
    VideoModelProvider::all()
        .into_iter()
        .map(|provider| ProviderInfo {
            id: provider.to_string(),
            name: provider.to_string(),
            icon: "🎬".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: provider.description().to_string(),
            description_zh: provider.description_zh().to_string(),
        })
        .collect()
}
/// Returns video models filtered by provider.
#[tauri::command]
pub fn cmd_get_video_models_by_provider(provider: String) -> Vec<ModelInfo> {
    cmd_get_all_video_models().into_iter().filter(|m| m.provider == provider).collect()
}
/// Returns recommended video models.
#[tauri::command]
pub fn cmd_get_recommended_video_models() -> Vec<ModelInfo> {
    cmd_get_all_video_models().into_iter().filter(|m| m.recommended).collect()
}
// ---------------------------------------------------------------------------
// Audio (TTS / audio gen / music) model & provider catalog
// ---------------------------------------------------------------------------
/// Returns all supported audio models.
#[tauri::command]
pub fn cmd_get_all_audio_models() -> Vec<ModelInfo> {
    let lang = get_language();
    let is_zh = lang == "zh";
    let mut result = Vec::new();
    for provider in AudioModelProvider::all() {
        let provider_id = provider.to_string();
        let provider_name = provider.to_string();
        // Use the provider-level description so the frontend can show what
        // each provider is good at without reading external docs.
        let provider_description = if is_zh { provider.description_zh() } else { provider.description() };
        for (model_id, display_name, recommended) in provider.models() {
            result.push(ModelInfo {
                id: model_id,
                name: display_name,
                provider: provider_id.clone(),
                provider_name: provider_name.clone(),
                description: provider_description.to_string(),
                streaming: false,
                context_length: None,
                recommended,
            });
        }
    }
    result
}
/// Returns all supported audio generation providers.
#[tauri::command]
pub fn cmd_get_all_audio_providers() -> Vec<ProviderInfo> {
    AudioModelProvider::all()
        .into_iter()
        .map(|provider| ProviderInfo {
            id: provider.to_string(),
            name: provider.to_string(),
            icon: "🔊".to_string(),
            requires_api_key: true,
            requires_extra_config: false,
            extra_config_fields: vec![],
            description: provider.description().to_string(),
            description_zh: provider.description_zh().to_string(),
        })
        .collect()
}
/// Returns audio models filtered by provider.
#[tauri::command]
pub fn cmd_get_audio_models_by_provider(provider: String) -> Vec<ModelInfo> {
    cmd_get_all_audio_models().into_iter().filter(|m| m.provider == provider).collect()
}
/// Returns recommended audio models.
#[tauri::command]
pub fn cmd_get_recommended_audio_models() -> Vec<ModelInfo> {
    cmd_get_all_audio_models().into_iter().filter(|m| m.recommended).collect()
}
// ---------------------------------------------------------------------------
// Image generation instance management
// ---------------------------------------------------------------------------
/// Image generation instance stored in the app config.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageInstance {
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
/// Image instance shape exposed to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageInstanceForFrontend {
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
impl From<&ImageInstance> for ImageInstanceForFrontend {
    fn from(instance: &ImageInstance) -> Self {
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
/// Request payload for adding an image generation instance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddImageInstanceRequest {
    pub name: String,
    pub provider: String,
    pub api_key: String,
    pub api_base: String,
    pub default_model: String,
    pub models: Vec<ModelConfig>,
    pub is_default: Option<bool>,
    #[serde(default)]
    pub extra: HashMap<String, String>,
}
/// Adds a new image generation instance.
#[tauri::command]
pub async fn cmd_add_image_instance(request: AddImageInstanceRequest) -> Result<String, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Local::now().to_rfc3339();
    let is_first_instance = config.image_instances.is_empty();
    let should_be_default = if is_first_instance { true } else { request.is_default.unwrap_or(false) };
    let new_instance = ImageInstance {
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
    config.image_instances.insert(id.clone(), new_instance);
    if should_be_default {
        config.default_image_instance_id = id.clone();
    } else if config.default_image_instance_id.is_empty() && !config.image_instances.is_empty() {
        if let Some(first_id) = config.image_instances.keys().next() {
            config.default_image_instance_id = first_id.clone();
        }
    }
    drop(config);
    save_config_to_file().await?;
    Ok(id)
}
/// Updates an existing image generation instance.
#[tauri::command]
pub async fn cmd_update_image_instance(instance_id: String, instance: ImageInstanceForFrontend) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if let Some(existing) = config.image_instances.get_mut(&instance_id) {
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
        Err("Image instance not found".to_string())
    }
}
/// Deletes an image generation instance.
#[tauri::command]
pub async fn cmd_delete_image_instance(instance_id: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if config.image_instances.remove(&instance_id).is_some() {
        if config.default_image_instance_id == instance_id {
            if let Some(first_id) = config.image_instances.keys().next().cloned() {
                config.default_image_instance_id = first_id.clone();
                if let Some(instance) = config.image_instances.get_mut(&first_id) {
                    instance.is_default = Some(true);
                }
            } else {
                config.default_image_instance_id = String::new();
            }
        }
        drop(config);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("Image instance not found".to_string())
    }
}
/// Sets the default image generation instance.
#[tauri::command]
pub async fn cmd_set_default_image_instance(instance_id: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if config.image_instances.contains_key(&instance_id) {
        for (_, instance) in config.image_instances.iter_mut() {
            instance.is_default = Some(false);
        }
        if let Some(instance) = config.image_instances.get_mut(&instance_id) {
            instance.is_default = Some(true);
        }
        config.default_image_instance_id = instance_id.clone();
        drop(config);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("Image instance not found".to_string())
    }
}
/// Gets a single image generation instance by ID.
#[tauri::command]
pub async fn cmd_get_image_instance(instance_id: String) -> Result<Option<ImageInstanceForFrontend>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.image_instances.get(&instance_id).map(|instance| instance.into()))
}
/// Gets all image generation instances.
#[tauri::command]
pub async fn cmd_get_image_instances() -> Result<HashMap<String, ImageInstanceForFrontend>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    let default_id = &config.default_image_instance_id;
    let mut result = HashMap::new();
    for (key, instance) in config.image_instances.iter() {
        let mut frontend_instance: ImageInstanceForFrontend = instance.into();
        frontend_instance.is_default = Some(key == default_id);
        result.insert(key.clone(), frontend_instance);
    }
    Ok(result)
}
/// Gets the default image generation instance ID.
#[tauri::command]
pub async fn cmd_get_default_image_instance_id() -> Result<String, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.default_image_instance_id.clone())
}
// ---------------------------------------------------------------------------
// Video generation instance management
// ---------------------------------------------------------------------------
/// Video generation instance stored in the app config.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInstance {
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
/// Video instance shape exposed to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInstanceForFrontend {
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
impl From<&VideoInstance> for VideoInstanceForFrontend {
    fn from(instance: &VideoInstance) -> Self {
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
/// Request payload for adding a video generation instance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddVideoInstanceRequest {
    pub name: String,
    pub provider: String,
    pub api_key: String,
    pub api_base: String,
    pub default_model: String,
    pub models: Vec<ModelConfig>,
    pub is_default: Option<bool>,
    #[serde(default)]
    pub extra: HashMap<String, String>,
}
/// Adds a new video generation instance.
#[tauri::command]
pub async fn cmd_add_video_instance(request: AddVideoInstanceRequest) -> Result<String, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Local::now().to_rfc3339();
    let is_first_instance = config.video_instances.is_empty();
    let should_be_default = if is_first_instance { true } else { request.is_default.unwrap_or(false) };
    let new_instance = VideoInstance {
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
    config.video_instances.insert(id.clone(), new_instance);
    if should_be_default {
        config.default_video_instance_id = id.clone();
    } else if config.default_video_instance_id.is_empty() && !config.video_instances.is_empty() {
        if let Some(first_id) = config.video_instances.keys().next() {
            config.default_video_instance_id = first_id.clone();
        }
    }
    drop(config);
    save_config_to_file().await?;
    Ok(id)
}
/// Updates an existing video generation instance.
#[tauri::command]
pub async fn cmd_update_video_instance(instance_id: String, instance: VideoInstanceForFrontend) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if let Some(existing) = config.video_instances.get_mut(&instance_id) {
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
        Err("Video instance not found".to_string())
    }
}
/// Deletes a video generation instance.
#[tauri::command]
pub async fn cmd_delete_video_instance(instance_id: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if config.video_instances.remove(&instance_id).is_some() {
        if config.default_video_instance_id == instance_id {
            if let Some(first_id) = config.video_instances.keys().next().cloned() {
                config.default_video_instance_id = first_id.clone();
                if let Some(instance) = config.video_instances.get_mut(&first_id) {
                    instance.is_default = Some(true);
                }
            } else {
                config.default_video_instance_id = String::new();
            }
        }
        drop(config);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("Video instance not found".to_string())
    }
}
/// Sets the default video generation instance.
#[tauri::command]
pub async fn cmd_set_default_video_instance(instance_id: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if config.video_instances.contains_key(&instance_id) {
        for (_, instance) in config.video_instances.iter_mut() {
            instance.is_default = Some(false);
        }
        if let Some(instance) = config.video_instances.get_mut(&instance_id) {
            instance.is_default = Some(true);
        }
        config.default_video_instance_id = instance_id.clone();
        drop(config);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("Video instance not found".to_string())
    }
}
/// Gets a single video generation instance by ID.
#[tauri::command]
pub async fn cmd_get_video_instance(instance_id: String) -> Result<Option<VideoInstanceForFrontend>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.video_instances.get(&instance_id).map(|instance| instance.into()))
}
/// Gets all video generation instances.
#[tauri::command]
pub async fn cmd_get_video_instances() -> Result<HashMap<String, VideoInstanceForFrontend>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    let default_id = &config.default_video_instance_id;
    let mut result = HashMap::new();
    for (key, instance) in config.video_instances.iter() {
        let mut frontend_instance: VideoInstanceForFrontend = instance.into();
        frontend_instance.is_default = Some(key == default_id);
        result.insert(key.clone(), frontend_instance);
    }
    Ok(result)
}
/// Gets the default video generation instance ID.
#[tauri::command]
pub async fn cmd_get_default_video_instance_id() -> Result<String, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.default_video_instance_id.clone())
}
// ---------------------------------------------------------------------------
// Audio generation instance management
// ---------------------------------------------------------------------------
/// Audio generation instance stored in the app config.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioInstance {
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
/// Audio instance shape exposed to the frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioInstanceForFrontend {
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
impl From<&AudioInstance> for AudioInstanceForFrontend {
    fn from(instance: &AudioInstance) -> Self {
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
/// Request payload for adding an audio generation instance.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddAudioInstanceRequest {
    pub name: String,
    pub provider: String,
    pub api_key: String,
    pub api_base: String,
    pub default_model: String,
    pub models: Vec<ModelConfig>,
    pub is_default: Option<bool>,
    #[serde(default)]
    pub extra: HashMap<String, String>,
}
/// Adds a new audio generation instance.
#[tauri::command]
pub async fn cmd_add_audio_instance(request: AddAudioInstanceRequest) -> Result<String, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    let id = Uuid::new_v4().to_string();
    let now = chrono::Local::now().to_rfc3339();
    let is_first_instance = config.audio_instances.is_empty();
    let should_be_default = if is_first_instance { true } else { request.is_default.unwrap_or(false) };
    let new_instance = AudioInstance {
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
    config.audio_instances.insert(id.clone(), new_instance);
    if should_be_default {
        config.default_audio_instance_id = id.clone();
    } else if config.default_audio_instance_id.is_empty() && !config.audio_instances.is_empty() {
        if let Some(first_id) = config.audio_instances.keys().next() {
            config.default_audio_instance_id = first_id.clone();
        }
    }
    drop(config);
    save_config_to_file().await?;
    Ok(id)
}
/// Updates an existing audio generation instance.
#[tauri::command]
pub async fn cmd_update_audio_instance(instance_id: String, instance: AudioInstanceForFrontend) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if let Some(existing) = config.audio_instances.get_mut(&instance_id) {
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
        Err("Audio instance not found".to_string())
    }
}
/// Deletes an audio generation instance.
#[tauri::command]
pub async fn cmd_delete_audio_instance(instance_id: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if config.audio_instances.remove(&instance_id).is_some() {
        if config.default_audio_instance_id == instance_id {
            if let Some(first_id) = config.audio_instances.keys().next().cloned() {
                config.default_audio_instance_id = first_id.clone();
                if let Some(instance) = config.audio_instances.get_mut(&first_id) {
                    instance.is_default = Some(true);
                }
            } else {
                config.default_audio_instance_id = String::new();
            }
        }
        drop(config);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("Audio instance not found".to_string())
    }
}
/// Sets the default audio generation instance.
#[tauri::command]
pub async fn cmd_set_default_audio_instance(instance_id: String) -> Result<bool, String> {
    let mut config = HIPPOX_APP_CONFIG.write().await;
    if config.audio_instances.contains_key(&instance_id) {
        for (_, instance) in config.audio_instances.iter_mut() {
            instance.is_default = Some(false);
        }
        if let Some(instance) = config.audio_instances.get_mut(&instance_id) {
            instance.is_default = Some(true);
        }
        config.default_audio_instance_id = instance_id.clone();
        drop(config);
        save_config_to_file().await?;
        Ok(true)
    } else {
        Err("Audio instance not found".to_string())
    }
}
/// Gets a single audio generation instance by ID.
#[tauri::command]
pub async fn cmd_get_audio_instance(instance_id: String) -> Result<Option<AudioInstanceForFrontend>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.audio_instances.get(&instance_id).map(|instance| instance.into()))
}
/// Gets all audio generation instances.
#[tauri::command]
pub async fn cmd_get_audio_instances() -> Result<HashMap<String, AudioInstanceForFrontend>, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    let default_id = &config.default_audio_instance_id;
    let mut result = HashMap::new();
    for (key, instance) in config.audio_instances.iter() {
        let mut frontend_instance: AudioInstanceForFrontend = instance.into();
        frontend_instance.is_default = Some(key == default_id);
        result.insert(key.clone(), frontend_instance);
    }
    Ok(result)
}
/// Gets the default audio generation instance ID.
#[tauri::command]
pub async fn cmd_get_default_audio_instance_id() -> Result<String, String> {
    let config = HIPPOX_APP_CONFIG.read().await;
    Ok(config.default_audio_instance_id.clone())
}
