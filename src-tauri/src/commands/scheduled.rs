use crate::commands::paths;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    pub schedule_type: String,
    pub schedule_config: serde_json::Value,
    pub enabled: bool,
    pub action_type: String,
    pub action_content: String,
    pub action_file_name: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub last_executed_at: Option<String>,
    pub completed: Option<bool>,
}

#[tauri::command]
pub async fn scheduled_save(task_json: String) -> Result<(), String> {
    let task: ScheduledTask =
        serde_json::from_str(&task_json).map_err(|e| format!("Failed to parse task: {}", e))?;
    let _ = paths::save_scheduled_task(&task.id, &task_json)?;
    Ok(())
}

#[tauri::command]
pub async fn scheduled_delete(task_id: String) -> Result<(), String> {
    let _ = paths::delete_scheduled_task(&task_id)?;
    Ok(())
}

#[tauri::command]
pub async fn scheduled_list() -> Result<String, String> {
    let task_ids = paths::list_scheduled_task_ids()?;
    let mut tasks = Vec::new();
    for id in task_ids {
        if let Some(content) = paths::load_internal_setting(&paths::get_scheduled_tasks_dir(), &id)?
        {
            if let Ok(task) = serde_json::from_str::<ScheduledTask>(&content) {
                tasks.push(task);
            }
        }
    }
    let tasks_json =
        serde_json::to_string(&tasks).map_err(|e| format!("Failed to serialize tasks: {}", e))?;
    Ok(tasks_json)
}
