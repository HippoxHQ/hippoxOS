use crate::commands::get_default_chat_model_id;
use crate::hippox_core::get_default_hippox_with_chat_model;
use crate::state::AppState;
use crate::{
    commands::config::{get_hippox_instance, HIPPOX_APP_CONFIG},
    hippox_core::LlmInstance,
};
use hippox::{AudioModelProvider, Hippox, ImageModelProvider, VideoModelProvider};
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::time::{timeout, Duration};
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthCheckResult {
    pub instance_id: String,
    pub instance_name: String,
    pub status: HealthStatus,
    pub message: Option<String>,
    pub latency_ms: Option<u64>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum HealthStatus {
    Online,
    Offline,
    Error,
}
const HEALTH_CHECK_TIMEOUT_SECS: u64 = 10;
#[tauri::command]
pub async fn cmd_check_all_llm_health(state: State<'_, AppState>) -> Result<Vec<HealthCheckResult>, String> {
    let instances = {
        let config = HIPPOX_APP_CONFIG.read().await;
        config.llm_instances.clone()
    };
    if instances.is_empty() {
        return Ok(vec![]);
    }
    let mut tasks = Vec::new();
    let language = state.get_language().await;
    for (instance_id, instance) in instances {
        let instance_id_clone = instance_id.clone();
        let instance_clone = instance.clone();
        let language_clone = language.clone();
        let task = tokio::spawn(async move { check_single_llm_health(&instance_id_clone, &instance_clone, &language_clone).await });
        tasks.push(task);
    }
    let results = futures::future::join_all(tasks).await;
    let mut health_results = Vec::new();
    for result in results {
        match result {
            Ok(health_result) => health_results.push(health_result),
            Err(e) => {
                log::error!("Health check task failed: {}", e);
            }
        }
    }
    Ok(health_results)
}
async fn check_single_llm_health(instance_id: &str, instance: &LlmInstance, language: &str) -> HealthCheckResult {
    let start_time = std::time::Instant::now();
    let instance_id_clone = instance_id.to_string();
    let instance_name = instance.name.clone();
    let hippox_result = get_hippox_instance(instance_id).await;
    let hippox = match hippox_result {
        Ok(h) => h,
        Err(e) => {
            return HealthCheckResult {
                instance_id: instance_id_clone,
                instance_name,
                status: HealthStatus::Offline,
                message: Some(format!("Failed to get Hippox instance: {}", e)),
                latency_ms: None,
            };
        }
    };
    let check_result = timeout(Duration::from_secs(HEALTH_CHECK_TIMEOUT_SECS), send_health_check_message(&hippox, language)).await;
    let latency_ms = start_time.elapsed().as_millis() as u64;
    match check_result {
        Ok(Ok(response)) => {
            let is_error = response.contains("error")
                || response.to_lowercase().contains("error")
                || response.contains("401")
                || response.contains("403")
                || response.contains("429")
                || response.contains("500")
                || response.contains("502")
                || response.contains("503")
                || response.to_lowercase().contains("unauthorized")
                || response.to_lowercase().contains("authentication")
                || response.to_lowercase().contains("invalid");
            if is_error {
                let error_msg = if response.len() > 200 { format!("{}...", &response[..200]) } else { response };
                HealthCheckResult {
                    instance_id: instance_id_clone,
                    instance_name,
                    status: HealthStatus::Offline,
                    message: Some(error_msg),
                    latency_ms: Some(latency_ms),
                }
            } else {
                HealthCheckResult {
                    instance_id: instance_id_clone,
                    instance_name,
                    status: HealthStatus::Online,
                    message: None,
                    latency_ms: Some(latency_ms),
                }
            }
        }
        Ok(Err(e)) => HealthCheckResult {
            instance_id: instance_id_clone,
            instance_name,
            status: HealthStatus::Offline,
            message: Some(e),
            latency_ms: Some(latency_ms),
        },
        Err(_) => HealthCheckResult {
            instance_id: instance_id_clone,
            instance_name,
            status: HealthStatus::Offline,
            message: Some("Health check timeout".to_string()),
            latency_ms: Some(latency_ms),
        },
    }
}
async fn send_health_check_message(hippox: &Hippox, language: &str) -> Result<String, String> {
    let model = get_default_chat_model_id().await.unwrap_or_default();
    hippox.heartbeat(&model).await.into_result().map_err(|err| err.to_string())
}
/// Maps a stored image provider string to the `ImageModelProvider` enum.
fn parse_image_provider(provider: &str) -> Option<ImageModelProvider> {
    match provider {
        "Seedream" => Some(ImageModelProvider::Seedream),
        "WanImage" => Some(ImageModelProvider::WanImage),
        "StabilityImage" => Some(ImageModelProvider::StabilityImage),
        "Flux" => Some(ImageModelProvider::Flux),
        "Imagen" => Some(ImageModelProvider::Imagen),
        "DallE" => Some(ImageModelProvider::DallE),
        _ => None,
    }
}
/// Maps a stored video provider string to the `VideoModelProvider` enum.
fn parse_video_provider(provider: &str) -> Option<VideoModelProvider> {
    match provider {
        "Seedance" => Some(VideoModelProvider::Seedance),
        "Wan" => Some(VideoModelProvider::Wan),
        "Kling" => Some(VideoModelProvider::Kling),
        "Veo" => Some(VideoModelProvider::Veo),
        "Runway" => Some(VideoModelProvider::Runway),
        "MiniMaxH3" => Some(VideoModelProvider::MiniMaxH3),
        "HappyHorse" => Some(VideoModelProvider::HappyHorse),
        "Ltx" => Some(VideoModelProvider::Ltx),
        "GrokImagine" => Some(VideoModelProvider::GrokImagine),
        "Pruna" => Some(VideoModelProvider::Pruna),
        "GeminiOmniFlash" => Some(VideoModelProvider::GeminiOmniFlash),
        _ => None,
    }
}
/// Maps a stored audio provider string to the `AudioModelProvider` enum.
fn parse_audio_provider(provider: &str) -> Option<AudioModelProvider> {
    match provider {
        "QwenTts" => Some(AudioModelProvider::QwenTts),
        "SeedAudio" => Some(AudioModelProvider::SeedAudio),
        "StepAudio" => Some(AudioModelProvider::StepAudio),
        "GeminiTts" => Some(AudioModelProvider::GeminiTts),
        "ElevenLabs" => Some(AudioModelProvider::ElevenLabs),
        "Lyria" => Some(AudioModelProvider::Lyria),
        "Suno" => Some(AudioModelProvider::Suno),
        "StableAudio" => Some(AudioModelProvider::StableAudio),
        _ => None,
    }
}
/// Converts a heartbeat result string into a `HealthCheckResult`.
fn heartbeat_to_result(instance_id: String, instance_name: String, latency_ms: u64, response: Result<String, String>) -> HealthCheckResult {
    match response {
        Ok(text) => {
            let is_error = text.to_lowercase().contains("error")
                || text.to_lowercase().contains("unreachable")
                || text.contains("401")
                || text.contains("403")
                || text.contains("429")
                || text.contains("500")
                || text.contains("502")
                || text.contains("503")
                || text.to_lowercase().contains("unauthorized")
                || text.to_lowercase().contains("authentication")
                || text.to_lowercase().contains("invalid");
            if is_error {
                let error_msg = if text.len() > 200 { format!("{}...", &text[..200]) } else { text };
                HealthCheckResult {
                    instance_id,
                    instance_name,
                    status: HealthStatus::Offline,
                    message: Some(error_msg),
                    latency_ms: Some(latency_ms),
                }
            } else {
                HealthCheckResult { instance_id, instance_name, status: HealthStatus::Online, message: None, latency_ms: Some(latency_ms) }
            }
        }
        Err(e) => HealthCheckResult { instance_id, instance_name, status: HealthStatus::Offline, message: Some(e), latency_ms: Some(latency_ms) },
    }
}
/// Probes every configured image instance through the shared Hippox instance.
#[tauri::command]
pub async fn cmd_check_all_image_health() -> Result<Vec<HealthCheckResult>, String> {
    let instances = {
        let config = HIPPOX_APP_CONFIG.read().await;
        config.image_instances.clone()
    };
    if instances.is_empty() {
        return Ok(vec![]);
    }
    let hippox = match get_default_hippox_with_chat_model().await {
        Ok(h) => h,
        Err(e) => return Err(format!("Failed to get default Hippox instance: {}", e)),
    };
    let mut tasks = Vec::new();
    for (instance_id, instance) in instances {
        let hippox_clone = hippox.clone();
        let instance_id_clone = instance_id.clone();
        let instance_name = instance.name.clone();
        let provider = instance.provider.clone();
        let api_key = instance.api_key.clone();
        let api_base = instance.api_base.clone();
        let task = tokio::spawn(async move {
            let start_time = std::time::Instant::now();
            let provider_enum = match parse_image_provider(&provider) {
                Some(p) => p,
                None => {
                    return HealthCheckResult {
                        instance_id: instance_id_clone,
                        instance_name,
                        status: HealthStatus::Offline,
                        message: Some(format!("Unknown image provider: {}", provider)),
                        latency_ms: None,
                    };
                }
            };
            let base_url_opt = if api_base.trim().is_empty() { None } else { Some(api_base.clone()) };
            let check_result =
                timeout(Duration::from_secs(HEALTH_CHECK_TIMEOUT_SECS), hippox_clone.heartbeat_image(provider_enum, Some(api_key), base_url_opt))
                    .await;
            let latency_ms = start_time.elapsed().as_millis() as u64;
            let response = match check_result {
                Ok(r) => r.into_result().map_err(|err| err.to_string()),
                Err(_) => Err("Health check timeout".to_string()),
            };
            heartbeat_to_result(instance_id_clone, instance_name, latency_ms, response)
        });
        tasks.push(task);
    }
    let results = futures::future::join_all(tasks).await;
    let mut health_results = Vec::new();
    for result in results {
        match result {
            Ok(health_result) => health_results.push(health_result),
            Err(e) => {
                log::error!("Image health check task failed: {}", e);
            }
        }
    }
    Ok(health_results)
}
/// Probes every configured video instance through the shared Hippox instance.
#[tauri::command]
pub async fn cmd_check_all_video_health() -> Result<Vec<HealthCheckResult>, String> {
    let instances = {
        let config = HIPPOX_APP_CONFIG.read().await;
        config.video_instances.clone()
    };
    if instances.is_empty() {
        return Ok(vec![]);
    }
    let hippox = match get_default_hippox_with_chat_model().await {
        Ok(h) => h,
        Err(e) => return Err(format!("Failed to get default Hippox instance: {}", e)),
    };
    let mut tasks = Vec::new();
    for (instance_id, instance) in instances {
        let hippox_clone = hippox.clone();
        let instance_id_clone = instance_id.clone();
        let instance_name = instance.name.clone();
        let provider = instance.provider.clone();
        let api_key = instance.api_key.clone();
        let api_base = instance.api_base.clone();
        let task = tokio::spawn(async move {
            let start_time = std::time::Instant::now();
            let provider_enum = match parse_video_provider(&provider) {
                Some(p) => p,
                None => {
                    return HealthCheckResult {
                        instance_id: instance_id_clone,
                        instance_name,
                        status: HealthStatus::Offline,
                        message: Some(format!("Unknown video provider: {}", provider)),
                        latency_ms: None,
                    };
                }
            };
            let base_url_opt = if api_base.trim().is_empty() { None } else { Some(api_base.clone()) };
            let check_result =
                timeout(Duration::from_secs(HEALTH_CHECK_TIMEOUT_SECS), hippox_clone.heartbeat_video(provider_enum, Some(api_key), base_url_opt))
                    .await;
            let latency_ms = start_time.elapsed().as_millis() as u64;
            let response = match check_result {
                Ok(r) => r.into_result().map_err(|err| err.to_string()),
                Err(_) => Err("Health check timeout".to_string()),
            };
            heartbeat_to_result(instance_id_clone, instance_name, latency_ms, response)
        });
        tasks.push(task);
    }
    let results = futures::future::join_all(tasks).await;
    let mut health_results = Vec::new();
    for result in results {
        match result {
            Ok(health_result) => health_results.push(health_result),
            Err(e) => {
                log::error!("Video health check task failed: {}", e);
            }
        }
    }
    Ok(health_results)
}
/// Probes every configured audio instance through the shared Hippox instance.
#[tauri::command]
pub async fn cmd_check_all_audio_health() -> Result<Vec<HealthCheckResult>, String> {
    let instances = {
        let config = HIPPOX_APP_CONFIG.read().await;
        config.audio_instances.clone()
    };
    if instances.is_empty() {
        return Ok(vec![]);
    }
    let hippox = match get_default_hippox_with_chat_model().await {
        Ok(h) => h,
        Err(e) => return Err(format!("Failed to get default Hippox instance: {}", e)),
    };
    let mut tasks = Vec::new();
    for (instance_id, instance) in instances {
        let hippox_clone = hippox.clone();
        let instance_id_clone = instance_id.clone();
        let instance_name = instance.name.clone();
        let provider = instance.provider.clone();
        let api_key = instance.api_key.clone();
        let api_base = instance.api_base.clone();
        let task = tokio::spawn(async move {
            let start_time = std::time::Instant::now();
            let provider_enum = match parse_audio_provider(&provider) {
                Some(p) => p,
                None => {
                    return HealthCheckResult {
                        instance_id: instance_id_clone,
                        instance_name,
                        status: HealthStatus::Offline,
                        message: Some(format!("Unknown audio provider: {}", provider)),
                        latency_ms: None,
                    };
                }
            };
            let base_url_opt = if api_base.trim().is_empty() { None } else { Some(api_base.clone()) };
            let check_result =
                timeout(Duration::from_secs(HEALTH_CHECK_TIMEOUT_SECS), hippox_clone.heartbeat_audio(provider_enum, Some(api_key), base_url_opt))
                    .await;
            let latency_ms = start_time.elapsed().as_millis() as u64;
            let response = match check_result {
                Ok(r) => r.into_result().map_err(|err| err.to_string()),
                Err(_) => Err("Health check timeout".to_string()),
            };
            heartbeat_to_result(instance_id_clone, instance_name, latency_ms, response)
        });
        tasks.push(task);
    }
    let results = futures::future::join_all(tasks).await;
    let mut health_results = Vec::new();
    for result in results {
        match result {
            Ok(health_result) => health_results.push(health_result),
            Err(e) => {
                log::error!("Audio health check task failed: {}", e);
            }
        }
    }
    Ok(health_results)
}
