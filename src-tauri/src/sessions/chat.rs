use crate::callback::{HippoXWorkflowCallback, HippoxDriverCallback};
use crate::commands::{
    cmd_get_disabled_drivers, get_default_chat_model_id, increment_session_chat_count, load_config_from_file, TaskInfo, HIPPOX_APP_CONFIG,
};
use crate::context::{get_conversation_history, store_user_message, Context};
use crate::hippox_core::{get_default_hippox_with_chat_model, init_all_hippox_instances};
use crate::state::AppState;
use crate::statistics::{append_record, update_record, ChatSource, ChatStatisticsRecord, RecordPatch};
use crate::subsystem::SubSystemEnum;
use crate::types::Role;
use crate::workspace::get_default_workspace;
use hippox::{string_to_workflow_mode, ChatModelProvider};
use hippox::{Hippox, HippoxResult, WorkflowMode};
use memcontext::MemContext;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::str::FromStr;
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
        let lang = crate::commons::get_setting_with_default("language", serde_json::json!("en"))
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
async fn build_enhanced_message(mem: Option<&MemContext>, session_id: &str, message: &str) -> String {
    let history_context =
        if let Some(mem_ref) = mem { get_conversation_history(mem_ref, session_id, 20).await.unwrap_or_default() } else { String::new() };
    if !history_context.is_empty() {
        format!("{}\n\n## User\n{}", history_context, message)
    } else {
        format!("{}", message)
    }
}
/// Resolve the provider and default model of the current default LLM instance.
async fn resolve_default_chat_provider_and_model() -> (String, String) {
    let config = HIPPOX_APP_CONFIG.read().await;
    let default_id = config
        .llm_instances
        .iter()
        .find(|(_, instance)| instance.is_default == Some(true))
        .map(|(id, _)| id.clone())
        .or_else(|| config.llm_instances.keys().next().cloned());
    match default_id.and_then(|id| config.llm_instances.get(&id)) {
        Some(inst) => (inst.provider.clone(), inst.default_model.clone()),
        None => (String::new(), String::new()),
    }
}
#[tauri::command]
pub async fn cmd_set_hippox_language(state: State<'_, AppState>, language: String) -> Result<(), String> {
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
    workflow_mode: Option<String>,
    subsystem: Option<String>,
) -> Result<String, String> {
    let session = session_id.clone().unwrap_or_else(|| "default".to_string());
    // Resolve the subsystem identifier. When the caller omits it, default to
    // `General` so older call sites keep working unchanged.
    let subsystem_enum = match subsystem {
        Some(ref s) if !s.trim().is_empty() => SubSystemEnum::from_str(s)?,
        _ => SubSystemEnum::General,
    };
    let hippox = get_default_hippox_with_chat_model().await?;
    let mem = state.get_memcontext().await;
    // Store user message
    if let Some(ref mem_ref) = mem {
        let _ = store_user_message(mem_ref, &session, &raw_message).await;
    }
    // Increment chat count in profile for this session
    let _ = increment_session_chat_count(&session);
    // Build enhanced message with history
    let enhanced_message = build_enhanced_message(mem.as_deref(), &session, &message).await;
    let workflow_callback = Arc::new(HippoXWorkflowCallback::new(app_handle.clone(), session.clone()));
    // atom skill callback
    let skill_callback = Arc::new(HippoxDriverCallback::new(app_handle.clone(), session.clone()));
    // disabled drivers
    let disabled_drivers = cmd_get_disabled_drivers().await.ok();
    let disable_drivers_refs = disabled_drivers.as_ref().map(|v| v.iter().map(|s| s.as_str()).collect::<Vec<_>>());
    // default workflow
    let workflow_mode_str = workflow_mode.clone().unwrap_or_else(|| "ReAct".to_string());
    let workflow_mode_enum = match string_to_workflow_mode(&workflow_mode_str) {
        Some(m) => m,
        None => return Err(format!("Invalid workflow mode: {}", workflow_mode_str)),
    };
    // Resolve the provider and model so the statistics ledger can attribute
    // the message to a concrete provider/model pair.
    let (provider, model) = resolve_default_chat_provider_and_model().await;
    // Handle HippoxResult from submit
    let core_task_id =
        match hippox.submit(&enhanced_message, workflow_mode_enum, &model, Some(workflow_callback), Some(skill_callback), disable_drivers_refs) {
            HippoxResult { data: Some(task_id), .. } => task_id,
            HippoxResult { error: Some(err), .. } => return Err(err),
            _ => return Err("Failed to submit task".to_string()),
        };
    // Pre-create a pending "llm" record with the submit-time provider/model
    // snapshot and the subsystem identifier.
    append_record(ChatStatisticsRecord::llm(
        &core_task_id,
        &session,
        subsystem_enum,
        ChatSource::Chat,
        "",
        &model,
        &provider,
        &workflow_mode_str,
        0,
        0,
    ));
    {
        let task_id_for_tokens = core_task_id.clone();
        tokio::spawn(async move {
            let result = hippox::wait_task(&task_id_for_tokens).await;
            let (content, input_tokens, output_tokens) = match result {
                HippoxResult { data: Some(output), input_tokens, output_tokens, .. } => (output, input_tokens, output_tokens),
                HippoxResult { error: Some(err), input_tokens, output_tokens, .. } => {
                    log::warn!("[Statistics] task {} failed: {}", task_id_for_tokens, err);
                    (String::new(), input_tokens, output_tokens)
                }
                _ => (String::new(), 0, 0),
            };
            update_record(
                &task_id_for_tokens,
                "llm",
                RecordPatch { content: Some(content), input_tokens: Some(input_tokens), output_tokens: Some(output_tokens) },
            );
        });
    }
    let messages = LogMessages::get();
    state.add_log("process".to_string(), messages.send_start.replace("{}", &message), Some(format!("task_id: {}", core_task_id)), None).await;
    state.create_task(core_task_id.clone(), session.clone(), message.clone()).await;
    state.update_task_status(&core_task_id, "pending").await;
    Ok(core_task_id)
}
#[tauri::command]
pub async fn cmd_get_task_status(state: State<'_, AppState>, task_id: String) -> Result<Option<TaskInfo>, String> {
    Ok(state.get_task(&task_id).await)
}
#[tauri::command]
pub async fn cmd_get_session_tasks(state: State<'_, AppState>, session_id: Option<String>) -> Result<Vec<TaskInfo>, String> {
    let session = session_id.unwrap_or_else(|| "default".to_string());
    Ok(state.get_session_tasks(&session).await)
}
#[tauri::command]
pub async fn cmd_get_execution_logs(state: State<'_, AppState>) -> Result<Vec<ExecutionLog>, String> {
    Ok(state.get_logs().await)
}
#[tauri::command]
pub async fn cmd_clear_execution_logs(state: State<'_, AppState>) -> Result<(), String> {
    state.clear_logs().await;
    Ok(())
}
#[tauri::command]
pub async fn cmd_reset_conversation(state: State<'_, AppState>, session_id: Option<String>) -> Result<(), String> {
    let messages = LogMessages::get();
    let session = session_id.unwrap_or_else(|| "default".to_string());
    state.add_log("process".to_string(), messages.session_cleared.replace("{}", &session), None, None).await;
    Ok(())
}
#[tauri::command]
pub async fn cmd_is_hippox_initialized() -> Result<bool, String> {
    Ok(get_default_hippox_with_chat_model().await.is_ok())
}
#[tauri::command]
pub async fn cmd_get_atomic_skills_list() -> Result<Vec<String>, String> {
    match get_default_hippox_with_chat_model().await {
        Ok(hippox) => {
            // Handle HippoxResult from get_atomic_skill_names
            match hippox.get_driver_names() {
                HippoxResult { data: Some(skills), .. } => Ok(skills),
                HippoxResult { error: Some(err), .. } => Err(err),
                _ => Ok(vec![]),
            }
        }
        Err(_) => Ok(vec![]),
    }
}