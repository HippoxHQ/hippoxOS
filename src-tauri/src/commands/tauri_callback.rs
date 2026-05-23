use async_trait::async_trait;
use hippox::WorkflowCallback;
use serde_json::json;
use std::fmt::Debug;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone)]
pub struct TauriWorkflowCallback {
    app_handle: AppHandle,
    task_id: String,
}

impl TauriWorkflowCallback {
    pub fn new(app_handle: AppHandle, task_id: String) -> Self {
        Self {
            app_handle,
            task_id,
        }
    }
}

#[async_trait]
impl WorkflowCallback for TauriWorkflowCallback {
    async fn on_step_start(&self, step_name: &str, step_index: usize) {
        let _ = self.app_handle.emit(
            "task_step_update",
            &json!({
                "task_id": self.task_id,
                "step_name": step_name,
                "step_index": step_index,
                "status": "RUNNING"
            }),
        );
    }

    async fn on_step_success(&self, step_name: &str, step_index: usize, output: &str) {
        let _ = self.app_handle.emit(
            "task_step_update",
            &json!({
                "task_id": self.task_id,
                "step_name": step_name,
                "step_index": step_index,
                "status": "SUCCESS",
                "output": output
            }),
        );
    }

    async fn on_step_failure(&self, step_name: &str, step_index: usize, error: &str) {
        let _ = self.app_handle.emit(
            "task_step_update",
            &json!({
                "task_id": self.task_id,
                "step_name": step_name,
                "step_index": step_index,
                "status": "FAILURE",
                "error": error
            }),
        );
    }

    async fn on_workflow_complete(&self, final_output: &str) {
        let _ = self.app_handle.emit(
            "task_complete",
            &json!({
                "task_id": self.task_id,
                "final_output": final_output
            }),
        );
    }

    async fn on_workflow_failed(&self, error: &str) {
        let _ = self.app_handle.emit(
            "task_failed",
            &json!({
                "task_id": self.task_id,
                "error": error
            }),
        );
    }
}
