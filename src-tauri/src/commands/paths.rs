use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

/// Get application root directory
///
/// Windows: C:\Users\<username>\AppData\Roaming\HippoX\
/// macOS:   /Users/<username>/Library/Application Support/HippoX/
/// Linux:   /home/<username>/.local/share/HippoX/
pub fn get_app_root_dir() -> PathBuf {
    if cfg!(target_os = "windows") {
        // Windows: %APPDATA%\HippoX
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("HippoX")
    } else if cfg!(target_os = "macos") {
        // macOS: ~/Library/Application Support/HippoX
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("Library")
            .join("Application Support")
            .join("HippoX")
    } else {
        // Linux: ~/.local/share/HippoX
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("HippoX")
    }
}

/// Dialog history directory: HippoX/DialogHistory
pub fn get_dialog_history_dir() -> PathBuf {
    get_app_root_dir().join("DialogHistory")
}

/// Skill market directory: HippoX/SkillsMarket
pub fn get_skills_market_dir() -> PathBuf {
    get_app_root_dir().join("SkillsMarket")
}

/// Scheduled tasks directory: HippoX/ScheduledTasks
pub fn get_scheduled_tasks_dir() -> PathBuf {
    get_app_root_dir().join("ScheduledTasks")
}

/// Scheduled tasks history directory: HippoX/ScheduledTasksHistory
pub fn get_scheduled_tasks_history_dir() -> PathBuf {
    get_app_root_dir().join("ScheduledTasksHistory")
}

/// Log directory: HippoX/logs
pub fn get_log_dir() -> PathBuf {
    get_app_root_dir().join("logs")
}

/// Cache directory: HippoX/cache
pub fn get_cache_dir() -> PathBuf {
    get_app_root_dir().join("cache")
}

/// Settings directory: HippoX/settings
pub fn get_settings_dir() -> PathBuf {
    get_app_root_dir().join("settings")
}

/// AI model config directory: HippoX/settings/ai_model
pub fn get_ai_model_config_dir() -> PathBuf {
    get_settings_dir().join("ai_model")
}

/// Atomic skills config directory: HippoX/settings/atomic_skills
pub fn get_atomic_skills_config_dir() -> PathBuf {
    get_settings_dir().join("atomic_skills")
}

/// Workspace config directory: HippoX/settings/workspace
pub fn get_workspace_config_dir() -> PathBuf {
    get_settings_dir().join("workspace")
}

/// Engine config directory: HippoX/settings/engine
pub fn get_engine_config_dir() -> PathBuf {
    get_settings_dir().join("engine")
}

/// System config directory: HippoX/settings/system
pub fn get_system_config_dir() -> PathBuf {
    get_settings_dir().join("system")
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPaths {
    pub app_root_dir: String,
    pub dialog_history_dir: String,
    pub skills_market_dir: String,
    pub scheduled_tasks_dir: String,
    pub scheduled_tasks_history_dir: String,
    pub log_dir: String,
    pub cache_dir: String,
    pub settings_dir: String,
    pub ai_model_config_dir: String,
    pub atomic_skills_config_dir: String,
    pub workspace_config_dir: String,
    pub engine_config_dir: String,
    pub system_config_dir: String,
}

#[tauri::command]
pub fn get_data_paths() -> DataPaths {
    DataPaths {
        app_root_dir: get_app_root_dir().to_string_lossy().to_string(),
        dialog_history_dir: get_dialog_history_dir().to_string_lossy().to_string(),
        skills_market_dir: get_skills_market_dir().to_string_lossy().to_string(),
        scheduled_tasks_dir: get_scheduled_tasks_dir().to_string_lossy().to_string(),
        scheduled_tasks_history_dir: get_scheduled_tasks_history_dir()
            .to_string_lossy()
            .to_string(),
        log_dir: get_log_dir().to_string_lossy().to_string(),
        cache_dir: get_cache_dir().to_string_lossy().to_string(),
        settings_dir: get_settings_dir().to_string_lossy().to_string(),
        ai_model_config_dir: get_ai_model_config_dir().to_string_lossy().to_string(),
        atomic_skills_config_dir: get_atomic_skills_config_dir().to_string_lossy().to_string(),
        workspace_config_dir: get_workspace_config_dir().to_string_lossy().to_string(),
        engine_config_dir: get_engine_config_dir().to_string_lossy().to_string(),
        system_config_dir: get_system_config_dir().to_string_lossy().to_string(),
    }
}

/// Initialize all directories
pub fn init_directories() -> Result<(), String> {
    let dirs = vec![
        get_app_root_dir(),
        get_dialog_history_dir(),
        get_skills_market_dir(),
        get_scheduled_tasks_dir(),
        get_scheduled_tasks_history_dir(),
        get_log_dir(),
        get_cache_dir(),
        get_settings_dir(),
        get_ai_model_config_dir(),
        get_atomic_skills_config_dir(),
        get_workspace_config_dir(),
        get_engine_config_dir(),
        get_system_config_dir(),
        get_cache_dir().join("models"),
        get_cache_dir().join("skills"),
        get_cache_dir().join("temp"),
    ];
    for dir in dirs {
        if !dir.exists() {
            fs::create_dir_all(&dir)
                .map_err(|e| format!("Failed to create directory {:?}: {}", dir, e))?;
        }
    }
    Ok(())
}

/// Write log to file (daily rotation with size limit, auto split when exceeding 10MB)
pub fn write_log(level: &str, message: &str, details: Option<&str>) -> Result<(), String> {
    let log_dir = get_log_dir();
    if !log_dir.exists() {
        fs::create_dir_all(&log_dir)
            .map_err(|e| format!("Failed to create log directory: {}", e))?;
    }
    let now = Local::now();
    let date_str = now.format("%Y%m%d").to_string();
    let timestamp = now.format("%Y-%m-%d %H:%M:%S%.3f").to_string();
    let log_content = format!("[{}] [{}] {}\n", timestamp, level.to_uppercase(), message);
    let details_content = details
        .map(|d| format!("  Details: {}\n", d))
        .unwrap_or_default();
    let full_content = log_content + &details_content;
    let mut log_file_path = log_dir.join(format!("{}.log", date_str));
    let mut index = 1;
    while log_file_path.exists() {
        if let Ok(metadata) = fs::metadata(&log_file_path) {
            // If file exceeds 10MB, create a new file
            if metadata.len() > 10 * 1024 * 1024 {
                index += 1;
                log_file_path = log_dir.join(format!("{}_{}.log", date_str, index));
                continue;
            }
        }
        break;
    }
    let mut file = File::options()
        .create(true)
        .append(true)
        .open(&log_file_path)
        .map_err(|e| format!("Failed to open log file: {}", e))?;
    file.write_all(full_content.as_bytes())
        .map_err(|e| format!("Failed to write log: {}", e))?;
    Ok(())
}

/// Save dialog session to file
pub fn save_dialog_session(session_id: &str, data: &str) -> Result<String, String> {
    let dir = get_dialog_history_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create dialog history directory: {}", e))?;
    }
    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("session_{}_{}.json", timestamp, session_id);
    let file_path = dir.join(filename);
    fs::write(&file_path, data).map_err(|e| format!("Failed to save dialog session: {}", e))?;
    Ok(file_path.to_string_lossy().to_string())
}

/// List all dialog sessions
pub fn list_dialog_sessions() -> Result<Vec<String>, String> {
    let dir = get_dialog_history_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut sessions = vec![];
    for entry in
        fs::read_dir(dir).map_err(|e| format!("Failed to read dialog history dir: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("json") {
            if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                sessions.push(name.to_string());
            }
        }
    }
    sessions.sort();
    Ok(sessions)
}

/// Save scheduled task configuration to file
pub fn save_scheduled_task(task_id: &str, data: &str) -> Result<String, String> {
    let dir = get_scheduled_tasks_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create scheduled tasks directory: {}", e))?;
    }
    let filename = format!("{}.json", task_id);
    let file_path = dir.join(filename);
    fs::write(&file_path, data).map_err(|e| format!("Failed to save scheduled task: {}", e))?;
    Ok(file_path.to_string_lossy().to_string())
}

/// Delete scheduled task configuration
pub fn delete_scheduled_task(task_id: &str) -> Result<(), String> {
    let dir = get_scheduled_tasks_dir();
    let file_path = dir.join(format!("{}.json", task_id));
    if file_path.exists() {
        fs::remove_file(file_path)
            .map_err(|e| format!("Failed to delete scheduled task: {}", e))?;
    }
    Ok(())
}

/// List all scheduled task IDs
pub fn list_scheduled_task_ids() -> Result<Vec<String>, String> {
    let dir = get_scheduled_tasks_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut tasks = vec![];
    for entry in
        fs::read_dir(dir).map_err(|e| format!("Failed to read scheduled tasks dir: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("json") {
            if let Some(name) = path.file_stem().and_then(|n| n.to_str()) {
                tasks.push(name.to_string());
            }
        }
    }
    Ok(tasks)
}

/// Record scheduled task execution history
pub fn record_task_execution(
    task_id: &str,
    task_name: &str,
    status: &str,
    output: &str,
    error: Option<&str>,
    duration_ms: u64,
) -> Result<String, String> {
    let dir = get_scheduled_tasks_history_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create task history directory: {}", e))?;
    }
    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("execution_{}_{}_{}.json", timestamp, task_id, status);
    let file_path = dir.join(filename);
    let record = serde_json::json!({
        "id": uuid::Uuid::new_v4().to_string(),
        "task_id": task_id,
        "task_name": task_name,
        "executed_at": Local::now().to_rfc3339(),
        "status": status,
        "output": output,
        "error": error,
        "duration_ms": duration_ms,
    });
    let content = serde_json::to_string_pretty(&record)
        .map_err(|e| format!("Failed to serialize execution record: {}", e))?;
    fs::write(&file_path, content)
        .map_err(|e| format!("Failed to save execution record: {}", e))?;
    Ok(file_path.to_string_lossy().to_string())
}

/// Save internal setting to config directory
pub fn save_internal_setting(setting_dir: &Path, key: &str, data: &str) -> Result<String, String> {
    if !setting_dir.exists() {
        fs::create_dir_all(setting_dir)
            .map_err(|e| format!("Failed to create setting directory: {}", e))?;
    }
    let file_path = setting_dir.join(format!("{}.json", key));
    fs::write(&file_path, data).map_err(|e| format!("Failed to save setting: {}", e))?;
    Ok(file_path.to_string_lossy().to_string())
}

/// Load internal setting from config directory
pub fn load_internal_setting(setting_dir: &Path, key: &str) -> Result<Option<String>, String> {
    let file_path = setting_dir.join(format!("{}.json", key));
    if file_path.exists() {
        let content =
            fs::read_to_string(&file_path).map_err(|e| format!("Failed to read setting: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}
