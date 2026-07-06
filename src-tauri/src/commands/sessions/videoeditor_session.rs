use crate::commands::paths::get_app_root_dir;
use crate::commands::video_editor::material::{insert_material, UploadResult};
use crate::commands::video_editor::track::calculate_max_track_time;
use crate::commands::{
    get_session_lock, get_settings_dir, get_video_dialog_history_dir, load_metadata,
    load_session_config, load_session_metadata, load_session_tracks, save_session_config,
    save_session_metadata, save_session_tracks, update_session_track_stack, AudioTrackBlock,
    ImageTrackBlock, TextTrackBlock, TrackBlock, TrackBlockType, TrackRow, TrackTable,
    VideoTrackBlock,
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
    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read video session config: {}", e))?;
        let config: serde_json::Value =
            serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}));
        Ok(config
            .get("pinned_sessions")
            .and_then(|v| serde_json::from_value(v.clone()).ok())
            .unwrap_or_default())
    } else {
        Ok(vec![])
    }
}

fn save_pinned_sessions_to_config(pinned_sessions: &[String]) -> Result<(), String> {
    let settings_dir = get_settings_dir();
    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    let config_path = get_config_path();
    let config = serde_json::json!({
        "pinned_sessions": pinned_sessions,
    });
    let content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize video session config: {}", e))?;
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to save video session config: {}", e))?;
    Ok(())
}

fn process_video_file(
    session_id: &str,
    source_path: String,
    ffmpeg: &Ffmpeg,
    tracks: &mut TrackTable,
    video_file_path: &mut Option<String>,
    video_info: &mut Option<serde_json::Value>,
) {
    if source_path.is_empty() || !Path::new(&source_path).exists() {
        return;
    }
    match insert_material(session_id.to_string(), source_path.clone(), "video") {
        Ok(upload_result) => {
            let dest_path_str = upload_result.file_path.clone();
            *video_file_path = Some(dest_path_str.clone());
            if let Ok(info_json) = ffmpeg.get_video_info_json(&dest_path_str) {
                *video_info = Some(info_json);
            }
            if let Ok(metadata) = load_metadata(session_id, "video", &upload_result.id) {
                let track_id = Uuid::new_v4().to_string();
                let track_block_id = Uuid::new_v4().to_string();
                let track_type = TrackBlockType::Video;
                let block = track_type
                    .create_block(
                        &dest_path_str,
                        &metadata,
                        &track_id,
                        &track_block_id,
                        ffmpeg,
                    )
                    .unwrap_or_else(|_| {
                        track_type.create_empty_block(&dest_path_str, &track_id, &track_block_id)
                    });
                let mut blocks: HashMap<String, Box<dyn TrackBlock>> = HashMap::new();
                blocks.insert(track_block_id.clone(), block);
                let track_row = TrackRow {
                    track_id: track_id.clone(),
                    visible: true,
                    locked: false,
                    muted: false,
                    height: None,
                    blocks,
                };
                tracks.insert(track_id, track_row);
            }
        }
        Err(e) => {
            eprintln!("Failed to upload video material: {}", e);
        }
    }
}

fn process_audio_files(
    session_id: &str,
    audio_paths: Vec<String>,
    ffmpeg: &Ffmpeg,
    tracks: &mut TrackTable,
) {
    for audio_path in audio_paths {
        if audio_path.is_empty() || !Path::new(&audio_path).exists() {
            continue;
        }
        match insert_material(session_id.to_string(), audio_path.clone(), "audio") {
            Ok(upload_result) => {
                let dest_path_str = upload_result.file_path.clone();
                if let Ok(metadata) = load_metadata(session_id, "audio", &upload_result.id) {
                    let track_id = Uuid::new_v4().to_string();
                    let track_block_id = Uuid::new_v4().to_string();
                    let track_type = TrackBlockType::Audio;
                    let block = track_type
                        .create_block(
                            &dest_path_str,
                            &metadata,
                            &track_id,
                            &track_block_id,
                            ffmpeg,
                        )
                        .unwrap_or_else(|_| {
                            track_type.create_empty_block(
                                &dest_path_str,
                                &track_id,
                                &track_block_id,
                            )
                        });
                    let mut blocks: HashMap<String, Box<dyn TrackBlock>> = HashMap::new();
                    blocks.insert(track_block_id.clone(), block);
                    let track_row = TrackRow {
                        track_id: track_id.clone(),
                        visible: true,
                        locked: false,
                        muted: false,
                        height: None,
                        blocks,
                    };
                    tracks.insert(track_id, track_row);
                }
            }
            Err(e) => {
                eprintln!("Failed to upload audio material: {}", e);
            }
        }
    }
}

fn process_gif_file(
    session_id: &str,
    source_path: String,
    tracks: &mut TrackTable,
    video_file_path: &mut Option<String>,
    video_info: &mut Option<serde_json::Value>,
) {
    if source_path.is_empty() || !Path::new(&source_path).exists() {
        return;
    }
    match insert_material(session_id.to_string(), source_path.clone(), "video") {
        Ok(upload_result) => {
            let dest_path_str = upload_result.file_path.clone();
            *video_file_path = Some(dest_path_str.clone());
            let duration = upload_result.duration;
            let width = upload_result.width;
            let height = upload_result.height;
            let fps = upload_result.fps;
            let codec = upload_result.codec.clone();
            let track_id = Uuid::new_v4().to_string();
            let track_block_id = Uuid::new_v4().to_string();
            let track_type = TrackBlockType::Video;
            let block = track_type.create_empty_block(&dest_path_str, &track_id, &track_block_id);
            if let Some(mut video_block) = block.as_any().downcast_ref::<VideoTrackBlock>().cloned()
            {
                video_block.width = width;
                video_block.height = height;
                video_block.duration = duration;
                video_block.fps = fps;
                video_block.codec = codec.clone();
                video_block.file_size = Some(upload_result.file_size);
                video_block.container_format = Some("gif".to_string());

                let boxed_block: Box<dyn TrackBlock> = Box::new(video_block);
                let mut blocks: HashMap<String, Box<dyn TrackBlock>> = HashMap::new();
                blocks.insert(track_block_id.clone(), boxed_block);

                let track_row = TrackRow {
                    track_id: track_id.clone(),
                    visible: true,
                    locked: false,
                    muted: false,
                    height: None,
                    blocks,
                };
                tracks.insert(track_id, track_row);
            } else {
                let video_block = VideoTrackBlock {
                    r#type: TrackBlockType::Video,
                    width,
                    height,
                    duration,
                    fps,
                    bitrate: 0,
                    codec: codec.clone(),
                    resource_path: dest_path_str.clone(),
                    aspect_ratio: None,
                    pixel_format: None,
                    color_space: None,
                    bit_depth: None,
                    frame_count: None,
                    keyframe_count: None,
                    has_audio: false,
                    audio_codec: None,
                    audio_sample_rate: None,
                    audio_channels: None,
                    audio_bitrate: None,
                    file_size: Some(upload_result.file_size),
                    container_format: Some("gif".to_string()),
                    creation_time: None,
                    tags: None,
                    video_stream_index: None,
                    audio_stream_index: None,
                    track_start_time: 0.0,
                    track_end_time: duration,
                    internal_start_time: 0.0,
                    internal_end_time: duration,
                    track_id: track_id.clone(),
                    track_block_id: track_block_id.clone(),
                    visible: true,
                    resource_frames_path: None,
                    resource_rgb_frames_path: None,
                };
                *video_info = Some(serde_json::json!({
                    "duration": duration,
                    "width": width,
                    "height": height,
                    "fps": fps,
                    "codec": codec,
                    "bitrate": 0,
                    "format": "gif",
                }));

                let mut blocks: HashMap<String, Box<dyn TrackBlock>> = HashMap::new();
                let boxed_block: Box<dyn TrackBlock> = Box::new(video_block);
                blocks.insert(track_block_id.clone(), boxed_block);

                let track_row = TrackRow {
                    track_id: track_id.clone(),
                    visible: true,
                    locked: false,
                    muted: false,
                    height: None,
                    blocks,
                };
                tracks.insert(track_id, track_row);
            }
        }
        Err(e) => {
            eprintln!("Failed to upload GIF material: {}", e);
        }
    }
}

fn process_image_files(
    session_id: &str,
    image_paths: Vec<String>,
    ffmpeg: &Ffmpeg,
    tracks: &mut TrackTable,
) {
    for image_path in image_paths {
        if image_path.is_empty() || !Path::new(&image_path).exists() {
            continue;
        }
        match insert_material(session_id.to_string(), image_path.clone(), "image") {
            Ok(upload_result) => {
                let dest_path_str = upload_result.file_path.clone();
                if let Ok(metadata) = load_metadata(session_id, "image", &upload_result.id) {
                    let track_id = Uuid::new_v4().to_string();
                    let track_block_id = Uuid::new_v4().to_string();
                    let block_type = TrackBlockType::Image;
                    let block = block_type
                        .create_block(
                            &dest_path_str,
                            &metadata,
                            &track_id,
                            &track_block_id,
                            ffmpeg,
                        )
                        .unwrap_or_else(|_| {
                            block_type.create_empty_block(
                                &dest_path_str,
                                &track_id,
                                &track_block_id,
                            )
                        });
                    let mut blocks: HashMap<String, Box<dyn TrackBlock>> = HashMap::new();
                    blocks.insert(track_block_id.clone(), block);
                    let track_row = TrackRow {
                        track_id: track_id.clone(),
                        visible: true,
                        locked: false,
                        muted: false,
                        height: None,
                        blocks,
                    };
                    tracks.insert(track_id, track_row);
                }
            }
            Err(e) => {
                eprintln!("Failed to upload image material: {}", e);
            }
        }
    }
}

fn process_text_files(session_id: &str, text_paths: Vec<String>, tracks: &mut TrackTable) {
    for text_path in text_paths {
        if text_path.is_empty() || !Path::new(&text_path).exists() {
            continue;
        }
        match insert_material(session_id.to_string(), text_path.clone(), "text") {
            Ok(upload_result) => {
                let dest_path_str = upload_result.file_path.clone();

                if let Ok(metadata) = load_metadata(session_id, "text", &upload_result.id) {
                    let track_id = Uuid::new_v4().to_string();
                    let track_block_id = Uuid::new_v4().to_string();
                    let track_type = TrackBlockType::Text;

                    let block = track_type
                        .create_block(
                            &dest_path_str,
                            &metadata,
                            &track_id,
                            &track_block_id,
                            &Ffmpeg::new(),
                        )
                        .unwrap_or_else(|_| {
                            track_type.create_empty_block(
                                &dest_path_str,
                                &track_id,
                                &track_block_id,
                            )
                        });

                    let mut blocks: HashMap<String, Box<dyn TrackBlock>> = HashMap::new();
                    blocks.insert(track_block_id.clone(), block);

                    let track_row = TrackRow {
                        track_id: track_id.clone(),
                        visible: true,
                        locked: false,
                        muted: false,
                        height: None,
                        blocks,
                    };
                    tracks.insert(track_id, track_row);
                }
            }
            Err(e) => {
                eprintln!("Failed to upload text material: {}", e);
            }
        }
    }
}

// ==================== Tauri Commands ====================

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
    use crate::commands::{extract_material_info_from_path, get_material_cache_dir};
    let lock = get_session_lock(session_id);
    let _guard = lock.lock().unwrap();
    let dir = get_video_dialog_history_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create video dialog history directory: {}", e))?;
    }
    let session_dir = dir.join(session_id);
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create video session directory: {}", e))?;
    }
    let workspace_dir = session_dir.join("workspace");
    if !workspace_dir.exists() {
        fs::create_dir_all(&workspace_dir)
            .map_err(|e| format!("Failed to create workspace directory: {}", e))?;
    }
    let material_dir = workspace_dir.join("material");
    if !material_dir.exists() {
        fs::create_dir_all(&material_dir)
            .map_err(|e| format!("Failed to create material directory: {}", e))?;
    }
    for sub_dir in ["videos", "audios", "images", "texts"] {
        let sub_path = material_dir.join(sub_dir);
        if !sub_path.exists() {
            fs::create_dir_all(&sub_path)
                .map_err(|e| format!("Failed to create {} directory: {}", sub_dir, e))?;
        }
    }
    let mut video_file_path: Option<String> = None;
    let mut video_info: Option<serde_json::Value> = None;
    let mut tracks: TrackTable = HashMap::new();
    let ffmpeg = Ffmpeg::new();

    if let Some(source_path) = video_source_path {
        process_video_file(
            session_id,
            source_path,
            &ffmpeg,
            &mut tracks,
            &mut video_file_path,
            &mut video_info,
        );
    }

    if let Some(audio_paths) = audio_source_paths {
        process_audio_files(session_id, audio_paths, &ffmpeg, &mut tracks);
    }

    if let Some(image_paths) = image_source_paths {
        let mut non_gif_paths = Vec::new();
        let mut gif_paths = Vec::new();
        for path in image_paths {
            if path.to_lowercase().ends_with(".gif") {
                gif_paths.push(path);
            } else {
                non_gif_paths.push(path);
            }
        }
        if !non_gif_paths.is_empty() {
            process_image_files(session_id, non_gif_paths, &ffmpeg, &mut tracks);
        }
        for gif_path in gif_paths {
            process_gif_file(
                session_id,
                gif_path,
                &mut tracks,
                &mut video_file_path,
                &mut video_info,
            );
        }
    }

    if let Some(text_paths) = text_source_paths {
        process_text_files(session_id, text_paths, &mut tracks);
    }

    let track_stack: Vec<String> = tracks.keys().cloned().collect();
    let max_track_time = calculate_max_track_time(&tracks);

    let metadata_path = workspace_dir.join("metadata.json");
    let metadata = serde_json::json!({
        "session_id": session_id,
        "title": title,
        "description": description,
        "created_at": Local::now().to_rfc3339(),
        "updated_at": Local::now().to_rfc3339(),
        "workflow_mode": workflow_mode.clone().unwrap_or_else(|| "ReAct".to_string()),
        "video_url": video_url.clone().unwrap_or_default(),
        "video_title": video_title.clone().unwrap_or_default(),
        "video_file": video_file_path,
        "video_info": video_info,
        "tracks": tracks,
        "track_stack": track_stack,
        "max_track_time": max_track_time,
        "files": serde_json::json!([]),
        "exported_videos": serde_json::json!([]),
    });

    let metadata_content = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    fs::write(&metadata_path, metadata_content)
        .map_err(|e| format!("Failed to save metadata.json: {}", e))?;

    let config = serde_json::json!({
        "session_id": session_id,
        "title": title,
        "description": description,
        "created_at": Local::now().to_rfc3339(),
        "updated_at": Local::now().to_rfc3339(),
        "workflow_mode": workflow_mode.unwrap_or_else(|| "ReAct".to_string()),
        "video_url": video_url.unwrap_or_default(),
        "video_title": video_title.unwrap_or_default(),
        "workspace_path": workspace_dir.to_string_lossy().to_string(),
        "metadata_path": metadata_path.to_string_lossy().to_string(),
        "video_file": video_file_path,
    });
    let config_path = session_dir.join("config.json");
    let config_content = serde_json::to_string_pretty(&config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&config_path, config_content).map_err(|e| format!("Failed to save config: {}", e))?;

    let chat_path = session_dir.join("chat.json");
    fs::write(&chat_path, initial_chat_content)
        .map_err(|e| format!("Failed to save chat history: {}", e))?;

    let terminal_path = session_dir.join("terminal.json");
    fs::write(&terminal_path, initial_terminal_content)
        .map_err(|e| format!("Failed to save terminal history: {}", e))?;

    Ok(session_dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn cmd_list_video_dialog_sessions() -> Result<Vec<serde_json::Value>, String> {
    let dir = get_video_dialog_history_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }
    let pinned_sessions = get_pinned_sessions_from_config()?;
    let mut sessions = vec![];
    for entry in
        fs::read_dir(dir).map_err(|e| format!("Failed to read video dialog history dir: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_dir() {
            let config_path = path.join("config.json");
            if config_path.exists() {
                let content = fs::read_to_string(&config_path)
                    .map_err(|e| format!("Failed to read config: {}", e))?;
                if let Ok(mut config) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(obj) = config.as_object_mut() {
                        let session_id = path
                            .file_name()
                            .unwrap_or_default()
                            .to_string_lossy()
                            .to_string();
                        obj.insert(
                            "path".to_string(),
                            serde_json::json!(path.to_string_lossy()),
                        );
                        obj.insert("session_id".to_string(), serde_json::json!(session_id));
                        obj.insert(
                            "is_pinned".to_string(),
                            serde_json::json!(pinned_sessions.contains(&session_id)),
                        );
                    }
                    sessions.push(config);
                }
            }
        }
    }
    sessions.sort_by(|a, b| {
        let a_pinned = a
            .get("is_pinned")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        let b_pinned = b
            .get("is_pinned")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
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
pub fn cmd_load_video_session_config(
    session_id: &str,
) -> Result<Option<serde_json::Value>, String> {
    let dir = get_video_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let config_path = session_dir.join("config.json");
    if !config_path.exists() {
        return Ok(None);
    }
    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;
    let mut config: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))?;
    let metadata_path = session_dir.join("workspace").join("metadata.json");
    if metadata_path.exists() {
        let metadata_content = fs::read_to_string(&metadata_path)
            .map_err(|e| format!("Failed to read metadata: {}", e))?;
        if let Ok(metadata) = serde_json::from_str::<serde_json::Value>(&metadata_content) {
            if let Some(tracks) = metadata.get("tracks").cloned() {
                config["tracks"] = tracks;
            }
            if let Some(video_file) = metadata.get("video_file").cloned() {
                if config.get("video_file").is_none() || config["video_file"].is_null() {
                    config["video_file"] = video_file;
                }
            }
            if let Some(video_info) = metadata.get("video_info").cloned() {
                if config.get("video_info").is_none() || config["video_info"].is_null() {
                    config["video_info"] = video_info;
                }
            }
            if let Some(title) = metadata.get("title").cloned() {
                if config.get("title").is_none() || config["title"].is_null() {
                    config["title"] = title;
                }
            }
            if let Some(description) = metadata.get("description").cloned() {
                if config.get("description").is_none() || config["description"].is_null() {
                    config["description"] = description;
                }
            }
        }
    }
    Ok(Some(config))
}

#[tauri::command]
pub fn cmd_update_video_session_config(session_id: &str, updates: String) -> Result<(), String> {
    let lock = get_session_lock(session_id);
    let _guard = lock.lock().unwrap();

    let dir = get_video_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let config_path = session_dir.join("config.json");
    if !config_path.exists() {
        return Err(format!("Video session {} not found", session_id));
    }
    let content =
        fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;
    let mut config: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))?;
    let updates_json: serde_json::Value =
        serde_json::from_str(&updates).map_err(|e| format!("Failed to parse updates: {}", e))?;
    if let Some(obj) = updates_json.as_object() {
        for (key, value) in obj {
            config[key] = value.clone();
        }
    }
    config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
    save_session_config(session_id, &config)?;

    let metadata_path = session_dir.join("workspace").join("metadata.json");
    if metadata_path.exists() {
        let metadata_content = fs::read_to_string(&metadata_path)
            .map_err(|e| format!("Failed to read metadata: {}", e))?;
        let mut metadata: serde_json::Value = serde_json::from_str(&metadata_content)
            .map_err(|e| format!("Failed to parse metadata: {}", e))?;
        if let Some(obj) = updates_json.as_object() {
            for (key, value) in obj {
                metadata[key] = value.clone();
            }
        }
        metadata["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
        save_session_metadata(session_id, &metadata)?;
    }
    Ok(())
}

#[tauri::command]
pub fn cmd_delete_video_dialog_session(session_id: &str) -> Result<(), String> {
    let lock = get_session_lock(session_id);
    let _guard = lock.lock().unwrap();

    let dir = get_video_dialog_history_dir();
    let session_dir = dir.join(session_id);
    if session_dir.exists() {
        fs::remove_dir_all(&session_dir)
            .map_err(|e| format!("Failed to delete video session: {}", e))?;
    }
    let pinned = get_pinned_sessions_from_config()?;
    if pinned.contains(&session_id.to_string()) {
        let _ = cmd_update_pinned_video_sessions(session_id.to_string(), false);
    }
    Ok(())
}

#[tauri::command]
pub fn cmd_save_video_chat_content(session_id: &str, content: &str) -> Result<(), String> {
    let lock = get_session_lock(session_id);
    let _guard = lock.lock().unwrap();

    let dir = get_video_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let chat_path = session_dir.join("chat.json");
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create video session directory: {}", e))?;
    }
    fs::write(&chat_path, content)
        .map_err(|e| format!("Failed to save video chat content: {}", e))?;
    let config_path = session_dir.join("config.json");
    if config_path.exists() {
        let cfg_content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        let mut config: serde_json::Value = serde_json::from_str(&cfg_content)
            .map_err(|e| format!("Failed to parse config: {}", e))?;
        config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
        save_session_config(session_id, &config)?;
    }
    Ok(())
}

#[tauri::command]
pub fn cmd_save_video_terminal_content(session_id: &str, content: &str) -> Result<(), String> {
    let lock = get_session_lock(session_id);
    let _guard = lock.lock().unwrap();

    let dir = get_video_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let terminal_path = session_dir.join("terminal.json");
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create video session directory: {}", e))?;
    }
    fs::write(&terminal_path, content)
        .map_err(|e| format!("Failed to save video terminal content: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn cmd_load_video_chat_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_video_dialog_history_dir();
    let chat_path = dir.join(session_id).join("chat.json");
    if chat_path.exists() {
        let content = fs::read_to_string(&chat_path)
            .map_err(|e| format!("Failed to read video chat content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn cmd_load_video_terminal_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_video_dialog_history_dir();
    let terminal_path = dir.join(session_id).join("terminal.json");
    if terminal_path.exists() {
        let content = fs::read_to_string(&terminal_path)
            .map_err(|e| format!("Failed to read video terminal content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn cmd_save_video_task_content(session_id: &str, content: &str) -> Result<(), String> {
    let lock = get_session_lock(session_id);
    let _guard = lock.lock().unwrap();

    let dir = get_video_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let task_path = session_dir.join("task.json");
    if !session_dir.exists() {
        fs::create_dir_all(&session_dir)
            .map_err(|e| format!("Failed to create video session directory: {}", e))?;
    }
    fs::write(&task_path, content)
        .map_err(|e| format!("Failed to save video task content: {}", e))?;
    Ok(())
}

#[tauri::command]
pub fn cmd_load_video_task_content(session_id: &str) -> Result<Option<String>, String> {
    let dir = get_video_dialog_history_dir();
    let task_path = dir.join(session_id).join("task.json");
    if task_path.exists() {
        let content = fs::read_to_string(&task_path)
            .map_err(|e| format!("Failed to read video task content: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub fn cmd_update_pinned_video_sessions(
    session_id: String,
    pinned: bool,
) -> Result<Vec<String>, String> {
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
pub fn cmd_add_video_track(request: AddTrackRequest) -> Result<serde_json::Value, String> {
    use crate::commands::{extract_material_info_from_path, get_material_cache_dir, load_metadata};
    use std::collections::HashMap;
    let lock = get_session_lock(&request.session_id);
    let _guard = lock.lock().unwrap();
    let dir = get_video_dialog_history_dir();
    let session_dir = dir.join(&request.session_id);
    let workspace_dir = session_dir.join("workspace");
    let metadata_path = workspace_dir.join("metadata.json");
    if !metadata_path.exists() {
        return Err(format!(
            "Session metadata not found: {}",
            request.session_id
        ));
    }
    let content = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    let mut metadata: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse metadata: {}", e))?;
    let mut tracks: TrackTable = match metadata.get("tracks") {
        Some(t) => serde_json::from_value(t.clone())
            .map_err(|e| format!("Failed to parse tracks: {}", e))?,
        None => HashMap::new(),
    };
    let ffmpeg = Ffmpeg::new();
    let track_type_str = request.track_type.as_str();
    let track_id = Uuid::new_v4().to_string();
    match track_type_str {
        "video" => {
            let default_path = workspace_dir
                .join("material")
                .join("videos")
                .join("empty_video.mp4");
            let video_path = if let Some(ref path) = request.file_path {
                if Path::new(path).exists() {
                    path.clone()
                } else {
                    default_path.to_string_lossy().to_string()
                }
            } else {
                default_path.to_string_lossy().to_string()
            };
            let track_type = TrackBlockType::Video;
            let track_block_id = Uuid::new_v4().to_string();
            let block = if let Ok(info_json) = ffmpeg.get_video_info_json(&video_path) {
                let mut block =
                    track_type.create_empty_block(&video_path, &track_id, &track_block_id);
                if let Some(video_block) = block.as_any_mut().downcast_mut::<VideoTrackBlock>() {
                    video_block.width = info_json["width"].as_u64().unwrap_or(1920) as u32;
                    video_block.height = info_json["height"].as_u64().unwrap_or(1080) as u32;
                    video_block.duration = info_json["duration"].as_f64().unwrap_or(5.0);
                    video_block.fps = info_json["fps"].as_f64().unwrap_or(30.0);
                    video_block.bitrate = info_json["bitrate"].as_u64().unwrap_or(0);
                    video_block.codec =
                        info_json["codec"].as_str().unwrap_or("unknown").to_string();
                    video_block.track_end_time = video_block.duration;
                    video_block.internal_end_time = video_block.duration;
                }
                block
            } else {
                track_type.create_empty_block(&video_path, &track_id, &track_block_id)
            };
            let mut blocks: HashMap<String, Box<dyn TrackBlock>> = HashMap::new();
            blocks.insert(track_block_id.clone(), block);
            let track_row = TrackRow {
                track_id: track_id.clone(),
                visible: true,
                locked: false,
                muted: false,
                height: None,
                blocks,
            };
            tracks.insert(track_id.clone(), track_row);
        }
        "audio" => {
            let default_path = workspace_dir
                .join("material")
                .join("audios")
                .join("empty_audio.mp3");
            let audio_path = if let Some(ref path) = request.file_path {
                if Path::new(path).exists() {
                    path.clone()
                } else {
                    default_path.to_string_lossy().to_string()
                }
            } else {
                default_path.to_string_lossy().to_string()
            };
            let track_type = TrackBlockType::Audio;
            let track_block_id = Uuid::new_v4().to_string();
            let mut block = track_type.create_empty_block(&audio_path, &track_id, &track_block_id);
            if let Ok(meta) = ffmpeg.get_metadata(&audio_path) {
                if let Some(audio_block) = block.as_any_mut().downcast_mut::<AudioTrackBlock>() {
                    audio_block.duration = meta.duration;
                    audio_block.track_end_time = meta.duration;
                    audio_block.internal_end_time = meta.duration;
                }
            }
            let mut blocks: HashMap<String, Box<dyn TrackBlock>> = HashMap::new();
            blocks.insert(track_block_id.clone(), block);
            let track_row = TrackRow {
                track_id: track_id.clone(),
                visible: true,
                locked: false,
                muted: false,
                height: None,
                blocks,
            };
            tracks.insert(track_id.clone(), track_row);
        }
        "image" => {
            let default_path = workspace_dir
                .join("material")
                .join("images")
                .join("empty_image.png");
            let image_path = if let Some(ref path) = request.file_path {
                if Path::new(path).exists() {
                    path.clone()
                } else {
                    default_path.to_string_lossy().to_string()
                }
            } else {
                default_path.to_string_lossy().to_string()
            };
            let track_type = TrackBlockType::Image;
            let track_block_id = Uuid::new_v4().to_string();
            let mut block = track_type.create_empty_block(&image_path, &track_id, &track_block_id);
            if let Ok(info_json) = ffmpeg.get_video_info_json(&image_path) {
                if let Some(image_block) = block.as_any_mut().downcast_mut::<ImageTrackBlock>() {
                    image_block.width = info_json["width"].as_u64().unwrap_or(1920) as u32;
                    image_block.height = info_json["height"].as_u64().unwrap_or(1080) as u32;
                }
            }
            let mut blocks: HashMap<String, Box<dyn TrackBlock>> = HashMap::new();
            blocks.insert(track_block_id.clone(), block);
            let track_row = TrackRow {
                track_id: track_id.clone(),
                visible: true,
                locked: false,
                muted: false,
                height: None,
                blocks,
            };
            tracks.insert(track_id.clone(), track_row);
        }
        "text" => {
            let default_path = workspace_dir
                .join("material")
                .join("texts")
                .join("empty_text.txt");
            let text_path = if let Some(ref path) = request.file_path {
                if Path::new(path).exists() {
                    path.clone()
                } else {
                    default_path.to_string_lossy().to_string()
                }
            } else {
                default_path.to_string_lossy().to_string()
            };
            let track_type = TrackBlockType::Text;
            let track_block_id = Uuid::new_v4().to_string();
            let mut block = track_type.create_empty_block(&text_path, &track_id, &track_block_id);
            if let Ok(content) = FileUtils::read_text_file(Path::new(&text_path)) {
                if let Some(text_block) = block.as_any_mut().downcast_mut::<TextTrackBlock>() {
                    let line_count = content.lines().count() as u64;
                    text_block.line_count = Some(line_count);
                    text_block.content = if content.len() > 200 {
                        format!("{}...", &content[..200])
                    } else {
                        content
                    };
                }
            }
            let mut blocks: HashMap<String, Box<dyn TrackBlock>> = HashMap::new();
            blocks.insert(track_block_id.clone(), block);
            let track_row = TrackRow {
                track_id: track_id.clone(),
                visible: true,
                locked: false,
                muted: false,
                height: None,
                blocks,
            };
            tracks.insert(track_id.clone(), track_row);
        }
        _ => {
            return Err(format!("Invalid track type: {}", request.track_type));
        }
    }
    metadata["tracks"] =
        serde_json::to_value(&tracks).map_err(|e| format!("Failed to serialize tracks: {}", e))?;
    metadata["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
    let new_content = serde_json::to_string_pretty(&metadata)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;
    fs::write(&metadata_path, new_content)
        .map_err(|e| format!("Failed to save metadata: {}", e))?;
    let config_path = session_dir.join("config.json");
    if config_path.exists() {
        let config_content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        let mut config: serde_json::Value = serde_json::from_str(&config_content)
            .map_err(|e| format!("Failed to parse config: {}", e))?;
        config["tracks"] = serde_json::to_value(&tracks)
            .map_err(|e| format!("Failed to serialize tracks for config: {}", e))?;
        config["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
        let new_config_content = serde_json::to_string_pretty(&config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;
        fs::write(&config_path, new_config_content)
            .map_err(|e| format!("Failed to save config: {}", e))?;
    }
    Ok(metadata)
}

#[tauri::command]
pub fn cmd_remove_video_track(request: RemoveTrackRequest) -> Result<serde_json::Value, String> {
    use std::collections::HashMap;
    let lock = get_session_lock(&request.session_id);
    let _guard = lock.lock().unwrap();
    let dir = get_video_dialog_history_dir();
    let session_dir = dir.join(&request.session_id);
    let workspace_dir = session_dir.join("workspace");
    let metadata_path = workspace_dir.join("metadata.json");
    if !metadata_path.exists() {
        return Err(format!(
            "Session metadata not found: {}",
            request.session_id
        ));
    }
    let content = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    let mut metadata: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse metadata: {}", e))?;
    let mut tracks: TrackTable = match metadata.get("tracks") {
        Some(t) => serde_json::from_value(t.clone())
            .map_err(|e| format!("Failed to parse tracks: {}", e))?,
        None => HashMap::new(),
    };
    let track_keys: Vec<String> = tracks.keys().cloned().collect();
    if request.track_index >= track_keys.len() {
        return Err(format!("Track index out of range: {}", request.track_index));
    }
    let track_id_to_remove = &track_keys[request.track_index];
    tracks.remove(track_id_to_remove);
    let track_stack: Vec<String> = tracks.keys().cloned().collect();
    metadata["tracks"] =
        serde_json::to_value(&tracks).map_err(|e| format!("Failed to serialize tracks: {}", e))?;
    metadata["track_stack"] = serde_json::to_value(&track_stack)
        .map_err(|e| format!("Failed to serialize track_stack: {}", e))?;
    metadata["updated_at"] = serde_json::json!(Local::now().to_rfc3339());
    save_session_metadata(&request.session_id, &metadata)?;
    Ok(metadata)
}

#[tauri::command]
pub fn cmd_get_video_session_tracks(session_id: &str) -> Result<Vec<serde_json::Value>, String> {
    let dir = get_video_dialog_history_dir();
    let session_dir = dir.join(session_id);
    let metadata_path = session_dir.join("workspace").join("metadata.json");
    if !metadata_path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&metadata_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    let metadata: serde_json::Value =
        serde_json::from_str(&content).map_err(|e| format!("Failed to parse metadata: {}", e))?;
    let tracks = metadata
        .get("tracks")
        .and_then(|t| t.as_object())
        .map(|obj| obj.values().cloned().collect::<Vec<serde_json::Value>>())
        .unwrap_or_default();
    Ok(tracks)
}

#[tauri::command]
pub fn cmd_update_video_session_tracks(
    session_id: &str,
    tracks: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let lock = get_session_lock(session_id);
    let _guard = lock.lock().unwrap();
    let track_table: TrackTable = serde_json::from_value(tracks)
        .map_err(|e| format!("Failed to deserialize tracks: {}", e))?;
    save_session_tracks(session_id, &track_table)?;
    let metadata = load_session_metadata(session_id)?;
    Ok(metadata)
}
