use crate::commands::config::{get_hippox_instance, HIPPOX_APP_CONFIG, HIPPOX_INSTANCES};
use hippox::Hippox;
use serde::{Deserialize, Serialize};
use tauri::State;
use tokio::time::{timeout, Duration};

use crate::state::AppState;

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
pub async fn cmd_check_all_llm_health(
    state: State<'_, AppState>,
) -> Result<Vec<HealthCheckResult>, String> {
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
        let task = tokio::spawn(async move {
            check_single_llm_health(&instance_id_clone, &instance_clone, &language_clone).await
        });
        tasks.push(task);
    }
    let results = futures::future::join_all(tasks).await;
    let mut health_results = Vec::new();
    for result in results {
        match result {
            Ok(health_result) => health_results.push(health_result),
            Err(e) => {
                eprintln!("Health check task failed: {}", e);
            }
        }
    }
    Ok(health_results)
}

async fn check_single_llm_health(
    instance_id: &str,
    instance: &crate::commands::config::LlmInstance,
    language: &str,
) -> HealthCheckResult {
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
    let check_result = timeout(
        Duration::from_secs(HEALTH_CHECK_TIMEOUT_SECS),
        send_health_check_message(&hippox, language),
    )
    .await;
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
                let error_msg = if response.len() > 200 {
                    format!("{}...", &response[..200])
                } else {
                    response
                };
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
    let message = match language {
        "zh" => "hi",
        _ => "hi",
    };
    let result = hippox.handle_natural_language(message, None, None).await;
    Ok(result)
}
