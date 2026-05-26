use hippox::ModelProvider;
use hippox::{ConfigInitMethod, Hippox, WorkflowMode};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{Emitter, State};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::commands::callback::TauriWorkflowCallback;
use crate::commands::{
    get_default_hippox, init_all_hippox_instances, load_config_from_file, HIPPOX_APP_CONFIG,
};
use crate::workspace::get_default_workspace;

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
pub struct TaskStepInfo {
    pub step_index: usize,
    pub step_name: String,
    pub status: String,
    pub output: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskInfo {
    pub task_id: String,
    pub session_id: String,
    pub user_input: String,
    pub status: String,
    pub steps: Vec<TaskStepInfo>,
    pub final_output: Option<String>,
    pub created_at: String,
    pub updated_at: String,
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
    pub logs: Arc<Mutex<Vec<ExecutionLog>>>,
    pub language: Arc<Mutex<String>>,
    pub tasks: Arc<Mutex<HashMap<String, TaskInfo>>>,
}

impl AppStateWithChat {
    pub fn new() -> Self {
        Self {
            logs: Arc::new(Mutex::new(Vec::new())),
            language: Arc::new(Mutex::new("en".to_string())),
            tasks: Arc::new(Mutex::new(HashMap::new())),
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
            id: Uuid::new_v4().to_string(),
            timestamp: chrono::Local::now().format("%H:%M:%S").to_string(),
            level: level.clone(),
            message: message.clone(),
            details: details.clone(),
            duration,
        });
        if logs.len() > 1000 {
            logs.remove(0);
        }
        let _ = super::paths::write_log(&level, &message, details.as_deref());
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
        LogMessages::get()
    }

    pub async fn create_task(&self, task_id: String, session_id: String, user_input: String) {
        let now = chrono::Local::now().to_rfc3339();
        let task = TaskInfo {
            task_id: task_id.clone(),
            session_id,
            user_input,
            status: "pending".to_string(),
            steps: vec![],
            final_output: None,
            created_at: now.clone(),
            updated_at: now,
        };
        let mut tasks = self.tasks.lock().await;
        tasks.insert(task_id, task);
    }

    pub async fn update_task_status(&self, task_id: &str, status: &str) {
        let mut tasks = self.tasks.lock().await;
        if let Some(task) = tasks.get_mut(task_id) {
            task.status = status.to_string();
            task.updated_at = chrono::Local::now().to_rfc3339();
        }
    }

    pub async fn add_task_step(
        &self,
        task_id: &str,
        step_index: usize,
        step_name: &str,
        status: &str,
        output: Option<String>,
        error: Option<String>,
    ) {
        let mut tasks = self.tasks.lock().await;
        if let Some(task) = tasks.get_mut(task_id) {
            task.steps.push(TaskStepInfo {
                step_index,
                step_name: step_name.to_string(),
                status: status.to_string(),
                output,
                error,
            });
            task.updated_at = chrono::Local::now().to_rfc3339();
        }
    }

    pub async fn complete_task(&self, task_id: &str, final_output: &str) {
        let mut tasks = self.tasks.lock().await;
        if let Some(task) = tasks.get_mut(task_id) {
            task.status = "completed".to_string();
            task.final_output = Some(final_output.to_string());
            task.updated_at = chrono::Local::now().to_rfc3339();
        }
    }

    pub async fn fail_task(&self, task_id: &str, error: &str) {
        let mut tasks = self.tasks.lock().await;
        if let Some(task) = tasks.get_mut(task_id) {
            task.status = "failed".to_string();
            task.final_output = Some(error.to_string());
            task.updated_at = chrono::Local::now().to_rfc3339();
        }
    }

    pub async fn get_task(&self, task_id: &str) -> Option<TaskInfo> {
        let tasks = self.tasks.lock().await;
        tasks.get(task_id).cloned()
    }

    pub async fn get_session_tasks(&self, session_id: &str) -> Vec<TaskInfo> {
        let tasks = self.tasks.lock().await;
        tasks
            .values()
            .filter(|t| t.session_id == session_id)
            .cloned()
            .collect()
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
pub async fn reinitialize_hippox() -> Result<(), String> {
    load_config_from_file().await?;
    init_all_hippox_instances().await?;
    Ok(())
}

#[tauri::command]
pub async fn send_chat_message_async(
    state: State<'_, AppStateWithChat>,
    app_handle: tauri::AppHandle,
    message: String,
    session_id: Option<String>,
) -> Result<String, String> {
    let task_id = Uuid::new_v4().to_string();
    let session = session_id.clone().unwrap_or_else(|| "default".to_string());
    state
        .create_task(task_id.clone(), session.clone(), message.clone())
        .await;
    state.update_task_status(&task_id, "pending").await;
    let messages = state.get_log_messages().await;
    state
        .add_log(
            "process".to_string(),
            messages.send_start.replace("{}", &message),
            Some(format!("task_id: {}", task_id)),
            None,
        )
        .await;
    let state_clone = state.inner().clone();
    let app_handle_clone = app_handle.clone();
    let task_id_clone = task_id.clone();
    tokio::spawn(async move {
        execute_task_async(
            state_clone,
            app_handle_clone,
            task_id_clone,
            message,
            session,
        )
        .await;
    });
    Ok(task_id)
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
    let hippox = get_default_hippox().await?;
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
    let system_prompt = format!(
        "[Important Rule] When performing file download, file write, or file creation operations, \
         if no target directory is explicitly specified, please use the following workspace directory by default: {}\n\
         Do not write files to system temp directory or any other non-workspace directories. \
         If subdirectories need to be created, create them under the workspace directory.",
        workspace_path
    );
    let enhanced_message = format!("{}\n\n{}", system_prompt, message);
    let response = hippox
        .handle_natural_language(&enhanced_message, Some(&session), None)
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
pub async fn get_task_status(
    state: State<'_, AppStateWithChat>,
    task_id: String,
) -> Result<Option<TaskInfo>, String> {
    Ok(state.get_task(&task_id).await)
}

#[tauri::command]
pub async fn get_session_tasks(
    state: State<'_, AppStateWithChat>,
    session_id: Option<String>,
) -> Result<Vec<TaskInfo>, String> {
    let session = session_id.unwrap_or_else(|| "default".to_string());
    Ok(state.get_session_tasks(&session).await)
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
    let messages = state.get_log_messages().await;
    let hippox = get_default_hippox().await?;
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
    Ok(())
}

#[tauri::command]
pub async fn is_hippox_initialized() -> Result<bool, String> {
    Ok(get_default_hippox().await.is_ok())
}

#[tauri::command]
pub async fn get_atomic_skills_list() -> Result<Vec<String>, String> {
    match get_default_hippox().await {
        Ok(hippox) => Ok(hippox.get_atomic_skill_names()),
        Err(_) => Ok(vec![]),
    }
}

async fn execute_task_async(
    state: AppStateWithChat,
    app_handle: tauri::AppHandle,
    task_id: String,
    message: String,
    session_id: String,
) {
    state.update_task_status(&task_id, "running").await;
    let callback = Arc::new(TauriWorkflowCallback::new(
        app_handle.clone(),
        task_id.clone(),
    ));
    let callback_clone = callback.clone();
    let hippox = match get_default_hippox().await {
        Ok(engine) => engine,
        Err(e) => {
            state.fail_task(&task_id, &e).await;
            callback.emit_failed(&e).await;
            return;
        }
    };
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
    let system_prompt = format!(
        "[Important Rule] When performing file download, file write, or file creation operations, \
         if no target directory is explicitly specified, please use the following workspace directory by default: {}\n\
         Do not write files to system temp directory or any other non-workspace directories. \
         If subdirectories need to be created, create them under the workspace directory.",
        workspace_path
    );
    let enhanced_message = format!("{}\n\n{}", system_prompt, message);
    let response = hippox
        .handle_natural_language(&enhanced_message, Some(&session_id), Some(callback_clone))
        .await;
    let duration = std::time::Instant::now().elapsed().as_millis() as u64;
    let messages = state.get_log_messages().await;
    let is_error = response.contains("error.llm_error")
        || response.contains("LLM error")
        || response.contains("401 Unauthorized")
        || response.contains("403 Forbidden")
        || response.contains("429 Too Many Requests")
        || response.contains("500 Internal Server Error")
        || response.contains("502 Bad Gateway")
        || response.contains("503 Service Unavailable")
        || response.contains("timeout")
        || response.contains("connection")
        || response.contains("invalid")
        || response.contains("Authentication")
        || response.contains("authentication")
        || response.to_lowercase().contains("error")
        || response.starts_with("Error:");
    if is_error {
        callback.emit_failed(&response).await;
        state.fail_task(&task_id, &response).await;
        state
            .add_log(
                "error".to_string(),
                format!("Task failed: {}", response),
                Some(response),
                Some(duration),
            )
            .await;
    } else {
        callback.emit_complete(&response).await;
        state.complete_task(&task_id, &response).await;
        state
            .add_log(
                "success".to_string(),
                messages.send_response.replace("{}", &duration.to_string()),
                Some(response),
                Some(duration),
            )
            .await;
    }
}
