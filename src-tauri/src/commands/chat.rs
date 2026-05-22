use hippox::ModelProvider;
use hippox::{ConfigInitMethod, Hippox, WorkflowMode};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

use crate::commands::{save_config_to_file, HIPPOX_APP_CONFIG};

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
pub struct ChatRequest {
    pub message: String,
    pub session_id: Option<String>,
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

#[tauri::command]
pub async fn init_hippox(
    state: State<'_, AppStateWithChat>,
    skills_dir: Option<String>,
    provider: Option<String>,
    api_key: Option<String>,
    api_base: Option<String>,
    workflow_mode: Option<String>,
    language: Option<String>,
) -> Result<bool, String> {
    let global_config = HIPPOX_APP_CONFIG.read().await;
    let final_skills_dir = skills_dir
        .clone()
        .or_else(|| Some(global_config.workspace.skills_dir.clone()))
        .unwrap_or_else(|| "~/.hippox/skills".to_string());
    let final_provider = provider
        .clone()
        .or_else(|| Some(global_config.llm.provider.clone()))
        .unwrap_or_else(|| "openai".to_string());
    let final_api_key = api_key
        .clone()
        .or_else(|| {
            let key = global_config.llm.api_key.clone();
            if key.is_empty() {
                None
            } else {
                Some(key)
            }
        })
        .unwrap_or_default();
    let final_api_base = api_base
        .clone()
        .or_else(|| Some(global_config.llm.api_base.clone()))
        .unwrap_or_else(|| "https://api.openai.com/v1".to_string());
    let final_workflow_mode = workflow_mode
        .clone()
        .or_else(|| Some(global_config.llm.workflow_mode.clone()))
        .unwrap_or_else(|| "react".to_string());
    let final_language = language
        .clone()
        .or_else(|| Some(global_config.language.clone()))
        .unwrap_or_else(|| "en".to_string());
    drop(global_config);
    state.set_language(final_language.clone()).await;
    let messages = state.get_log_messages().await;
    let model_provider = match final_provider.as_str() {
        "openai" => ModelProvider::OpenAI,
        "anthropic" => ModelProvider::Anthropic,
        "azure" => ModelProvider::Azure,
        "google" => ModelProvider::Google,
        "deepseek" => ModelProvider::DeepSeek,
        "alibaba" => ModelProvider::Alibaba,
        "zhipu" => ModelProvider::Zhipu,
        "moonshot" => ModelProvider::Moonshot,
        _ => ModelProvider::OpenAI,
    };
    let mode = match final_workflow_mode.as_str() {
        "batch" => WorkflowMode::Batch,
        "chain" => WorkflowMode::Chain,
        "plan_and_execute" => WorkflowMode::PlanAndExecute,
        "react" => WorkflowMode::ReAct,
        _ => WorkflowMode::ReAct,
    };
    state
        .add_log(
            "process".to_string(),
            messages.init_start,
            Some(format!(
                "skills_dir: {}, provider: {}, workflow_mode: {}",
                final_skills_dir, final_provider, final_workflow_mode
            )),
            None,
        )
        .await;
    let mut extra_keys = std::collections::HashMap::new();
    if final_provider == "custom" && !final_api_base.is_empty() {
        extra_keys.insert("api_base".to_string(), final_api_base.clone());
    }
    let init_result = Hippox::with_workflow_mode(
        &final_skills_dir,
        model_provider,
        if final_api_key.is_empty() {
            None
        } else {
            Some(final_api_key.clone())
        },
        if extra_keys.is_empty() {
            None
        } else {
            Some(extra_keys)
        },
        ConfigInitMethod::Env,
        mode,
    )
    .await;
    match init_result {
        Ok(hippox) => {
            let mut engine = state.hippox.lock().await;
            *engine = Some(hippox);

            state
                .add_log(
                    "success".to_string(),
                    messages.init_success,
                    Some(format!("API Base: {}", final_api_base)),
                    None,
                )
                .await;
            let mut global_config = HIPPOX_APP_CONFIG.write().await;
            if let Some(lang) = language {
                global_config.language = lang;
            }
            if let Some(p) = provider {
                global_config.llm.provider = p;
            }
            if let Some(key) = api_key {
                global_config.llm.api_key = key;
            }
            if let Some(base) = api_base {
                global_config.llm.api_base = base;
            }
            if let Some(wm) = workflow_mode {
                global_config.llm.workflow_mode = wm;
            }
            if let Some(dir) = skills_dir {
                global_config.workspace.skills_dir = dir;
            }
            if let Err(e) = save_config_to_file().await {
                eprintln!("Failed to save config: {}", e);
            }
            drop(global_config);
            Ok(true)
        }
        Err(e) => {
            state
                .add_log(
                    "error".to_string(),
                    messages.init_failed.clone(),
                    Some(e.to_string()),
                    None,
                )
                .await;
            Err(format!("{}: {}", messages.init_failed, e))
        }
    }
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
            messages.send_start.replace("{}", &message),
            None,
            None,
        )
        .await;

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

#[tauri::command]
pub async fn auto_init_hippox(state: State<'_, AppStateWithChat>) -> Result<bool, String> {
    {
        let engine = state.hippox.lock().await;
        if engine.is_some() {
            return Ok(true);
        }
    }
    let global_config = HIPPOX_APP_CONFIG.read().await;
    let skills_dir = global_config.workspace.skills_dir.clone();
    let provider = global_config.llm.provider.clone();
    let api_key = global_config.llm.api_key.clone();
    let api_base = global_config.llm.api_base.clone();
    let workflow_mode = global_config.llm.workflow_mode.clone();
    let language = global_config.language.clone();
    drop(global_config);
    if api_key.is_empty() {
        let messages = state.get_log_messages().await;
        return Err(messages.init_failed);
    }
    init_hippox(
        state,
        Some(skills_dir),
        Some(provider),
        Some(api_key),
        Some(api_base),
        Some(workflow_mode),
        Some(language),
    )
    .await
}
