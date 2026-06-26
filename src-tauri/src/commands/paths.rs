use chrono::Local;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use sysinfo::Disks;
use walkdir::WalkDir;

use crate::commands::{get_notifications_dir, get_skill_history_dir, get_skills_dir};

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

/// Chart Dialog history directory: HippoX/ChartDialogHistory
pub fn get_chart_dialog_history_dir() -> PathBuf {
    get_app_root_dir().join("ChartDialogHistory")
}

/// Map Dialog history directory: HippoX/MapDialogHistory
pub fn get_map_dialog_history_dir() -> PathBuf {
    get_app_root_dir().join("MapDialogHistory")
}

/// Map Dialog history directory: HippoX/CodeEditorDialogHistory
pub fn get_codeeditor_dialog_history_dir() -> PathBuf {
    get_app_root_dir().join("CodeEditorDialogHistory")
}

/// Skill market directory: HippoX/SkillsMarket
pub fn get_skills_market_dir() -> PathBuf {
    get_app_root_dir().join("SkillsMarket")
}

/// Scheduled tasks directory: HippoX/ScheduledTasks
pub fn get_scheduled_tasks_dir() -> PathBuf {
    get_app_root_dir().join("ScheduledTasks")
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

/// Get taskpool backup directory: HippoX/taskpool
pub fn get_taskpool_dir() -> PathBuf {
    get_app_root_dir().join("taskpool")
}

pub fn get_favorites_dir() -> PathBuf {
    get_app_root_dir().join("favorites")
}

pub fn get_favorites_skill_dir() -> PathBuf {
    get_favorites_dir().join("skill")
}

pub fn get_favorites_natural_dir() -> PathBuf {
    get_favorites_dir().join("natural")
}

pub fn get_favorites_size() -> Result<u64, String> {
    let favorites_dir = get_favorites_dir();
    if !favorites_dir.exists() {
        return Ok(0);
    }
    let mut total_size = 0;
    for entry in WalkDir::new(&favorites_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file())
    {
        if let Ok(metadata) = entry.metadata() {
            total_size += metadata.len();
        }
    }
    Ok(total_size)
}

pub fn get_max_favorites_size() -> u64 {
    match crate::common::get_setting("max_favorites_size_mb") {
        Ok(value) => value.as_u64().unwrap_or(500),
        Err(_) => 500,
    }
}

pub fn set_max_favorites_size(size_mb: u64) -> Result<(), String> {
    crate::common::set_setting("max_favorites_size_mb", serde_json::json!(size_mb))
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPaths {
    pub app_root_dir: String,
    pub dialog_history_dir: String,
    pub chart_dialog_history_dir: String,
    pub map_dialog_history_dir: String,
    pub skills_market_dir: String,
    pub scheduled_tasks_dir: String,
    pub log_dir: String,
    pub cache_dir: String,
    pub settings_dir: String,
}

#[tauri::command]
pub fn cmd_get_data_paths() -> DataPaths {
    DataPaths {
        app_root_dir: get_app_root_dir().to_string_lossy().to_string(),
        dialog_history_dir: get_dialog_history_dir().to_string_lossy().to_string(),
        chart_dialog_history_dir: get_chart_dialog_history_dir().to_string_lossy().to_string(),
        map_dialog_history_dir: get_map_dialog_history_dir().to_string_lossy().to_string(),
        skills_market_dir: get_skills_market_dir().to_string_lossy().to_string(),
        scheduled_tasks_dir: get_scheduled_tasks_dir().to_string_lossy().to_string(),
        log_dir: get_log_dir().to_string_lossy().to_string(),
        cache_dir: get_cache_dir().to_string_lossy().to_string(),
        settings_dir: get_settings_dir().to_string_lossy().to_string(),
    }
}

#[tauri::command]
pub fn cmd_get_favorites_dir() -> String {
    get_app_root_dir()
        .join("favorites")
        .to_string_lossy()
        .to_string()
}

#[tauri::command]
pub fn cmd_get_directory_size(path: String) -> Result<u64, String> {
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
pub fn cmd_get_disk_info(path: String) -> Result<serde_json::Value, String> {
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
pub fn cmd_get_logs_size_command() -> Result<u64, String> {
    get_logs_size()
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
pub fn cmd_get_dialog_history_config() -> Result<DialogHistoryConfig, String> {
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
pub fn cmd_save_dialog_history_config(config: DialogHistoryConfig) -> Result<(), String> {
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
