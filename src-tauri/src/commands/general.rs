use crate::commands::FileOperationResult;
use std::path::PathBuf;
use tauri::command;
#[command]
pub async fn cmd_open_in_explorer(path: String) -> Result<FileOperationResult, String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Ok(FileOperationResult { success: false, message: format!("Path does not exist: {}", path), path: None });
    }
    #[cfg(target_os = "windows")]
    {
        let path_str = path_buf.to_string_lossy().to_string();
        if path_buf.is_file() {
            if let Some(parent) = path_buf.parent() {
                use crate::commons::hidden_cmd;
                use std::process::Command;
                let _ = hidden_cmd("explorer").args(["/select,", &path_str]).spawn();
            }
        } else {
            use crate::commons::hidden_cmd;
            use std::process::Command;
            let _ = hidden_cmd("explorer").arg(&path_str).spawn();
        }
    }
    #[cfg(target_os = "macos")]
    {
        if path_buf.is_file() {
            let _ = hidden_cmd("open").args(["-R", &path]).spawn();
        } else {
            let _ = hidden_cmd("open").arg(&path).spawn();
        }
    }
    #[cfg(target_os = "linux")]
    {
        let path_str = path_buf.to_string_lossy().to_string();
        if path_buf.is_file() {
            if let Some(parent) = path_buf.parent() {
                let _ = hidden_cmd("xdg-open").arg(parent.to_string_lossy().to_string()).spawn();
            }
        } else {
            let _ = hidden_cmd("xdg-open").arg(&path_str).spawn();
        }
    }
    Ok(FileOperationResult { success: true, message: "Opened in explorer".to_string(), path: Some(path) })
}
