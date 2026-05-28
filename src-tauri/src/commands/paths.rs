use chrono::Local;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use sysinfo::Disks;
use walkdir::WalkDir;

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

/// data directory: HippoX/data
pub fn get_data_dir() -> PathBuf {
    get_app_root_dir().join("data")
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
    }
}

/// Get total size of log files (in bytes)
pub fn get_logs_size() -> Result<u64, String> {
    let log_dir = get_log_dir();
    if !log_dir.exists() {
        return Ok(0);
    }
    let mut total_size = 0;
    for entry in WalkDir::new(&log_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file() && e.path().extension().map_or(false, |ext| ext == "log"))
    {
        if let Ok(metadata) = entry.metadata() {
            total_size += metadata.len();
        }
    }
    Ok(total_size)
}

/// Clean up old log files when exceeding max size
pub fn cleanup_old_logs(max_size_mb: u64) -> Result<u64, String> {
    let log_dir = get_log_dir();
    if !log_dir.exists() {
        return Ok(0);
    }
    let max_size_bytes = max_size_mb * 1024 * 1024;
    let mut log_files: Vec<(PathBuf, std::time::SystemTime, u64)> = Vec::new();
    for entry in WalkDir::new(&log_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file() && e.path().extension().map_or(false, |ext| ext == "log"))
    {
        if let Ok(metadata) = entry.metadata() {
            if let Ok(modified) = metadata.modified() {
                log_files.push((entry.path().to_path_buf(), modified, metadata.len()));
            }
        }
    }
    // Sort by modified time (oldest first)
    log_files.sort_by(|a, b| a.1.cmp(&b.1));
    let mut current_total: u64 = log_files.iter().map(|(_, _, size)| size).sum();
    let mut deleted_count = 0;
    for (path, _, size) in log_files {
        if current_total <= max_size_bytes {
            break;
        }
        if let Err(e) = fs::remove_file(&path) {
            eprintln!("Failed to remove old log file {:?}: {}", path, e);
        } else {
            current_total -= size;
            deleted_count += 1;
        }
    }
    Ok(deleted_count)
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
        get_data_dir(),
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogHistoryConfig {
    #[serde(default)]
    pub pinned_sessions: Vec<String>,
    #[serde(default = "default_sort_by")]
    pub sort_by: String,
    #[serde(default = "default_sort_order")]
    pub sort_order: String,
    #[serde(default = "default_page_size")]
    pub page_size: usize,
    #[serde(default)]
    pub expanded_categories: Vec<String>,
    #[serde(flatten)]
    pub extra: HashMap<String, serde_json::Value>,
}

fn default_sort_by() -> String {
    "updated_at".to_string()
}

fn default_sort_order() -> String {
    "desc".to_string()
}

fn default_page_size() -> usize {
    50
}

impl Default for DialogHistoryConfig {
    fn default() -> Self {
        Self {
            pinned_sessions: vec![],
            sort_by: "updated_at".to_string(),
            sort_order: "desc".to_string(),
            page_size: 50,
            expanded_categories: vec![],
            extra: HashMap::new(),
        }
    }
}

#[tauri::command]
pub fn get_dialog_history_config() -> Result<DialogHistoryConfig, String> {
    let settings_dir = get_settings_dir();
    let config_path = settings_dir.join("config.json");

    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        let full_config: serde_json::Value =
            serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}));

        if let Some(dh) = full_config.get("dialog_history") {
            Ok(serde_json::from_value(dh.clone())
                .unwrap_or_else(|_| DialogHistoryConfig::default()))
        } else {
            Ok(DialogHistoryConfig::default())
        }
    } else {
        Ok(DialogHistoryConfig::default())
    }
}

#[tauri::command]
pub fn save_dialog_history_config(config: DialogHistoryConfig) -> Result<(), String> {
    let settings_dir = get_settings_dir();
    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    let config_path = settings_dir.join("config.json");
    let mut full_config: serde_json::Value = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    full_config["dialog_history"] = serde_json::to_value(&config)
        .map_err(|e| format!("Failed to serialize dialog history config: {}", e))?;
    let content = serde_json::to_string_pretty(&full_config)
        .map_err(|e| format!("Failed to serialize settings config: {}", e))?;
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to save settings config: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn update_pinned_sessions(session_id: String, pinned: bool) -> Result<Vec<String>, String> {
    let mut config = get_dialog_history_config()?;
    if pinned {
        if !config.pinned_sessions.contains(&session_id) {
            config.pinned_sessions.push(session_id);
        }
    } else {
        config.pinned_sessions.retain(|id| id != &session_id);
    }
    save_dialog_history_config(config)?;
    get_pinned_sessions()
}

#[tauri::command]
pub fn get_pinned_sessions() -> Result<Vec<String>, String> {
    let config = get_dialog_history_config()?;
    Ok(config.pinned_sessions)
}

#[tauri::command]
pub fn create_dialog_session(
    session_id: &str,
    title: &str,
    description: &str,
    initial_chat_content: &str,
    initial_terminal_content: &str,
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
pub fn list_dialog_sessions() -> Result<Vec<serde_json::Value>, String> {
    let dir = get_dialog_history_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }
    let pinned_sessions = get_pinned_sessions()?;
    let mut sessions = vec![];
    for entry in
        fs::read_dir(dir).map_err(|e| format!("Failed to read dialog history dir: {}", e))?
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
                        obj.insert(
                            "is_pinned".to_string(),
                            serde_json::json!(pinned_sessions.contains(&session_id)),
                        );
                    }
                    sessions.push(config);
                }
            }
        }
    }
    sessions.sort_by(|a, b| {
        let a_pinned = a
            .get("is_pinned")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let b_pinned = b
            .get("is_pinned")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
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
pub fn update_session_config(session_id: &str, updates: serde_json::Value) -> Result<(), String> {
    let dir = get_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let config_path = session_dir.join("config.json");
    if !config_path.exists() {
        return Err(format!("Session {} not found", session_id));
    }
    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;
    let mut config: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))?;
    if let Some(obj) = updates.as_object() {
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
pub fn delete_dialog_session(session_id: &str) -> Result<(), String> {
    let dir = get_dialog_history_dir();
    let session_dir = dir.join(session_id);
    if session_dir.exists() {
        fs::remove_dir_all(&session_dir).map_err(|e| format!("Failed to delete session: {}", e))?;
    }
    let _ = update_pinned_sessions(session_id.to_string(), false);
    Ok(())
}

#[tauri::command]
pub fn save_chat_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let chat_path = session_dir.join("chat.json");

    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create session directory: {}", e))?;
    }
    fs::write(&chat_path, content).map_err(|e| format!("Failed to save chat content: {}", e))?;
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
pub fn save_terminal_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let terminal_path = session_dir.join("terminal.json");
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create session directory: {}", e))?;
    }
    fs::write(&terminal_path, content)
        .map_err(|e| format!("Failed to save terminal content: {}", e))?;

    Ok(())
}

#[tauri::command]
pub fn load_chat_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_dialog_history_dir();
    let chat_path = dir.join(session_id).join("chat.json");
    if chat_path.exists() {
        let content = fs::read_to_string(&chat_path)
            .map_err(|e| format!("Failed to read chat content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn load_terminal_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_dialog_history_dir();
    let terminal_path = dir.join(session_id).join("terminal.json");
    if terminal_path.exists() {
        let content = fs::read_to_string(&terminal_path)
            .map_err(|e| format!("Failed to read terminal content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn get_logs_size_command() -> Result<u64, String> {
    get_logs_size()
}

#[tauri::command]
pub fn set_max_log_size(max_size_mb: u64) -> Result<(), String> {
    let settings_dir = get_settings_dir();
    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    let config_path = settings_dir.join("config.json");
    let mut full_config: serde_json::Value = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    full_config["max_log_size_mb"] = serde_json::json!(max_size_mb);
    let content = serde_json::to_string_pretty(&full_config)
        .map_err(|e| format!("Failed to serialize settings config: {}", e))?;
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to save settings config: {}", e))?;
    let _ = cleanup_old_logs(max_size_mb);
    Ok(())
}

#[tauri::command]
pub fn get_max_log_size() -> Result<u64, String> {
    let settings_dir = get_settings_dir();
    let config_path = settings_dir.join("config.json");
    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        let full_config: serde_json::Value =
            serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}));
        if let Some(size) = full_config.get("max_log_size_mb").and_then(|v| v.as_u64()) {
            return Ok(size);
        }
    }
    Ok(500)
}

pub fn init_default_session_if_empty() -> Result<(), String> {
    let dir = get_dialog_history_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create dialog history directory: {}", e))?;
    }
    let has_sessions = fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read dialog history dir: {}", e))?
        .filter_map(|entry| entry.ok())
        .any(|entry| entry.path().is_dir());
    if !has_sessions {
        let language = crate::common::get_setting_with_default("language", serde_json::json!("en"))
            .map(|v| v.as_str().unwrap_or("en").to_string())
            .unwrap_or_else(|_| "en".to_string());
        let title = if language == "zh" {
            "默认对话"
        } else {
            "Default Session"
        };
        let description = if language == "zh" {
            "Hippox AI 运行时默认对话"
        } else {
            "Hippox AI Runtime default session"
        };
        let welcome_text = if language == "zh" {
            "你好，我是 Hippox AI 运行时。我有自主决策能力，可以执行技能并实时反馈。有什么可以帮你的？"
        } else {
            "Hello, I am Hippox AI Runtime. I have autonomous decision-making capabilities and can execute skills with real-time feedback. How can I help you?"
        };
        let session_id = format!("session_{}", chrono::Local::now().timestamp_millis());
        let session_dir = dir.join(&session_id);
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create session directory: {}", e))?;
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
        fs::write(&config_path, serde_json::to_string_pretty(&config).unwrap())
            .map_err(|e| format!("Failed to save config: {}", e))?;
        let chat_path = session_dir.join("chat.json");
        fs::write(
            &chat_path,
            serde_json::to_string_pretty(&welcome_message).unwrap(),
        )
        .map_err(|e| format!("Failed to save chat: {}", e))?;
        let terminal_path = session_dir.join("terminal.json");
        fs::write(&terminal_path, "[]").map_err(|e| format!("Failed to save terminal: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_directory_size(path: String) -> Result<u64, String> {
    let dir = Path::new(&path);
    if !dir.exists() {
        return Ok(0);
    }
    let mut total_size = 0;
    let mut file_count = 0;
    for entry in WalkDir::new(dir)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let file_path = entry.path();
        if file_path.is_file() {
            if let Ok(metadata) = entry.metadata() {
                let size = metadata.len();
                total_size += size;
                file_count += 1;
            }
        }
    }
    Ok(total_size)
}

#[tauri::command]
pub fn get_disk_info(path: String) -> Result<serde_json::Value, String> {
    use std::path::Path;
    let path = Path::new(&path);
    let disks = Disks::new_with_refreshed_list();
    let disk = disks.iter().find(|d| path.starts_with(d.mount_point()));
    if let Some(disk) = disk {
        let total = disk.total_space();
        let free = disk.available_space();
        let used = total - free;
        Ok(serde_json::json!({
            "total": total,
            "free": free,
            "used": used
        }))
    } else {
        Err(format!("No disk found for path: {:?}", path))
    }
}

#[tauri::command]
pub fn get_max_dialog_size() -> Result<u64, String> {
    let settings_dir = get_settings_dir();
    let config_path = settings_dir.join("config.json");
    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        let full_config: serde_json::Value =
            serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}));
        if let Some(size) = full_config
            .get("max_dialog_size_mb")
            .and_then(|v| v.as_u64())
        {
            return Ok(size);
        }
    }
    Ok(500)
}

#[tauri::command]
pub fn set_max_dialog_size(maxSizeMb: u64) -> Result<(), String> {
    let settings_dir = get_settings_dir();
    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    let config_path = settings_dir.join("config.json");
    let mut full_config: serde_json::Value = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    full_config["max_dialog_size_mb"] = serde_json::json!(maxSizeMb);
    let content = serde_json::to_string_pretty(&full_config)
        .map_err(|e| format!("Failed to serialize settings config: {}", e))?;
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to save settings config: {}", e))?;
    Ok(())
}
