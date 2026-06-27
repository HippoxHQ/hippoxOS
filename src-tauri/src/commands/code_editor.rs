use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileOperationResult {
    pub success: bool,
    pub message: String,
    pub path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileMoveResult {
    pub success: bool,
    pub message: String,
    pub old_path: Option<String>,
    pub new_path: Option<String>,
}

#[command]
pub async fn cmd_open_in_explorer(path: String) -> Result<FileOperationResult, String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: format!("Path does not exist: {}", path),
            path: None,
        });
    }

    #[cfg(target_os = "windows")]
    {
        let path_str = path_buf.to_string_lossy().to_string();
        if path_buf.is_file() {
            if let Some(parent) = path_buf.parent() {
                let _ = Command::new("explorer")
                    .args(["/select,", &path_str])
                    .spawn();
            }
        } else {
            let _ = Command::new("explorer").arg(&path_str).spawn();
        }
    }

    #[cfg(target_os = "macos")]
    {
        if path_buf.is_file() {
            let _ = Command::new("open").args(["-R", &path]).spawn();
        } else {
            let _ = Command::new("open").arg(&path).spawn();
        }
    }

    #[cfg(target_os = "linux")]
    {
        let path_str = path_buf.to_string_lossy().to_string();
        if path_buf.is_file() {
            if let Some(parent) = path_buf.parent() {
                let _ = Command::new("xdg-open")
                    .arg(parent.to_string_lossy().to_string())
                    .spawn();
            }
        } else {
            let _ = Command::new("xdg-open").arg(&path_str).spawn();
        }
    }

    Ok(FileOperationResult {
        success: true,
        message: "Opened in explorer".to_string(),
        path: Some(path),
    })
}

#[command]
pub async fn cmd_open_in_terminal(path: String) -> Result<FileOperationResult, String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: format!("Path does not exist: {}", path),
            path: None,
        });
    }

    let target_path = if path_buf.is_file() {
        path_buf.parent().unwrap_or(&path_buf).to_path_buf()
    } else {
        path_buf
    };

    let path_str = target_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("cmd")
            .args(["/c", "start", "cmd", "/k", &format!("cd /d {}", path_str)])
            .spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let script = format!(
            r#"tell application "Terminal" to do script "cd '{}'" "#,
            path_str.replace("'", "'\\''")
        );
        let _ = Command::new("osascript").args(["-e", &script]).spawn();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = Command::new("gnome-terminal")
            .args(["--working-directory", &path_str])
            .spawn()
            .or_else(|_| {
                Command::new("xfce4-terminal")
                    .args(["--working-directory", &path_str])
                    .spawn()
            })
            .or_else(|_| {
                Command::new("kitty")
                    .args(["--directory", &path_str])
                    .spawn()
            })
            .or_else(|_| {
                Command::new("alacritty")
                    .args(["--working-directory", &path_str])
                    .spawn()
            });
    }

    Ok(FileOperationResult {
        success: true,
        message: "Opened in terminal".to_string(),
        path: Some(path_str),
    })
}

#[command]
pub async fn cmd_create_file(
    base_path: String,
    file_name: String,
) -> Result<FileOperationResult, String> {
    let path_buf = PathBuf::from(&base_path).join(&file_name);
    if path_buf.exists() {
        if path_buf.is_dir() {
            return Ok(FileOperationResult {
                success: false,
                message: format!("A folder named '{}' already exists at this path", file_name),
                path: None,
            });
        }
        return Ok(FileOperationResult {
            success: false,
            message: format!("File already exists: {}", file_name),
            path: None,
        });
    }
    if let Some(parent) = path_buf.parent() {
        if !parent.exists() {
            if let Err(e) = fs::create_dir_all(parent) {
                return Ok(FileOperationResult {
                    success: false,
                    message: format!("Failed to create directory: {}", e),
                    path: None,
                });
            }
        }
    }
    match fs::write(&path_buf, "") {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: format!("File created: {}", file_name),
            path: Some(path_buf.to_string_lossy().to_string()),
        }),
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Failed to create file: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_create_folder(
    base_path: String,
    folder_name: String,
) -> Result<FileOperationResult, String> {
    let path_buf = PathBuf::from(&base_path).join(&folder_name);
    if path_buf.exists() {
        if path_buf.is_file() {
            return Ok(FileOperationResult {
                success: false,
                message: format!("A file named '{}' already exists at this path", folder_name),
                path: None,
            });
        }
        return Ok(FileOperationResult {
            success: false,
            message: format!("Folder already exists: {}", folder_name),
            path: None,
        });
    }
    match fs::create_dir_all(&path_buf) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: format!("Folder created: {}", folder_name),
            path: Some(path_buf.to_string_lossy().to_string()),
        }),
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Failed to create folder: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_rename(old_path: String, new_name: String) -> Result<FileMoveResult, String> {
    let old_path_buf = PathBuf::from(&old_path);
    if !old_path_buf.exists() {
        return Ok(FileMoveResult {
            success: false,
            message: format!("Path does not exist: {}", old_path),
            old_path: Some(old_path),
            new_path: None,
        });
    }
    let new_path_buf = if let Some(parent) = old_path_buf.parent() {
        parent.join(&new_name)
    } else {
        return Ok(FileMoveResult {
            success: false,
            message: "Cannot rename root directory".to_string(),
            old_path: Some(old_path),
            new_path: None,
        });
    };
    if new_path_buf.exists() {
        if (old_path_buf.is_file() && new_path_buf.is_file())
            || (old_path_buf.is_dir() && new_path_buf.is_dir())
        {
            return Ok(FileMoveResult {
                success: false,
                message: format!("Target already exists: {}", new_name),
                old_path: Some(old_path),
                new_path: None,
            });
        }
        return Ok(FileMoveResult {
            success: false,
            message: format!("Target already exists with different type: {}", new_name),
            old_path: Some(old_path),
            new_path: None,
        });
    }
    match fs::rename(&old_path_buf, &new_path_buf) {
        Ok(_) => Ok(FileMoveResult {
            success: true,
            message: format!("Renamed to: {}", new_name),
            old_path: Some(old_path),
            new_path: Some(new_path_buf.to_string_lossy().to_string()),
        }),
        Err(e) => Ok(FileMoveResult {
            success: false,
            message: format!("Rename failed: {}", e),
            old_path: Some(old_path),
            new_path: None,
        }),
    }
}

#[command]
pub async fn cmd_delete(path: String) -> Result<FileOperationResult, String> {
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: format!("Path does not exist: {}", path),
            path: None,
        });
    }
    if path_buf.is_dir() {
        match fs::remove_dir_all(&path_buf) {
            Ok(_) => Ok(FileOperationResult {
                success: true,
                message: "Folder deleted".to_string(),
                path: Some(path),
            }),
            Err(e) => Ok(FileOperationResult {
                success: false,
                message: format!("Failed to delete folder: {}", e),
                path: None,
            }),
        }
    } else {
        match fs::remove_file(&path_buf) {
            Ok(_) => Ok(FileOperationResult {
                success: true,
                message: "File deleted".to_string(),
                path: Some(path),
            }),
            Err(e) => Ok(FileOperationResult {
                success: false,
                message: format!("Failed to delete file: {}", e),
                path: None,
            }),
        }
    }
}
