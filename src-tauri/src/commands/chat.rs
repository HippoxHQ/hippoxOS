use crate::callback::{HippoXWorkflowCallback, HippoxDriverCallback};
use crate::commands::{load_config_from_file, TaskInfo, HIPPOX_APP_CONFIG};
use crate::context::{get_conversation_history, store_user_message, Context};
use crate::hippox_core::{get_default_hippox, init_all_hippox_instances};
use crate::llm::prompts::get_system_prompt;
use crate::state::AppState;
use crate::types::Role;
use crate::workspace::get_default_workspace;
use hippox::ModelProvider;
use hippox::{Hippox, HippoxResult, WorkflowMode};
use memcontext::MemContext;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{Emitter, State};
use tokio::sync::Mutex;
use uuid::Uuid;

pub(crate) struct LogMessages {
    init_start: String,
    init_success: String,
    init_failed: String,
    send_start: String,
    send_response: String,
    session_cleared: String,
    engine_not_initialized: String,
}

impl LogMessages {
    pub fn get() -> Self {
        let lang = crate::common::get_setting_with_default("language", serde_json::json!("en"))
            .map(|v| v.as_str().unwrap_or("en").to_string())
            .unwrap_or_else(|_| "en".to_string());
        match lang.as_str() {
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

/// Helper function to build enhanced message with history and system prompt
async fn build_enhanced_message(
    mem: Option<&MemContext>,
    session_id: &str,
    message: &str,
) -> String {
    let workspace_path = get_default_workspace()
        .ok()
        .flatten()
        .map(|ws| ws.workspace_path)
        .unwrap_or_else(|| {
            crate::commands::get_app_root_dir()
                .join("workspace")
                .to_string_lossy()
                .to_string()
        });
    let system_prompt = get_system_prompt(&workspace_path);
    let history_context = if let Some(mem_ref) = mem {
        get_conversation_history(mem_ref, session_id, 20)
            .await
            .unwrap_or_default()
    } else {
        String::new()
    };
    if !history_context.is_empty() {
        format!(
            "{}\n\n{}\n\n## User\n{}",
            system_prompt, history_context, message
        )
    } else {
        format!("{}\n\n{}", system_prompt, message)
    }
}

#[tauri::command]
pub async fn cmd_set_hippox_language(
    state: State<'_, AppState>,
    language: String,
) -> Result<(), String> {
    state.set_language(language).await;
    Ok(())
}

#[tauri::command]
pub async fn cmd_get_hippox_language(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.get_language().await)
}

#[tauri::command]
pub async fn reinitialize_hippox() -> Result<(), String> {
    load_config_from_file().await?;
    init_all_hippox_instances().await?;
    Ok(())
}

#[tauri::command]
pub async fn cmd_send_chat_message_async(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    raw_message: String,
    message: String,
    session_id: Option<String>,
) -> Result<String, String> {
    let session = session_id.clone().unwrap_or_else(|| "default".to_string());
    let hippox = get_default_hippox().await?;
    let mem = state.get_memcontext().await;
    // Store user message
    if let Some(ref mem_ref) = mem {
        let _ = store_user_message(mem_ref, &session, &raw_message).await;
    }
    // Build enhanced message with history
    let enhanced_message = build_enhanced_message(mem.as_deref(), &session, &message).await;
    let workflow_callback = Arc::new(HippoXWorkflowCallback::new(
        app_handle.clone(),
        session.clone(),
    ));
    // atom skill callback
    let skill_callback = Arc::new(HippoxDriverCallback::new(
        app_handle.clone(),
        session.clone(),
    ));
    // Handle HippoxResult from submit
    let core_task_id = match hippox.submit(
        &enhanced_message,
        Some(workflow_callback),
        Some(skill_callback),
    ) {
        HippoxResult {
            data: Some(task_id),
            ..
        } => task_id,
        HippoxResult {
            error: Some(err), ..
        } => return Err(err),
        _ => return Err("Failed to submit task".to_string()),
    };
    let messages = LogMessages::get();
    state
        .add_log(
            "process".to_string(),
            messages.send_start.replace("{}", &message),
            Some(format!("task_id: {}", core_task_id)),
            None,
        )
        .await;
    state
        .create_task(core_task_id.clone(), session.clone(), message.clone())
        .await;
    state.update_task_status(&core_task_id, "pending").await;
    Ok(core_task_id)
}

#[tauri::command]
pub async fn cmd_send_chat_message(
    state: State<'_, AppState>,
    app_handle: tauri::AppHandle,
    message: String,
    session_id: Option<String>,
) -> Result<ChatResponse, String> {
    let start_time = std::time::Instant::now();
    let session = session_id.clone().unwrap_or_else(|| "default".to_string());
    let hippox = get_default_hippox().await?;
    let mem = state.get_memcontext().await;
    // Store user message
    if let Some(ref mem_ref) = mem {
        let _ = store_user_message(mem_ref, &session, &message).await;
    }
    // Build enhanced message with history
    let enhanced_message = build_enhanced_message(mem.as_deref(), &session, &message).await;
    let workflow_callback = Arc::new(HippoXWorkflowCallback::new(
        app_handle.clone(),
        session.clone(),
    ));
    // atom skill callback
    let skill_callback = Arc::new(HippoxDriverCallback::new(
        app_handle.clone(),
        session.clone(),
    ));
    // Handle HippoxResult from submit
    let core_task_id = match hippox.submit(
        &enhanced_message,
        Some(workflow_callback),
        Some(skill_callback),
    ) {
        HippoxResult {
            data: Some(task_id),
            ..
        } => task_id,
        HippoxResult {
            error: Some(err), ..
        } => return Err(err),
        _ => return Err("Failed to submit task".to_string()),
    };
    state
        .create_task(core_task_id.clone(), session.clone(), message.clone())
        .await;
    state.update_task_status(&core_task_id, "pending").await;
    let duration = start_time.elapsed().as_millis() as u64;
    let messages = LogMessages::get();
    Ok(ChatResponse {
        success: true,
        message: core_task_id,
        session_id: session,
        error: None,
    })
}

#[tauri::command]
pub async fn cmd_get_task_status(
    state: State<'_, AppState>,
    task_id: String,
) -> Result<Option<TaskInfo>, String> {
    Ok(state.get_task(&task_id).await)
}

#[tauri::command]
pub async fn cmd_get_session_tasks(
    state: State<'_, AppState>,
    session_id: Option<String>,
) -> Result<Vec<TaskInfo>, String> {
    let session = session_id.unwrap_or_else(|| "default".to_string());
    Ok(state.get_session_tasks(&session).await)
}

#[tauri::command]
pub async fn cmd_get_execution_logs(
    state: State<'_, AppState>,
) -> Result<Vec<ExecutionLog>, String> {
    Ok(state.get_logs().await)
}

#[tauri::command]
pub async fn cmd_clear_execution_logs(state: State<'_, AppState>) -> Result<(), String> {
    state.clear_logs().await;
    Ok(())
}

#[tauri::command]
pub async fn cmd_reset_conversation(
    state: State<'_, AppState>,
    session_id: Option<String>,
) -> Result<(), String> {
    let messages = LogMessages::get();
    let session = session_id.unwrap_or_else(|| "default".to_string());
    state
        .add_log(
            "process".to_string(),
            messages.session_cleared.replace("{}", &session),
            None,
            None,
        )
        .await;
    Ok(())
}

#[tauri::command]
pub async fn cmd_is_hippox_initialized() -> Result<bool, String> {
    Ok(get_default_hippox().await.is_ok())
}

#[tauri::command]
pub async fn cmd_get_atomic_skills_list() -> Result<Vec<String>, String> {
    match get_default_hippox().await {
        Ok(hippox) => {
            // Handle HippoxResult from get_atomic_skill_names
            match hippox.get_driver_names() {
                HippoxResult {
                    data: Some(skills), ..
                } => Ok(skills),
                HippoxResult {
                    error: Some(err), ..
                } => Err(err),
                _ => Ok(vec![]),
            }
        }
        Err(_) => Ok(vec![]),
    }
}
