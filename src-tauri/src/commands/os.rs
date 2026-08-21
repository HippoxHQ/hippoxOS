use std::env;
use tauri::{AppHandle, Manager, Window};
#[tauri::command]
pub async fn cmd_exit_app() -> Result<(), String> {
    std::process::exit(0);
}
#[tauri::command]
pub fn cmd_get_system_username() -> Result<String, String> {
    match env::var("USERNAME").or_else(|_| env::var("USER")) {
        Ok(username) => Ok(username),
        Err(_) => {
            #[cfg(target_os = "windows")]
            {
                Ok("User".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                Ok("User".to_string())
            }
        }
    }
}
/// Open a URL in the system default browser
#[tauri::command]
pub async fn cmd_open_browser(url: String) -> Result<(), String> {
    if url.is_empty() {
        return Err("URL cannot be empty".to_string());
    }
    // Validate URL format
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid URL format. Must start with http:// or https://".to_string());
    }
    match webbrowser::open(&url) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open browser: {}", e)),
    }
}
