use crate::commands::get_chart_dialog_history_dir;
use crate::commands::get_settings_dir;
use chrono::Local;
use std::fs;
fn get_config_path() -> std::path::PathBuf {
    get_settings_dir().join("chart_session.json")
}
fn get_pinned_sessions_from_config() -> Result<Vec<String>, String> {
    let config_path = get_config_path();
    if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| format!("Failed to read chart session config: {}", e))?;
        let config: serde_json::Value = serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}));
        Ok(config.get("pinned_sessions").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default())
    } else {
        Ok(vec![])
    }
}
fn save_pinned_sessions_to_config(pinned_sessions: &[String]) -> Result<(), String> {
    let settings_dir = get_settings_dir();
    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir).map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    let config_path = get_config_path();
    let config = serde_json::json!({
        "pinned_sessions": pinned_sessions,
    });
    let content = serde_json::to_string_pretty(&config).map_err(|e| format!("Failed to serialize chart session config: {}", e))?;
    fs::write(&config_path, content).map_err(|e| format!("Failed to save chart session config: {}", e))?;
    Ok(())
}
#[tauri::command]
pub fn cmd_create_chart_dialog_session(
    session_id: &str,
    title: &str,
    description: &str,
    initial_chat_content: &str,
    initial_terminal_content: &str,
    workflow_mode: Option<String>,
) -> Result<String, String> {
    let dir = get_chart_dialog_history_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create chart dialog history directory: {}", e))?;
    }
    let session_dir = dir.join(session_id);
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir).map_err(|e| format!("Failed to create chart session directory: {}", e))?;
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
    let config_content = serde_json::to_string_pretty(&config).map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&config_path, config_content).map_err(|e| format!("Failed to save config: {}", e))?;
    let chat_path = session_dir.join("chat.json");
    fs::write(&chat_path, initial_chat_content).map_err(|e| format!("Failed to save chat history: {}", e))?;
    let terminal_path = session_dir.join("terminal.json");
    fs::write(&terminal_path, initial_terminal_content).map_err(|e| format!("Failed to save terminal history: {}", e))?;
    Ok(session_dir.to_string_lossy().to_string())
}
#[tauri::command]
pub fn cmd_list_chart_dialog_sessions() -> Result<Vec<serde_json::Value>, String> {
    let dir = get_chart_dialog_history_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }
    let pinned_sessions = get_pinned_sessions_from_config()?;
    let mut sessions = vec![];
    for entry in fs::read_dir(dir).map_err(|e| format!("Failed to read chart dialog history dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_dir() {
            let config_path = path.join("config.json");
            if config_path.exists() {
                let content = fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;
                if let Ok(mut config) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(obj) = config.as_object_mut() {
                        let session_id = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                        obj.insert("path".to_string(), serde_json::json!(path.to_string_lossy()));
                        obj.insert("session_id".to_string(), serde_json::json!(session_id));
                        obj.insert("is_pinned".to_string(), serde_json::json!(pinned_sessions.contains(&session_id)));
                    }
                    sessions.push(config);
                }
            }
        }
    }
    sessions.sort_by(|a, b| {
        let a_pinned = a.get("is_pinned").and_then(|v| v.as_bool()).unwrap_or(false);
        let b_pinned = b.get("is_pinned").and_then(|v| v.as_bool()).unwrap_or(false);
        if a_pinned != b_pinned {
            return b_pinned.cmp(&a_pinned);
        }
        let a_time = a.get("updated_at").and_then(|v| v.as_str()).unwrap_or("");
        let b_time = b.get("updated_at").and_then(|v| v.as_str()).unwrap_or("");
        b_time.cmp(a_time)
    });
    Ok(sessions)
}
#[tauri::command]
pub fn cmd_load_chart_session_config(session_id: &str) -> Result<Option<serde_json::Value>, String> {
    let dir = get_chart_dialog_history_dir();
    let config_path = dir.join(session_id).join("config.json");
    if config_path.exists() {
        let content = fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;
        let config: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))?;
        Ok(Some(config))
    } else {
        Ok(None)
    }
}
#[tauri::command]
pub fn cmd_update_chart_session_config(session_id: &str, updates: String) -> Result<(), String> {
    let dir = get_chart_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let config_path = session_dir.join("config.json");
    if !config_path.exists() {
        return Err(format!("Chart session {} not found", session_id));
    }
    let content = fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;
    let mut config: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))?;
    let updates_json: serde_json::Value = serde_json::from_str(&updates).map_err(|e| format!("Failed to parse updates: {}", e))?;
    if let Some(obj) = updates_json.as_object() {
        for (key, value) in obj {
            config[key] = value.clone();
        }
    }
    config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
    let new_content = serde_json::to_string_pretty(&config).map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&config_path, new_content).map_err(|e| format!("Failed to save config: {}", e))?;
    Ok(())
}
#[tauri::command]
pub fn cmd_delete_chart_dialog_session(session_id: &str) -> Result<(), String> {
    let dir = get_chart_dialog_history_dir();
    let session_dir = dir.join(session_id);
    if session_dir.exists() {
        fs::remove_dir_all(&session_dir).map_err(|e| format!("Failed to delete chart session: {}", e))?;
    }
    // Also remove from pinned if present
    let pinned = get_pinned_sessions_from_config()?;
    if pinned.contains(&session_id.to_string()) {
        let _ = cmd_update_pinned_chart_sessions(session_id.to_string(), false);
    }
    Ok(())
}
#[tauri::command]
pub fn cmd_save_chart_chat_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_chart_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let chat_path = session_dir.join("chat.json");
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir).map_err(|e| format!("Failed to create chart session directory: {}", e))?;
    }
    fs::write(&chat_path, content).map_err(|e| format!("Failed to save chart chat content: {}", e))?;
    let config_path = session_dir.join("config.json");
    if config_path.exists() {
        let cfg_content = fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;
        let mut config: serde_json::Value = serde_json::from_str(&cfg_content).map_err(|e| format!("Failed to parse config: {}", e))?;
        config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
        let new_content = serde_json::to_string_pretty(&config).map_err(|e| format!("Failed to serialize config: {}", e))?;
        fs::write(&config_path, new_content).map_err(|e| format!("Failed to save config: {}", e))?;
    }
    Ok(())
}
#[tauri::command]
pub fn cmd_save_chart_terminal_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_chart_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let terminal_path = session_dir.join("terminal.json");
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir).map_err(|e| format!("Failed to create chart session directory: {}", e))?;
    }
    fs::write(&terminal_path, content).map_err(|e| format!("Failed to save chart terminal content: {}", e))?;
    Ok(())
}
#[tauri::command]
pub fn cmd_load_chart_chat_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_chart_dialog_history_dir();
    let chat_path = dir.join(session_id).join("chat.json");
    if chat_path.exists() {
        let content = fs::read_to_string(&chat_path).map_err(|e| format!("Failed to read chart chat content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}
#[tauri::command]
pub fn cmd_load_chart_terminal_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_chart_dialog_history_dir();
    let terminal_path = dir.join(session_id).join("terminal.json");
    if terminal_path.exists() {
        let content = fs::read_to_string(&terminal_path).map_err(|e| format!("Failed to read chart terminal content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}
#[tauri::command]
pub fn cmd_save_chart_task_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_chart_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let task_path = session_dir.join("task.json");
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir).map_err(|e| format!("Failed to create chart session directory: {}", e))?;
    }
    fs::write(&task_path, content).map_err(|e| format!("Failed to save chart task content: {}", e))?;
    Ok(())
}
#[tauri::command]
pub fn cmd_load_chart_task_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_chart_dialog_history_dir();
    let task_path = dir.join(session_id).join("task.json");
    if task_path.exists() {
        let content = fs::read_to_string(&task_path).map_err(|e| format!("Failed to read chart task content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}
#[tauri::command]
pub fn cmd_update_pinned_chart_sessions(session_id: String, pinned: bool) -> Result<Vec<String>, String> {
    let mut pinned_sessions = get_pinned_sessions_from_config()?;
    if pinned {
        if !pinned_sessions.contains(&session_id) {
            pinned_sessions.push(session_id);
        }
    } else {
        pinned_sessions.retain(|id| id != &session_id);
    }
    save_pinned_sessions_to_config(&pinned_sessions)?;
    Ok(pinned_sessions)
}
#[tauri::command]
pub fn cmd_get_pinned_chart_sessions() -> Result<Vec<String>, String> {
    get_pinned_sessions_from_config()
}
