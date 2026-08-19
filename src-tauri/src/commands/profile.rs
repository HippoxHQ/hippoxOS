use crate::commands::paths::get_app_root_dir;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;
const PROFILE_DIR: &str = "profile";
const PROFILE_INFO_FILE: &str = "info.json";
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: String,
    pub name: String,
    pub email: Option<String>,
    pub avatar: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub settings: ProfileSettings,
}
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
        // Get timezone name - use a helper function
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
        }
    }
}
/// Helper function to get current timezone name
fn get_current_timezone_name() -> String {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
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
        use std::process::Command;
        let output = hidden_cmd("date").arg("+%Z").output();
        if let Ok(output) = output {
            if output.status.success() {
                let tz = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !tz.is_empty() {
                    return tz;
                }
            }
        }
        // Try reading /etc/timezone on Linux
        if let Ok(content) = std::fs::read_to_string("/etc/timezone") {
            let tz = content.trim().to_string();
            if !tz.is_empty() {
                return tz;
            }
        }
    }
    // Fallback to UTC
    "UTC".to_string()
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub email: Option<String>,
    pub avatar: Option<String>,
    pub settings: Option<ProfileSettings>,
}
/// Get the profile directory path
pub fn get_profile_dir() -> PathBuf {
    get_app_root_dir().join(PROFILE_DIR)
}
/// Get the profile info file path
pub fn get_profile_info_path() -> PathBuf {
    get_profile_dir().join(PROFILE_INFO_FILE)
}
/// Ensure the profile directory exists
fn ensure_profile_dir() -> Result<(), String> {
    let dir = get_profile_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create profile directory: {}", e))?;
    }
    Ok(())
}
/// Load profile from file
pub fn load_profile() -> Result<UserProfile, String> {
    let profile_path = get_profile_info_path();
    if profile_path.exists() {
        let content = fs::read_to_string(&profile_path).map_err(|e| format!("Failed to read profile file: {}", e))?;
        let profile: UserProfile = serde_json::from_str(&content).map_err(|e| format!("Failed to parse profile: {}", e))?;
        Ok(profile)
    } else {
        // Create default profile if not exists
        let default_profile = UserProfile::default();
        save_profile(&default_profile)?;
        Ok(default_profile)
    }
}
/// Save profile to file
pub fn save_profile(profile: &UserProfile) -> Result<(), String> {
    ensure_profile_dir()?;
    let profile_path = get_profile_info_path();
    let content = serde_json::to_string_pretty(profile).map_err(|e| format!("Failed to serialize profile: {}", e))?;
    fs::write(&profile_path, content).map_err(|e| format!("Failed to save profile: {}", e))?;
    Ok(())
}
/// Update profile with partial data
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
/// Initialize default profile if not exists
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
/// Check if profile exists
pub fn profile_exists() -> bool {
    get_profile_info_path().exists()
}
/// Delete profile (for reset)
pub fn delete_profile() -> Result<bool, String> {
    let profile_path = get_profile_info_path();
    if profile_path.exists() {
        fs::remove_file(&profile_path).map_err(|e| format!("Failed to delete profile: {}", e))?;
        Ok(true)
    } else {
        Ok(false)
    }
}
/// Get the current user profile
#[tauri::command]
pub async fn cmd_get_profile() -> Result<UserProfile, String> {
    load_profile()
}
/// Update the user profile
#[tauri::command]
pub async fn cmd_update_profile(update: UpdateProfileRequest) -> Result<UserProfile, String> {
    update_profile(update)
}
/// Reset profile to default
#[tauri::command]
pub async fn cmd_reset_profile() -> Result<UserProfile, String> {
    let default_profile = UserProfile::default();
    save_profile(&default_profile)?;
    Ok(default_profile)
}
/// Check if profile exists
#[tauri::command]
pub async fn cmd_profile_exists() -> Result<bool, String> {
    Ok(profile_exists())
}
/// Get profile directory path
#[tauri::command]
pub async fn cmd_get_profile_dir() -> Result<String, String> {
    Ok(get_profile_dir().to_string_lossy().to_string())
}
/// Update profile settings only
#[tauri::command]
pub async fn cmd_update_profile_settings(settings: ProfileSettings) -> Result<UserProfile, String> {
    let mut profile = load_profile()?;
    profile.settings = settings;
    profile.updated_at = chrono::Local::now().to_rfc3339();
    save_profile(&profile)?;
    Ok(profile)
}
/// Get a specific profile setting
#[tauri::command]
pub async fn cmd_get_profile_setting(key: String) -> Result<serde_json::Value, String> {
    let profile = load_profile()?;
    match key.as_str() {
        "timezone" => Ok(serde_json::json!(profile.settings.timezone)),
        "date_format" => Ok(serde_json::json!(profile.settings.date_format)),
        "notifications_enabled" => Ok(serde_json::json!(profile.settings.notifications_enabled)),
        "sound_enabled" => Ok(serde_json::json!(profile.settings.sound_enabled)),
        "auto_save" => Ok(serde_json::json!(profile.settings.auto_save)),
        "theme_preference" => Ok(serde_json::json!(profile.settings.theme_preference)),
        _ => {
            if let Some(value) = profile.settings.extra.get(&key) {
                Ok(value.clone())
            } else {
                Ok(serde_json::Value::Null)
            }
        }
    }
}
/// Update a specific profile setting
#[tauri::command]
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
        _ => {
            profile.settings.extra.insert(key, value);
        }
    }
    profile.updated_at = chrono::Local::now().to_rfc3339();
    save_profile(&profile)?;
    Ok(profile)
}
