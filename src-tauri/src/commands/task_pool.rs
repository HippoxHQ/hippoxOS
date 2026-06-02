//! Task pool management commands for Tauri

use crate::{
    commands::{StepInfo, TaskInfo, TaskPoolStats},
    state::AppState,
};
use hippox::{
    cancel_task, get_all_tasks, get_task, get_task_status, pause_task, pending_count, resume_task,
    retry_task, running_count, set_max_concurrent, Task,
};
use serde::{Deserialize, Serialize};
use tauri::State;

/// Get all tasks in the pool
#[tauri::command]
pub async fn cmd_task_pool_get_all_tasks(limit: Option<usize>) -> Result<Vec<TaskInfo>, String> {
    let tasks = get_all_tasks(limit).await;
    Ok(tasks.into_iter().map(TaskInfo::from).collect())
}

/// Get a single task by ID
#[tauri::command]
pub async fn cmd_task_pool_get_task(task_id: String) -> Result<Option<TaskInfo>, String> {
    let task = get_task(&task_id).await;
    Ok(task.map(TaskInfo::from))
}

/// Get task status by ID
#[tauri::command]
pub async fn cmd_task_pool_get_task_status(task_id: String) -> Result<Option<String>, String> {
    let status = get_task_status(&task_id).await;
    Ok(status.map(|s| format!("{:?}", s).to_lowercase()))
}

/// Cancel a task
#[tauri::command]
pub async fn cmd_task_pool_cancel_task(task_id: String) -> Result<bool, String> {
    Ok(cancel_task(&task_id).await)
}

/// Pause a task
#[tauri::command]
pub async fn cmd_task_pool_pause_task(task_id: String) -> Result<bool, String> {
    Ok(pause_task(&task_id).await)
}

/// Resume a paused task
#[tauri::command]
pub async fn cmd_task_pool_resume_task(task_id: String) -> Result<bool, String> {
    Ok(resume_task(&task_id).await)
}

/// Retry a failed task
#[tauri::command]
pub async fn cmd_task_pool_retry_task(task_id: String) -> Result<bool, String> {
    Ok(retry_task(&task_id).await)
}

/// Get task pool statistics
#[tauri::command]
pub async fn cmd_task_pool_get_stats() -> Result<TaskPoolStats, String> {
    let running = running_count().await;
    let pending = pending_count().await;
    let all_tasks = get_all_tasks(None).await;
    Ok(TaskPoolStats {
        running_count: running,
        pending_count: pending,
        total_count: all_tasks.len(),
        max_concurrent: 10,
    })
}

/// Set maximum concurrent tasks
#[tauri::command]
pub async fn cmd_task_pool_set_max_concurrent(max: usize) -> Result<(), String> {
    set_max_concurrent(max).await;
    Ok(())
}

/// Get tasks by session (filter)
#[tauri::command]
pub async fn cmd_task_pool_get_tasks_by_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<Vec<TaskInfo>, String> {
    let session_tasks = state.get_session_tasks(&session_id).await;
    Ok(session_tasks
        .into_iter()
        .map(|t| TaskInfo {
            id: t.id,
            task_type: t.task_type,
            input: t.input,
            status: t.status,
            steps: t.steps,
            final_output: t.final_output,
            error: t.error,
            created_at: t.created_at,
            started_at: t.started_at,
            completed_at: t.completed_at,
            duration_ms: t.duration_ms,
            progress: t.progress,
        })
        .collect())
}
