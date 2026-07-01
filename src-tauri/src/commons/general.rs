use serde_json::Value;
use std::fs;
use std::path::PathBuf;

use crate::commands::get_settings_dir;

pub fn get_setting(key: &str) -> Result<Value, String> {
    let config_path = get_settings_config_path()?;
    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        let config: Value = serde_json::from_str(&content)
            .unwrap_or_else(|_| Value::Object(serde_json::Map::new()));
        if let Some(value) = config.get(key) {
            return Ok(value.clone());
        }
    }
    Ok(Value::Null)
}

pub fn set_setting(key: &str, value: Value) -> Result<(), String> {
    let config_path = get_settings_config_path()?;
    let settings_dir = get_settings_dir();
    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    let mut config: Value = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read settings config: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| Value::Object(serde_json::Map::new()))
    } else {
        Value::Object(serde_json::Map::new())
    };
    config[key] = value;
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize settings config: {}", e))?;
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to save settings config: {}", e))?;
    Ok(())
}

pub fn get_setting_with_default(key: &str, default: Value) -> Result<Value, String> {
    let value = get_setting(key)?;
    if value.is_null() {
        Ok(default)
    } else {
        Ok(value)
    }
}

fn get_settings_config_path() -> Result<PathBuf, String> {
    let settings_dir = get_settings_dir();
    Ok(settings_dir.join("config.json"))
}

pub fn init_default_settings() -> Result<(), String> {
    let config_path = get_settings_config_path()?;
    if !config_path.exists() {
        let default_config = serde_json::json!({
            "language": "en",
            "theme": "dark",
            "dialog_history": {
                "pinned_sessions": [],
                "sort_by": "updated_at",
                "sort_order": "desc",
                "page_size": 50,
                "expanded_categories": []
            }
        });
        let content = serde_json::to_string_pretty(&default_config)
            .map_err(|e| format!("Failed to serialize default config: {}", e))?;
        fs::write(&config_path, content)
            .map_err(|e| format!("Failed to write default config: {}", e))?;
    }
    Ok(())
}

pub fn get_app_data_dir() -> PathBuf {
    let settings_dir = get_settings_dir();
    settings_dir.parent().unwrap_or(&settings_dir).to_path_buf()
}

pub fn get_sessions_dir() -> PathBuf {
    let app_data_dir = get_app_data_dir();
    app_data_dir.join("dialog_sessions")
}

pub fn get_logs_dir() -> PathBuf {
    let app_data_dir = get_app_data_dir();
    app_data_dir.join("logs")
}
