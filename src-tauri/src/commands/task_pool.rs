use crate::{
    commands::{StepInfo, TaskInfo, TaskPoolStats},
    hippox_core::get_default_hippox,
    state::AppState,
};
use hippox::{
    cancel_task, get_all_tasks, get_all_tasks_detailed, get_task, get_task_status, pause_task, pending_count, resume_task, retry_task, running_count,
    set_max_concurrent, HippoxResult, Task,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::path::PathBuf;
use tauri::State;
/// Get taskpool backup directory path (kept for backward compatibility)
pub fn get_taskpool_backup_dir() -> PathBuf {
    crate::commands::paths::get_app_root_dir().join("taskpool")
}
/// Ensure taskpool backup directory exists (kept for backward compatibility)
fn ensure_taskpool_backup_dir() -> Result<(), String> {
    let dir = get_taskpool_backup_dir();
    if !dir.exists() {
        std::fs::create_dir_all(&dir).map_err(|e| format!("Failed to create taskpool directory: {}", e))?;
    }
    Ok(())
}
/// Get all tasks in the pool
#[tauri::command]
pub async fn cmd_task_pool_get_all_tasks(limit: Option<usize>) -> Result<Vec<TaskInfo>, String> {
    match get_all_tasks_detailed(limit).await {
        HippoxResult { data: Some(tasks), .. } => Ok(tasks.into_iter().map(TaskInfo::from).collect()),
        HippoxResult { error: Some(e), .. } => Err(e),
        _ => Err("Failed to get tasks: unknown error".to_string()),
    }
}
/// Get a single task by ID
#[tauri::command]
pub async fn cmd_task_pool_get_task(task_id: String) -> Result<Option<TaskInfo>, String> {
    match get_task(&task_id).await {
        HippoxResult { data: Some(task), .. } => Ok(Some(TaskInfo::from(task))),
        HippoxResult { error: Some(e), .. } => Err(e),
        _ => Ok(None),
    }
}
/// Get task status by ID
#[tauri::command]
pub async fn cmd_task_pool_get_task_status(task_id: String) -> Result<Option<String>, String> {
    match get_task_status(&task_id).await {
        HippoxResult { data: Some(status), .. } => Ok(Some(format!("{:?}", status).to_lowercase())),
        HippoxResult { error: Some(e), .. } => Err(e),
        _ => Ok(None),
    }
}
/// Cancel a task
#[tauri::command]
pub async fn cmd_task_pool_cancel_task(task_id: String) -> Result<bool, String> {
    match cancel_task(&task_id).await {
        HippoxResult { data: Some(success), .. } => Ok(success),
        HippoxResult { error: Some(e), .. } => Err(e),
        _ => Err("Failed to cancel task: unknown error".to_string()),
    }
}
/// Pause a task
#[tauri::command]
pub async fn cmd_task_pool_pause_task(task_id: String) -> Result<bool, String> {
    match pause_task(&task_id).await {
        HippoxResult { data: Some(success), .. } => Ok(success),
        HippoxResult { error: Some(e), .. } => Err(e),
        _ => Err("Failed to pause task: unknown error".to_string()),
    }
}
/// Resume a paused task
#[tauri::command]
pub async fn cmd_task_pool_resume_task(task_id: String) -> Result<bool, String> {
    match resume_task(&task_id).await {
        HippoxResult { data: Some(success), .. } => Ok(success),
        HippoxResult { error: Some(e), .. } => Err(e),
        _ => Err("Failed to resume task: unknown error".to_string()),
    }
}
/// Retry a failed task
#[tauri::command]
pub async fn cmd_task_pool_retry_task(task_id: String) -> Result<bool, String> {
    match retry_task(&task_id).await {
        HippoxResult { data: Some(success), .. } => Ok(success),
        HippoxResult { error: Some(e), .. } => Err(e),
        _ => Err("Failed to retry task: unknown error".to_string()),
    }
}
/// Get task pool statistics
#[tauri::command]
pub async fn cmd_task_pool_get_stats() -> Result<TaskPoolStats, String> {
    let running = match running_count().await {
        HippoxResult { data: Some(count), .. } => count,
        HippoxResult { error: Some(e), .. } => return Err(e),
        _ => return Err("Failed to get running count".to_string()),
    };
    let pending = match pending_count().await {
        HippoxResult { data: Some(count), .. } => count,
        HippoxResult { error: Some(e), .. } => return Err(e),
        _ => return Err("Failed to get pending count".to_string()),
    };
    let all_tasks = match get_all_tasks_detailed(None).await {
        HippoxResult { data: Some(tasks), .. } => tasks,
        HippoxResult { error: Some(e), .. } => return Err(e),
        _ => return Err("Failed to get all tasks".to_string()),
    };
    Ok(TaskPoolStats { running_count: running, pending_count: pending, total_count: all_tasks.len(), max_concurrent: 10 })
}
/// Set maximum concurrent tasks
#[tauri::command]
pub async fn cmd_task_pool_set_max_concurrent(max: usize) -> Result<(), String> {
    match set_max_concurrent(max).await {
        HippoxResult { data: Some(()), .. } => Ok(()),
        HippoxResult { error: Some(e), .. } => Err(e),
        _ => Err("Failed to set max concurrent".to_string()),
    }
}
/// Get tasks by session (filter)
#[tauri::command]
pub async fn cmd_task_pool_get_tasks_by_session(session_id: String, state: State<'_, AppState>) -> Result<Vec<TaskInfo>, String> {
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
/// Calculate and accumulate token usage and task count from Hippox instance to user profile.
///
/// This command:
/// 1. Reads current input/output token counts from the Hippox instance
/// 2. Accumulates them to the user profile's top-level fields
/// 3. Counts unique task IDs from the task pool and accumulates to total_task_count
/// 4. Deduplicates tasks by their unique ID to ensure accurate counting
/// 5. Saves the updated profile to C:\Users\<username>\AppData\Roaming\HippoX\profile\info.json
///
/// # Returns
/// JSON object containing:
/// - success: bool
/// - message: string
/// - input_tokens: tokens consumed in this operation
/// - output_tokens: tokens consumed in this operation
/// - total_input_tokens: cumulative input tokens in profile
/// - total_output_tokens: cumulative output tokens in profile
/// - task_count: number of tasks in the pool (after deduplication)
/// - total_task_count: cumulative task count in profile
#[tauri::command]
pub async fn cmd_calculate_token() -> Result<serde_json::Value, String> {
    use crate::commands::profile::{load_profile, save_profile};
    // Get default Hippox instance to fetch token counts
    let hippox = get_default_hippox().await?;
    // Retrieve current token counts from Hippox instance
    let input_tokens = hippox.get_current_input_token_count();
    let output_tokens = hippox.get_current_output_token_count();
    // Get all tasks from the pool and count unique task IDs
    // get_all_tasks(None) returns Vec<String> of task IDs
    let all_task_ids = match get_all_tasks(None).await {
        HippoxResult { data: Some(ids), .. } => ids,
        HippoxResult { error: Some(e), .. } => {
            log::warn!("Failed to get all tasks: {}", e);
            Vec::new()
        }
        _ => Vec::new(),
    };
    // Deduplicate task IDs using HashSet
    let unique_task_ids: HashSet<String> = all_task_ids.into_iter().collect();
    let task_count = unique_task_ids.len() as u64;
    // Skip update if no tokens were consumed and no tasks exist
    if input_tokens == 0 && output_tokens == 0 && task_count == 0 {
        return Ok(serde_json::json!({
            "success": true,
            "message": "No tokens or tasks to accumulate",
            "input_tokens": 0,
            "output_tokens": 0,
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "task_count": 0,
            "total_task_count": 0,
            "timestamp": chrono::Local::now().to_rfc3339()
        }));
    }
    // Load existing user profile from disk
    let mut profile = load_profile().map_err(|e| format!("Failed to load profile: {}", e))?;
    // Accumulate new tokens to top-level fields
    if input_tokens > 0 || output_tokens > 0 {
        profile.total_input_tokens += input_tokens;
        profile.total_output_tokens += output_tokens;
    }
    // Accumulate task count (deduplicated)
    if task_count > 0 {
        profile.total_task_count += task_count;
    }
    // Update profile timestamp
    profile.updated_at = chrono::Local::now().to_rfc3339();
    // Write updated profile back to disk
    save_profile(&profile).map_err(|e| format!("Failed to save profile: {}", e))?;
    // Return success response with token statistics
    Ok(serde_json::json!({
        "success": true,
        "message": "Tokens and task count accumulated to profile successfully",
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_input_tokens": profile.total_input_tokens,
        "total_output_tokens": profile.total_output_tokens,
        "task_count": task_count,
        "total_task_count": profile.total_task_count,
        "timestamp": chrono::Local::now().to_rfc3339()
    }))
}
