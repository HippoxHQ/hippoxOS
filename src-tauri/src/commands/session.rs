use std::fs;

use chrono::Local;

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

#[tauri::command]
pub fn cmd_create_dialog_session(
    session_id: &str,
    title: &str,
    description: &str,
    initial_chat_content: &str,
    initial_terminal_content: &str,
    workflow_mode: Option<String>,
) -> Result<String, String> {
    let dir = get_dialog_history_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create dialog history directory: {}", e))?;
    }
    let session_dir = dir.join(session_id);
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create session directory: {}", e))?;
    }
    let config = serde_json::json!({
        "session_id": session_id,
        "title": title,
        "description": description,
        "created_at": Local::now().to_rfc3339(),
        "updated_at": Local::now().to_rfc3339(),
         "workflow_mode": workflow_mode.unwrap_or_else(|| "ReAct".to_string()),
    });
    let config_path = session_dir.join("config.json");
    let config_content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&config_path, config_content).map_err(|e| format!("Failed to save config: {}", e))?;
    let chat_path = session_dir.join("chat.json");
    fs::write(&chat_path, initial_chat_content)
        .map_err(|e| format!("Failed to save chat history: {}", e))?;
    let terminal_path = session_dir.join("terminal.json");
    fs::write(&terminal_path, initial_terminal_content)
        .map_err(|e| format!("Failed to save terminal history: {}", e))?;
    Ok(session_dir.to_string_lossy().to_string())
}
