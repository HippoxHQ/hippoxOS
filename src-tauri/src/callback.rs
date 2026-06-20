use async_trait::async_trait;
use hippox::{DriverCallback, WorkflowCallback};
use serde_json::json;
use std::fmt::Debug;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};

use crate::state::AppState;
use crate::types::Role;

#[derive(Debug, Clone)]
pub struct HippoXWorkflowCallback {
    app_handle: AppHandle,
    session_id: String,
    completed: Arc<AtomicBool>,
}

impl HippoXWorkflowCallback {
    pub fn new(app_handle: AppHandle, session_id: String) -> Self {
        Self {
            app_handle,
            session_id,
            completed: Arc::new(AtomicBool::new(false)),
        }
    }
}

#[async_trait]
impl WorkflowCallback for HippoXWorkflowCallback {
    async fn on_step_start(
        &self,
        task_id: &str,
        step_name: &str,
        step_index: usize,
        input: Option<&std::collections::HashMap<String, serde_json::Value>>,
    ) {
        let params_json =
            input.map(|p| serde_json::to_string(p).unwrap_or_else(|_| "{}".to_string()));

        let _ = self.app_handle.emit(
            "task_step_update",
            &json!({
                "task_id": task_id,
                "step_name": step_name,
                "step_index": step_index,
                "status": "RUNNING",
                "input": params_json,
                "session_id": self.session_id
            }),
        );
    }

    async fn on_step_success(
        &self,
        task_id: &str,
        step_name: &str,
        step_index: usize,
        output: &str,
        duration_ms: u64,
    ) {
        let _ = self.app_handle.emit(
            "task_step_update",
            &json!({
                "task_id": task_id,
                "step_name": step_name,
                "step_index": step_index,
                "status": "SUCCESS",
                "output": output,
                "duration_ms": duration_ms,
                "session_id": self.session_id
            }),
        );
    }

    async fn on_step_failure(
        &self,
        task_id: &str,
        step_name: &str,
        step_index: usize,
        error: &str,
        duration_ms: u64,
    ) {
        let _ = self.app_handle.emit(
            "task_step_update",
            &json!({
                "task_id": task_id,
                "step_name": step_name,
                "step_index": step_index,
                "status": "FAILURE",
                "error": error,
                "duration_ms": duration_ms,
                "session_id": self.session_id
            }),
        );
    }

    async fn on_step_timeout(
        &self,
        task_id: &str,
        step_name: &str,
        step_index: usize,
        error: &str,
        duration_ms: u64,
    ) {
        let _ = self.app_handle.emit(
            "task_step_update",
            &json!({
                "task_id": task_id,
                "step_name": step_name,
                "step_index": step_index,
                "status": "TIMEOUT",
                "error": error,
                "duration_ms": duration_ms,
                "session_id": self.session_id
            }),
        );
    }

    async fn on_step_interrupted(&self, task_id: &str, info: &hippox::StepInterruptionInfo) {
        let _ = self.app_handle.emit(
            "task_step_interrupted",
            &json!({
                "task_id": task_id,
                "step_index": info.step_index,
                "step_name": info.step_name,
                "reason": info.reason,
                "checkpoint": info.checkpoint,
                "session_id": self.session_id
            }),
        );
    }

    async fn on_workflow_complete(
        &self,
        task_id: &str,
        final_output: &str,
        total_duration_ms: u64,
        total_steps: usize,
    ) {
        if !self.completed.swap(true, Ordering::SeqCst) {
            let app_handle = self.app_handle.clone();
            let _ = self.app_handle.emit(
                "task_complete",
                &json!({
                    "task_id": task_id,
                    "final_output": final_output,
                    "total_duration_ms": total_duration_ms,
                    "total_steps": total_steps,
                    "session_id": self.session_id
                }),
            );
        }
    }

    async fn on_workflow_failed(
        &self,
        task_id: &str,
        error: &str,
        total_duration_ms: u64,
        total_steps: usize,
    ) {
        if !self.completed.swap(true, Ordering::SeqCst) {
            let app_handle = self.app_handle.clone();
            let session_id = self.session_id.clone();
            let err_msg = format!("Error: {}", error);
            tokio::spawn(async move {
                if let Some(mem) = app_handle.state::<AppState>().get_memcontext().await {
                    let _ = mem
                        .store_message(session_id, Role::LLM.to_string(), err_msg)
                        .await;
                }
            });
            let _ = self.app_handle.emit(
                "task_failed",
                &json!({
                    "task_id": task_id,
                    "error": error,
                    "total_duration_ms": total_duration_ms,
                    "total_steps": total_steps,
                    "session_id": self.session_id
                }),
            );
        }
    }

    async fn on_workflow_cancelled(
        &self,
        task_id: &str,
        total_duration_ms: u64,
        total_steps: usize,
    ) {
        let _ = self.app_handle.emit(
            "task_cancelled",
            &json!({
                "task_id": task_id,
                "total_duration_ms": total_duration_ms,
                "total_steps": total_steps,
                "session_id": self.session_id
            }),
        );
    }

    async fn on_workflow_paused(
        &self,
        task_id: &str,
        checkpoint: Option<&str>,
        total_duration_ms: u64,
        total_steps: usize,
    ) {
        let _ = self.app_handle.emit(
            "task_paused",
            &json!({
                "task_id": task_id,
                "checkpoint": checkpoint,
                "total_duration_ms": total_duration_ms,
                "total_steps": total_steps,
                "session_id": self.session_id
            }),
        );
    }

    // Add this new method for workflow resumed
    async fn on_workflow_resumed(&self, task_id: &str, total_duration_ms: u64, total_steps: usize) {
        let _ = self.app_handle.emit(
            "task_resumed",
            &json!({
                "task_id": task_id,
                "total_duration_ms": total_duration_ms,
                "total_steps": total_steps,
                "session_id": self.session_id
            }),
        );
    }
}

// ======================= Driver Call Back =======================

#[derive(Debug, Clone)]
pub struct HippoxDriverCallback {
    app_handle: AppHandle,
    session_id: String,
    task_id: Option<String>,
}

impl HippoxDriverCallback {
    pub fn new(app_handle: AppHandle, session_id: String) -> Self {
        Self {
            app_handle,
            session_id,
            task_id: None,
        }
    }

    pub fn with_task_id(mut self, task_id: impl Into<String>) -> Self {
        self.task_id = Some(task_id.into());
        self
    }
}

impl DriverCallback for HippoxDriverCallback {
    fn on_progress(
        &self,
        task_id: Option<String>,
        driver_index: Option<usize>,
        progress: Option<u32>,
        message: Option<String>,
    ) {
        let _ = self.app_handle.emit(
            "driver_callback_progress",
            &json!({
                "task_id": task_id.or_else(|| self.task_id.clone()),
                "step_index": driver_index,
                "progress": progress,
                "message": message,
                "session_id": self.session_id
            }),
        );
    }

    fn on_start(
        &self,
        task_id: Option<String>,
        driver_index: Option<usize>,
        driver_name: Option<String>,
    ) {
        let _ = self.app_handle.emit(
            "driver_callback_start",
            &json!({
                "task_id": task_id.or_else(|| self.task_id.clone()),
                "step_index": driver_index,
                "driver_name": driver_name,
                "session_id": self.session_id
            }),
        );
    }

    fn on_complete(
        &self,
        task_id: Option<String>,
        driver_index: Option<usize>,
        driver_name: Option<String>,
        output: Option<String>,
    ) {
        let _ = self.app_handle.emit(
            "driver_callback_complete",
            &json!({
                "task_id": task_id.or_else(|| self.task_id.clone()),
                "step_index": driver_index,
                "driver_name": driver_name,
                "output": output,
                "session_id": self.session_id
            }),
        );
    }

    fn on_error(
        &self,
        task_id: Option<String>,
        driver_index: Option<usize>,
        driver_name: Option<String>,
        error: Option<String>,
    ) {
        let _ = self.app_handle.emit(
            "driver_callback_error",
            &json!({
                "task_id": task_id.or_else(|| self.task_id.clone()),
                "step_index": driver_index,
                "driver_name": driver_name,
                "error": error,
                "session_id": self.session_id
            }),
        );
    }

    fn on_log(
        &self,
        task_id: Option<String>,
        driver_index: Option<usize>,
        message: Option<String>,
    ) {
        let _ = self.app_handle.emit(
            "driver_callback_log",
            &json!({
                "task_id": task_id.or_else(|| self.task_id.clone()),
                "step_index": driver_index,
                "msg": message,
                "session_id": self.session_id
            }),
        );
    }
}
