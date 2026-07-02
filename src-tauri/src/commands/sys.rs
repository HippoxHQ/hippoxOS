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
