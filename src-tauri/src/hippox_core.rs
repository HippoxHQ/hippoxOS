use crate::commands::{get_hippox_instance, ModelConfig, HIPPOX_APP_CONFIG, HIPPOX_INSTANCES};
use hippox::{
    build_audio_config, build_image_config, build_video_config, parse_audio_provider, parse_image_provider, parse_video_provider, AudioLLMConfig,
    AudioModelProvider, ChatModelProvider, Hippox, HippoxConfig, IdentityInformation, ImageLLMConfig, ImageModelProvider, VideoLLMConfig,
    VideoModelProvider,
};
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
/**
 * Initialize ONLY the default Hippox instance
 * This reduces memory usage by not loading all LLM instances at startup
 */
pub(crate) async fn init_default_hippox_instance() -> Result<(), String> {
    if let Err(e) = sync_all_to_hippox_core().await {
        log::error!("Failed to sync config to Hippox core: {}", e);
    }
    let (skills_dir, default_instance_id) = {
        let config = HIPPOX_APP_CONFIG.read().await;
        let skills_dir = config.workspace.skills_dir.clone();
        // Find default instance or first one
        let default_id = config
            .llm_instances
            .iter()
            .find(|(_, instance)| instance.is_default == Some(true))
            .map(|(id, _)| id.clone())
            .or_else(|| config.llm_instances.keys().next().cloned());
        (skills_dir, default_id)
    };
    // If no LLM instances configured, skip initialization
    let instance_id = match default_instance_id {
        Some(id) => id,
        None => {
            log::warn!("No LLM instances configured, skipping Hippox initialization");
            return Ok(());
        }
    };
    let instance = {
        let config = HIPPOX_APP_CONFIG.read().await;
        config.llm_instances.get(&instance_id).cloned()
    };
    let instance = match instance {
        Some(inst) => inst,
        None => {
            log::warn!("Default LLM instance not found: {}", instance_id);
            return Ok(());
        }
    };
    match create_hippox_instance(&instance, &skills_dir).await {
        Ok(hippox) => {
            // Attach the multi-modal clients to the freshly built Hippox so
            // that `Hippox` is the single gateway for every modality.
            let hippox = attach_multimodal_clients_to_hippox(hippox).await;
            let mut instances = HIPPOX_INSTANCES.write().await;
            instances.insert(instance_id.clone(), Arc::new(hippox));
            log::info!("Initialized default Hippox instance: {}", instance_id);
            Ok(())
        }
        Err(e) => {
            log::error!("Failed to initialize default Hippox instance {}: {}", instance_id, e);
            Err(e)
        }
    }
}
/**
 * Initialize all Hippox instances (deprecated - use init_default_hippox_instance instead)
 * Kept for backwards compatibility but no longer used at startup
 */
pub(crate) async fn init_all_hippox_instances() -> Result<(), String> {
    if let Err(e) = sync_all_to_hippox_core().await {
        log::error!("Failed to sync config to Hippox core: {}", e);
    }
    let (skills_dir, llm_instances) = {
        let config = HIPPOX_APP_CONFIG.read().await;
        (config.workspace.skills_dir.clone(), config.llm_instances.clone())
    };
    let mut instances = HIPPOX_INSTANCES.write().await;
    for (id, instance) in llm_instances {
        match create_hippox_instance(&instance, &skills_dir).await {
            Ok(hippox) => {
                // Attach the multi-modal clients to every Hippox instance so
                // that `Hippox` remains the single gateway for every modality.
                let hippox = attach_multimodal_clients_to_hippox(hippox).await;
                instances.insert(id.clone(), Arc::new(hippox));
            }
            Err(e) => {
                log::error!("Failed to initialize {} ({}): {}", instance.name, id, e);
            }
        }
    }
    Ok(())
}
pub(crate) async fn create_hippox_instance(instance: &LlmInstance, skills_dir: &str) -> Result<Hippox, String> {
    let model_provider = match instance.provider.to_lowercase().as_str() {
        "openai" => ChatModelProvider::OpenAI,
        "anthropic" => ChatModelProvider::Anthropic,
        "azure" => ChatModelProvider::Azure,
        "google" => ChatModelProvider::Google,
        "deepseek" => ChatModelProvider::DeepSeek,
        "alibaba" => ChatModelProvider::Alibaba,
        "zhipu" => ChatModelProvider::Zhipu,
        "moonshot" => ChatModelProvider::Moonshot,
        "cohere" => ChatModelProvider::Cohere,
        "mistral" => ChatModelProvider::Mistral,
        "groq" => ChatModelProvider::Groq,
        "together" => ChatModelProvider::Together,
        "baichuan" => ChatModelProvider::Baichuan,
        "yi" => ChatModelProvider::Yi,
        "baidu" => ChatModelProvider::Baidu,
        "tencent" => ChatModelProvider::Tencent,
        "minimax" => ChatModelProvider::MiniMax,
        "custom" => ChatModelProvider::Custom,
        _ => ChatModelProvider::OpenAI,
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
/// Attach every configured image / video / audio client to the given Hippox
/// instance so that `Hippox` becomes the single outward-facing gateway for
/// all modalities.
pub(crate) async fn attach_multimodal_clients_to_hippox(hippox: Hippox) -> Hippox {
    let (image_instances, default_image_id, video_instances, default_video_id, audio_instances, default_audio_id) = {
        let config = HIPPOX_APP_CONFIG.read().await;
        (
            config.image_instances.clone(),
            config.default_image_instance_id.clone(),
            config.video_instances.clone(),
            config.default_video_instance_id.clone(),
            config.audio_instances.clone(),
            config.default_audio_instance_id.clone(),
        )
    };
    let mut hippox = hippox;
    let image_instance = if !default_image_id.is_empty() { image_instances.get(&default_image_id) } else { image_instances.values().next() };
    if let Some(instance) = image_instance {
        // Build the `ImageLLMConfig` from the persisted instance fields.
        let provider = match instance.provider.to_lowercase().as_str() {
            "seedream" => ImageModelProvider::Seedream,
            "wan_image" | "wanimage" | "wan" => ImageModelProvider::WanImage,
            "stability" | "stability_image" => ImageModelProvider::StabilityImage,
            "flux" => ImageModelProvider::Flux,
            "imagen" => ImageModelProvider::Imagen,
            "dalle" | "dall_e" | "dall-e" => ImageModelProvider::DallE,
            _ => ImageModelProvider::Seedream,
        };
        let mut config = ImageLLMConfig::new();
        match provider {
            ImageModelProvider::Seedream => {
                config = config.seedream(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.seedream_base_url = Some(instance.api_base.clone());
                }
            }
            ImageModelProvider::WanImage => {
                config = config.wan_image(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.wan_image_base_url = Some(instance.api_base.clone());
                }
            }
            ImageModelProvider::StabilityImage => {
                config = config.stability(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.stability_base_url = Some(instance.api_base.clone());
                }
            }
            ImageModelProvider::Flux => {
                config = config.flux(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.flux_base_url = Some(instance.api_base.clone());
                }
            }
            ImageModelProvider::Imagen => {
                config = config.imagen(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.imagen_base_url = Some(instance.api_base.clone());
                }
            }
            ImageModelProvider::DallE => {
                config = config.dalle(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.dalle_base_url = Some(instance.api_base.clone());
                }
            }
        }
        match Hippox::new_llm_image_with_config(provider, &config) {
            Ok(client) => {
                hippox = hippox.with_image_client(client, provider);
                log::info!("Attached image client to Hippox: {} ({})", instance.name, provider);
            }
            Err(e) => log::error!("Failed to attach image client to Hippox: {}", e),
        }
    }
    let video_instance = if !default_video_id.is_empty() { video_instances.get(&default_video_id) } else { video_instances.values().next() };
    if let Some(instance) = video_instance {
        let provider = match instance.provider.to_lowercase().as_str() {
            "seedance" => VideoModelProvider::Seedance,
            "wan" => VideoModelProvider::Wan,
            "kling" => VideoModelProvider::Kling,
            "veo" => VideoModelProvider::Veo,
            "runway" => VideoModelProvider::Runway,
            "minimax_h3" | "minimaxh3" => VideoModelProvider::MiniMaxH3,
            "happyhorse" => VideoModelProvider::HappyHorse,
            "ltx" => VideoModelProvider::Ltx,
            "grok" | "grok_imagine" => VideoModelProvider::GrokImagine,
            "pruna" => VideoModelProvider::Pruna,
            "gemini" | "gemini_omni_flash" => VideoModelProvider::GeminiOmniFlash,
            _ => VideoModelProvider::Seedance,
        };
        let mut config = VideoLLMConfig::new();
        match provider {
            VideoModelProvider::Seedance => {
                config = config.seedance(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.seedance_base_url = Some(instance.api_base.clone());
                }
            }
            VideoModelProvider::Wan => {
                config = config.wan(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.wan_base_url = Some(instance.api_base.clone());
                }
            }
            VideoModelProvider::Kling => {
                let secret_key = instance.extra.get("secret_key").cloned().unwrap_or_else(|| instance.api_key.clone());
                config = config.kling(instance.api_key.clone(), secret_key);
                if !instance.api_base.is_empty() {
                    config.kling_base_url = Some(instance.api_base.clone());
                }
            }
            VideoModelProvider::Veo => {
                config = config.veo(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.veo_base_url = Some(instance.api_base.clone());
                }
            }
            VideoModelProvider::Runway => {
                config = config.runway(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.runway_base_url = Some(instance.api_base.clone());
                }
            }
            VideoModelProvider::MiniMaxH3 => {
                let group_id = instance.extra.get("group_id").cloned().unwrap_or_else(|| instance.api_key.clone());
                config = config.minimax_h3(instance.api_key.clone(), group_id);
                if !instance.api_base.is_empty() {
                    config.minimax_h3_base_url = Some(instance.api_base.clone());
                }
            }
            VideoModelProvider::HappyHorse => {
                config = config.happyhorse(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.happyhorse_base_url = Some(instance.api_base.clone());
                }
            }
            VideoModelProvider::Ltx => {
                config = config.ltx(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.ltx_base_url = Some(instance.api_base.clone());
                }
            }
            VideoModelProvider::GrokImagine => {
                config = config.grok(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.grok_base_url = Some(instance.api_base.clone());
                }
            }
            VideoModelProvider::Pruna => {
                config = config.pruna(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.pruna_base_url = Some(instance.api_base.clone());
                }
            }
            VideoModelProvider::GeminiOmniFlash => {
                config = config.gemini(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.gemini_base_url = Some(instance.api_base.clone());
                }
            }
        }
        match Hippox::new_llm_video_with_config(provider, &config) {
            Ok(client) => {
                hippox = hippox.with_video_client(client, provider);
                log::info!("Attached video client to Hippox: {} ({})", instance.name, provider);
            }
            Err(e) => log::error!("Failed to attach video client to Hippox: {}", e),
        }
    }
    let audio_instance = if !default_audio_id.is_empty() { audio_instances.get(&default_audio_id) } else { audio_instances.values().next() };
    if let Some(instance) = audio_instance {
        // Build the `AudioLLMConfig` from the persisted instance fields.
        let provider = match instance.provider.to_lowercase().as_str() {
            "qwen_tts" | "qwentts" => AudioModelProvider::QwenTts,
            "seed_audio" | "seedaudio" => AudioModelProvider::SeedAudio,
            "step_audio" | "stepaudio" => AudioModelProvider::StepAudio,
            "gemini_tts" | "geminitts" => AudioModelProvider::GeminiTts,
            "elevenlabs" => AudioModelProvider::ElevenLabs,
            "lyria" => AudioModelProvider::Lyria,
            "suno" => AudioModelProvider::Suno,
            "stable_audio" | "stableaudio" => AudioModelProvider::StableAudio,
            _ => AudioModelProvider::QwenTts,
        };
        let mut config = AudioLLMConfig::new();
        match provider {
            AudioModelProvider::QwenTts => {
                config = config.qwen_tts(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.qwen_tts_base_url = Some(instance.api_base.clone());
                }
            }
            AudioModelProvider::SeedAudio => {
                config = config.seed_audio(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.seed_audio_base_url = Some(instance.api_base.clone());
                }
            }
            AudioModelProvider::StepAudio => {
                config = config.step_audio(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.step_audio_base_url = Some(instance.api_base.clone());
                }
            }
            AudioModelProvider::GeminiTts => {
                config = config.gemini_tts(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.gemini_tts_base_url = Some(instance.api_base.clone());
                }
            }
            AudioModelProvider::ElevenLabs => {
                config = config.elevenlabs(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.elevenlabs_base_url = Some(instance.api_base.clone());
                }
            }
            AudioModelProvider::Lyria => {
                config = config.lyria(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.lyria_base_url = Some(instance.api_base.clone());
                }
            }
            AudioModelProvider::Suno => {
                config = config.suno(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.suno_base_url = Some(instance.api_base.clone());
                }
            }
            AudioModelProvider::StableAudio => {
                config = config.stable_audio(instance.api_key.clone());
                if !instance.api_base.is_empty() {
                    config.stable_audio_base_url = Some(instance.api_base.clone());
                }
            }
        }
        match Hippox::new_llm_audio_with_config(provider, &config) {
            Ok(client) => {
                hippox = hippox.with_audio_client(client, provider);
                log::info!("Attached audio client to Hippox: {} ({})", instance.name, provider);
            }
            Err(e) => log::error!("Failed to attach audio client to Hippox: {}", e),
        }
    }
    hippox
}
/// get default hippox instance with chat model
pub(crate) async fn get_default_hippox_with_chat_model() -> Result<Arc<Hippox>, String> {
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

/// Builds a dedicated `Hippox` instance for the default image-generation instance configured in the app config.
pub async fn get_default_hippox_with_image_model() -> Result<Arc<Hippox>, String> {
    let (provider_str, api_key, api_base) = {
        let config = HIPPOX_APP_CONFIG.read().await;
        let id = &config.default_image_instance_id;
        if id.is_empty() {
            return Err("No default image instance configured".to_string());
        }
        let instance = config.image_instances.get(id).ok_or_else(|| format!("Default image instance not found: {}", id))?;
        (instance.provider.clone(), instance.api_key.clone(), instance.api_base.clone())
    };
    let provider = parse_image_provider(&provider_str)?;
    let base_url = if api_base.trim().is_empty() { None } else { Some(api_base) };
    let config = build_image_config(provider, api_key, base_url);
    let hippox =
        Hippox::builder_image(provider, config).build_with_model().await.map_err(|e| format!("Failed to build default image Hippox: {}", e))?;
    Ok(Arc::new(hippox))
}

/// Builds a dedicated `Hippox` instance for the default audio-generation instance configured in the app config.
pub async fn get_default_hippox_with_audio_model() -> Result<Arc<Hippox>, String> {
    let (provider_str, api_key, api_base) = {
        let config = HIPPOX_APP_CONFIG.read().await;
        let id = &config.default_audio_instance_id;
        if id.is_empty() {
            return Err("No default audio instance configured".to_string());
        }
        let instance = config.audio_instances.get(id).ok_or_else(|| format!("Default audio instance not found: {}", id))?;
        (instance.provider.clone(), instance.api_key.clone(), instance.api_base.clone())
    };
    let provider = parse_audio_provider(&provider_str)?;
    let base_url = if api_base.trim().is_empty() { None } else { Some(api_base) };
    let config = build_audio_config(provider, api_key, base_url);
    let hippox =
        Hippox::builder_audio(provider, config).build_with_model().await.map_err(|e| format!("Failed to build default audio Hippox: {}", e))?;
    Ok(Arc::new(hippox))
}

/// Builds a dedicated `Hippox` instance for the default video-generation
/// instance configured in the app config.
pub async fn get_default_hippox_with_video_model() -> Result<Arc<Hippox>, String> {
    let (provider_str, api_key, api_base) = {
        let config = HIPPOX_APP_CONFIG.read().await;
        let id = &config.default_video_instance_id;
        if id.is_empty() {
            return Err("No default video instance configured".to_string());
        }
        let instance = config.video_instances.get(id).ok_or_else(|| format!("Default video instance not found: {}", id))?;
        (instance.provider.clone(), instance.api_key.clone(), instance.api_base.clone())
    };
    let provider = parse_video_provider(&provider_str)?;
    let base_url = if api_base.trim().is_empty() { None } else { Some(api_base) };
    let config = build_video_config(provider, api_key, base_url);
    let hippox =
        Hippox::builder_video(provider, config).build_with_model().await.map_err(|e| format!("Failed to build default video Hippox: {}", e))?;
    Ok(Arc::new(hippox))
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
