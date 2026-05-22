use hippox::ModelProvider;
use hippox::{ConfigInitMethod, Hippox, WorkflowMode};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

struct LogMessages {
    init_start: String,
    init_success: String,
    send_start: String,
    send_response: String,
    session_cleared: String,
}

impl LogMessages {
    fn get(lang: &str) -> Self {
        match lang {
            "zh" => LogMessages {
                init_start: "正在初始化 Hippox 引擎...".to_string(),
                init_success: "Hippox 引擎初始化成功".to_string(),
                send_start: "📤 发送消息: {}".to_string(),
                send_response: "📥 收到响应 (耗时: {}ms)".to_string(),
                session_cleared: "已清空会话: {}".to_string(),
            },
            _ => LogMessages {
                init_start: "Initializing Hippox engine...".to_string(),
                init_success: "Hippox engine initialized successfully".to_string(),
                send_start: "📤 Sending message: {}".to_string(),
                send_response: "📥 Received response (took: {}ms)".to_string(),
                session_cleared: "Session cleared: {}".to_string(),
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

pub struct HippoxInstance {
    engine: Arc<Mutex<Option<Hippox>>>,
    logs: Arc<Mutex<Vec<ExecutionLog>>>,
    session_id: String,
}

impl HippoxInstance {
    pub fn new() -> Self {
        Self {
            engine: Arc::new(Mutex::new(None)),
            logs: Arc::new(Mutex::new(Vec::new())),
            session_id: "default".to_string(),
        }
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

    pub async fn clear_logs(&self) {
        let mut logs = self.logs.lock().await;
        logs.clear();
    }

    pub async fn get_logs(&self) -> Vec<ExecutionLog> {
        self.logs.lock().await.clone()
    }
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
    skills_dir: String,
    provider: String,
    api_key: String,
    workflow_mode: Option<String>,
    language: Option<String>,
) -> Result<bool, String> {
    if let Some(lang) = language {
        state.set_language(lang).await;
    }
    let messages = state.get_log_messages().await;
    let model_provider = match provider.as_str() {
        "openai" => ModelProvider::OpenAI,
        "anthropic" => ModelProvider::Anthropic,
        "azure" => ModelProvider::Azure,
        "google" => ModelProvider::Google,
        "deepseek" => ModelProvider::DeepSeek,
        "alibaba" => ModelProvider::Alibaba,
        _ => ModelProvider::OpenAI,
    };
    let mode = match workflow_mode.as_deref() {
        Some("batch") => WorkflowMode::Batch,
        Some("chain") => WorkflowMode::Chain,
        Some("plan_and_execute") => WorkflowMode::PlanAndExecute,
        _ => WorkflowMode::ReAct,
    };
    state
        .add_log("process".to_string(), messages.init_start, None, None)
        .await;
    let hippox = Hippox::with_workflow_mode(
        &skills_dir,
        model_provider,
        Some(api_key),
        None,
        ConfigInitMethod::Env,
        mode,
    )
    .await
    .map_err(|e| format!("初始化失败: {}", e))?;
    let mut engine = state.hippox.lock().await;
    *engine = Some(hippox);
    state
        .add_log("success".to_string(), messages.init_success, None, None)
        .await;
    Ok(true)
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
    let hippox = engine.as_ref().ok_or("Hippox 引擎未初始化")?;
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
