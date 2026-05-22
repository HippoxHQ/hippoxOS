use hippox::ModelProvider;
use hippox::{ConfigInitMethod, Hippox, WorkflowMode};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

use crate::commands::HIPPOX_APP_CONFIG;

struct LogMessages {
    init_start: String,
    init_success: String,
    init_failed: String,
    send_start: String,
    send_response: String,
    session_cleared: String,
    engine_not_initialized: String,
}

impl LogMessages {
    fn get(lang: &str) -> Self {
        match lang {
            "zh" => LogMessages {
                init_start: "正在初始化 Hippox 引擎...".to_string(),
                init_success: "Hippox 引擎初始化成功".to_string(),
                init_failed: "Hippox 引擎初始化失败".to_string(),
                send_start: "📤 发送消息: {}".to_string(),
                send_response: "📥 收到响应 (耗时: {}ms)".to_string(),
                session_cleared: "已清空会话: {}".to_string(),
                engine_not_initialized: "Hippox 引擎未初始化".to_string(),
            },
            _ => LogMessages {
                init_start: "Initializing Hippox engine...".to_string(),
                init_success: "Hippox engine initialized successfully".to_string(),
                init_failed: "Hippox engine initialization failed".to_string(),
                send_start: "📤 Sending message: {}".to_string(),
                send_response: "📥 Received response (took: {}ms)".to_string(),
                session_cleared: "Session cleared: {}".to_string(),
                engine_not_initialized: "Hippox engine not initialized".to_string(),
            },
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub success: bool,
    pub message: String,
    pub session_id: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionLog {
    pub id: String,
    pub timestamp: String,
    pub level: String,
    pub message: String,
    pub details: Option<String>,
    pub duration: Option<u64>,
}

#[derive(Clone)]
pub struct AppStateWithChat {
    pub hippox: Arc<Mutex<Option<Hippox>>>,
    pub logs: Arc<Mutex<Vec<ExecutionLog>>>,
    pub language: Arc<Mutex<String>>,
}

impl AppStateWithChat {
    pub fn new() -> Self {
        Self {
            hippox: Arc::new(Mutex::new(None)),
            logs: Arc::new(Mutex::new(Vec::new())),
            language: Arc::new(Mutex::new("en".to_string())),
        }
    }

    pub async fn set_language(&self, lang: String) {
        let mut language = self.language.lock().await;
        *language = lang;
    }

    pub async fn get_language(&self) -> String {
        self.language.lock().await.clone()
    }

    pub async fn add_log(
        &self,
        level: String,
        message: String,
        details: Option<String>,
        duration: Option<u64>,
    ) {
        let mut logs = self.logs.lock().await;
        logs.push(ExecutionLog {
            id: uuid::Uuid::new_v4().to_string(),
            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
            level,
            message,
            details,
            duration,
        });
        if logs.len() > 1000 {
            logs.remove(0);
        }
    }

    pub async fn get_logs(&self) -> Vec<ExecutionLog> {
        self.logs.lock().await.clone()
    }

    pub async fn clear_logs(&self) {
        let mut logs = self.logs.lock().await;
        logs.clear();
    }

    pub async fn get_log_messages(&self) -> LogMessages {
        let lang = self.get_language().await;
        LogMessages::get(&lang)
    }
}

#[tauri::command]
pub async fn set_hippox_language(
    state: State<'_, AppStateWithChat>,
    language: String,
) -> Result<(), String> {
    state.set_language(language).await;
    Ok(())
}

#[tauri::command]
pub async fn get_hippox_language(state: State<'_, AppStateWithChat>) -> Result<String, String> {
    Ok(state.get_language().await)
}

async fn init_engine_with_default(state: &AppStateWithChat) -> Result<(), String> {
    let global_config = HIPPOX_APP_CONFIG.read().await;
    let instance_id = global_config.default_llm_instance_id.clone();
    let instance = global_config
        .llm_instances
        .get(&instance_id)
        .ok_or_else(|| format!("Instance not found: {}", instance_id))?
        .clone();
    let skills_dir = global_config.workspace.skills_dir.clone();
    let language = global_config.language.clone();
    drop(global_config);
    state.set_language(language).await;
    let messages = state.get_log_messages().await;
    let model_provider = match instance.provider.to_lowercase().as_str() {
        "openai" => ModelProvider::OpenAI,
        "anthropic" => ModelProvider::Anthropic,
        "azure" => ModelProvider::Azure,
        "google" => ModelProvider::Google,
        "deepseek" => ModelProvider::DeepSeek,
        "alibaba" => ModelProvider::Alibaba,
        "zhipu" => ModelProvider::Zhipu,
        "moonshot" => ModelProvider::Moonshot,
        _ => {
            println!(
                "Unknown provider: {}, defaulting to OpenAI",
                instance.provider
            );
            ModelProvider::OpenAI
        }
    };
    let mode = match instance.workflow_mode.to_lowercase().as_str() {
        "batch" => WorkflowMode::Batch,
        "chain" => WorkflowMode::Chain,
        "plan_and_execute" => WorkflowMode::PlanAndExecute,
        _ => WorkflowMode::ReAct,
    };
    let mut extra_keys = std::collections::HashMap::new();
    if instance.provider.to_lowercase() != "openai" && !instance.api_base.is_empty() {
        extra_keys.insert("api_base".to_string(), instance.api_base.clone());
    }
    if instance.provider.to_lowercase() == "custom" && !instance.api_base.is_empty() {
        extra_keys.insert("api_base".to_string(), instance.api_base.clone());
    }
    let api_key_to_use = if instance.api_key.is_empty() {
        None
    } else {
        Some(instance.api_key.clone())
    };
    let hippox = Hippox::with_workflow_mode(
        &skills_dir,
        model_provider,
        api_key_to_use,
        if extra_keys.is_empty() {
            None
        } else {
            Some(extra_keys)
        },
        ConfigInitMethod::Env,
        mode,
    )
    .await
    .map_err(|e| {
        println!("Initialization error: {}", e);
        format!("{}: {}", messages.init_failed, e)
    })?;
    let mut engine = state.hippox.lock().await;
    *engine = Some(hippox);
    state
        .add_log(
            "success".to_string(),
            messages.init_success.clone(),
            Some(format!("Provider: {}", instance.provider)),
            None,
        )
        .await;

    Ok(())
}

#[tauri::command]
pub async fn send_chat_message(
    state: State<'_, AppStateWithChat>,
    message: String,
    session_id: Option<String>,
) -> Result<ChatResponse, String> {
    let start_time = std::time::Instant::now();
    let session = session_id.clone().unwrap_or_else(|| "default".to_string());
    let messages = state.get_log_messages().await;
    state
        .add_log(
            "process".to_string(),
            messages.init_start.clone(),
            Some(format!("message: {}", message)),
            None,
        )
        .await;
    if let Err(e) = init_engine_with_default(&state).await {
        state
            .add_log(
                "error".to_string(),
                format!("{}: {}", messages.init_failed, e),
                None,
                None,
            )
            .await;
        return Err(e);
    }
    let engine = state.hippox.lock().await;
    let hippox = engine
        .as_ref()
        .ok_or_else(|| messages.engine_not_initialized.clone())?;
    let response = hippox
        .handle_natural_language(&message, Some(&session))
        .await;
    let duration = start_time.elapsed().as_millis() as u64;
    state
        .add_log(
            "success".to_string(),
            messages.send_response.replace("{}", &duration.to_string()),
            Some(response.clone()),
            Some(duration),
        )
        .await;
    Ok(ChatResponse {
        success: true,
        message: response,
        session_id: session,
        error: None,
    })
}

#[tauri::command]
pub async fn get_execution_logs(
    state: State<'_, AppStateWithChat>,
) -> Result<Vec<ExecutionLog>, String> {
    Ok(state.get_logs().await)
}

#[tauri::command]
pub async fn clear_execution_logs(state: State<'_, AppStateWithChat>) -> Result<(), String> {
    state.clear_logs().await;
    Ok(())
}

#[tauri::command]
pub async fn reset_conversation(
    state: State<'_, AppStateWithChat>,
    session_id: Option<String>,
) -> Result<(), String> {
    let engine = state.hippox.lock().await;
    let messages = state.get_log_messages().await;
    if let Some(hippox) = engine.as_ref() {
        let session = session_id.unwrap_or_else(|| "default".to_string());
        hippox.clear_conversation(&session);
        state
            .add_log(
                "process".to_string(),
                messages.session_cleared.replace("{}", &session),
                None,
                None,
            )
            .await;
    }
    Ok(())
}

#[tauri::command]
pub async fn is_hippox_initialized(state: State<'_, AppStateWithChat>) -> Result<bool, String> {
    let engine = state.hippox.lock().await;
    Ok(engine.is_some())
}

#[tauri::command]
pub async fn get_atomic_skills_list(
    state: State<'_, AppStateWithChat>,
) -> Result<Vec<String>, String> {
    let engine = state.hippox.lock().await;
    if let Some(hippox) = engine.as_ref() {
        Ok(hippox.get_atomic_skill_names())
    } else {
        Ok(vec![])
    }
}
