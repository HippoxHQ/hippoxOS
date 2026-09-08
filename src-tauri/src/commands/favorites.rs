use crate::commands::{get_skills_market_dir, FavoritesConfig};
use crate::commons::FileUtils;
use std::path::PathBuf;
use tauri::command;
const FAVORITES_CONFIG_FILE: &str = "favorites.json";
#[command]
pub async fn get_favorited_skills() -> Result<Vec<String>, String> {
    let favorites = load_favorites_config();
    Ok(favorites.favorites)
}
pub fn load_favorites_config() -> FavoritesConfig {
    let config_path = get_favorites_config_path();
    if FileUtils::path_exists(&config_path) {
        if let Ok(content) = FileUtils::read_file_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }
    FavoritesConfig::default()
}
pub fn get_favorites_config_path() -> PathBuf {
    get_skills_market_dir().join(FAVORITES_CONFIG_FILE)
}
pub fn save_favorites_config(config: &FavoritesConfig) -> Result<(), String> {
    let config_path = get_favorites_config_path();
    if let Some(parent) = config_path.parent() {
        if !FileUtils::path_exists(parent) {
            FileUtils::ensure_dir(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }
    let content = serde_json::to_string_pretty(config).map_err(|e| format!("Failed to serialize favorites config: {}", e))?;
    FileUtils::write_file_string(&config_path, &content).map_err(|e| format!("Failed to save favorites config: {}", e))?;
    Ok(())
}
