use chrono::Utc;
use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::Arc;
use tauri::command;
use walkdir::WalkDir;

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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchMatch {
    pub line: String,
    pub line_number: usize,
    pub start_index: usize,
    pub end_index: usize,
    pub context_before: String,
    pub context_after: String,
    pub matched_text: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FileSearchResult {
    pub file_path: String,
    pub relative_path: String,
    pub match_count: usize,
    pub matches: Vec<SearchMatch>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SearchInFilesResult {
    pub success: bool,
    pub message: String,
    pub total_files: usize,
    pub total_matches: usize,
    pub results: Vec<FileSearchResult>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TabFileMetadata {
    pub id: String,
    pub source_path: String,
    pub is_dirty: bool,
    pub last_modified: String,
    pub tmp_path: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceMetadata {
    pub version: String,
    pub workspace: WorkspaceInfo,
    pub tabs: TabsInfo,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceInfo {
    pub path: String,
    pub name: String,
    pub created_at: String,
    pub last_opened: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TabsInfo {
    pub files: Vec<TabFileMetadata>,
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

#[command]
pub async fn cmd_copy(
    source_path: String,
    target_path: String,
) -> Result<FileOperationResult, String> {
    let source_buf = PathBuf::from(&source_path);
    let target_buf = PathBuf::from(&target_path);
    if !source_buf.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: format!("Source path does not exist: {}", source_path),
            path: None,
        });
    }
    if target_buf.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: format!("Target already exists: {}", target_path),
            path: None,
        });
    }
    if let Some(parent) = target_buf.parent() {
        if !parent.exists() {
            if let Err(e) = fs::create_dir_all(parent) {
                return Ok(FileOperationResult {
                    success: false,
                    message: format!("Failed to create target directory: {}", e),
                    path: None,
                });
            }
        }
    }
    let result = if source_buf.is_dir() {
        copy_dir_all(&source_buf, &target_buf)
    } else {
        fs::copy(&source_buf, &target_buf).map(|_| ())
    };
    match result {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: format!("Copied to: {}", target_path),
            path: Some(target_path),
        }),
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Copy failed: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_write_file(path: String, content: String) -> Result<FileOperationResult, String> {
    let path_buf = PathBuf::from(&path);

    if !path_buf.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: format!("Path does not exist: {}", path),
            path: None,
        });
    }

    if path_buf.is_dir() {
        return Ok(FileOperationResult {
            success: false,
            message: format!("Path is a directory, not a file: {}", path),
            path: None,
        });
    }

    match fs::write(&path_buf, content) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: "File written successfully".to_string(),
            path: Some(path),
        }),
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Failed to write file: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_search_in_files(
    workspace_path: String,
    query: String,
) -> Result<SearchInFilesResult, String> {
    let workspace_buf = PathBuf::from(&workspace_path);
    if !workspace_buf.exists() || !workspace_buf.is_dir() {
        return Ok(SearchInFilesResult {
            success: false,
            message: "Workspace path does not exist or is not a directory".to_string(),
            total_files: 0,
            total_matches: 0,
            results: Vec::new(),
        });
    }

    let query_lower = query.to_lowercase();
    let query_regex = match Regex::new(&regex::escape(&query)) {
        Ok(re) => Arc::new(re),
        Err(_) => {
            return Ok(SearchInFilesResult {
                success: false,
                message: "Invalid search query".to_string(),
                total_files: 0,
                total_matches: 0,
                results: Vec::new(),
            });
        }
    };
    let query_lower_arc = Arc::new(query_lower);
    let mut file_paths: Vec<PathBuf> = Vec::new();
    for entry in WalkDir::new(&workspace_buf)
        .into_iter()
        .filter_entry(|e| !is_ignored_dir(e.file_name()))
    {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.is_file() && !is_binary_file(path) {
                file_paths.push(path.to_path_buf());
            }
        }
    }
    use rayon::prelude::*;
    let results: Vec<FileSearchResult> = file_paths
        .par_iter()
        .filter_map(|path| {
            let relative_path = match path.strip_prefix(&workspace_buf) {
                Ok(p) => p.to_string_lossy().to_string(),
                Err(_) => path.to_string_lossy().to_string(),
            };
            let content = match fs::read_to_string(path) {
                Ok(c) => c,
                Err(_) => return None,
            };
            let mut matches = Vec::new();
            let mut match_count = 0;
            for (line_num, line) in content.lines().enumerate() {
                let line_lower = line.to_lowercase();
                if !line_lower.contains(&*query_lower_arc) {
                    continue;
                }
                let mut start = 0;
                while let Some(matched) = query_regex.find_at(&line, start) {
                    let context_before = if matched.start() > 50 {
                        &line[matched.start() - 50..matched.start()]
                    } else {
                        &line[0..matched.start()]
                    };
                    let context_after = if matched.end() + 50 < line.len() {
                        &line[matched.end()..matched.end() + 50]
                    } else {
                        &line[matched.end()..]
                    };
                    matches.push(SearchMatch {
                        line: line.to_string(),
                        line_number: line_num + 1,
                        start_index: matched.start(),
                        end_index: matched.end(),
                        context_before: context_before.to_string(),
                        context_after: context_after.to_string(),
                        matched_text: matched.as_str().to_string(),
                    });
                    match_count += 1;
                    start = matched.end();
                }
            }

            if match_count == 0 {
                return None;
            }
            Some(FileSearchResult {
                file_path: path.to_string_lossy().to_string(),
                relative_path,
                match_count,
                matches,
            })
        })
        .collect();
    let total_files = results.len();
    let total_matches: usize = results.iter().map(|r| r.match_count).sum();
    Ok(SearchInFilesResult {
        success: true,
        message: format!("Found {} matches in {} files", total_matches, total_files),
        total_files,
        total_matches,
        results,
    })
}

fn is_binary_file(path: &std::path::Path) -> bool {
    if let Some(ext) = path.extension() {
        let ext = ext.to_string_lossy().to_lowercase();
        let binary_exts = vec![
            "png", "jpg", "jpeg", "gif", "bmp", "ico", "webp", "mp3", "mp4", "avi", "mov", "wmv",
            "flv", "mkv", "zip", "rar", "7z", "tar", "gz", "bz2", "exe", "dll", "so", "dylib",
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "pyc", "class", "o", "a",
        ];
        return binary_exts.contains(&ext.as_str());
    }
    false
}

fn is_ignored_dir(name: &std::ffi::OsStr) -> bool {
    let name = name.to_string_lossy();
    name == "node_modules"
        || name == "target"
        || name == "dist"
        || name == "build"
        || name == ".git"
        || name == ".next"
        || name == ".nuxt"
        || name == "coverage"
        || name == ".cache"
        || name == "vendor"
        || name == "bower_components"
        || name == "venv"
        || name == ".venv"
        || name == "env"
        || name == ".env"
        || name == "__pycache__"
        || name == ".DS_Store"
        || name == "Thumbs.db"
        || name.starts_with('.')
}

fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> std::io::Result<()> {
    if !dst.exists() {
        fs::create_dir_all(dst)?;
    }
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let entry_path = entry.path();
        let target_path = dst.join(entry.file_name());
        if entry_path.is_dir() {
            copy_dir_all(&entry_path.to_path_buf(), &target_path)?;
        } else {
            fs::copy(&entry_path, &target_path)?;
        }
    }
    Ok(())
}

fn get_tmp_dir(workspace_path: &str) -> PathBuf {
    PathBuf::from(workspace_path).join(".hippox").join("tmp")
}

fn get_metadata_path(workspace_path: &str) -> PathBuf {
    PathBuf::from(workspace_path)
        .join(".hippox")
        .join("metadata.json")
}

fn generate_tmp_name() -> String {
    use rand::Rng;
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let mut rng = rand::thread_rng();
    let name: String = (0..16)
        .map(|_| {
            let idx = rng.gen_range(0..CHARSET.len());
            CHARSET[idx] as char
        })
        .collect();
    format!("{}.tmp", name)
}

fn get_source_path_from_metadata(metadata: &WorkspaceMetadata, tmp_path: &str) -> Option<String> {
    for file in &metadata.tabs.files {
        if file.tmp_path == tmp_path {
            return Some(file.source_path.clone());
        }
    }
    None
}

#[command]
pub async fn cmd_ensure_tmp_dir(workspace_path: String) -> Result<FileOperationResult, String> {
    let tmp_dir = get_tmp_dir(&workspace_path);
    match fs::create_dir_all(&tmp_dir) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: "Tmp directory ensured".to_string(),
            path: Some(tmp_dir.to_string_lossy().to_string()),
        }),
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Failed to create tmp directory: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_load_metadata(
    workspace_path: String,
) -> Result<Option<WorkspaceMetadata>, String> {
    let metadata_path = get_metadata_path(&workspace_path);
    if !metadata_path.exists() {
        return Ok(None);
    }
    match fs::read_to_string(&metadata_path) {
        Ok(content) => match serde_json::from_str::<WorkspaceMetadata>(&content) {
            Ok(metadata) => Ok(Some(metadata)),
            Err(e) => Err(format!("Failed to parse metadata: {}", e)),
        },
        Err(e) => Err(format!("Failed to read metadata: {}", e)),
    }
}

#[command]
pub async fn cmd_save_metadata(
    workspace_path: String,
    metadata: WorkspaceMetadata,
) -> Result<FileOperationResult, String> {
    let tmp_dir = get_tmp_dir(&workspace_path);
    if let Err(e) = fs::create_dir_all(&tmp_dir) {
        return Ok(FileOperationResult {
            success: false,
            message: format!("Failed to create tmp directory: {}", e),
            path: None,
        });
    }

    let metadata_path = get_metadata_path(&workspace_path);
    match serde_json::to_string_pretty(&metadata) {
        Ok(content) => match fs::write(&metadata_path, content) {
            Ok(_) => Ok(FileOperationResult {
                success: true,
                message: "Metadata saved".to_string(),
                path: Some(metadata_path.to_string_lossy().to_string()),
            }),
            Err(e) => Ok(FileOperationResult {
                success: false,
                message: format!("Failed to write metadata: {}", e),
                path: None,
            }),
        },
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Failed to serialize metadata: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_get_tmp_file_path(
    workspace_path: String,
    tmp_name: String,
) -> Result<String, String> {
    let tmp_dir = get_tmp_dir(&workspace_path);
    Ok(tmp_dir.join(tmp_name).to_string_lossy().to_string())
}

#[command]
pub async fn cmd_check_tmp_exists(
    workspace_path: String,
    tmp_name: String,
) -> Result<bool, String> {
    let tmp_file = get_tmp_dir(&workspace_path).join(tmp_name);
    Ok(tmp_file.exists())
}

#[command]
pub async fn cmd_read_from_tmp(
    workspace_path: String,
    tmp_name: String,
) -> Result<Option<String>, String> {
    let tmp_file = get_tmp_dir(&workspace_path).join(&tmp_name);
    if !tmp_file.exists() {
        return Ok(None);
    }
    match fs::read_to_string(&tmp_file) {
        Ok(content) => Ok(Some(content)),
        Err(e) => Err(format!("Failed to read tmp file: {}", e)),
    }
}

#[command]
pub async fn cmd_write_to_tmp(
    workspace_path: String,
    tmp_name: String,
    content: String,
) -> Result<FileOperationResult, String> {
    let tmp_dir = get_tmp_dir(&workspace_path);
    if let Err(e) = fs::create_dir_all(&tmp_dir) {
        return Ok(FileOperationResult {
            success: false,
            message: format!("Failed to create tmp directory: {}", e),
            path: None,
        });
    }

    let tmp_file = tmp_dir.join(&tmp_name);
    match fs::write(&tmp_file, content) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: "Written to tmp".to_string(),
            path: Some(tmp_file.to_string_lossy().to_string()),
        }),
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Failed to write tmp file: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_delete_from_tmp(
    workspace_path: String,
    tmp_name: String,
) -> Result<FileOperationResult, String> {
    let tmp_file = get_tmp_dir(&workspace_path).join(&tmp_name);
    if !tmp_file.exists() {
        return Ok(FileOperationResult {
            success: true,
            message: "Tmp file does not exist".to_string(),
            path: None,
        });
    }
    match fs::remove_file(&tmp_file) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: "Deleted from tmp".to_string(),
            path: Some(tmp_file.to_string_lossy().to_string()),
        }),
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Failed to delete tmp file: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_copy_to_tmp(
    workspace_path: String,
    source_path: String,
    tmp_name: String,
) -> Result<FileOperationResult, String> {
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Ok(FileOperationResult {
            success: false,
            message: format!("Source file does not exist: {}", source_path),
            path: None,
        });
    }
    if source.is_dir() {
        return Ok(FileOperationResult {
            success: false,
            message: "Cannot copy directory to tmp".to_string(),
            path: None,
        });
    }

    let tmp_dir = get_tmp_dir(&workspace_path);
    if let Err(e) = fs::create_dir_all(&tmp_dir) {
        return Ok(FileOperationResult {
            success: false,
            message: format!("Failed to create tmp directory: {}", e),
            path: None,
        });
    }

    let tmp_file = tmp_dir.join(&tmp_name);
    match fs::copy(&source, &tmp_file) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: "Copied file to tmp".to_string(),
            path: Some(tmp_file.to_string_lossy().to_string()),
        }),
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Failed to copy to tmp: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_compare_tmp_with_source(
    workspace_path: String,
    source_path: String,
    tmp_name: String,
) -> Result<bool, String> {
    let source = PathBuf::from(&source_path);
    if !source.exists() {
        return Ok(false);
    }

    let tmp_file = get_tmp_dir(&workspace_path).join(&tmp_name);
    if !tmp_file.exists() {
        return Ok(false);
    }

    let source_content = match fs::read_to_string(&source) {
        Ok(c) => c,
        Err(_) => return Ok(false),
    };
    let tmp_content = match fs::read_to_string(&tmp_file) {
        Ok(c) => c,
        Err(_) => return Ok(false),
    };

    Ok(source_content == tmp_content)
}

#[command]
pub async fn cmd_sync_metadata_on_rename(
    workspace_path: String,
    old_path: String,
    new_path: String,
) -> Result<FileOperationResult, String> {
    let metadata_path = get_metadata_path(&workspace_path);
    if !metadata_path.exists() {
        return Ok(FileOperationResult {
            success: true,
            message: "No metadata to sync".to_string(),
            path: None,
        });
    }

    let content = match fs::read_to_string(&metadata_path) {
        Ok(c) => c,
        Err(e) => {
            return Ok(FileOperationResult {
                success: false,
                message: format!("Failed to read metadata: {}", e),
                path: None,
            });
        }
    };

    let mut metadata: WorkspaceMetadata = match serde_json::from_str(&content) {
        Ok(m) => m,
        Err(e) => {
            return Ok(FileOperationResult {
                success: false,
                message: format!("Failed to parse metadata: {}", e),
                path: None,
            });
        }
    };

    let mut updated = false;
    for file in &mut metadata.tabs.files {
        if file.source_path == old_path {
            file.source_path = new_path.clone();
            updated = true;
        }
    }

    if !updated {
        return Ok(FileOperationResult {
            success: true,
            message: "No matching file found in metadata".to_string(),
            path: None,
        });
    }

    match serde_json::to_string_pretty(&metadata) {
        Ok(json) => match fs::write(&metadata_path, json) {
            Ok(_) => Ok(FileOperationResult {
                success: true,
                message: "Metadata synced on rename".to_string(),
                path: Some(metadata_path.to_string_lossy().to_string()),
            }),
            Err(e) => Ok(FileOperationResult {
                success: false,
                message: format!("Failed to write metadata: {}", e),
                path: None,
            }),
        },
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Failed to serialize metadata: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_sync_metadata_on_delete(
    workspace_path: String,
    path: String,
) -> Result<FileOperationResult, String> {
    let metadata_path = get_metadata_path(&workspace_path);
    if !metadata_path.exists() {
        return Ok(FileOperationResult {
            success: true,
            message: "No metadata to sync".to_string(),
            path: None,
        });
    }
    let content = match fs::read_to_string(&metadata_path) {
        Ok(c) => c,
        Err(e) => {
            return Ok(FileOperationResult {
                success: false,
                message: format!("Failed to read metadata: {}", e),
                path: None,
            });
        }
    };
    let mut metadata: WorkspaceMetadata = match serde_json::from_str(&content) {
        Ok(m) => m,
        Err(e) => {
            return Ok(FileOperationResult {
                success: false,
                message: format!("Failed to parse metadata: {}", e),
                path: None,
            });
        }
    };
    let path_buf = PathBuf::from(&path);
    let is_dir = path_buf.is_dir();
    let mut to_remove = Vec::new();
    for (idx, file) in metadata.tabs.files.iter().enumerate() {
        if is_dir {
            if file.source_path.starts_with(&path) {
                to_remove.push(idx);
            }
        } else {
            if file.source_path == path {
                to_remove.push(idx);
            }
        }
    }
    for idx in to_remove.into_iter().rev() {
        let tmp_file = get_tmp_dir(&workspace_path).join(&metadata.tabs.files[idx].tmp_path);
        let _ = fs::remove_file(tmp_file);
        metadata.tabs.files.remove(idx);
    }
    match serde_json::to_string_pretty(&metadata) {
        Ok(json) => match fs::write(&metadata_path, json) {
            Ok(_) => Ok(FileOperationResult {
                success: true,
                message: "Metadata synced on delete".to_string(),
                path: Some(metadata_path.to_string_lossy().to_string()),
            }),
            Err(e) => Ok(FileOperationResult {
                success: false,
                message: format!("Failed to write metadata: {}", e),
                path: None,
            }),
        },
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Failed to serialize metadata: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_clear_all_tmp(workspace_path: String) -> Result<FileOperationResult, String> {
    let tmp_dir = get_tmp_dir(&workspace_path);
    if !tmp_dir.exists() {
        return Ok(FileOperationResult {
            success: true,
            message: "Tmp directory does not exist".to_string(),
            path: None,
        });
    }

    match fs::remove_dir_all(&tmp_dir) {
        Ok(_) => {
            let _ = fs::create_dir_all(&tmp_dir);
            Ok(FileOperationResult {
                success: true,
                message: "Cleared all tmp files".to_string(),
                path: Some(tmp_dir.to_string_lossy().to_string()),
            })
        }
        Err(e) => Ok(FileOperationResult {
            success: false,
            message: format!("Failed to clear tmp directory: {}", e),
            path: None,
        }),
    }
}

#[command]
pub async fn cmd_cleanup_orphaned_tmp(
    workspace_path: String,
) -> Result<FileOperationResult, String> {
    let metadata_path = get_metadata_path(&workspace_path);
    let tmp_dir = get_tmp_dir(&workspace_path);
    if !tmp_dir.exists() {
        return Ok(FileOperationResult {
            success: true,
            message: "Tmp directory does not exist".to_string(),
            path: None,
        });
    }
    let metadata: Option<WorkspaceMetadata> = if metadata_path.exists() {
        match fs::read_to_string(&metadata_path) {
            Ok(content) => match serde_json::from_str(&content) {
                Ok(m) => Some(m),
                Err(_) => None,
            },
            Err(_) => None,
        }
    } else {
        None
    };
    let valid_tmp_paths: HashSet<String> = match metadata {
        Some(m) => m.tabs.files.iter().map(|f| f.tmp_path.clone()).collect(),
        None => HashSet::new(),
    };
    let mut deleted_count = 0;
    if let Ok(entries) = fs::read_dir(&tmp_dir) {
        for entry in entries {
            if let Ok(entry) = entry {
                let path = entry.path();
                if path.is_file() {
                    if let Some(file_name) = path.file_name() {
                        let file_name_str = file_name.to_string_lossy().to_string();
                        if !valid_tmp_paths.contains(&file_name_str) {
                            let _ = fs::remove_file(&path);
                            deleted_count += 1;
                        }
                    }
                }
            }
        }
    }
    Ok(FileOperationResult {
        success: true,
        message: format!("Cleaned up {} orphaned tmp files", deleted_count),
        path: Some(tmp_dir.to_string_lossy().to_string()),
    })
}

#[command]
pub async fn cmd_generate_tmp_name(source_path: String) -> Result<String, String> {
    Ok(generate_tmp_name())
}
