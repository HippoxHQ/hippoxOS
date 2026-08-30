use crate::commons::FileError;
use crate::commons::FileUtils;
use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use chrono::Local;
use rfd::AsyncFileDialog;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Error as IoError;
use std::path::Path;
use std::path::PathBuf;
use std::process::Command;
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub modified: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileInfoDetail {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub mime_type: String,
    pub modified: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveFileDialogResult {
    pub file_path: Option<String>,
    pub canceled: bool,
}
// ===== Tauri Commands =====
/// Open a path in system file explorer
#[tauri::command]
pub async fn cmd_open_path(path: String) -> Result<(), String> {
    let path = Path::new(&path);
    if !FileUtils::path_exists(path) {
        return Err(format!("Path does not exist: {}", path.display()));
    }
    #[cfg(target_os = "windows")]
    {
        use crate::commons::hidden_cmd;
        hidden_cmd("explorer").arg(path).spawn().map_err(|e| format!("Failed to open path: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        hidden_cmd("open").arg(path).spawn().map_err(|e| format!("Failed to open path: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        hidden_cmd("xdg-open").arg(path).spawn().map_err(|e| format!("Failed to open path: {}", e))?;
    }
    Ok(())
}
/// Select a directory using system dialog
#[tauri::command]
pub async fn cmd_select_directory() -> Result<Option<String>, String> {
    let folder = AsyncFileDialog::new().set_title("Select Workspace Directory").pick_folder().await;
    Ok(folder.map(|f| f.path().to_string_lossy().to_string()))
}
/// Select a file using system dialog
#[tauri::command]
pub async fn cmd_select_file(options: Option<serde_json::Value>) -> Result<serde_json::Value, String> {
    let mut dialog = AsyncFileDialog::new();
    if let Some(opts) = options {
        if let Some(title) = opts.get("title").and_then(|v| v.as_str()) {
            dialog = dialog.set_title(title);
        }
        if let Some(multiple) = opts.get("multiple").and_then(|v| v.as_bool()) {
            if multiple {
                match dialog.pick_files().await {
                    Some(files) => {
                        let paths: Vec<String> = files.into_iter().map(|f| f.path().to_string_lossy().to_string()).collect();
                        return Ok(serde_json::json!(paths));
                    }
                    None => return Ok(serde_json::json!(Vec::<String>::new())),
                }
            }
        }
    }
    let file = dialog.pick_file().await;
    Ok(serde_json::json!(file.map(|f| f.path().to_string_lossy().to_string())))
}
/// Open save file dialog with custom options
#[tauri::command]
pub async fn cmd_save_file_dialog(options: Option<serde_json::Value>) -> Result<SaveFileDialogResult, String> {
    let mut dialog = AsyncFileDialog::new();
    if let Some(opts) = options {
        if let Some(title) = opts.get("title").and_then(|v| v.as_str()) {
            dialog = dialog.set_title(title);
        }
        if let Some(file_name) = opts.get("fileName").and_then(|v| v.as_str()) {
            dialog = dialog.set_file_name(file_name);
        }
        if let Some(extension) = opts.get("extension").and_then(|v| v.as_str()) {
            let ext = extension.trim_start_matches('.');
            dialog = dialog.add_filter(format!("*.{} files", ext).as_str(), &[ext]);
        }
        if let Some(filters) = opts.get("filters").and_then(|v| v.as_array()) {
            for filter in filters {
                if let (Some(name), Some(extensions)) =
                    (filter.get("name").and_then(|v| v.as_str()), filter.get("extensions").and_then(|v| v.as_array()))
                {
                    let exts: Vec<&str> = extensions.iter().filter_map(|e| e.as_str()).collect();
                    if !exts.is_empty() {
                        dialog = dialog.add_filter(name, &exts);
                    }
                }
            }
        }
    }
    match dialog.save_file().await {
        Some(path) => Ok(SaveFileDialogResult { file_path: Some(path.path().to_string_lossy().to_string()), canceled: false }),
        None => Ok(SaveFileDialogResult { file_path: None, canceled: true }),
    }
}
/// Write text content to a file (uses FileUtils)
#[tauri::command]
pub async fn cmd_write_text_file(path: String, content: String) -> Result<(), String> {
    FileUtils::write_file_string(Path::new(&path), &content).map_err(|e| format!("Failed to write file: {}", format_file_error(&e)))?;
    Ok(())
}
/// Write binary content to a file (uses FileUtils)
#[tauri::command]
pub async fn cmd_write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    FileUtils::write_file(Path::new(&path), &data).map_err(|e| format!("Failed to write file: {}", format_file_error(&e)))?;
    Ok(())
}
/// Read directory contents
#[tauri::command]
pub async fn cmd_read_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let dir = Path::new(&path);
    if !FileUtils::path_exists(dir) {
        return Err(format!("Directory does not exist: {}", path));
    }
    if !dir.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }
    let mut entries = Vec::new();
    let dir_entries = FileUtils::read_dir_entries(dir).map_err(|e| format!("Failed to read directory: {}", format_file_error(&e)))?;
    for entry in dir_entries {
        let metadata = entry.metadata().map_err(|e| format!("Failed to read metadata: {}", e))?;
        entries.push(FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_directory: metadata.is_dir(),
            size: if metadata.is_file() { Some(metadata.len()) } else { None },
            modified: metadata.modified().ok().and_then(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .ok()
                    .and_then(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0).map(|dt| dt.to_rfc3339()))
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
/// Check if path exists (uses FileUtils)
#[tauri::command]
pub async fn cmd_path_exists(path: String) -> Result<bool, String> {
    Ok(FileUtils::path_exists(Path::new(&path)))
}
/// Read text file (uses FileUtils)
#[tauri::command]
pub async fn cmd_read_text_file(path: String) -> Result<String, String> {
    let path = Path::new(&path);
    if !FileUtils::file_exists(path) {
        return Err(format!("File does not exist: {}", path.display()));
    }
    FileUtils::read_file_to_string(path).map_err(|e| format!("Failed to read file: {}", format_file_error(&e)))
}
/// Read image as base64 data URL (uses FileUtils)
#[tauri::command]
pub async fn cmd_read_image_base64(path: String) -> Result<String, String> {
    let path = Path::new(&path);
    if !FileUtils::file_exists(path) {
        return Err(format!("File does not exist: {}", path.display()));
    }
    let data = FileUtils::read_file(path).map_err(|e| format!("Failed to read file: {}", format_file_error(&e)))?;
    let encoded = STANDARD.encode(&data);
    let mime = match path.extension().and_then(|e| e.to_str()) {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("bmp") => "image/bmp",
        Some("svg") => "image/svg+xml",
        _ => "application/octet-stream",
    };
    Ok(format!("data:{};base64,{}", mime, encoded))
}
/// Read file as base64 string (uses FileUtils)
#[tauri::command]
pub async fn cmd_read_file_base64(path: String) -> Result<String, String> {
    let path = Path::new(&path);
    if !FileUtils::file_exists(path) {
        return Err(format!("File does not exist: {}", path.display()));
    }
    let data = FileUtils::read_file(path).map_err(|e| format!("Failed to read file: {}", format_file_error(&e)))?;
    Ok(STANDARD.encode(&data))
}
/// Get detailed file info (uses FileUtils)
#[tauri::command]
pub async fn cmd_get_file_info(path: String) -> Result<FileInfoDetail, String> {
    let path = Path::new(&path);
    if !FileUtils::file_exists(path) {
        return Err(format!("File does not exist: {}", path.display()));
    }
    let metadata = FileUtils::get_metadata(path).map_err(|e| format!("Failed to get metadata: {}", format_file_error(&e)))?;
    let mime_type = match path.extension().and_then(|e| e.to_str()) {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("gif") => "image/gif",
        Some("webp") => "image/webp",
        Some("pdf") => "application/pdf",
        Some("txt") | Some("md") => "text/plain",
        Some("json") => "application/json",
        Some("html") | Some("htm") => "text/html",
        Some("css") => "text/css",
        Some("js") | Some("ts") => "application/javascript",
        Some("py") => "text/x-python",
        Some("rs") => "text/x-rust",
        Some("xml") => "application/xml",
        Some("yaml") | Some("yml") => "text/yaml",
        _ => "application/octet-stream",
    }
    .to_string();
    Ok(FileInfoDetail {
        name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
        path: path.to_string_lossy().to_string(),
        size: metadata.len(),
        mime_type,
        modified: metadata.modified().ok().and_then(|t| {
            t.duration_since(std::time::UNIX_EPOCH)
                .ok()
                .and_then(|d| chrono::DateTime::from_timestamp(d.as_secs() as i64, 0).map(|dt| dt.to_rfc3339()))
        }),
    })
}
/// Save CSV file (uses FileUtils)
#[tauri::command]
pub async fn cmd_save_csv_file(content: String, default_name: String) -> Result<(), String> {
    let file_path = AsyncFileDialog::new().set_title("Save CSV File").add_filter("CSV File", &["csv"]).set_file_name(&default_name).save_file().await;
    match file_path {
        Some(path) => {
            let path_str = path.path().to_string_lossy().to_string();
            FileUtils::write_file_string(Path::new(&path_str), &content).map_err(|e| format!("Failed to write file: {}", format_file_error(&e)))?;
            Ok(())
        }
        None => Err("User cancelled save dialog".to_string()),
    }
}
/// Helper to format FileError as string
fn format_file_error(err: &FileError) -> String {
    match err {
        FileError::Io(msg) => msg.clone(),
        FileError::NotFound(msg) => msg.clone(),
        FileError::InvalidFileName(msg) => msg.clone(),
        FileError::DirectoryCreation(msg) => msg.clone(),
        FileError::UnsupportedType(msg) => msg.clone(),
        FileError::ReadError(msg) => msg.clone(),
        FileError::WriteError(msg) => msg.clone(),
        FileError::CopyError(msg) => msg.clone(),
        FileError::RemoveError(msg) => msg.clone(),
    }
}
