use async_trait::async_trait;
use hippox::WorkflowCallback;
use serde_json::json;
use std::fmt::Debug;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};

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
        parameters: Option<&std::collections::HashMap<String, serde_json::Value>>,
    ) {
        let params_json =
            parameters.map(|p| serde_json::to_string(p).unwrap_or_else(|_| "{}".to_string()));

        let _ = self.app_handle.emit(
            "task_step_update",
            &json!({
                "task_id": task_id,
                "step_name": step_name,
                "step_index": step_index,
                "status": "RUNNING",
                "parameters": params_json,
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
        let display_duration = if duration_ms == 0 {
            "<1ms".to_string()
        } else {
            format!("{}ms", duration_ms)
        };

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

    async fn on_workflow_complete(
        &self,
        task_id: &str,
        final_output: &str,
        total_duration_ms: u64,
        total_steps: usize,
    ) {
        if !self.completed.swap(true, Ordering::SeqCst) {
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
}
