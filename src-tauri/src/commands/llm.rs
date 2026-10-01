use crate::{
    commands::{get_hippox_instance, save_config_to_file, LlmInstanceForFrontend, ModelConfig, HIPPOX_APP_CONFIG},
    hippox_core::LlmInstance,
};
use hippox::{
    AudioLLMOptions, AudioModelProvider, AudioTaskInfo, ImageLLMOptions, ImageModelProvider, ImageTaskInfo, ModelProvider, VideoLLMOptions,
    VideoModelProvider, VideoTaskInfo,
};
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
/// Returns all supported LLM models.
#[tauri::command]
pub fn cmd_get_all_models() -> Vec<ModelInfo> {
    let lang = get_language();
    let is_zh = lang == "zh";
    let mut result = Vec::new();
    for provider in ModelProvider::all() {
        let provider_id = model_provider_id(&provider).to_string();
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
                streaming: true,
                context_length: None,
                recommended,
            });
        }
    }
    result
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
/// Returns all supported LLM providers.
///
/// The provider list is built dynamically from `ModelProvider::all()`, so
/// adding a new provider only requires updating `langhub::types` — no
/// change is needed here.
#[tauri::command]
pub fn cmd_get_all_providers() -> Vec<ProviderInfo> {
    ModelProvider::all()
        .into_iter()
        .map(|provider| {
            let extra_config_fields = provider
                .extra_config_fields()
                .into_iter()
                .map(|(key, name, placeholder, required)| ExtraConfigField { key, name, placeholder, required })
                .collect();
            ProviderInfo {
                id: model_provider_id(&provider).to_string(),
                name: provider.to_string(),
                icon: provider.icon().to_string(),
                requires_api_key: provider.requires_api_key(),
                requires_extra_config: provider.needs_extra_config(),
                extra_config_fields,
                description: provider.description().to_string(),
                description_zh: provider.description_zh().to_string(),
            }
        })
        .collect()
}
#[tauri::command]
pub fn cmd_get_models_by_provider(provider: String) -> Vec<ModelInfo> {
    cmd_get_all_models().into_iter().filter(|m| m.provider == provider).collect()
}
#[tauri::command]
pub fn cmd_get_recommended_models() -> Vec<ModelInfo> {
    cmd_get_all_models().into_iter().filter(|m| m.recommended).collect()
}
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
/// Submit an image generation task through the `Hippox` gateway.
///
/// # Arguments
/// * `hippox_instance_id` - The id of the `Hippox` instance to use.
/// * `provider`           - The image model provider to use.
/// * `prompt`             - Text prompt for image generation.
/// * `options`            - Optional generation options.
/// * `base_url`           - Optional custom base URL override.
#[tauri::command]
pub async fn cmd_submit_image_task(
    hippox_instance_id: String,
    provider: ImageModelProvider,
    prompt: String,
    options: Option<ImageLLMOptions>,
    base_url: Option<String>,
) -> Result<ImageTaskInfo, String> {
    let hippox = get_hippox_instance(&hippox_instance_id).await?;
    let result = hippox.submit_image_task_info(provider, String::new(), prompt, options, base_url).await;
    result.into_result().map_err(|e| e.to_string())
}
/// Poll an image generation task through the `Hippox` gateway.
#[tauri::command]
pub async fn cmd_poll_image_task(
    hippox_instance_id: String,
    provider: ImageModelProvider,
    provider_task_id: String,
    base_url: Option<String>,
    task_id: String,
    prompt: String,
    created_at: u64,
) -> Result<ImageTaskInfo, String> {
    let hippox = get_hippox_instance(&hippox_instance_id).await?;
    let result = hippox.poll_image_task_info(provider, String::new(), provider_task_id, base_url, task_id, prompt, created_at).await;
    result.into_result().map_err(|e| e.to_string())
}
/// Cancel an image generation task through the `Hippox` gateway.
#[tauri::command]
pub async fn cmd_cancel_image_task(
    hippox_instance_id: String,
    provider: ImageModelProvider,
    provider_task_id: Option<String>,
    base_url: Option<String>,
    task_id: String,
    prompt: String,
    created_at: u64,
) -> Result<ImageTaskInfo, String> {
    let hippox = get_hippox_instance(&hippox_instance_id).await?;
    let result = hippox.cancel_image_task_info(provider, String::new(), provider_task_id, base_url, task_id, prompt, created_at).await;
    result.into_result().map_err(|e| e.to_string())
}
/// Submit a video generation task through the `Hippox` gateway.
#[tauri::command]
pub async fn cmd_submit_video_task(
    hippox_instance_id: String,
    provider: VideoModelProvider,
    prompt: String,
    options: Option<VideoLLMOptions>,
    base_url: Option<String>,
) -> Result<VideoTaskInfo, String> {
    let hippox = get_hippox_instance(&hippox_instance_id).await?;
    let result = hippox.submit_video_task_info(provider, String::new(), prompt, options, base_url).await;
    result.into_result().map_err(|e| e.to_string())
}
/// Poll a video generation task through the `Hippox` gateway.
#[tauri::command]
pub async fn cmd_poll_video_task(
    hippox_instance_id: String,
    provider: VideoModelProvider,
    provider_task_id: String,
    base_url: Option<String>,
    task_id: String,
    prompt: String,
    created_at: u64,
) -> Result<VideoTaskInfo, String> {
    let hippox = get_hippox_instance(&hippox_instance_id).await?;
    let result = hippox.poll_video_task_info(provider, String::new(), provider_task_id, base_url, task_id, prompt, created_at).await;
    result.into_result().map_err(|e| e.to_string())
}
/// Cancel a video generation task through the `Hippox` gateway.
#[tauri::command]
pub async fn cmd_cancel_video_task(
    hippox_instance_id: String,
    provider: VideoModelProvider,
    provider_task_id: Option<String>,
    base_url: Option<String>,
    task_id: String,
    prompt: String,
    created_at: u64,
) -> Result<VideoTaskInfo, String> {
    let hippox = get_hippox_instance(&hippox_instance_id).await?;
    let result = hippox.cancel_video_task_info(provider, String::new(), provider_task_id, base_url, task_id, prompt, created_at).await;
    result.into_result().map_err(|e| e.to_string())
}
/// Submit an audio generation task through the `Hippox` gateway.
#[tauri::command]
pub async fn cmd_submit_audio_task(
    hippox_instance_id: String,
    provider: AudioModelProvider,
    prompt: String,
    options: Option<AudioLLMOptions>,
    base_url: Option<String>,
) -> Result<AudioTaskInfo, String> {
    let hippox = get_hippox_instance(&hippox_instance_id).await?;
    let result = hippox.submit_audio_task_info(provider, String::new(), prompt, options, base_url).await;
    result.into_result().map_err(|e| e.to_string())
}
/// Poll an audio generation task through the `Hippox` gateway.
#[tauri::command]
pub async fn cmd_poll_audio_task(
    hippox_instance_id: String,
    provider: AudioModelProvider,
    provider_task_id: String,
    base_url: Option<String>,
    task_id: String,
    prompt: String,
    created_at: u64,
) -> Result<AudioTaskInfo, String> {
    let hippox = get_hippox_instance(&hippox_instance_id).await?;
    let result = hippox.poll_audio_task_info(provider, String::new(), provider_task_id, base_url, task_id, prompt, created_at).await;
    result.into_result().map_err(|e| e.to_string())
}
/// Cancel an audio generation task through the `Hippox` gateway.
#[tauri::command]
pub async fn cmd_cancel_audio_task(
    hippox_instance_id: String,
    provider: AudioModelProvider,
    provider_task_id: Option<String>,
    base_url: Option<String>,
    task_id: String,
    prompt: String,
    created_at: u64,
) -> Result<AudioTaskInfo, String> {
    let hippox = get_hippox_instance(&hippox_instance_id).await?;
    let result = hippox.cancel_audio_task_info(provider, String::new(), provider_task_id, base_url, task_id, prompt, created_at).await;
    result.into_result().map_err(|e| e.to_string())
}
