//! User profile management with async-aware caching and read-write lock protection
//!
//! This module provides a global cache for user profile with:
//! - Memory is the source of truth (all reads/writes go to memory)
//! - Write: writes to memory immediately, never blocks
//! - Read: reads from memory, loads from disk only if not in cache
//! - Thread-safe: uses RwLock for concurrent access
//!
//! # Data Flow
//! - All operations: Memory ←→ User
//! - Initial load: Disk → Memory (when cache is empty)
use crate::commands::paths::get_app_root_dir;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::RwLock;
use tauri::command;
use uuid::Uuid;
const PROFILE_DIR: &str = "profile";
const PROFILE_INFO_FILE: &str = "info.json";
/// Global profile cache protected by RwLock for thread-safe access
/// - Multiple readers can access simultaneously (load_profile)
/// - Exclusive write access for modifications (save_profile)
/// - Memory is the source of truth after initial load
static PROFILE_CACHE: Lazy<RwLock<Option<UserProfile>>> = Lazy::new(|| RwLock::new(None));
/// User profile containing user information and settings
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub avatar: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub settings: ProfileSettings,
    /// Total input tokens consumed across all tasks
    #[serde(default)]
    pub total_input_tokens: u64,
    /// Total output tokens consumed across all tasks
    #[serde(default)]
    pub total_output_tokens: u64,
    /// key: session id, value: session creation timestamp (milliseconds)
    #[serde(default)]
    pub total_sessions_count: HashMap<String, u64>,
    /// key: session id, value: chat count
    #[serde(default)]
    pub total_sessions_chat_count: HashMap<String, u64>,
    /// total task count
    #[serde(default)]
    pub total_task_count: u64,
}
/// User profile settings with extensible extra fields
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProfileSettings {
    pub timezone: Option<String>,
    pub date_format: Option<String>,
    pub notifications_enabled: bool,
    pub sound_enabled: bool,
    pub auto_save: bool,
    pub theme_preference: String,
    #[serde(default)]
    pub extra: std::collections::HashMap<String, serde_json::Value>,
}
impl Default for UserProfile {
    fn default() -> Self {
        let now = chrono::Local::now().to_rfc3339();
        let timezone_name = get_current_timezone_name();
        Self {
            id: Uuid::new_v4().to_string(),
            name: "User".to_string(),
            email: None,
            avatar: None,
            created_at: now.clone(),
            updated_at: now,
            settings: ProfileSettings {
                timezone: Some(timezone_name),
                date_format: Some("YYYY-MM-DD".to_string()),
                notifications_enabled: true,
                sound_enabled: true,
                auto_save: true,
                theme_preference: "dark".to_string(),
                extra: std::collections::HashMap::new(),
            },
            total_input_tokens: 0,
            total_output_tokens: 0,
            total_sessions_count: HashMap::new(),
            total_sessions_chat_count: HashMap::new(),
            total_task_count: 0,
        }
    }
}
/// Get current timezone name from system
fn get_current_timezone_name() -> String {
    #[cfg(target_os = "windows")]
    {
        use crate::commons::hidden_cmd;
        let output = hidden_cmd("powershell").args(["-Command", "Get-TimeZone | Select-Object -ExpandProperty Id"]).output();
        if let Ok(output) = output {
            if output.status.success() {
                let tz = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !tz.is_empty() {
                    return tz;
                }
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        use crate::commons::hidden_cmd;
        let output = hidden_cmd("date").arg("+%Z").output();
        if let Ok(output) = output {
            if output.status.success() {
                let tz = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !tz.is_empty() {
                    return tz;
                }
            }
        }
        if let Ok(content) = std::fs::read_to_string("/etc/timezone") {
            let tz = content.trim().to_string();
            if !tz.is_empty() {
                return tz;
            }
        }
    }
    "UTC".to_string()
}
/// Add a new session to the profile's session tracking maps
pub fn add_session_to_profile(session_id: &str, created_at: u64) -> Result<(), String> {
    let mut profile = load_profile()?;
    if !profile.total_sessions_count.contains_key(session_id) {
        profile.total_sessions_count.insert(session_id.to_string(), created_at);
    }
    if !profile.total_sessions_chat_count.contains_key(session_id) {
        profile.total_sessions_chat_count.insert(session_id.to_string(), 0);
    }
    profile.updated_at = chrono::Local::now().to_rfc3339();
    save_profile(&profile)?;
    Ok(())
}
/// Increment the chat count for a specific session
pub fn increment_session_chat_count(session_id: &str) -> Result<u64, String> {
    let mut profile = load_profile()?;
    let current_count = profile.total_sessions_chat_count.get(session_id).copied().unwrap_or(0);
    let new_count = current_count + 1;
    profile.total_sessions_chat_count.insert(session_id.to_string(), new_count);
    // Ensure session exists in total_sessions_count
    if !profile.total_sessions_count.contains_key(session_id) {
        let created_at = chrono::Utc::now().timestamp_millis() as u64;
        profile.total_sessions_count.insert(session_id.to_string(), created_at);
    }
    profile.updated_at = chrono::Local::now().to_rfc3339();
    save_profile(&profile)?;
    Ok(new_count)
}
/// Remove a session from the profile's session tracking maps
pub fn remove_session_from_profile(session_id: &str) -> Result<(), String> {
    let mut profile = load_profile()?;
    profile.total_sessions_count.remove(session_id);
    profile.total_sessions_chat_count.remove(session_id);
    profile.updated_at = chrono::Local::now().to_rfc3339();
    save_profile(&profile)?;
    Ok(())
}
/// Get total session count from profile (no directory scanning)
pub fn get_total_session_count_from_profile() -> Result<u64, String> {
    let profile = load_profile()?;
    Ok(profile.total_sessions_count.len() as u64)
}
/// Get total chat count from profile (no chat.json scanning)
pub fn get_total_chat_count_from_profile() -> Result<u64, String> {
    let profile = load_profile()?;
    let total: u64 = profile.total_sessions_chat_count.values().sum();
    Ok(total)
}
/// Get session chat count from profile
pub fn get_session_chat_count_from_profile(session_id: &str) -> Result<u64, String> {
    let profile = load_profile()?;
    Ok(profile.total_sessions_chat_count.get(session_id).copied().unwrap_or(0))
}
pub fn get_profile_dir() -> PathBuf {
    get_app_root_dir().join(PROFILE_DIR)
}
pub fn get_profile_info_path() -> PathBuf {
    get_profile_dir().join(PROFILE_INFO_FILE)
}
fn ensure_profile_dir() -> Result<(), String> {
    let dir = get_profile_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create profile directory: {}", e))?;
    }
    Ok(())
}
pub fn load_profile() -> Result<UserProfile, String> {
    {
        let cache = PROFILE_CACHE.read().map_err(|e| format!("Failed to acquire read lock: {}", e))?;
        if let Some(profile) = cache.as_ref() {
            return Ok(profile.clone());
        }
    }
    let mut cache = PROFILE_CACHE.write().map_err(|e| format!("Failed to acquire write lock: {}", e))?;
    if let Some(profile) = cache.as_ref() {
        return Ok(profile.clone());
    }
    let profile_path = get_profile_info_path();
    if !profile_path.exists() {
        let default_profile = UserProfile::default();
        drop(cache);
        save_profile_to_disk(&default_profile)?;
        let mut cache = PROFILE_CACHE.write().map_err(|e| format!("Failed to acquire write lock: {}", e))?;
        *cache = Some(default_profile.clone());
        return Ok(default_profile);
    }
    let content = fs::read_to_string(&profile_path).map_err(|e| format!("Failed to read profile file: {}", e))?;
    let profile: UserProfile = serde_json::from_str(&content).map_err(|e| format!("Failed to parse profile: {}", e))?;
    *cache = Some(profile.clone());
    Ok(profile)
}
pub fn save_profile(profile: &UserProfile) -> Result<(), String> {
    save_profile_to_disk(profile)?;
    let mut cache = PROFILE_CACHE.write().map_err(|e| format!("Failed to acquire write lock: {}", e))?;
    *cache = Some(profile.clone());
    Ok(())
}
fn save_profile_to_disk(profile: &UserProfile) -> Result<(), String> {
    ensure_profile_dir()?;
    let profile_path = get_profile_info_path();
    let content = serde_json::to_string_pretty(profile).map_err(|e| format!("Failed to serialize profile: {}", e))?;
    fs::write(&profile_path, content).map_err(|e| format!("Failed to save profile: {}", e))?;
    Ok(())
}
pub fn update_profile(update: UpdateProfileRequest) -> Result<UserProfile, String> {
    let mut profile = load_profile()?;
    if let Some(name) = update.name {
        profile.name = name;
    }
    if let Some(email) = update.email {
        profile.email = Some(email);
    }
    if let Some(avatar) = update.avatar {
        profile.avatar = Some(avatar);
    }
    if let Some(settings) = update.settings {
        profile.settings = settings;
    }
    profile.updated_at = chrono::Local::now().to_rfc3339();
    save_profile(&profile)?;
    Ok(profile)
}
pub fn init_default_profile() -> Result<UserProfile, String> {
    let profile_path = get_profile_info_path();
    if !profile_path.exists() {
        let default_profile = UserProfile::default();
        save_profile(&default_profile)?;
        Ok(default_profile)
    } else {
        load_profile()
    }
}
pub fn profile_exists() -> bool {
    get_profile_info_path().exists()
}
pub fn delete_profile() -> Result<bool, String> {
    let profile_path = get_profile_info_path();
    if profile_path.exists() {
        fs::remove_file(&profile_path).map_err(|e| format!("Failed to delete profile: {}", e))?;
        let mut cache = PROFILE_CACHE.write().map_err(|e| format!("Failed to acquire write lock: {}", e))?;
        *cache = None;
        Ok(true)
    } else {
        Ok(false)
    }
}
pub fn invalidate_profile_cache() -> Result<(), String> {
    let mut cache = PROFILE_CACHE.write().map_err(|e| format!("Failed to acquire write lock: {}", e))?;
    *cache = None;
    Ok(())
}
pub fn get_cache_stats() -> ProfileCacheStats {
    match PROFILE_CACHE.read() {
        Ok(cache) => ProfileCacheStats { cached: cache.is_some() },
        Err(_) => ProfileCacheStats { cached: false },
    }
}
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct ProfileCacheStats {
    pub cached: bool,
}
pub fn get_cached_profile() -> Option<UserProfile> {
    let cache = PROFILE_CACHE.read().ok()?;
    cache.clone()
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar: Option<String>,
    pub settings: Option<ProfileSettings>,
}
#[command]
pub async fn cmd_get_profile() -> Result<UserProfile, String> {
    load_profile()
}
#[command]
pub async fn cmd_update_profile(update: UpdateProfileRequest) -> Result<UserProfile, String> {
    update_profile(update)
}
#[command]
pub async fn cmd_reset_profile() -> Result<UserProfile, String> {
    let default_profile = UserProfile::default();
    save_profile(&default_profile)?;
    Ok(default_profile)
}
#[command]
pub async fn cmd_profile_exists() -> Result<bool, String> {
    Ok(profile_exists())
}
#[command]
pub async fn cmd_get_profile_dir() -> Result<String, String> {
    Ok(get_profile_dir().to_string_lossy().to_string())
}
#[command]
pub async fn cmd_update_profile_settings(settings: ProfileSettings) -> Result<UserProfile, String> {
    let mut profile = load_profile()?;
    profile.settings = settings;
    profile.updated_at = chrono::Local::now().to_rfc3339();
    save_profile(&profile)?;
    Ok(profile)
}
#[command]
pub async fn cmd_get_profile_setting(key: String) -> Result<serde_json::Value, String> {
    let profile = load_profile()?;
    match key.as_str() {
        "timezone" => Ok(serde_json::json!(profile.settings.timezone)),
        "date_format" => Ok(serde_json::json!(profile.settings.date_format)),
        "notifications_enabled" => Ok(serde_json::json!(profile.settings.notifications_enabled)),
        "sound_enabled" => Ok(serde_json::json!(profile.settings.sound_enabled)),
        "auto_save" => Ok(serde_json::json!(profile.settings.auto_save)),
        "theme_preference" => Ok(serde_json::json!(profile.settings.theme_preference)),
        "total_input_tokens" => Ok(serde_json::json!(profile.total_input_tokens)),
        "total_output_tokens" => Ok(serde_json::json!(profile.total_output_tokens)),
        "total_session_count" => Ok(serde_json::json!(profile.total_sessions_count.len() as u64)),
        "total_chat_count" => {
            let total: u64 = profile.total_sessions_chat_count.values().sum();
            Ok(serde_json::json!(total))
        }
        _ => {
            if let Some(value) = profile.settings.extra.get(&key) {
                Ok(value.clone())
            } else {
                Ok(serde_json::Value::Null)
            }
        }
    }
}
#[command]
pub async fn cmd_set_profile_setting(key: String, value: serde_json::Value) -> Result<UserProfile, String> {
    let mut profile = load_profile()?;
    match key.as_str() {
        "timezone" => {
            if let Some(v) = value.as_str() {
                profile.settings.timezone = Some(v.to_string());
            }
        }
        "date_format" => {
            if let Some(v) = value.as_str() {
                profile.settings.date_format = Some(v.to_string());
            }
        }
        "notifications_enabled" => {
            if let Some(v) = value.as_bool() {
                profile.settings.notifications_enabled = v;
            }
        }
        "sound_enabled" => {
            if let Some(v) = value.as_bool() {
                profile.settings.sound_enabled = v;
            }
        }
        "auto_save" => {
            if let Some(v) = value.as_bool() {
                profile.settings.auto_save = v;
            }
        }
        "theme_preference" => {
            if let Some(v) = value.as_str() {
                profile.settings.theme_preference = v.to_string();
            }
        }
        "total_input_tokens" => {
            if let Some(v) = value.as_u64() {
                profile.total_input_tokens = v;
            }
        }
        "total_output_tokens" => {
            if let Some(v) = value.as_u64() {
                profile.total_output_tokens = v;
            }
        }
        _ => {
            profile.settings.extra.insert(key, value);
        }
    }
    profile.updated_at = chrono::Local::now().to_rfc3339();
    save_profile(&profile)?;
    Ok(profile)
}
#[command]
pub async fn cmd_invalidate_profile_cache() -> Result<(), String> {
    invalidate_profile_cache()
}
#[command]
pub async fn cmd_get_profile_cache_stats() -> Result<ProfileCacheStats, String> {
    Ok(get_cache_stats())
}
