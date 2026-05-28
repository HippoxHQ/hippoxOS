use std::fs;

use crate::commands::get_dialog_history_dir;

#[tauri::command]
pub fn cmd_save_task_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let task_path = session_dir.join("task.json");
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create session directory: {}", e))?;
    }
    fs::write(&task_path, content).map_err(|e| format!("Failed to save task content: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn cmd_load_task_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_dialog_history_dir();
    let task_path = dir.join(session_id).join("task.json");
    if task_path.exists() {
        let content = fs::read_to_string(&task_path)
            .map_err(|e| format!("Failed to read task content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}
