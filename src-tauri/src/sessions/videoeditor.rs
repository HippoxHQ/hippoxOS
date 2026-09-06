use crate::commands::add_session_to_profile;
use crate::commands::get_settings_dir;
use crate::commands::get_video_editing_system_dialog_history_dir;
use crate::commons::FileUtils;
use crate::subsystem::get_session_cover_path;
use crate::subsystem::videoeditor::get_downloads_root_dir;
use crate::subsystem::videoeditor::material::{register_material, UploadResult};
use crate::subsystem::videoeditor::track::calculate_max_track_time;
use crate::subsystem::videoeditor::track::table::TrackTable;
use crate::subsystem::videoeditor::{
    emit_refresh_timeline_and_player, load_metadata, load_session_config, load_session_metadata, save_session_config, save_session_metadata,
    save_session_tracks, update_download_material_mapping, update_session_track_stack, MaterialType, SessionMetadata, TrackTableMap,
};
use chrono::{Duration, Local};
use log::{debug, error, info, warn};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use uuid::Uuid;
const DEFAULT_DURATION: f64 = 5.0;
/// Get the path to the video session configuration file
fn get_config_path() -> std::path::PathBuf {
    get_settings_dir().join("video_session.json")
}
/// Retrieve the list of pinned session IDs from the configuration file
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
/// Save the list of pinned session IDs to the configuration file
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
/// Background task to process a video file asynchronously
///
/// This function runs in a background thread pool to handle file copying,
/// metadata extraction, and session updates without blocking the main thread.
///
/// # Arguments
/// * `app_handle` - The Tauri app handle for emitting events
/// * `session_id` - The session identifier
/// * `source_path` - Path to the video file to process
///
/// # Returns
/// * `Ok(())` on successful processing
/// * `Err(String)` with error message on failure
async fn process_video_file_background(app_handle: tauri::AppHandle, session_id: &str, source_path: String) -> Result<(), String> {
    debug!("process_video_file_background - START: session_id={}, source_path={}", session_id, source_path);
    let sid = session_id.to_string();
    let path = source_path.clone();
    let app = app_handle.clone();
    // Use spawn_blocking for CPU-intensive operations (file copy, metadata extraction, etc.)
    let result = tokio::task::spawn_blocking(move || {
        debug!("process_video_file_background - Spawned blocking task for video processing");
        // Extract download_content_id if the file is from the downloads directory
        let downloads_dir = get_downloads_root_dir();
        let downloads_dir_str = downloads_dir.to_string_lossy().to_string();
        let download_content_id = if path.starts_with(&downloads_dir_str) {
            path.strip_prefix(&downloads_dir_str).and_then(|p| p.split(std::path::MAIN_SEPARATOR).nth(1)).map(|s| s.to_string())
        } else {
            None
        };
        debug!("process_video_file_background - download_content_id: {:?}", download_content_id);
        // Insert the material into the session
        let upload_result = match register_material(&app, sid.clone(), path.clone(), download_content_id.clone()) {
            Ok(r) => {
                debug!("process_video_file_background - Video material inserted successfully: id={}", r.id);
                r
            }
            Err(e) => {
                error!("process_video_file_background - Failed to insert video material: {}", e);
                return Err(e);
            }
        };
        let material_id = upload_result.id;
        info!("process_video_file_background - Video material processed: material_id={}", material_id);
        // Update download material mapping if applicable
        if let Some(task_id) = download_content_id {
            let _ = update_download_material_mapping(&task_id, &sid, &material_id);
            debug!("process_video_file_background - Updated download material mapping: task_id={}, material_id={}", task_id, material_id);
        }
        // Load the material metadata
        let material_metadata = match load_metadata(&sid, &MaterialType::Video, &material_id) {
            Ok(m) => {
                debug!("process_video_file_background - Material metadata loaded successfully");
                m
            }
            Err(e) => {
                error!("process_video_file_background - Failed to load video metadata: {}", e);
                return Err(e);
            }
        };
        // Update session metadata - add track
        match load_session_metadata(&sid) {
            Ok(mut metadata) => {
                debug!("process_video_file_background - Loading session metadata");
                let mut tracks = TrackTable::from_track_table_map(std::mem::take(&mut metadata.tracks));
                let _ = tracks.add_material_track(&sid, &material_id, None, None, "video", &material_metadata);
                metadata.tracks = tracks.0;
                metadata.track_stack = metadata.tracks.keys().cloned().collect();
                metadata.max_track_time = calculate_max_track_time(&metadata.tracks);
                metadata.update_timestamp();
                if let Err(e) = save_session_metadata(&sid, &metadata) {
                    error!("process_video_file_background - Failed to save session metadata: {}", e);
                    return Err(e);
                }
                debug!("process_video_file_background - Session metadata updated with video track");
                // Update config.json
                let session_dir = get_video_editing_system_dialog_history_dir().join(&sid);
                let config_path = session_dir.join("config.json");
                if FileUtils::path_exists(&config_path) {
                    debug!("process_video_file_background - Updating config.json");
                    if let Ok(content) = FileUtils::read_file_to_string(&config_path) {
                        if let Ok(mut config) = serde_json::from_str::<serde_json::Value>(&content) {
                            if let Ok(tracks_json) = serde_json::to_value(&metadata.tracks) {
                                config["tracks"] = tracks_json;
                                config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
                                let _ = save_session_config(&sid, &config);
                                debug!("process_video_file_background - config.json updated successfully");
                            }
                        }
                    }
                }
                info!("process_video_file_background - Video processing completed successfully: material_id={}", material_id);
                // Emit refresh event to notify frontend
                let _ = emit_refresh_timeline_and_player(&app, &sid);
                debug!("process_video_file_background - Refresh event emitted for session: {}", sid);
                Ok(())
            }
            Err(e) => {
                error!("process_video_file_background - Failed to load session metadata: {}", e);
                Err(e)
            }
        }
    })
    .await;
    match result {
        Ok(Ok(())) => {
            debug!("process_video_file_background - DONE: session_id={}", session_id);
            Ok(())
        }
        Ok(Err(e)) => {
            error!("process_video_file_background - Task returned error: {}", e);
            Err(e)
        }
        Err(e) => {
            error!("process_video_file_background - Background task panicked: {}", e);
            Err(format!("Background task panicked: {}", e))
        }
    }
}
/// Background task to process multiple audio files asynchronously
///
/// This function processes each audio file in the list sequentially,
/// inserting them into the session and updating metadata.
///
/// # Arguments
/// * `app_handle` - The Tauri app handle for emitting events
/// * `session_id` - The session identifier
/// * `audio_paths` - List of audio file paths to process
///
/// # Returns
/// * `Ok(())` on successful processing
/// * `Err(String)` with error message on failure
async fn process_audio_files_background(app_handle: tauri::AppHandle, session_id: &str, audio_paths: Vec<String>) -> Result<(), String> {
    debug!("process_audio_files_background - START: session_id={}, count={}", session_id, audio_paths.len());
    let sid = session_id.to_string();
    let paths = audio_paths.clone();
    let app = app_handle.clone();
    let result = tokio::task::spawn_blocking(move || {
        debug!("process_audio_files_background - Spawned blocking task for audio processing");
        let downloads_dir = get_downloads_root_dir();
        let downloads_dir_str = downloads_dir.to_string_lossy().to_string();
        for (idx, audio_path) in paths.iter().enumerate() {
            debug!("process_audio_files_background - Processing audio {}/{}: {}", idx + 1, paths.len(), audio_path);
            if audio_path.is_empty() || !FileUtils::path_exists(Path::new(audio_path)) {
                warn!("process_audio_files_background - Skipping invalid audio path: {}", audio_path);
                continue;
            }
            // Extract download_content_id if the file is from the downloads directory
            let download_content_id = if audio_path.starts_with(&downloads_dir_str) {
                audio_path.strip_prefix(&downloads_dir_str).and_then(|p| p.split(std::path::MAIN_SEPARATOR).nth(1)).map(|s| s.to_string())
            } else {
                None
            };
            match register_material(&app, sid.clone(), audio_path.clone(), download_content_id.clone()) {
                Ok(upload_result) => {
                    let material_id = upload_result.id;
                    debug!("process_audio_files_background - Audio material inserted: {}", material_id);
                    // Update download material mapping if applicable
                    if let Some(task_id) = download_content_id {
                        let _ = update_download_material_mapping(&task_id, &sid, &material_id);
                        debug!(
                            "process_audio_files_background - Updated download material mapping: task_id={}, material_id={}",
                            task_id, material_id
                        );
                    }
                    if let Ok(material_metadata) = load_metadata(&sid, &MaterialType::Audio, &material_id) {
                        if let Ok(mut metadata) = load_session_metadata(&sid) {
                            let mut tracks = TrackTable::from_track_table_map(std::mem::take(&mut metadata.tracks));
                            let _ = tracks.add_material_track(&sid, &material_id, None, None, "audio", &material_metadata);
                            metadata.tracks = tracks.0;
                            metadata.track_stack = metadata.tracks.keys().cloned().collect();
                            metadata.max_track_time = calculate_max_track_time(&metadata.tracks);
                            metadata.update_timestamp();
                            let _ = save_session_metadata(&sid, &metadata);
                            // Update config.json
                            let session_dir = get_video_editing_system_dialog_history_dir().join(&sid);
                            let config_path = session_dir.join("config.json");
                            if FileUtils::path_exists(&config_path) {
                                if let Ok(content) = FileUtils::read_file_to_string(&config_path) {
                                    if let Ok(mut config) = serde_json::from_str::<serde_json::Value>(&content) {
                                        if let Ok(tracks_json) = serde_json::to_value(&metadata.tracks) {
                                            config["tracks"] = tracks_json;
                                            config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
                                            let _ = save_session_config(&sid, &config);
                                        }
                                    }
                                }
                            }
                            info!("process_audio_files_background - Audio material added: {}", material_id);
                        }
                    }
                }
                Err(e) => {
                    error!("process_audio_files_background - Failed to insert audio material: {}", e);
                }
            }
        }
        debug!("process_audio_files_background - All audio files processed");
        // Emit refresh event to notify frontend after all audio files are processed
        let _ = emit_refresh_timeline_and_player(&app, &sid);
        debug!("process_audio_files_background - Refresh event emitted for session: {}", sid);
        Ok(())
    })
    .await;
    match result {
        Ok(Ok(())) => {
            debug!("process_audio_files_background - DONE: session_id={}", session_id);
            Ok(())
        }
        Ok(Err(e)) => {
            error!("process_audio_files_background - Task returned error: {}", e);
            Err(e)
        }
        Err(e) => {
            error!("process_audio_files_background - Background task panicked: {}", e);
            Err(format!("Background task panicked: {}", e))
        }
    }
}
/// Background task to process multiple image files asynchronously
///
/// This function processes each image file in the list sequentially,
/// inserting them into the session and updating metadata.
///
/// # Arguments
/// * `app_handle` - The Tauri app handle for emitting events
/// * `session_id` - The session identifier
/// * `image_paths` - List of image file paths to process
///
/// # Returns
/// * `Ok(())` on successful processing
/// * `Err(String)` with error message on failure
async fn process_image_files_background(app_handle: tauri::AppHandle, session_id: &str, image_paths: Vec<String>) -> Result<(), String> {
    debug!("process_image_files_background - START: session_id={}, count={}", session_id, image_paths.len());
    let sid = session_id.to_string();
    let paths = image_paths.clone();
    let app = app_handle.clone();
    let result = tokio::task::spawn_blocking(move || {
        debug!("process_image_files_background - Spawned blocking task for image processing");
        let downloads_dir = get_downloads_root_dir();
        let downloads_dir_str = downloads_dir.to_string_lossy().to_string();
        for (idx, image_path) in paths.iter().enumerate() {
            debug!("process_image_files_background - Processing image {}/{}: {}", idx + 1, paths.len(), image_path);
            if image_path.is_empty() || !FileUtils::path_exists(Path::new(image_path)) {
                warn!("process_image_files_background - Skipping invalid image path: {}", image_path);
                continue;
            }
            // Extract download_content_id if the file is from the downloads directory
            let download_content_id = if image_path.starts_with(&downloads_dir_str) {
                image_path.strip_prefix(&downloads_dir_str).and_then(|p| p.split(std::path::MAIN_SEPARATOR).nth(1)).map(|s| s.to_string())
            } else {
                None
            };
            match register_material(&app, sid.clone(), image_path.clone(), download_content_id.clone()) {
                Ok(upload_result) => {
                    let material_id = upload_result.id;
                    debug!("process_image_files_background - Image material inserted: {}", material_id);
                    // Update download material mapping if applicable
                    if let Some(task_id) = download_content_id {
                        let _ = update_download_material_mapping(&task_id, &sid, &material_id);
                        debug!(
                            "process_image_files_background - Updated download material mapping: task_id={}, material_id={}",
                            task_id, material_id
                        );
                    }
                    if let Ok(material_metadata) = load_metadata(&sid, &MaterialType::Image, &material_id) {
                        if let Ok(mut metadata) = load_session_metadata(&sid) {
                            let mut tracks = TrackTable::from_track_table_map(std::mem::take(&mut metadata.tracks));
                            let _ = tracks.add_material_track(&sid, &material_id, None, None, "image", &material_metadata);
                            metadata.tracks = tracks.0;
                            metadata.track_stack = metadata.tracks.keys().cloned().collect();
                            metadata.max_track_time = calculate_max_track_time(&metadata.tracks);
                            metadata.update_timestamp();
                            let _ = save_session_metadata(&sid, &metadata);
                            // Update config.json
                            let session_dir = get_video_editing_system_dialog_history_dir().join(&sid);
                            let config_path = session_dir.join("config.json");
                            if FileUtils::path_exists(&config_path) {
                                if let Ok(content) = FileUtils::read_file_to_string(&config_path) {
                                    if let Ok(mut config) = serde_json::from_str::<serde_json::Value>(&content) {
                                        if let Ok(tracks_json) = serde_json::to_value(&metadata.tracks) {
                                            config["tracks"] = tracks_json;
                                            config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
                                            let _ = save_session_config(&sid, &config);
                                        }
                                    }
                                }
                            }
                            info!("process_image_files_background - Image material added: {}", material_id);
                        }
                    }
                }
                Err(e) => {
                    error!("process_image_files_background - Failed to insert image material: {}", e);
                }
            }
        }
        debug!("process_image_files_background - All image files processed");
        // Emit refresh event to notify frontend after all image files are processed
        let _ = emit_refresh_timeline_and_player(&app, &sid);
        debug!("process_image_files_background - Refresh event emitted for session: {}", sid);
        Ok(())
    })
    .await;
    match result {
        Ok(Ok(())) => {
            debug!("process_image_files_background - DONE: session_id={}", session_id);
            Ok(())
        }
        Ok(Err(e)) => {
            error!("process_image_files_background - Task returned error: {}", e);
            Err(e)
        }
        Err(e) => {
            error!("process_image_files_background - Background task panicked: {}", e);
            Err(format!("Background task panicked: {}", e))
        }
    }
}
/// Background task to process multiple text files asynchronously
///
/// This function processes each text file in the list sequentially,
/// inserting them into the session and updating metadata.
///
/// # Arguments
/// * `app_handle` - The Tauri app handle for emitting events
/// * `session_id` - The session identifier
/// * `text_paths` - List of text file paths to process
///
/// # Returns
/// * `Ok(())` on successful processing
/// * `Err(String)` with error message on failure
async fn process_text_files_background(app_handle: tauri::AppHandle, session_id: &str, text_paths: Vec<String>) -> Result<(), String> {
    debug!("process_text_files_background - START: session_id={}, count={}", session_id, text_paths.len());
    let sid = session_id.to_string();
    let paths = text_paths.clone();
    let app = app_handle.clone();
    let result = tokio::task::spawn_blocking(move || {
        debug!("process_text_files_background - Spawned blocking task for text processing");
        let downloads_dir = get_downloads_root_dir();
        let downloads_dir_str = downloads_dir.to_string_lossy().to_string();
        for (idx, text_path) in paths.iter().enumerate() {
            debug!("process_text_files_background - Processing text {}/{}: {}", idx + 1, paths.len(), text_path);
            if text_path.is_empty() || !FileUtils::path_exists(Path::new(text_path)) {
                warn!("process_text_files_background - Skipping invalid text path: {}", text_path);
                continue;
            }
            // Extract download_content_id if the file is from the downloads directory
            let download_content_id = if text_path.starts_with(&downloads_dir_str) {
                text_path.strip_prefix(&downloads_dir_str).and_then(|p| p.split(std::path::MAIN_SEPARATOR).nth(1)).map(|s| s.to_string())
            } else {
                None
            };
            match register_material(&app, sid.clone(), text_path.clone(), download_content_id.clone()) {
                Ok(upload_result) => {
                    let material_id = upload_result.id;
                    debug!("process_text_files_background - Text material inserted: {}", material_id);
                    // Update download material mapping if applicable
                    if let Some(task_id) = download_content_id {
                        let _ = update_download_material_mapping(&task_id, &sid, &material_id);
                        debug!("process_text_files_background - Updated download material mapping: task_id={}, material_id={}", task_id, material_id);
                    }
                    if let Ok(material_metadata) = load_metadata(&sid, &MaterialType::Text, &material_id) {
                        if let Ok(mut metadata) = load_session_metadata(&sid) {
                            let mut tracks = TrackTable::from_track_table_map(std::mem::take(&mut metadata.tracks));
                            let _ = tracks.add_material_track(&sid, &material_id, None, None, "text", &material_metadata);
                            metadata.tracks = tracks.0;
                            metadata.track_stack = metadata.tracks.keys().cloned().collect();
                            metadata.max_track_time = calculate_max_track_time(&metadata.tracks);
                            metadata.update_timestamp();
                            let _ = save_session_metadata(&sid, &metadata);
                            // Update config.json
                            let session_dir = get_video_editing_system_dialog_history_dir().join(&sid);
                            let config_path = session_dir.join("config.json");
                            if FileUtils::path_exists(&config_path) {
                                if let Ok(content) = FileUtils::read_file_to_string(&config_path) {
                                    if let Ok(mut config) = serde_json::from_str::<serde_json::Value>(&content) {
                                        if let Ok(tracks_json) = serde_json::to_value(&metadata.tracks) {
                                            config["tracks"] = tracks_json;
                                            config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
                                            let _ = save_session_config(&sid, &config);
                                        }
                                    }
                                }
                            }
                            info!("process_text_files_background - Text material added: {}", material_id);
                        }
                    }
                }
                Err(e) => {
                    error!("process_text_files_background - Failed to insert text material: {}", e);
                }
            }
        }
        debug!("process_text_files_background - All text files processed");
        // Emit refresh event to notify frontend after all text files are processed
        let _ = emit_refresh_timeline_and_player(&app, &sid);
        debug!("process_text_files_background - Refresh event emitted for session: {}", sid);
        Ok(())
    })
    .await;
    match result {
        Ok(Ok(())) => {
            debug!("process_text_files_background - DONE: session_id={}", session_id);
            Ok(())
        }
        Ok(Err(e)) => {
            error!("process_text_files_background - Task returned error: {}", e);
            Err(e)
        }
        Err(e) => {
            error!("process_text_files_background - Background task panicked: {}", e);
            Err(format!("Background task panicked: {}", e))
        }
    }
}
// Synchronous processing functions (kept for backward compatibility)
/// Process a video file synchronously (legacy, kept for backward compatibility)
///
/// # Note
/// This function is synchronous and will block the calling thread.
/// For new code, use the async version `process_video_file_background`.
fn process_video_file(app_handle: tauri::AppHandle, session_id: &str, source_path: String, metadata: &mut SessionMetadata) {
    debug!("process_video_file - START: session_id={}, source_path={}", session_id, source_path);
    if source_path.is_empty() || !FileUtils::path_exists(Path::new(&source_path)) {
        warn!("process_video_file - Source path is empty or does not exist");
        return;
    }
    // For synchronous version, we don't have download_context_id, so pass None
    match register_material(&app_handle, session_id.to_string(), source_path, None) {
        Ok(upload_result) => {
            let material_id = upload_result.id;
            debug!("process_video_file - Video material inserted: {}", material_id);
            if let Ok(material_metadata) = load_metadata(session_id, &MaterialType::Video, &material_id) {
                let mut tracks = TrackTable::from_track_table_map(std::mem::take(&mut metadata.tracks));
                let _ = tracks.add_material_track(session_id, &material_id, None, None, "video", &material_metadata);
                metadata.tracks = tracks.0;
                info!("process_video_file - Video track added: {}", material_id);
            }
        }
        Err(e) => {
            error!("process_video_file - Failed to insert video material: {}", e);
        }
    }
}
/// Process audio files synchronously (legacy, kept for backward compatibility)
fn process_audio_files(app_handle: tauri::AppHandle, session_id: &str, audio_paths: Vec<String>, tracks: &mut TrackTableMap) {
    debug!("process_audio_files - START: session_id={}, count={}", session_id, audio_paths.len());
    for audio_path in audio_paths {
        if audio_path.is_empty() || !FileUtils::path_exists(Path::new(&audio_path)) {
            warn!("process_audio_files - Skipping invalid audio path: {}", audio_path);
            continue;
        }
        // For synchronous version, we don't have download_context_id, so pass None
        match register_material(&app_handle, session_id.to_string(), audio_path, None) {
            Ok(upload_result) => {
                let material_id = upload_result.id;
                debug!("process_audio_files - Audio material inserted: {}", material_id);
                if let Ok(material_metadata) = load_metadata(session_id, &MaterialType::Audio, &material_id) {
                    let mut track_table = TrackTable::from_track_table_map(std::mem::take(tracks));
                    let _ = track_table.add_material_track(session_id, &material_id, None, None, "audio", &material_metadata);
                    *tracks = track_table.0;
                    info!("process_audio_files - Audio track added: {}", material_id);
                }
            }
            Err(e) => {
                error!("process_audio_files - Failed to insert audio material: {}", e);
            }
        }
    }
}
/// Process image files synchronously (legacy, kept for backward compatibility)
fn process_image_files(app_handle: tauri::AppHandle, session_id: &str, image_paths: Vec<String>, tracks: &mut TrackTableMap) {
    debug!("process_image_files - START: session_id={}, count={}", session_id, image_paths.len());
    for image_path in image_paths {
        if image_path.is_empty() || !FileUtils::path_exists(Path::new(&image_path)) {
            warn!("process_image_files - Skipping invalid image path: {}", image_path);
            continue;
        }
        // For synchronous version, we don't have download_context_id, so pass None
        match register_material(&app_handle, session_id.to_string(), image_path, None) {
            Ok(upload_result) => {
                let material_id = upload_result.id;
                debug!("process_image_files - Image material inserted: {}", material_id);
                if let Ok(material_metadata) = load_metadata(session_id, &MaterialType::Image, &material_id) {
                    let mut track_table = TrackTable::from_track_table_map(std::mem::take(tracks));
                    let _ = track_table.add_material_track(session_id, &material_id, None, None, "image", &material_metadata);
                    *tracks = track_table.0;
                    info!("process_image_files - Image track added: {}", material_id);
                }
            }
            Err(e) => {
                error!("process_image_files - Failed to insert image material: {}", e);
            }
        }
    }
}
/// Process text files synchronously (legacy, kept for backward compatibility)
fn process_text_files(app_handle: tauri::AppHandle, session_id: &str, text_paths: Vec<String>, tracks: &mut TrackTableMap) {
    debug!("process_text_files - START: session_id={}, count={}", session_id, text_paths.len());
    for text_path in text_paths {
        if text_path.is_empty() || !FileUtils::path_exists(Path::new(&text_path)) {
            warn!("process_text_files - Skipping invalid text path: {}", text_path);
            continue;
        }
        // For synchronous version, we don't have download_context_id, so pass None
        match register_material(&app_handle, session_id.to_string(), text_path, None) {
            Ok(upload_result) => {
                let material_id = upload_result.id;
                debug!("process_text_files - Text material inserted: {}", material_id);
                if let Ok(material_metadata) = load_metadata(session_id, &MaterialType::Text, &material_id) {
                    let mut track_table = TrackTable::from_track_table_map(std::mem::take(tracks));
                    let _ = track_table.add_material_track(session_id, &material_id, None, None, "text", &material_metadata);
                    *tracks = track_table.0;
                    info!("process_text_files - Text track added: {}", material_id);
                }
            }
            Err(e) => {
                error!("process_text_files - Failed to insert text material: {}", e);
            }
        }
    }
}
/// Create a new video dialog session
///
/// This command creates a new video editing session with the given parameters.
/// Files are processed asynchronously in the background to prevent UI blocking.
///
/// # Arguments
/// * `app_handle` - The Tauri app handle for emitting events
/// * `session_id` - Unique identifier for the session
/// * `title` - Session title
/// * `description` - Session description
/// * `initial_chat_content` - Initial chat history content (JSON)
/// * `initial_terminal_content` - Initial terminal history content (JSON)
/// * `workflow_mode` - Optional workflow mode
/// * `video_url` - Optional video URL
/// * `video_title` - Optional video title
/// * `video_source_path` - Optional video file path to import
/// * `audio_source_paths` - Optional list of audio file paths to import
/// * `image_source_paths` - Optional list of image file paths to import
/// * `text_source_paths` - Optional list of text file paths to import
///
/// # Returns
/// * `Ok(String)` - Path to the session directory
/// * `Err(String)` - Error message if creation fails
#[tauri::command]
pub fn cmd_create_video_dialog_session(
    app_handle: tauri::AppHandle,
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
    debug!("cmd_create_video_dialog_session - START: session_id={}, title={}", session_id, title);
    // CALCULATE FILE COUNT FIRST - BEFORE ANY MOVES
    let file_count = (video_source_path.is_some() as u8)
        + (audio_source_paths.as_ref().map_or(0, |v| if v.is_empty() { 0 } else { 1 }) as u8)
        + (image_source_paths.as_ref().map_or(0, |v| if v.is_empty() { 0 } else { 1 }) as u8)
        + (text_source_paths.as_ref().map_or(0, |v| if v.is_empty() { 0 } else { 1 }) as u8);
    // Create the session directory structure
    let dir = get_video_editing_system_dialog_history_dir();
    if !FileUtils::path_exists(&dir) {
        debug!("cmd_create_video_dialog_session - Creating dialog history directory");
        FileUtils::ensure_dir(&dir).map_err(|e| format!("Failed to create video dialog history directory: {:?}", e))?;
    }
    let session_dir = dir.join(session_id);
    if !FileUtils::path_exists(&session_dir) {
        debug!("cmd_create_video_dialog_session - Creating session directory: {:?}", session_dir);
        FileUtils::ensure_dir(&session_dir).map_err(|e| format!("Failed to create video session directory: {:?}", e))?;
    }
    let workspace_dir = session_dir.join("workspace");
    if !FileUtils::path_exists(&workspace_dir) {
        debug!("cmd_create_video_dialog_session - Creating workspace directory: {:?}", workspace_dir);
        FileUtils::ensure_dir(&workspace_dir).map_err(|e| format!("Failed to create workspace directory: {:?}", e))?;
    }
    let material_dir = workspace_dir.join("material");
    if !FileUtils::path_exists(&material_dir) {
        debug!("cmd_create_video_dialog_session - Creating material directory: {:?}", material_dir);
        FileUtils::ensure_dir(&material_dir).map_err(|e| format!("Failed to create material directory: {:?}", e))?;
    }
    for sub_dir in ["videos", "audios", "images", "texts"] {
        let sub_path = material_dir.join(sub_dir);
        if !FileUtils::path_exists(&sub_path) {
            debug!("cmd_create_video_dialog_session - Creating sub-directory: {}", sub_dir);
            FileUtils::ensure_dir(&sub_path).map_err(|e| format!("Failed to create {} directory: {:?}", sub_dir, e))?;
        }
    }
    // Initialize session metadata
    let mut session_metadata = SessionMetadata::new(session_id, title, description);
    if let Some(mode) = workflow_mode {
        debug!("cmd_create_video_dialog_session - Setting workflow_mode: {}", mode);
        session_metadata.workflow_mode = mode;
    }
    // Save initial metadata (without files)
    session_metadata.update_timestamp();
    let metadata_path = workspace_dir.join("metadata.json");
    debug!("cmd_create_video_dialog_session - Saving initial metadata to: {:?}", metadata_path);
    save_session_metadata(session_id, &session_metadata)?;
    // Asynchronous non-blocking file processing
    let session_id_owned = session_id.to_string();
    // Process video file asynchronously
    if let Some(source_path) = video_source_path {
        if !source_path.is_empty() && FileUtils::path_exists(Path::new(&source_path)) {
            debug!("cmd_create_video_dialog_session - Spawning background task for video file: {}", source_path);
            let sid = session_id_owned.clone();
            let path = source_path.clone();
            let app = app_handle.clone();
            tokio::spawn(async move {
                debug!("cmd_create_video_dialog_session - Background processing video file: {}", path);
                let result = process_video_file_background(app, &sid, path).await;
                if let Err(e) = result {
                    error!("cmd_create_video_dialog_session - Background video processing failed: {}", e);
                } else {
                    info!("cmd_create_video_dialog_session - Background video processing completed successfully");
                }
            });
        } else {
            warn!("cmd_create_video_dialog_session - Video source path is empty or does not exist");
        }
    }
    // Process audio files asynchronously
    if let Some(audio_paths) = audio_source_paths {
        let valid_paths: Vec<String> = audio_paths.into_iter().filter(|p| !p.is_empty() && FileUtils::path_exists(Path::new(p))).collect();
        if !valid_paths.is_empty() {
            debug!("cmd_create_video_dialog_session - Spawning background task for {} audio files", valid_paths.len());
            let sid = session_id_owned.clone();
            let paths = valid_paths.clone();
            let app = app_handle.clone();
            tokio::spawn(async move {
                debug!("cmd_create_video_dialog_session - Background processing {} audio files", paths.len());
                let result = process_audio_files_background(app, &sid, paths).await;
                if let Err(e) = result {
                    error!("cmd_create_video_dialog_session - Background audio processing failed: {}", e);
                } else {
                    info!("cmd_create_video_dialog_session - Background audio processing completed successfully");
                }
            });
        } else {
            debug!("cmd_create_video_dialog_session - No valid audio paths to process");
        }
    }
    // Process image files asynchronously
    if let Some(image_paths) = image_source_paths {
        let valid_paths: Vec<String> = image_paths.into_iter().filter(|p| !p.is_empty() && FileUtils::path_exists(Path::new(p))).collect();
        if !valid_paths.is_empty() {
            debug!("cmd_create_video_dialog_session - Spawning background task for {} image files", valid_paths.len());
            let sid = session_id_owned.clone();
            let paths = valid_paths.clone();
            let app = app_handle.clone();
            tokio::spawn(async move {
                debug!("cmd_create_video_dialog_session - Background processing {} image files", paths.len());
                let result = process_image_files_background(app, &sid, paths).await;
                if let Err(e) = result {
                    error!("cmd_create_video_dialog_session - Background image processing failed: {}", e);
                } else {
                    info!("cmd_create_video_dialog_session - Background image processing completed successfully");
                }
            });
        } else {
            debug!("cmd_create_video_dialog_session - No valid image paths to process");
        }
    }
    // Process text files asynchronously
    if let Some(text_paths) = text_source_paths {
        let valid_paths: Vec<String> = text_paths.into_iter().filter(|p| !p.is_empty() && FileUtils::path_exists(Path::new(p))).collect();
        if !valid_paths.is_empty() {
            debug!("cmd_create_video_dialog_session - Spawning background task for {} text files", valid_paths.len());
            let sid = session_id_owned.clone();
            let paths = valid_paths.clone();
            let app = app_handle.clone();
            tokio::spawn(async move {
                debug!("cmd_create_video_dialog_session - Background processing {} text files", paths.len());
                let result = process_text_files_background(app, &sid, paths).await;
                if let Err(e) = result {
                    error!("cmd_create_video_dialog_session - Background text processing failed: {}", e);
                } else {
                    info!("cmd_create_video_dialog_session - Background text processing completed successfully");
                }
            });
        } else {
            debug!("cmd_create_video_dialog_session - No valid text paths to process");
        }
    }
    // Save configuration and session files
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
    debug!("cmd_create_video_dialog_session - Saving config to: {:?}", config_path);
    let config_content = serde_json::to_string_pretty(&config).map_err(|e| format!("Failed to serialize config: {:?}", e))?;
    FileUtils::write_file(&config_path, config_content.as_bytes()).map_err(|e| format!("Failed to save config: {:?}", e))?;
    let chat_path = session_dir.join("chat.json");
    debug!("cmd_create_video_dialog_session - Saving chat history to: {:?}", chat_path);
    FileUtils::write_file(&chat_path, initial_chat_content.as_bytes()).map_err(|e| format!("Failed to save chat history: {:?}", e))?;
    let terminal_path = session_dir.join("terminal.json");
    debug!("cmd_create_video_dialog_session - Saving terminal history to: {:?}", terminal_path);
    FileUtils::write_file(&terminal_path, initial_terminal_content.as_bytes()).map_err(|e| format!("Failed to save terminal history: {:?}", e))?;
    info!("cmd_create_video_dialog_session - Session created: session_id={}, file_count={}", session_id, file_count);
    debug!("cmd_create_video_dialog_session - DONE: session_dir={:?}", session_dir);
    let _ = add_session_to_profile(session_id, chrono::Utc::now().timestamp_millis() as u64);
    Ok(session_dir.to_string_lossy().to_string())
}
/// List all video dialog sessions
///
/// # Returns
/// * `Ok(Vec<serde_json::Value>)` - List of session configurations
/// * `Err(String)` - Error message if listing fails
#[tauri::command]
pub fn cmd_list_video_dialog_sessions() -> Result<Vec<serde_json::Value>, String> {
    debug!("cmd_list_video_dialog_sessions - START");
    let dir = get_video_editing_system_dialog_history_dir();
    if !FileUtils::path_exists(&dir) {
        debug!("cmd_list_video_dialog_sessions - Directory does not exist, returning empty list");
        return Ok(vec![]);
    }
    let pinned_sessions = get_pinned_sessions_from_config()?;
    debug!("cmd_list_video_dialog_sessions - Pinned sessions: {:?}", pinned_sessions);
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
                        // Get session cover thumbnail
                        let cover_path = get_session_cover_path(&session_id);
                        let thumbnail_path = if cover_path.exists() { Some(cover_path.to_string_lossy().to_string()) } else { None };
                        obj.insert("thumbnail".to_string(), serde_json::json!(thumbnail_path));
                    }
                    sessions.push(config);
                }
            }
        }
    }
    // Sort sessions: pinned first, then by updated_at descending
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
    debug!("cmd_list_video_dialog_sessions - DONE: found {} sessions", sessions.len());
    Ok(sessions)
}
/// Load a video session configuration
///
/// # Arguments
/// * `session_id` - The session identifier
///
/// # Returns
/// * `Ok(Option<serde_json::Value>)` - The session configuration if found
/// * `Err(String)` - Error message if loading fails
#[tauri::command]
pub fn cmd_load_video_session_config(session_id: &str) -> Result<Option<serde_json::Value>, String> {
    debug!("cmd_load_video_session_config - START: session_id={}", session_id);
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let config_path = session_dir.join("config.json");
    if !FileUtils::path_exists(&config_path) {
        debug!("cmd_load_video_session_config - Config not found");
        return Ok(None);
    }
    let content = FileUtils::read_file_to_string(&config_path).map_err(|e| format!("Failed to read config: {:?}", e))?;
    let mut config: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {:?}", e))?;
    // Load tracks from metadata if available
    let metadata_path = session_dir.join("workspace").join("metadata.json");
    if FileUtils::path_exists(&metadata_path) {
        debug!("cmd_load_video_session_config - Loading tracks from metadata");
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
    debug!("cmd_load_video_session_config - DONE: session_id={}", session_id);
    Ok(Some(config))
}
/// Update a video session configuration
///
/// # Arguments
/// * `session_id` - The session identifier
/// * `updates` - JSON string of updates to apply
///
/// # Returns
/// * `Ok(())` on successful update
/// * `Err(String)` - Error message if update fails
#[tauri::command]
pub fn cmd_update_video_session_config(session_id: &str, updates: String) -> Result<(), String> {
    debug!("cmd_update_video_session_config - START: session_id={}", session_id);
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let config_path = session_dir.join("config.json");
    if !FileUtils::path_exists(&config_path) {
        error!("cmd_update_video_session_config - Session not found: {}", session_id);
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
    // Update metadata if it exists
    let metadata_path = session_dir.join("workspace").join("metadata.json");
    if FileUtils::path_exists(&metadata_path) {
        debug!("cmd_update_video_session_config - Updating metadata");
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
    debug!("cmd_update_video_session_config - DONE: session_id={}", session_id);
    Ok(())
}
/// Delete a video dialog session
///
/// # Arguments
/// * `session_id` - The session identifier
///
/// # Returns
/// * `Ok(())` on successful deletion
/// * `Err(String)` - Error message if deletion fails
#[tauri::command]
pub fn cmd_delete_video_dialog_session(session_id: &str) -> Result<(), String> {
    debug!("cmd_delete_video_dialog_session - START: session_id={}", session_id);
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    if FileUtils::path_exists(&session_dir) {
        debug!("cmd_delete_video_dialog_session - Removing session directory: {:?}", session_dir);
        FileUtils::remove_dir_all_force(&session_dir).map_err(|e| format!("Failed to delete video session: {:?}", e))?;
        info!("cmd_delete_video_dialog_session - Session deleted: {}", session_id);
    } else {
        warn!("cmd_delete_video_dialog_session - Session directory does not exist");
    }
    // Remove from pinned list if present
    let pinned = get_pinned_sessions_from_config()?;
    if pinned.contains(&session_id.to_string()) {
        debug!("cmd_delete_video_dialog_session - Removing from pinned sessions");
        let _ = cmd_update_pinned_video_sessions(session_id.to_string(), false);
    }
    debug!("cmd_delete_video_dialog_session - DONE");
    Ok(())
}
/// Save video chat content
///
/// # Arguments
/// * `session_id` - The session identifier
/// * `content` - The chat content to save
///
/// # Returns
/// * `Ok(())` on successful save
/// * `Err(String)` - Error message if save fails
#[tauri::command]
pub fn cmd_save_video_chat_content(session_id: &str, content: &str) -> Result<(), String> {
    debug!("cmd_save_video_chat_content - START: session_id={}", session_id);
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let chat_path = session_dir.join("chat.json");
    if !FileUtils::path_exists(&session_dir) {
        debug!("cmd_save_video_chat_content - Creating session directory");
        FileUtils::ensure_dir(&session_dir).map_err(|e| format!("Failed to create video session directory: {:?}", e))?;
    }
    FileUtils::write_file(&chat_path, content.as_bytes()).map_err(|e| format!("Failed to save video chat content: {:?}", e))?;
    // Update config timestamp
    let config_path = session_dir.join("config.json");
    if FileUtils::path_exists(&config_path) {
        let cfg_content = FileUtils::read_file_to_string(&config_path).map_err(|e| format!("Failed to read config: {:?}", e))?;
        let mut config: serde_json::Value = serde_json::from_str(&cfg_content).map_err(|e| format!("Failed to parse config: {:?}", e))?;
        config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
        save_session_config(session_id, &config)?;
    }
    debug!("cmd_save_video_chat_content - DONE");
    Ok(())
}
/// Save video terminal content
///
/// # Arguments
/// * `session_id` - The session identifier
/// * `content` - The terminal content to save
///
/// # Returns
/// * `Ok(())` on successful save
/// * `Err(String)` - Error message if save fails
#[tauri::command]
pub fn cmd_save_video_terminal_content(session_id: &str, content: &str) -> Result<(), String> {
    debug!("cmd_save_video_terminal_content - START: session_id={}", session_id);
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let terminal_path = session_dir.join("terminal.json");
    if !FileUtils::path_exists(&session_dir) {
        debug!("cmd_save_video_terminal_content - Creating session directory");
        FileUtils::ensure_dir(&session_dir).map_err(|e| format!("Failed to create video session directory: {:?}", e))?;
    }
    FileUtils::write_file(&terminal_path, content.as_bytes()).map_err(|e| format!("Failed to save video terminal content: {:?}", e))?;
    debug!("cmd_save_video_terminal_content - DONE");
    Ok(())
}
/// Load video chat content
///
/// # Arguments
/// * `session_id` - The session identifier
///
/// # Returns
/// * `Ok(Option<String>)` - The chat content if found
/// * `Err(String)` - Error message if load fails
#[tauri::command]
pub fn cmd_load_video_chat_content(session_id: &str) -> Result<Option<String>, String> {
    debug!("cmd_load_video_chat_content - START: session_id={}", session_id);
    let dir = get_video_editing_system_dialog_history_dir();
    let chat_path = dir.join(session_id).join("chat.json");
    if FileUtils::path_exists(&chat_path) {
        let content = FileUtils::read_file_to_string(&chat_path).map_err(|e| format!("Failed to read video chat content: {:?}", e))?;
        debug!("cmd_load_video_chat_content - DONE: content loaded");
        Ok(Some(content))
    } else {
        debug!("cmd_load_video_chat_content - DONE: no content found");
        Ok(None)
    }
}
/// Load video terminal content
///
/// # Arguments
/// * `session_id` - The session identifier
///
/// # Returns
/// * `Ok(Option<String>)` - The terminal content if found
/// * `Err(String)` - Error message if load fails
#[tauri::command]
pub fn cmd_load_video_terminal_content(session_id: &str) -> Result<Option<String>, String> {
    debug!("cmd_load_video_terminal_content - START: session_id={}", session_id);
    let dir = get_video_editing_system_dialog_history_dir();
    let terminal_path = dir.join(session_id).join("terminal.json");
    if FileUtils::path_exists(&terminal_path) {
        let content = FileUtils::read_file_to_string(&terminal_path).map_err(|e| format!("Failed to read video terminal content: {:?}", e))?;
        debug!("cmd_load_video_terminal_content - DONE: content loaded");
        Ok(Some(content))
    } else {
        debug!("cmd_load_video_terminal_content - DONE: no content found");
        Ok(None)
    }
}
/// Save video task content
///
/// # Arguments
/// * `session_id` - The session identifier
/// * `content` - The task content to save
///
/// # Returns
/// * `Ok(())` on successful save
/// * `Err(String)` - Error message if save fails
#[tauri::command]
pub fn cmd_save_video_task_content(session_id: &str, content: &str) -> Result<(), String> {
    debug!("cmd_save_video_task_content - START: session_id={}", session_id);
    let dir = get_video_editing_system_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let task_path = session_dir.join("task.json");
    if !FileUtils::path_exists(&session_dir) {
        debug!("cmd_save_video_task_content - Creating session directory");
        FileUtils::ensure_dir(&session_dir).map_err(|e| format!("Failed to create video session directory: {:?}", e))?;
    }
    FileUtils::write_file(&task_path, content.as_bytes()).map_err(|e| format!("Failed to save video task content: {:?}", e))?;
    debug!("cmd_save_video_task_content - DONE");
    Ok(())
}
/// Load video task content
///
/// # Arguments
/// * `session_id` - The session identifier
///
/// # Returns
/// * `Ok(Option<String>)` - The task content if found
/// * `Err(String)` - Error message if load fails
#[tauri::command]
pub fn cmd_load_video_task_content(session_id: &str) -> Result<Option<String>, String> {
    debug!("cmd_load_video_task_content - START: session_id={}", session_id);
    let dir = get_video_editing_system_dialog_history_dir();
    let task_path = dir.join(session_id).join("task.json");
    if FileUtils::path_exists(&task_path) {
        let content = FileUtils::read_file_to_string(&task_path).map_err(|e| format!("Failed to read video task content: {:?}", e))?;
        debug!("cmd_load_video_task_content - DONE: content loaded");
        Ok(Some(content))
    } else {
        debug!("cmd_load_video_task_content - DONE: no content found");
        Ok(None)
    }
}
/// Update pinned video sessions
///
/// # Arguments
/// * `session_id` - The session identifier to pin/unpin
/// * `pinned` - Whether to pin or unpin
///
/// # Returns
/// * `Ok(Vec<String>)` - The updated list of pinned session IDs
/// * `Err(String)` - Error message if update fails
#[tauri::command]
pub fn cmd_update_pinned_video_sessions(session_id: String, pinned: bool) -> Result<Vec<String>, String> {
    debug!("cmd_update_pinned_video_sessions - START: session_id={}, pinned={}", session_id, pinned);
    let mut pinned_sessions = get_pinned_sessions_from_config()?;
    if pinned {
        if !pinned_sessions.contains(&session_id) {
            debug!("cmd_update_pinned_video_sessions - Adding to pinned list");
            pinned_sessions.push(session_id);
        }
    } else {
        debug!("cmd_update_pinned_video_sessions - Removing from pinned list");
        pinned_sessions.retain(|id| id != &session_id);
    }
    save_pinned_sessions_to_config(&pinned_sessions)?;
    info!("cmd_update_pinned_video_sessions - Updated pinned sessions: {:?}", pinned_sessions);
    Ok(pinned_sessions)
}
/// Get pinned video sessions
///
/// # Returns
/// * `Ok(Vec<String>)` - List of pinned session IDs
/// * `Err(String)` - Error message if retrieval fails
#[tauri::command]
pub fn cmd_get_pinned_video_sessions() -> Result<Vec<String>, String> {
    debug!("cmd_get_pinned_video_sessions - START");
    get_pinned_sessions_from_config()
}
/// Request structure for adding a track
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct AddTrackRequest {
    pub session_id: String,
    pub track_type: String,
    pub file_path: Option<String>,
}
/// Request structure for removing a track
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RemoveTrackRequest {
    pub session_id: String,
    pub track_index: usize,
}
/// Get video session tracks
///
/// # Arguments
/// * `session_id` - The session identifier
///
/// # Returns
/// * `Ok(Vec<serde_json::Value>)` - List of tracks
/// * `Err(String)` - Error message if retrieval fails
#[tauri::command]
pub fn cmd_get_video_session_tracks(session_id: &str) -> Result<Vec<serde_json::Value>, String> {
    debug!("cmd_get_video_session_tracks - START: session_id={}", session_id);
    let metadata = load_session_metadata(session_id)?;
    let tracks: Vec<serde_json::Value> =
        metadata.tracks.values().map(|track| serde_json::to_value(track).unwrap_or(serde_json::Value::Null)).collect();
    debug!("cmd_get_video_session_tracks - DONE: found {} tracks", tracks.len());
    Ok(tracks)
}
/// Update video session tracks
///
/// # Arguments
/// * `session_id` - The session identifier
/// * `tracks` - The new tracks data
///
/// # Returns
/// * `Ok(serde_json::Value)` - The updated metadata
/// * `Err(String)` - Error message if update fails
#[tauri::command]
pub fn cmd_update_video_session_tracks(session_id: &str, tracks: serde_json::Value) -> Result<serde_json::Value, String> {
    debug!("cmd_update_video_session_tracks - START: session_id={}", session_id);
    let track_table: TrackTableMap = serde_json::from_value(tracks).map_err(|e| format!("Failed to deserialize tracks: {:?}", e))?;
    save_session_tracks(session_id, &track_table)?;
    let metadata = load_session_metadata(session_id)?;
    let result = serde_json::to_value(&metadata).map_err(|e| format!("Failed to serialize metadata: {:?}", e))?;
    debug!("cmd_update_video_session_tracks - DONE");
    Ok(result)
}
