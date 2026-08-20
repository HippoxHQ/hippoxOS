use crate::commands::FileOperationResult;
use crate::commons::FileUtils;
use crate::subsystem::sandbox3d::get_sandbox3d_gif_path;
use crate::subsystem::videoeditor::{register_overlay, OverlayType};
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
/// Upload GIF for a specific 3D sandbox session and task
/// Saves to: HippoX/SandBox3DDialogHistory/{session_id}/exports/{task_id}.gif
/// Overwrites existing file if present
#[command]
pub async fn cmd_upload_sandbox3d_gif(session_id: String, task_id: String, gif_data: Vec<u8>) -> Result<FileOperationResult, String> {
    if session_id.is_empty() {
        return Ok(FileOperationResult { success: false, message: "Session ID cannot be empty".to_string(), path: None });
    }
    if task_id.is_empty() {
        return Ok(FileOperationResult { success: false, message: "Task ID cannot be empty".to_string(), path: None });
    }
    if gif_data.is_empty() {
        return Ok(FileOperationResult { success: false, message: "GIF data cannot be empty".to_string(), path: None });
    }
    let target_path = get_sandbox3d_gif_path(&session_id, &task_id);
    // Ensure parent directory exists using FileUtils
    if let Some(parent) = target_path.parent() {
        if let Err(e) = FileUtils::ensure_dir(parent) {
            return Ok(FileOperationResult { success: false, message: format!("Failed to create export directory: {:?}", e), path: None });
        }
    }
    // Write file using FileUtils (overwrites if exists)
    match FileUtils::write_file(&target_path, &gif_data) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: "GIF uploaded successfully".to_string(),
            path: Some(target_path.to_string_lossy().to_string()),
        }),
        Err(e) => Ok(FileOperationResult { success: false, message: format!("Failed to write GIF file: {:?}", e), path: None }),
    }
}
/// Get GIF for a specific 3D sandbox session and task
/// Returns the GIF data as Vec<u8>, or None if not found
#[command]
pub async fn cmd_get_sandbox3d_gif(session_id: String, task_id: String) -> Result<Option<Vec<u8>>, String> {
    if session_id.is_empty() {
        return Err("Session ID cannot be empty".to_string());
    }
    if task_id.is_empty() {
        return Err("Task ID cannot be empty".to_string());
    }
    let target_path = get_sandbox3d_gif_path(&session_id, &task_id);
    if !FileUtils::file_exists(&target_path) {
        return Ok(None);
    }
    match FileUtils::read_file(&target_path) {
        Ok(data) => Ok(Some(data)),
        Err(e) => Err(format!("Failed to read GIF file: {:?}", e)),
    }
}
/// Check if GIF exists for a specific 3D sandbox session and task
#[command]
pub async fn cmd_check_sandbox3d_gif_exists(session_id: String, task_id: String) -> Result<bool, String> {
    if session_id.is_empty() {
        return Err("Session ID cannot be empty".to_string());
    }
    if task_id.is_empty() {
        return Err("Task ID cannot be empty".to_string());
    }
    let target_path = get_sandbox3d_gif_path(&session_id, &task_id);
    Ok(FileUtils::file_exists(&target_path))
}
/// Delete GIF for a specific 3D sandbox session and task
#[command]
pub async fn cmd_delete_sandbox3d_gif(session_id: String, task_id: String) -> Result<FileOperationResult, String> {
    if session_id.is_empty() {
        return Ok(FileOperationResult { success: false, message: "Session ID cannot be empty".to_string(), path: None });
    }
    if task_id.is_empty() {
        return Ok(FileOperationResult { success: false, message: "Task ID cannot be empty".to_string(), path: None });
    }
    let target_path = get_sandbox3d_gif_path(&session_id, &task_id);
    if !FileUtils::file_exists(&target_path) {
        return Ok(FileOperationResult { success: true, message: "GIF does not exist, nothing to delete".to_string(), path: None });
    }
    match FileUtils::remove_file(&target_path) {
        Ok(_) => Ok(FileOperationResult {
            success: true,
            message: "GIF deleted successfully".to_string(),
            path: Some(target_path.to_string_lossy().to_string()),
        }),
        Err(e) => Ok(FileOperationResult { success: false, message: format!("Failed to delete GIF: {:?}", e), path: None }),
    }
}
/// Get GIF file path for a specific 3D sandbox session and task
/// Returns the full file path if exists, otherwise returns None
#[command]
pub async fn cmd_get_sandbox3d_gif_path(session_id: String, task_id: String) -> Result<Option<String>, String> {
    if session_id.is_empty() {
        return Err("Session ID cannot be empty".to_string());
    }
    if task_id.is_empty() {
        return Err("Task ID cannot be empty".to_string());
    }
    let target_path = get_sandbox3d_gif_path(&session_id, &task_id);
    if FileUtils::file_exists(&target_path) {
        Ok(Some(target_path.to_string_lossy().to_string()))
    } else {
        Ok(None)
    }
}
/// Register a material for 3D sandbox scene
/// Saves material data to: HippoX/SandBox3DDialogHistory/{session_id}/materials/{material_id}.json
#[command]
pub async fn cmd_register_3d_material(session_id: String, task_id: String) -> Result<FileOperationResult, String> {
    if session_id.is_empty() {
        return Ok(FileOperationResult { success: false, message: "Session ID cannot be empty".to_string(), path: None });
    }
    if task_id.is_empty() {
        return Ok(FileOperationResult { success: false, message: "Task ID cannot be empty".to_string(), path: None });
    }
    // Get GIF file path for the task
    let gif_path = get_sandbox3d_gif_path(&session_id, &task_id);
    // Check if GIF exists
    if !FileUtils::file_exists(&gif_path) {
        return Ok(FileOperationResult { success: false, message: format!("GIF not found for task: {}", task_id), path: None });
    }
    // Call register_overlay with the GIF path
    match register_overlay(Some(gif_path.to_string_lossy().to_string()), OverlayType::Image, None, "3d".to_string()) {
        Ok(result) => {
            Ok(FileOperationResult { success: true, message: "Material registered successfully".to_string(), path: Some(result.file_path) })
        }
        Err(e) => Ok(FileOperationResult { success: false, message: format!("Failed to register material: {}", e), path: None }),
    }
}
