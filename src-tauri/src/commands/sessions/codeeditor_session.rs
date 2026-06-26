use std::fs;

use chrono::Local;

use crate::commands::get_codeeditor_dialog_history_dir;

#[tauri::command]
pub fn cmd_create_codeeditor_dialog_session(
    session_id: &str,
    title: &str,
    description: &str,
    initial_chat_content: &str,
    initial_terminal_content: &str,
    workflow_mode: Option<String>,
) -> Result<String, String> {
    let dir = get_codeeditor_dialog_history_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| {
            format!(
                "Failed to create codeeditor dialog history directory: {}",
                e
            )
        })?;
    }
    let session_dir = dir.join(session_id);
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create codeeditor session directory: {}", e))?;
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

#[tauri::command]
pub fn cmd_list_codeeditor_dialog_sessions() -> Result<Vec<serde_json::Value>, String> {
    let dir = get_codeeditor_dialog_history_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut sessions = vec![];
    for entry in fs::read_dir(dir)
        .map_err(|e| format!("Failed to read codeeditor dialog history dir: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_dir() {
            let config_path = path.join("config.json");
            if config_path.exists() {
                let content = fs::read_to_string(&config_path)
                    .map_err(|e| format!("Failed to read config: {}", e))?;
                if let Ok(mut config) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(obj) = config.as_object_mut() {
                        let session_id = path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();
                        obj.insert(
                            "path".to_string(),
                            serde_json::json!(path.to_string_lossy()),
                        );
                        obj.insert("session_id".to_string(), serde_json::json!(session_id));
                    }
                    sessions.push(config);
                }
            }
        }
    }
    sessions.sort_by(|a, b| {
        let a_time = a.get("updated_at").and_then(|v| v.as_str()).unwrap_or("");
        let b_time = b.get("updated_at").and_then(|v| v.as_str()).unwrap_or("");
        b_time.cmp(a_time)
    });
    Ok(sessions)
}

#[tauri::command]
pub fn cmd_load_codeeditor_session_config(
    session_id: &str,
) -> Result<Option<serde_json::Value>, String> {
    let dir = get_codeeditor_dialog_history_dir();
    let config_path = dir.join(session_id).join("config.json");
    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        let config: serde_json::Value =
            serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))?;
        Ok(Some(config))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn cmd_update_codeeditor_session_config(
    session_id: &str,
    updates: String,
) -> Result<(), String> {
    let dir = get_codeeditor_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let config_path = session_dir.join("config.json");
    if !config_path.exists() {
        return Err(format!("CodeEditor session {} not found", session_id));
    }
    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;
    let mut config: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))?;
    let updates_json: serde_json::Value =
        serde_json::from_str(&updates).map_err(|e| format!("Failed to parse updates: {}", e))?;
    if let Some(obj) = updates_json.as_object() {
        for (key, value) in obj {
            config[key] = value.clone();
        }
    }
    config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
    let new_content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&config_path, new_content).map_err(|e| format!("Failed to save config: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn cmd_delete_codeeditor_dialog_session(session_id: &str) -> Result<(), String> {
    let dir = get_codeeditor_dialog_history_dir();
    let session_dir = dir.join(session_id);
    if session_dir.exists() {
        fs::remove_dir_all(&session_dir)
            .map_err(|e| format!("Failed to delete codeeditor session: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn cmd_save_codeeditor_chat_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_codeeditor_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let chat_path = session_dir.join("chat.json");
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create codeeditor session directory: {}", e))?;
    }
    fs::write(&chat_path, content)
        .map_err(|e| format!("Failed to save codeeditor chat content: {}", e))?;
    let config_path = session_dir.join("config.json");
    if config_path.exists() {
        let cfg_content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        let mut config: serde_json::Value = serde_json::from_str(&cfg_content)
            .map_err(|e| format!("Failed to parse config: {}", e))?;
        config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
        let new_content = serde_json::to_string_pretty(&config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        fs::write(&config_path, new_content)
            .map_err(|e| format!("Failed to save config: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn cmd_save_codeeditor_terminal_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_codeeditor_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let terminal_path = session_dir.join("terminal.json");
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create codeeditor session directory: {}", e))?;
    }
    fs::write(&terminal_path, content)
        .map_err(|e| format!("Failed to save codeeditor terminal content: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn cmd_load_codeeditor_chat_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_codeeditor_dialog_history_dir();
    let chat_path = dir.join(session_id).join("chat.json");
    if chat_path.exists() {
        let content = fs::read_to_string(&chat_path)
            .map_err(|e| format!("Failed to read codeeditor chat content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn cmd_load_codeeditor_terminal_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_codeeditor_dialog_history_dir();
    let terminal_path = dir.join(session_id).join("terminal.json");
    if terminal_path.exists() {
        let content = fs::read_to_string(&terminal_path)
            .map_err(|e| format!("Failed to read codeeditor terminal content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn cmd_save_codeeditor_task_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_codeeditor_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let task_path = session_dir.join("task.json");
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create codeeditor session directory: {}", e))?;
    }
    fs::write(&task_path, content)
        .map_err(|e| format!("Failed to save codeeditor task content: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn cmd_load_codeeditor_task_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_codeeditor_dialog_history_dir();
    let task_path = dir.join(session_id).join("task.json");
    if task_path.exists() {
        let content = fs::read_to_string(&task_path)
            .map_err(|e| format!("Failed to read codeeditor task content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn cmd_update_pinned_codeeditor_sessions(
    session_id: String,
    pinned: bool,
) -> Result<Vec<String>, String> {
    let settings_dir = crate::commands::get_settings_dir();
    let config_path = settings_dir.join("codeeditor_config.json");
    let mut config: serde_json::Value = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read codeeditor config: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    let mut pinned_sessions: Vec<String> = config
        .get("pinned_sessions")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or_default();
    if pinned {
        if !pinned_sessions.contains(&session_id) {
            pinned_sessions.push(session_id);
        }
    } else {
        pinned_sessions.retain(|id| id != &session_id);
    }
    config["pinned_sessions"] = serde_json::to_value(&pinned_sessions)
        .map_err(|e| format!("Failed to serialize pinned sessions: {}", e))?;
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize codeeditor config: {}", e))?;
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to save codeeditor config: {}", e))?;
    Ok(pinned_sessions)
}

#[tauri::command]
pub fn cmd_get_pinned_codeeditor_sessions() -> Result<Vec<String>, String> {
    let settings_dir = crate::commands::get_settings_dir();
    let config_path = settings_dir.join("codeeditor_config.json");
    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read codeeditor config: {}", e))?;
        let config: serde_json::Value =
            serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}));
        Ok(config
            .get("pinned_sessions")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default())
    } else {
        Ok(vec![])
    }
}
