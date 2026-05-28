use hippox::ModelProvider;
use hippox::{ConfigInitMethod, Hippox, WorkflowMode};
use memcontext::MemContext;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{Emitter, State};
use tokio::sync::Mutex;
use uuid::Uuid;

use crate::commands::callback::TauriWorkflowCallback;
use crate::commands::{
    get_default_hippox, init_all_hippox_instances, load_config_from_file, write_log, ExecutionLog,
    LogMessages, TaskInfo, TaskStepInfo, HIPPOX_APP_CONFIG,
};
use crate::workspace::get_default_workspace;

#[derive(Clone)]
pub struct AppState {
    pub logs: Arc<Mutex<Vec<ExecutionLog>>>,
    pub language: Arc<Mutex<String>>,
    pub tasks: Arc<Mutex<HashMap<String, TaskInfo>>>,
    pub memcontext: Arc<Mutex<Option<Arc<MemContext>>>>,
}
// AppStateWithChat
impl AppState {
    pub fn new() -> Self {
        Self {
            logs: Arc::new(Mutex::new(Vec::new())),
            language: Arc::new(Mutex::new("en".to_string())),
            tasks: Arc::new(Mutex::new(HashMap::new())),
            memcontext: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn set_memcontext(&self, mem: MemContext) {
        let mut guard = self.memcontext.lock().await;
        *guard = Some(Arc::new(mem));
    }

    pub async fn get_memcontext(&self) -> Option<Arc<MemContext>> {
        self.memcontext.lock().await.clone()
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
        let _ = write_log(&level, &message, details.as_deref());
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
