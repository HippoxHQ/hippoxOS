//! Task pool management commands for Tauri

use crate::{
    commands::{StepInfo, TaskInfo, TaskPoolStats},
    hippox_core::get_default_hippox,
    state::AppState,
};
use hippox::{
    cancel_task, get_all_tasks, get_task, get_task_status, pause_task, pending_count, resume_task,
    retry_task, running_count, set_max_concurrent, HippoxResult, Task,
};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::State;

/// Get taskpool backup directory path
pub fn get_taskpool_backup_dir() -> PathBuf {
    crate::commands::paths::get_app_root_dir().join("taskpool")
}

/// Ensure taskpool backup directory exists
fn ensure_taskpool_backup_dir() -> Result<(), String> {
    let dir = get_taskpool_backup_dir();
    if !dir.exists() {
        std::fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create taskpool directory: {}", e))?;
    }
    Ok(())
}

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

/// Persist task pool: backup terminal state tasks to file and remove from memory
///
/// This command calls Hippox core's storage_task_pool function which:
/// 1. Saves all completed/failed/cancelled/timeout tasks to a JSON file
/// 2. Removes them from the global task pool to free memory
///
/// The backup file is saved in HippoX/taskpool/ directory with timestamp filename.
///
/// # Returns
/// JSON object containing:
/// - success: bool
/// - message: string
/// - backup_file: path to the backup file
/// - timestamp: export time
#[tauri::command]
pub async fn cmd_task_pool_persist() -> Result<serde_json::Value, String> {
    // Ensure taskpool directory exists
    ensure_taskpool_backup_dir()?;
    // Generate timestamped filename
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S_%3f").to_string();
    let filename = format!("taskpool_{}.json", timestamp);
    let file_path = get_taskpool_backup_dir().join(filename);
    // Get default Hippox instance
    let hippox = get_default_hippox().await?;
    // Call core storage_task_pool (backup + delete terminal tasks)
    match hippox.storage_task_pool(file_path.to_string_lossy().to_string()) {
        HippoxResult {
            data: Some(()),
            error: None,
            ..
        } => Ok(serde_json::json!({
            "success": true,
            "message": "Task pool persisted successfully",
            "backup_file": file_path.to_string_lossy(),
            "timestamp": chrono::Local::now().to_rfc3339()
        })),
        HippoxResult {
            error: Some(err), ..
        } => Err(format!("Failed to persist task pool: {}", err)),
        _ => Err("Failed to persist task pool: unknown error".to_string()),
    }
}

/// List all taskpool backup files
#[tauri::command]
pub async fn cmd_task_pool_list_backups() -> Result<Vec<serde_json::Value>, String> {
    let backup_dir = get_taskpool_backup_dir();
    if !backup_dir.exists() {
        return Ok(vec![]);
    }
    let mut backups = Vec::new();
    for entry in std::fs::read_dir(&backup_dir)
        .map_err(|e| format!("Failed to read backup directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("json") {
            let metadata =
                std::fs::metadata(&path).map_err(|e| format!("Failed to read metadata: {}", e))?;
            backups.push(serde_json::json!({
                "filename": path.file_name().unwrap_or_default().to_string_lossy(),
                "path": path.to_string_lossy(),
                "size": metadata.len(),
                "modified": metadata.modified()
                    .ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_secs())
            }));
        }
    }
    // Sort by modified time descending (newest first)
    backups.sort_by(|a, b| {
        let a_time = a.get("modified").and_then(|v| v.as_u64()).unwrap_or(0);
        let b_time = b.get("modified").and_then(|v| v.as_u64()).unwrap_or(0);
        b_time.cmp(&a_time)
    });
    Ok(backups)
}

/// Clean up old backup files (keep only the most recent N)
#[tauri::command]
pub async fn cmd_task_pool_cleanup_backups(keep_count: usize) -> Result<serde_json::Value, String> {
    let backups = cmd_task_pool_list_backups().await?;
    if backups.len() <= keep_count {
        return Ok(serde_json::json!({
            "success": true,
            "deleted_count": 0,
            "message": "No backups to clean up"
        }));
    }
    let to_delete = &backups[keep_count..];
    let mut deleted_count = 0;
    for backup in to_delete {
        if let Some(path) = backup.get("path").and_then(|v| v.as_str()) {
            if std::fs::remove_file(path).is_ok() {
                deleted_count += 1;
            }
        }
    }
    Ok(serde_json::json!({
        "success": true,
        "deleted_count": deleted_count,
        "message": format!("Deleted {} old backup files", deleted_count)
    }))
}
