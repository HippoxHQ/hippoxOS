use crate::commands::paths::get_app_root_dir;
use crate::commands::video_editor::material::{insert_material, UploadResult};
use crate::commands::video_editor::track::calculate_max_track_time;
use crate::commands::video_editor::track::table::TrackTable;
use crate::commands::{
    get_settings_dir, get_video_editing_system_dialog_history_dir, load_metadata, load_session_config, load_session_metadata, save_session_config,
    save_session_metadata, save_session_tracks, update_session_track_stack, MaterialType, SessionMetadata, TrackTableMap,
};
use crate::commons::{Ffmpeg, FileUtils};
use chrono::{Duration, Local};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use uuid::Uuid;
const DEFAULT_DURATION: f64 = 5.0;
fn get_config_path() -> std::path::PathBuf {
    get_settings_dir().join("video_session.json")
}
fn get_pinned_sessions_from_config() -> Result<Vec<String>, String> {
    let config_path = get_config_path();
    if FileUtils::path_exists(&config_path) {
        let content = FileUtils::read_file_to_string(&config_path).map_err(|e| format!("Failed to read video session config: {:?}", e))?;
        let config: serde_json::Value = serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}));
        Ok(config.get("pinned_sessions").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default())
    } else {
        Ok(vec![])
    }
}
fn save_pinned_sessions_to_config(pinned_sessions: &[String]) -> Result<(), String> {
    let settings_dir = get_settings_dir();
    if !FileUtils::path_exists(&settings_dir) {
        FileUtils::ensure_dir(&settings_dir).map_err(|e| format!("Failed to create settings directory: {:?}", e))?;
    }
    let config_path = get_config_path();
    let config = serde_json::json!({
        "pinned_sessions": pinned_sessions,
    });
    let content = serde_json::to_string_pretty(&config).map_err(|e| format!("Failed to serialize video session config: {:?}", e))?;
    FileUtils::write_file(&config_path, content.as_bytes()).map_err(|e| format!("Failed to save video session config: {:?}", e))?;
    Ok(())
}
fn process_video_file(session_id: &str, source_path: String, metadata: &mut SessionMetadata) {
    if source_path.is_empty() || !FileUtils::path_exists(Path::new(&source_path)) {
        return;
    }
    match insert_material(session_id.to_string(), source_path, &MaterialType::Video) {
        Ok(upload_result) => {
            let material_id = upload_result.id;
            if let Ok(material_metadata) = load_metadata(session_id, &MaterialType::Video, &material_id) {
                let mut tracks = TrackTable::from_track_table_map(std::mem::take(&mut metadata.tracks));
                let _ = tracks.add_material_track(session_id, &material_id, None, None, "video", &material_metadata);
                metadata.tracks = tracks.0;
            }
        }
        Err(e) => {}
    }
}
fn process_audio_files(session_id: &str, audio_paths: Vec<String>, tracks: &mut TrackTableMap) {
    for audio_path in audio_paths {
        if audio_path.is_empty() || !FileUtils::path_exists(Path::new(&audio_path)) {
            continue;
        }
        match insert_material(session_id.to_string(), audio_path, &MaterialType::Audio) {
            Ok(upload_result) => {
                let material_id = upload_result.id;
                if let Ok(material_metadata) = load_metadata(session_id, &MaterialType::Audio, &material_id) {
                    let mut track_table = TrackTable::from_track_table_map(std::mem::take(tracks));
                    let _ = track_table.add_material_track(session_id, &material_id, None, None, "audio", &material_metadata);
                    *tracks = track_table.0;
                }
            }
            Err(e) => {}
        }
    }
}
fn process_image_files(session_id: &str, image_paths: Vec<String>, tracks: &mut TrackTableMap) {
    for image_path in image_paths {
        if image_path.is_empty() || !FileUtils::path_exists(Path::new(&image_path)) {
            continue;
        }
        match insert_material(session_id.to_string(), image_path, &MaterialType::Image) {
            Ok(upload_result) => {
                let material_id = upload_result.id;
                if let Ok(material_metadata) = load_metadata(session_id, &MaterialType::Image, &material_id) {
                    let mut track_table = TrackTable::from_track_table_map(std::mem::take(tracks));
                    let _ = track_table.add_material_track(session_id, &material_id, None, None, "image", &material_metadata);
                    *tracks = track_table.0;
                }
            }
            Err(e) => {}
        }
    }
}
fn process_text_files(session_id: &str, text_paths: Vec<String>, tracks: &mut TrackTableMap) {
    for text_path in text_paths {
        if text_path.is_empty() || !FileUtils::path_exists(Path::new(&text_path)) {
            continue;
        }
        match insert_material(session_id.to_string(), text_path, &MaterialType::Text) {
            Ok(upload_result) => {
                let material_id = upload_result.id;
                if let Ok(material_metadata) = load_metadata(session_id, &MaterialType::Text, &material_id) {
                    let mut track_table = TrackTable::from_track_table_map(std::mem::take(tracks));
                    let _ = track_table.add_material_track(session_id, &material_id, None, None, "text", &material_metadata);
                    *tracks = track_table.0;
                }
            }
            Err(e) => {}
        }
    }
}
#[tauri::command]
pub fn cmd_create_video_dialog_session(
    session_id: &str,
    title: &str,
    description: &str,
    initial_chat_content: &str,
    initial_terminal_content: &str,
    workflow_mode: Option<String>,
    video_url: Option<String>,
    video_title: Option<String>,
    video_source_path: Option<String>,
    audio_source_paths: Option<Vec<String>>,
    image_source_paths: Option<Vec<String>>,
    text_source_paths: Option<Vec<String>>,
) -> Result<String, String> {
    let dir = get_video_editing_system_dialog_history_dir();
    if !FileUtils::path_exists(&dir) {
        FileUtils::ensure_dir(&dir).map_err(|e| format!("Failed to create video dialog history directory: {:?}", e))?;
    }
    let session_dir = dir.join(session_id);
    if !FileUtils::path_exists(&session_dir) {
        FileUtils::ensure_dir(&session_dir).map_err(|e| format!("Failed to create video session directory: {:?}", e))?;
    }
    let workspace_dir = session_dir.join("workspace");
    if !FileUtils::path_exists(&workspace_dir) {
        FileUtils::ensure_dir(&workspace_dir).map_err(|e| format!("Failed to create workspace directory: {:?}", e))?;
    }
    let material_dir = workspace_dir.join("material");
    if !FileUtils::path_exists(&material_dir) {
        FileUtils::ensure_dir(&material_dir).map_err(|e| format!("Failed to create material directory: {:?}", e))?;
    }
    for sub_dir in ["videos", "audios", "images", "texts"] {
        let sub_path = material_dir.join(sub_dir);
        if !FileUtils::path_exists(&sub_path) {
            FileUtils::ensure_dir(&sub_path).map_err(|e| format!("Failed to create {} directory: {:?}", sub_dir, e))?;
        }
    }
    let mut session_metadata = SessionMetadata::new(session_id, title, description);
    if let Some(mode) = workflow_mode {
        session_metadata.workflow_mode = mode;
    }
    if let Some(source_path) = video_source_path {
        process_video_file(session_id, source_path, &mut session_metadata);
    }
    if let Some(audio_paths) = audio_source_paths {
        process_audio_files(session_id, audio_paths, &mut session_metadata.tracks);
    }
    if let Some(image_paths) = image_source_paths {
        process_image_files(session_id, image_paths, &mut session_metadata.tracks);
    }
    if let Some(text_paths) = text_source_paths {
        process_text_files(session_id, text_paths, &mut session_metadata.tracks);
    }
    session_metadata.track_stack = session_metadata.tracks.keys().cloned().collect();
    session_metadata.max_track_time = calculate_max_track_time(&session_metadata.tracks);
    session_metadata.update_timestamp();
    let metadata_path = workspace_dir.join("metadata.json");
    save_session_metadata(session_id, &session_metadata)?;
    let config = serde_json::json!({
        "session_id": session_id,
        "title": title,
        "description": description,
        "created_at": Local::now().to_rfc3339(),
        "updated_at": Local::now().to_rfc3339(),
        "workflow_mode": session_metadata.workflow_mode,
        "workspace_path": workspace_dir.to_string_lossy().to_string(),
        "metadata_path": metadata_path.to_string_lossy().to_string(),
    });
    let config_path = session_dir.join("config.json");
    let config_content = serde_json::to_string_pretty(&config).map_err(|e| format!("Failed to serialize config: {:?}", e))?;
    FileUtils::write_file(&config_path, config_content.as_bytes()).map_err(|e| format!("Failed to save config: {:?}", e))?;
    let chat_path = session_dir.join("chat.json");
    FileUtils::write_file(&chat_path, initial_chat_content.as_bytes()).map_err(|e| format!("Failed to save chat history: {:?}", e))?;
    let terminal_path = session_dir.join("terminal.json");
    FileUtils::write_file(&terminal_path, initial_terminal_content.as_bytes()).map_err(|e| format!("Failed to save terminal history: {:?}", e))?;
    Ok(session_dir.to_string_lossy().to_string())
}
#[tauri::command]
pub fn cmd_list_video_dialog_sessions() -> Result<Vec<serde_json::Value>, String> {
    let dir = get_video_editing_system_dialog_history_dir();
    if !FileUtils::path_exists(&dir) {
        return Ok(vec![]);
    }
    let pinned_sessions = get_pinned_sessions_from_config()?;
    let mut sessions = vec![];
    let entries = FileUtils::read_dir_entries(&dir).map_err(|e| format!("Failed to read video dialog history dir: {:?}", e))?;
    for entry in entries {
        let path = entry.path();
        if path.is_dir() {
            let config_path = path.join("config.json");
            if FileUtils::path_exists(&config_path) {
                let content = FileUtils::read_file_to_string(&config_path).map_err(|e| format!("Failed to read config: {:?}", e))?;
                if let Ok(mut config) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(obj) = config.as_object_mut() {
                        let session_id = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                        obj.insert("path".to_string(), serde_json::json!(path.to_string_lossy()));
                        obj.insert("session_id".to_string(), serde_json::json!(session_id));
                        obj.insert("is_pinned".to_string(), serde_json::json!(pinned_sessions.contains(&session_id)));
                    }
                    sessions.push(config);
                }
            }
        }
    }
    sessions.sort_by(|a, b| {
        let a_pinned = a.get("is_pinned").and_then(|v| v.as_bool()).unwrap_or(false);
        let b_pinned = b.get("is_pinned").and_then(|v| v.as_bool()).unwrap_or(false);
        if a_pinned != b_pinned {
            return b_pinned.cmp(&a_pinned);
        }
        let a_time = a.get("updated_at").and_then(|v| v.as_str()).unwrap_or("");
        let b_time = b.get("updated_at").and_then(|v| v.as_str()).unwrap_or("");
        b_time.cmp(a_time)
    });
    Ok(sessions)
}
#[tauri::command]
pub fn cmd_load_video_session_config(session_id: &str) -> Result<Option<serde_json::Value>, String> {
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let config_path = session_dir.join("config.json");
    if !FileUtils::path_exists(&config_path) {
        return Ok(None);
    }
    let content = FileUtils::read_file_to_string(&config_path).map_err(|e| format!("Failed to read config: {:?}", e))?;
    let mut config: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {:?}", e))?;
    let metadata_path = session_dir.join("workspace").join("metadata.json");
    if FileUtils::path_exists(&metadata_path) {
        if let Ok(metadata) = load_session_metadata(session_id) {
            if let Ok(tracks_json) = serde_json::to_value(&metadata.tracks) {
                config["tracks"] = tracks_json;
            }
            if config.get("title").is_none() || config["title"].is_null() {
                config["title"] = serde_json::json!(metadata.title);
            }
            if config.get("description").is_none() || config["description"].is_null() {
                config["description"] = serde_json::json!(metadata.description);
            }
        }
    }
    Ok(Some(config))
}
#[tauri::command]
pub fn cmd_update_video_session_config(session_id: &str, updates: String) -> Result<(), String> {
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let config_path = session_dir.join("config.json");
    if !FileUtils::path_exists(&config_path) {
        return Err(format!("Video session {} not found", session_id));
    }
    let content = FileUtils::read_file_to_string(&config_path).map_err(|e| format!("Failed to read config: {:?}", e))?;
    let mut config: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {:?}", e))?;
    let updates_json: serde_json::Value = serde_json::from_str(&updates).map_err(|e| format!("Failed to parse updates: {:?}", e))?;
    if let Some(obj) = updates_json.as_object() {
        for (key, value) in obj {
            config[key] = value.clone();
        }
    }
    config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
    save_session_config(session_id, &config)?;
    let metadata_path = session_dir.join("workspace").join("metadata.json");
    if FileUtils::path_exists(&metadata_path) {
        let mut metadata: SessionMetadata = load_session_metadata(session_id)?;
        if let Some(obj) = updates_json.as_object() {
            for (key, value) in obj {
                if key == "title" {
                    metadata.title = value.as_str().unwrap_or(&metadata.title).to_string();
                } else if key == "description" {
                    metadata.description = value.as_str().unwrap_or(&metadata.description).to_string();
                } else if key == "workflow_mode" {
                    metadata.workflow_mode = value.as_str().unwrap_or(&metadata.workflow_mode).to_string();
                }
            }
        }
        metadata.update_timestamp();
        save_session_metadata(session_id, &metadata)?;
    }
    Ok(())
}
#[tauri::command]
pub fn cmd_delete_video_dialog_session(session_id: &str) -> Result<(), String> {
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    if FileUtils::path_exists(&session_dir) {
        FileUtils::remove_dir_all_force(&session_dir).map_err(|e| format!("Failed to delete video session: {:?}", e))?;
    }
    let pinned = get_pinned_sessions_from_config()?;
    if pinned.contains(&session_id.to_string()) {
        let _ = cmd_update_pinned_video_sessions(session_id.to_string(), false);
    }
    Ok(())
}
#[tauri::command]
pub fn cmd_save_video_chat_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let chat_path = session_dir.join("chat.json");
    if !FileUtils::path_exists(&session_dir) {
        FileUtils::ensure_dir(&session_dir).map_err(|e| format!("Failed to create video session directory: {:?}", e))?;
    }
    FileUtils::write_file(&chat_path, content.as_bytes()).map_err(|e| format!("Failed to save video chat content: {:?}", e))?;
    let config_path = session_dir.join("config.json");
    if FileUtils::path_exists(&config_path) {
        let cfg_content = FileUtils::read_file_to_string(&config_path).map_err(|e| format!("Failed to read config: {:?}", e))?;
        let mut config: serde_json::Value = serde_json::from_str(&cfg_content).map_err(|e| format!("Failed to parse config: {:?}", e))?;
        config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
        save_session_config(session_id, &config)?;
    }
    Ok(())
}
#[tauri::command]
pub fn cmd_save_video_terminal_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let terminal_path = session_dir.join("terminal.json");
    if !FileUtils::path_exists(&session_dir) {
        FileUtils::ensure_dir(&session_dir).map_err(|e| format!("Failed to create video session directory: {:?}", e))?;
    }
    FileUtils::write_file(&terminal_path, content.as_bytes()).map_err(|e| format!("Failed to save video terminal content: {:?}", e))?;
    Ok(())
}
#[tauri::command]
pub fn cmd_load_video_chat_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_video_editing_system_dialog_history_dir();
    let chat_path = dir.join(session_id).join("chat.json");
    if FileUtils::path_exists(&chat_path) {
        let content = FileUtils::read_file_to_string(&chat_path).map_err(|e| format!("Failed to read video chat content: {:?}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}
#[tauri::command]
pub fn cmd_load_video_terminal_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_video_editing_system_dialog_history_dir();
    let terminal_path = dir.join(session_id).join("terminal.json");
    if FileUtils::path_exists(&terminal_path) {
        let content = FileUtils::read_file_to_string(&terminal_path).map_err(|e| format!("Failed to read video terminal content: {:?}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}
#[tauri::command]
pub fn cmd_save_video_task_content(session_id: &str, content: &str) -> Result<(), String> {
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let task_path = session_dir.join("task.json");
    if !FileUtils::path_exists(&session_dir) {
        FileUtils::ensure_dir(&session_dir).map_err(|e| format!("Failed to create video session directory: {:?}", e))?;
    }
    FileUtils::write_file(&task_path, content.as_bytes()).map_err(|e| format!("Failed to save video task content: {:?}", e))?;
    Ok(())
}
#[tauri::command]
pub fn cmd_load_video_task_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_video_editing_system_dialog_history_dir();
    let task_path = dir.join(session_id).join("task.json");
    if FileUtils::path_exists(&task_path) {
        let content = FileUtils::read_file_to_string(&task_path).map_err(|e| format!("Failed to read video task content: {:?}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}
#[tauri::command]
pub fn cmd_update_pinned_video_sessions(session_id: String, pinned: bool) -> Result<Vec<String>, String> {
    let mut pinned_sessions = get_pinned_sessions_from_config()?;
    if pinned {
        if !pinned_sessions.contains(&session_id) {
            pinned_sessions.push(session_id);
        }
    } else {
        pinned_sessions.retain(|id| id != &session_id);
    }
    save_pinned_sessions_to_config(&pinned_sessions)?;
    Ok(pinned_sessions)
}
#[tauri::command]
pub fn cmd_get_pinned_video_sessions() -> Result<Vec<String>, String> {
    get_pinned_sessions_from_config()
}
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AddTrackRequest {
    pub session_id: String,
    pub track_type: String,
    pub file_path: Option<String>,
}
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RemoveTrackRequest {
    pub session_id: String,
    pub track_index: usize,
}
#[tauri::command]
pub fn cmd_get_video_session_tracks(session_id: &str) -> Result<Vec<serde_json::Value>, String> {
    let metadata = load_session_metadata(session_id)?;
    let tracks: Vec<serde_json::Value> =
        metadata.tracks.values().map(|track| serde_json::to_value(track).unwrap_or(serde_json::Value::Null)).collect();
    Ok(tracks)
}
#[tauri::command]
pub fn cmd_update_video_session_tracks(session_id: &str, tracks: serde_json::Value) -> Result<serde_json::Value, String> {
    let track_table: TrackTableMap = serde_json::from_value(tracks).map_err(|e| format!("Failed to deserialize tracks: {:?}", e))?;
    save_session_tracks(session_id, &track_table)?;
    let metadata = load_session_metadata(session_id)?;
    Ok(serde_json::to_value(&metadata).map_err(|e| format!("Failed to serialize metadata: {:?}", e))?)
}
