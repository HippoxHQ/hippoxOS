use crate::commands::{
    get_app_root_dir, get_cache_dir, get_codeeditor_dialog_history_dir, get_data_dir, get_external_cache_audio_dir,
    get_external_cache_image_material_dir, get_external_cache_sfx_dir, get_external_cache_sticker_dir, get_external_cache_video_material_dir,
    get_finance_dialog_history_dir, get_general_history_dir, get_log_dir, get_map_dialog_history_dir, get_notifications_dir,
    get_sandbox3d_dialog_history_dir, get_scheduled_tasks_dir, get_settings_dir, get_skill_history_dir, get_skills_dir, get_skills_market_dir,
    get_video_editing_system_dialog_history_dir,
};
use crate::commons::FileUtils;
use std::path::Path;
/// Initialize all directories
pub fn init_directories() -> Result<(), String> {
    let dirs = vec![
        get_app_root_dir(),
        get_general_history_dir(),
        get_finance_dialog_history_dir(),
        get_map_dialog_history_dir(),
        get_codeeditor_dialog_history_dir(),
        get_video_editing_system_dialog_history_dir(),
        get_sandbox3d_dialog_history_dir(),
        get_skills_market_dir(),
        get_scheduled_tasks_dir(),
        get_log_dir(),
        get_cache_dir(),
        get_settings_dir(),
        get_data_dir(),
        get_cache_dir().join("models"),
        get_cache_dir().join("skills"),
        get_cache_dir().join("temp"),
        get_notifications_dir(),
        get_skills_dir(),
        get_skill_history_dir(),
        // get_taskpool_dir(),
        get_external_cache_video_material_dir(),
        get_external_cache_image_material_dir(),
        // get_material_favorites_dir(),
        get_external_cache_audio_dir(),
        get_external_cache_sfx_dir(),
        get_external_cache_sticker_dir(),
    ];
    for dir in dirs {
        if !FileUtils::path_exists(&dir) {
            FileUtils::ensure_dir(&dir).map_err(|e| format!("Failed to create directory {:?}: {}", dir, e))?;
        }
    }
    Ok(())
}
/// Save dialog session to file
pub fn save_dialog_session(session_id: &str, data: &str) -> Result<String, String> {
    let dir = get_general_history_dir();
    if !FileUtils::path_exists(&dir) {
        FileUtils::ensure_dir(&dir).map_err(|e| format!("Failed to create dialog history directory: {}", e))?;
    }
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("session_{}_{}.json", timestamp, session_id);
    let file_path = dir.join(filename);
    FileUtils::write_file_string(&file_path, data).map_err(|e| format!("Failed to save dialog session: {}", e))?;
    Ok(FileUtils::to_string_lossy(&file_path))
}
/// Save scheduled task configuration to file
pub fn save_scheduled_task(task_id: &str, data: &str) -> Result<String, String> {
    let dir = get_scheduled_tasks_dir();
    if !FileUtils::path_exists(&dir) {
        FileUtils::ensure_dir(&dir).map_err(|e| format!("Failed to create scheduled tasks directory: {}", e))?;
    }
    let filename = format!("{}.json", task_id);
    let file_path = dir.join(filename);
    FileUtils::write_file_string(&file_path, data).map_err(|e| format!("Failed to save scheduled task: {}", e))?;
    Ok(FileUtils::to_string_lossy(&file_path))
}
/// Delete scheduled task configuration
pub fn delete_scheduled_task(task_id: &str) -> Result<(), String> {
    let dir = get_scheduled_tasks_dir();
    let file_path = dir.join(format!("{}.json", task_id));
    if FileUtils::path_exists(&file_path) {
        FileUtils::remove_file(&file_path).map_err(|e| format!("Failed to delete scheduled task: {}", e))?;
    }
    Ok(())
}
/// List all scheduled task IDs
pub fn list_scheduled_task_ids() -> Result<Vec<String>, String> {
    let dir = get_scheduled_tasks_dir();
    if !FileUtils::path_exists(&dir) {
        return Ok(vec![]);
    }
    let mut tasks = vec![];
    for path in FileUtils::read_dir(&dir).map_err(|e| format!("Failed to read scheduled tasks dir: {}", e))? {
        if FileUtils::file_exists(&path) && FileUtils::get_file_extension(&path) == Some("json".to_string()) {
            if let Ok(name) = FileUtils::get_file_stem(&path) {
                tasks.push(name);
            }
        }
    }
    Ok(tasks)
}
/// Save internal setting to config directory
pub fn save_internal_setting(setting_dir: &Path, key: &str, data: &str) -> Result<String, String> {
    if !FileUtils::path_exists(setting_dir) {
        FileUtils::ensure_dir(setting_dir).map_err(|e| format!("Failed to create setting directory: {}", e))?;
    }
    let file_path = setting_dir.join(format!("{}.json", key));
    FileUtils::write_file_string(&file_path, data).map_err(|e| format!("Failed to save setting: {}", e))?;
    Ok(FileUtils::to_string_lossy(&file_path))
}
/// Load internal setting from config directory
pub fn load_internal_setting(setting_dir: &Path, key: &str) -> Result<Option<String>, String> {
    let file_path = setting_dir.join(format!("{}.json", key));
    if FileUtils::path_exists(&file_path) {
        let content = FileUtils::read_file_to_string(&file_path).map_err(|e| format!("Failed to read setting: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}
pub fn init_default_session_if_empty() -> Result<(), String> {
    let dir = get_general_history_dir();
    if !FileUtils::path_exists(&dir) {
        FileUtils::ensure_dir(&dir).map_err(|e| format!("Failed to create dialog history directory: {}", e))?;
    }
    let has_sessions = FileUtils::read_dir_entries(&dir)
        .map_err(|e| format!("Failed to read dialog history dir: {}", e))?
        .into_iter()
        .any(|entry| entry.path().is_dir());
    if !has_sessions {
        let language = crate::commons::get_setting_with_default("language", serde_json::json!("en"))
            .map(|v| v.as_str().unwrap_or("en").to_string())
            .unwrap_or_else(|_| "en".to_string());
        let title = if language == "zh" { "默认对话" } else { "Default Session" };
        let description = if language == "zh" { "Hippox AI 运行时默认对话" } else { "Hippox AI Runtime default session" };
        let welcome_text = if language == "zh" {
            "你好，我是 Hippox AI 运行时。我有自主决策能力，可以执行技能并实时反馈。有什么可以帮你的？"
        } else {
            "Hello, I am Hippox AI Runtime. I have autonomous decision-making capabilities and can execute skills with real-time feedback. How can I help you?"
        };
        let session_id = format!("session_{}", chrono::Local::now().timestamp_millis());
        let session_dir = dir.join(&session_id);
        FileUtils::ensure_dir(&session_dir).map_err(|e| format!("Failed to create session directory: {}", e))?;
        let welcome_message = serde_json::json!([
            {
                "id": "welcome",
                "role": "assistant",
                "content": welcome_text,
                "timestamp": chrono::Local::now().format("%H:%M:%S").to_string()
            }
        ]);
        let config = serde_json::json!({
            "session_id": session_id,
            "title": title,
            "description": description,
            "created_at": chrono::Local::now().to_rfc3339(),
            "updated_at": chrono::Local::now().to_rfc3339(),
        });
        let config_path = session_dir.join("config.json");
        FileUtils::write_file_string(&config_path, &serde_json::to_string_pretty(&config).unwrap())
            .map_err(|e| format!("Failed to save config: {}", e))?;
        let chat_path = session_dir.join("chat.json");
        FileUtils::write_file_string(&chat_path, &serde_json::to_string_pretty(&welcome_message).unwrap())
            .map_err(|e| format!("Failed to save chat: {}", e))?;
        let terminal_path = session_dir.join("terminal.json");
        FileUtils::write_file_string(&terminal_path, "[]").map_err(|e| format!("Failed to save terminal: {}", e))?;
    }
    Ok(())
}
