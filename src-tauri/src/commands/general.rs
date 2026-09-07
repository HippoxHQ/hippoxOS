use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::command;
#[derive(Debug, Serialize, Deserialize)]
pub struct FileOperationResult {
    pub success: bool,
    pub message: String,
    pub path: Option<String>,
}
#[command]
pub async fn cmd_open_explorer(path: String) -> Result<FileOperationResult, String> {
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
                let _ = hidden_cmd("explorer").args(["/select,", &path_str]).spawn();
            }
        } else {
            use crate::commons::hidden_cmd;
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
/// Open a terminal at the specified directory path.
/// This is a user-initiated action that intentionally opens a visible terminal.
///
/// # Arguments
/// * `path` - The directory path to open terminal at
///
/// # Returns
/// * `Ok(FileOperationResult)` - Success result with message
/// * `Err(String)` - Error message if operation fails
#[command]
pub async fn cmd_open_terminal(path: String) -> Result<FileOperationResult, String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Ok(FileOperationResult { success: false, message: format!("Path does not exist: {}", path), path: None });
    }
    // Ensure we have a directory path, if file is provided use its parent
    let target_path = if path_buf.is_file() { path_buf.parent().unwrap_or(&path_buf).to_path_buf() } else { path_buf };
    let path_str = target_path.to_string_lossy().to_string();
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        // Open cmd.exe at the specified directory
        let _ = Command::new("cmd")
            .args(&["/c", "start", "cmd", "/k", "cd", "/d", &path_str])
            .spawn()
            .map_err(|e| format!("Failed to open terminal: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        use std::path::Path;
        use std::process::Command;
        // Try iTerm2 first if available, otherwise use Terminal.app
        if Path::new("/Applications/iTerm.app").exists() {
            let _ = Command::new("open").args(&["-a", "iTerm", &path_str]).spawn().map_err(|e| format!("Failed to open iTerm: {}", e))?;
        } else {
            // Use AppleScript to open Terminal and cd to the directory
            let script = format!(
                "tell application \"Terminal\"\n\
                 do script \"cd '{}'\"\n\
                 activate\n\
                 end tell",
                path_str.replace("'", "\\'")
            );
            let _ = Command::new("osascript").args(&["-e", &script]).spawn().map_err(|e| format!("Failed to open Terminal: {}", e))?;
        }
    }
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        // List of common terminal emulators to try in order of preference
        let terminals = vec![
            ("gnome-terminal", vec!["--working-directory", &path_str]),
            ("konsole", vec!["--workdir", &path_str]),
            ("xfce4-terminal", vec!["--working-directory", &path_str]),
            ("alacritty", vec!["--working-directory", &path_str]),
            ("kitty", vec!["--directory", &path_str]),
            ("terminator", vec!["--working-directory", &path_str]),
            ("wezterm", vec!["start", "--cwd", &path_str]),
        ];
        let mut opened = false;
        for (term, args) in terminals {
            // Check if terminal exists
            let which_output = Command::new("which").arg(term).output();
            if let Ok(output) = which_output {
                if output.status.success() {
                    let _ = Command::new(term).args(args).spawn().map_err(|e| format!("Failed to open {}: {}", term, e))?;
                    opened = true;
                    break;
                }
            }
        }
        // Fallback: use xterm
        if !opened {
            let _ = Command::new("xterm")
                .args(&["-e", "bash", "-c", &format!("cd '{}' && exec bash", path_str)])
                .spawn()
                .map_err(|e| format!("Failed to open xterm: {}", e))?;
        }
    }
    Ok(FileOperationResult { success: true, message: format!("Terminal opened at: {}", path_str), path: Some(path_str) })
}
