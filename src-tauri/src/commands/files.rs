use rfd::AsyncFileDialog;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub modified: Option<String>,
}

#[tauri::command]
pub async fn cmd_open_path(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open path: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open path: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(path)
            .spawn()
            .map_err(|e| format!("Failed to open path: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub async fn cmd_select_directory() -> Result<Option<String>, String> {
    let folder = AsyncFileDialog::new()
        .set_title("Select Workspace Directory")
        .pick_folder()
        .await;
    Ok(folder.map(|f| f.path().to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn cmd_select_file(
    options: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let mut dialog = AsyncFileDialog::new();
    if let Some(opts) = options {
        if let Some(title) = opts.get("title").and_then(|v| v.as_str()) {
            dialog = dialog.set_title(title);
        }
        if let Some(multiple) = opts.get("multiple").and_then(|v| v.as_bool()) {
            if multiple {
                match dialog.pick_files().await {
                    Some(files) => {
                        let paths: Vec<String> = files
                            .into_iter()
                            .map(|f| f.path().to_string_lossy().to_string())
                            .collect();
                        return Ok(serde_json::json!(paths));
                    }
                    None => return Ok(serde_json::json!(Vec::<String>::new())),
                }
            }
        }
    }
    let file = dialog.pick_file().await;
    Ok(serde_json::json!(
        file.map(|f| f.path().to_string_lossy().to_string())
    ))
}

#[tauri::command]
pub async fn cmd_read_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let dir = Path::new(&path);
    if !dir.exists() {
        return Err(format!("Directory does not exist: {}", path));
    }
    if !dir.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    let mut entries = Vec::new();
    for entry in fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let metadata = entry
            .metadata()
            .map_err(|e| format!("Failed to read metadata: {}", e))?;
        entries.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_directory: metadata.is_dir(),
            size: if metadata.is_file() {
                Some(metadata.len())
            } else {
                None
            },
            modified: metadata.modified().ok().and_then(|t| {
                t.duration_since(std::time::UNIX_EPOCH).ok().and_then(|d| {
                    chrono::DateTime::from_timestamp(d.as_secs() as i64, 0)
                        .map(|dt| dt.to_rfc3339())
                })
            }),
        });
    }
    entries.sort_by(|a, b| {
        if a.is_directory && !b.is_directory {
            std::cmp::Ordering::Less
        } else if !a.is_directory && b.is_directory {
            std::cmp::Ordering::Greater
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(entries)
}

#[tauri::command]
pub async fn cmd_path_exists(path: String) -> Result<bool, String> {
    Ok(Path::new(&path).exists())
}

#[tauri::command]
pub async fn cmd_read_text_file(path: String) -> Result<String, String> {
    let path = std::path::Path::new(&path);
    if !path.exists() {
        return Err(format!("File does not exist: {}", path.display()));
    }
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}
