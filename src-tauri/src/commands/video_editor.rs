use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::command;

use crate::commons::{
    ComposeRequest, CompressOptions, ExportOptions, Ffmpeg, GifOptions, KeyframeAnimation, KeyframeTrackRequest, ThumbnailOptions, TrackItem, VideoMetadata, WatermarkOptions, WatermarkPosition,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipInfo {
    pub path: String,
    pub start: f64,
    pub duration: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportRequest {
    pub clips: Vec<ClipInfo>,
    pub options: ExportOptions,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoOperationResult {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComposeTracksRequest {
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub output_path: String,
    pub tracks: Vec<TrackItem>,
    pub background_color: Option<String>,
    pub audio_bitrate: Option<String>,
    pub video_bitrate: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverlayRequest {
    pub background_path: String,
    pub overlay_path: String,
    pub output_path: String,
    pub x: f64,
    pub y: f64,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub opacity: f64,
    pub start: f64,
    pub duration: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddTextRequest {
    pub input_path: String,
    pub output_path: String,
    pub text: String,
    pub x: f64,
    pub y: f64,
    pub font_size: u32,
    pub font_color: String,
    pub font_family: String,
    pub start: f64,
    pub duration: f64,
    pub background_color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MixAudioRequest {
    pub inputs: Vec<String>,
    pub output_path: String,
    pub volumes: Option<Vec<f32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplyKeyframesRequest {
    pub input_path: String,
    pub output_path: String,
    pub animations: Vec<KeyframeAnimation>,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OverlayKeyframesRequest {
    pub background_path: String,
    pub overlay_path: String,
    pub output_path: String,
    pub animations: Vec<KeyframeAnimation>,
    pub width: u32,
    pub height: u32,
    pub start: f64,
    pub duration: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlideTransitionRequest {
    pub clip_a: String,
    pub clip_b: String,
    pub output_path: String,
    pub duration: f64,
    pub direction: String, // "left", "right", "up", "down"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitScreenRequest {
    pub inputs: Vec<String>,
    pub output_path: String,
    pub layout: String, // "2x2", "3x1", etc.
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackgroundMusicRequest {
    pub video_path: String,
    pub audio_path: String,
    pub output_path: String,
    pub video_volume: f32,
    pub bgm_volume: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChangeSpeedRequest {
    pub input_path: String,
    pub output_path: String,
    pub speed: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FadeRequest {
    pub input_path: String,
    pub output_path: String,
    pub fade_in: f64,
    pub fade_out: f64,
}

#[command]
pub async fn cmd_video_export(
    clips: Vec<ClipInfo>,
    options: ExportOptions,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    if clips.is_empty() {
        return Ok(VideoOperationResult {
            success: false,
            message: "No clips provided".to_string(),
        });
    }

    if clips.len() == 1 {
        let clip = &clips[0];
        let temp_input = clip.path.clone();
        let start = clip.start;
        let duration = clip.duration;

        if start == 0.0 && duration <= 0.0 {
            match ffmpeg.export_video(&temp_input, &options) {
                Ok(_) => Ok(VideoOperationResult {
                    success: true,
                    message: "Video exported successfully".to_string(),
                }),
                Err(e) => Ok(VideoOperationResult {
                    success: false,
                    message: format!("Export failed: {}", e),
                }),
            }
        } else {
            let temp_dir = std::env::temp_dir();
            let temp_output = temp_dir.join(format!(
                "trimmed_{}",
                Path::new(&options.output_path)
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
            ));

            let temp_output_str = temp_output.to_string_lossy().to_string();

            match ffmpeg.trim_video(&temp_input, &temp_output_str, start, duration) {
                Ok(_) => {
                    let export_opts = ExportOptions {
                        output_path: options.output_path.clone(),
                        width: options.width,
                        height: options.height,
                        bitrate: options.bitrate.clone(),
                        fps: options.fps,
                        format: options.format.clone(),
                    };

                    let result = ffmpeg.export_video(&temp_output_str, &export_opts);
                    let _ = fs::remove_file(&temp_output_str);
                    match result {
                        Ok(_) => Ok(VideoOperationResult {
                            success: true,
                            message: "Video exported successfully".to_string(),
                        }),
                        Err(e) => Ok(VideoOperationResult {
                            success: false,
                            message: format!("Export failed: {}", e),
                        }),
                    }
                }
                Err(e) => Ok(VideoOperationResult {
                    success: false,
                    message: format!("Failed to trim video: {}", e),
                }),
            }
        }
    } else {
        let temp_dir = std::env::temp_dir();
        let temp_concat = temp_dir.join("concat_output.mp4");
        let temp_concat_str = temp_concat.to_string_lossy().to_string();

        let mut temp_files = Vec::new();
        for (idx, clip) in clips.iter().enumerate() {
            let temp_file = temp_dir.join(format!("clip_{}_{}.mp4", idx, std::process::id()));
            let temp_file_str = temp_file.to_string_lossy().to_string();

            if clip.start > 0.0 || clip.duration > 0.0 {
                match ffmpeg.trim_video(&clip.path, &temp_file_str, clip.start, clip.duration) {
                    Ok(_) => {
                        temp_files.push(temp_file_str);
                    }
                    Err(e) => {
                        for f in &temp_files {
                            let _ = fs::remove_file(f);
                        }
                        return Ok(VideoOperationResult {
                            success: false,
                            message: format!("Failed to trim clip {}: {}", idx, e),
                        });
                    }
                }
            } else {
                temp_files.push(clip.path.clone());
            }
        }

        let concat_result = ffmpeg.concat_videos(&temp_files, &temp_concat_str);

        for f in &temp_files {
            if f != &temp_concat_str {
                let _ = fs::remove_file(f);
            }
        }

        match concat_result {
            Ok(_) => {
                let export_opts = ExportOptions {
                    output_path: options.output_path.clone(),
                    width: options.width,
                    height: options.height,
                    bitrate: options.bitrate.clone(),
                    fps: options.fps,
                    format: options.format.clone(),
                };

                let result = ffmpeg.export_video(&temp_concat_str, &export_opts);
                let _ = fs::remove_file(&temp_concat_str);

                match result {
                    Ok(_) => Ok(VideoOperationResult {
                        success: true,
                        message: "Video exported successfully".to_string(),
                    }),
                    Err(e) => Ok(VideoOperationResult {
                        success: false,
                        message: format!("Export failed: {}", e),
                    }),
                }
            }
            Err(e) => {
                let _ = fs::remove_file(&temp_concat_str);
                Ok(VideoOperationResult {
                    success: false,
                    message: format!("Failed to concatenate videos: {}", e),
                })
            }
        }
    }
}

#[command]
pub async fn cmd_video_metadata(path: String) -> Result<Option<VideoMetadata>, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&path).exists() {
        return Ok(None);
    }

    match ffmpeg.get_metadata(&path) {
        Ok(metadata) => Ok(Some(metadata)),
        Err(e) => {
            eprintln!("Failed to get video metadata: {}", e);
            Ok(None)
        }
    }
}

#[command]
pub async fn cmd_video_thumbnail(
    path: String,
    options: ThumbnailOptions,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Video file not found".to_string(),
        });
    }

    match ffmpeg.generate_thumbnail(&path, &options) {
        Ok(output_path) => Ok(VideoOperationResult {
            success: true,
            message: format!("Thumbnail generated: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to generate thumbnail: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_trim(
    input_path: String,
    output_path: String,
    start: f64,
    duration: f64,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&input_path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Input video file not found".to_string(),
        });
    }

    match ffmpeg.trim_video(&input_path, &output_path, start, duration) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: format!("Video trimmed successfully: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to trim video: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_concat(
    inputs: Vec<String>,
    output_path: String,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    if inputs.is_empty() {
        return Ok(VideoOperationResult {
            success: false,
            message: "No input videos provided".to_string(),
        });
    }

    for input in &inputs {
        if !Path::new(input).exists() {
            return Ok(VideoOperationResult {
                success: false,
                message: format!("Input video not found: {}", input),
            });
        }
    }

    match ffmpeg.concat_videos(&inputs, &output_path) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: format!("Videos concatenated successfully: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to concatenate videos: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_extract_audio(
    input_path: String,
    output_path: String,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&input_path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Input video file not found".to_string(),
        });
    }

    let ext = Path::new(&output_path).extension().and_then(|e| e.to_str());
    if !matches!(
        ext,
        Some("mp3") | Some("m4a") | Some("aac") | Some("wav") | Some("flac") | Some("ogg")
    ) {
        return Ok(VideoOperationResult {
            success: false,
            message: "Invalid audio output format. Supported: mp3, m4a, aac, wav, flac, ogg"
                .to_string(),
        });
    }

    match ffmpeg.extract_audio(&input_path, &output_path) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: format!("Audio extracted successfully: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to extract audio: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_filter(
    input_path: String,
    output_path: String,
    filter_type: String,
    intensity: f32,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&input_path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Input video file not found".to_string(),
        });
    }

    let valid_filters = vec![
        "grayscale",
        "blackwhite",
        "sepia",
        "vintage",
        "warm",
        "cool",
        "blur",
        "sharpen",
        "nostalgic",
        "brightness",
        "contrast",
        "saturation",
    ];

    if !valid_filters.contains(&filter_type.as_str()) {
        return Ok(VideoOperationResult {
            success: false,
            message: format!(
                "Invalid filter type. Supported: {}",
                valid_filters.join(", ")
            ),
        });
    }

    if intensity < 0.0 || intensity > 1.0 {
        return Ok(VideoOperationResult {
            success: false,
            message: "Intensity must be between 0 and 1".to_string(),
        });
    }

    match ffmpeg.apply_filter(&input_path, &output_path, &filter_type, intensity) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: format!("Filter applied successfully: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to apply filter: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_duration(path: String) -> Result<f64, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&path).exists() {
        return Ok(0.0);
    }

    match ffmpeg.get_duration(&path) {
        Ok(duration) => Ok(duration),
        Err(e) => {
            eprintln!("Failed to get video duration: {}", e);
            Ok(0.0)
        }
    }
}

#[command]
pub async fn cmd_video_validate(path: String) -> Result<bool, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&path).exists() {
        return Ok(false);
    }

    Ok(ffmpeg.validate_video(&path))
}

#[command]
pub async fn cmd_video_compose_tracks(
    request: ComposeTracksRequest,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    let compose_request = ComposeRequest {
        width: request.width,
        height: request.height,
        fps: request.fps,
        output_path: request.output_path,
        tracks: request.tracks,
        background_color: request.background_color,
        audio_bitrate: request.audio_bitrate,
        video_bitrate: request.video_bitrate,
    };

    match ffmpeg.compose_tracks(&compose_request) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Tracks composed successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to compose tracks: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_overlay(request: OverlayRequest) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    match ffmpeg.overlay_media(
        &request.background_path,
        &request.overlay_path,
        &request.output_path,
        request.x,
        request.y,
        request.width,
        request.height,
        request.opacity,
        request.start,
        request.duration,
    ) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Overlay applied successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to apply overlay: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_add_text(request: AddTextRequest) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    match ffmpeg.add_text_overlay(
        &request.input_path,
        &request.output_path,
        &request.text,
        request.x,
        request.y,
        request.font_size,
        &request.font_color,
        &request.font_family,
        request.start,
        request.duration,
        request.background_color.as_deref(),
    ) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Text overlay added successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to add text overlay: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_add_emoji(
    input_path: String,
    output_path: String,
    emoji: String,
    x: f64,
    y: f64,
    size: u32,
    start: f64,
    duration: f64,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    match ffmpeg.add_emoji_overlay(
        &input_path,
        &output_path,
        &emoji,
        x,
        y,
        size,
        start,
        duration,
    ) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Emoji overlay added successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to add emoji overlay: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_mix_audio(request: MixAudioRequest) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    match ffmpeg.mix_audio(&request.inputs, &request.output_path, request.volumes) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Audio mixed successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to mix audio: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_apply_keyframes(
    request: ApplyKeyframesRequest,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    match ffmpeg.apply_keyframe_animation(
        &request.input_path,
        &request.output_path,
        &request.animations,
        request.width,
        request.height,
    ) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Keyframe animation applied successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to apply keyframe animation: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_overlay_keyframes(
    request: OverlayKeyframesRequest,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    match ffmpeg.apply_overlay_keyframe_animation(
        &request.background_path,
        &request.overlay_path,
        &request.output_path,
        &request.animations,
        request.width,
        request.height,
        request.start,
        request.duration,
    ) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Overlay keyframe animation applied successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to apply overlay keyframe animation: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_slide_transition(
    request: SlideTransitionRequest,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    match ffmpeg.create_slide_transition(
        &request.clip_a,
        &request.clip_b,
        &request.output_path,
        request.duration,
        &request.direction,
    ) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Slide transition created successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to create slide transition: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_create_split_screen(
    request: SplitScreenRequest,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    match ffmpeg.create_split_screen(&request.inputs, &request.output_path, &request.layout) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Split screen created successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to create split screen: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_add_background_music(
    request: BackgroundMusicRequest,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    match ffmpeg.add_background_music(
        &request.video_path,
        &request.audio_path,
        &request.output_path,
        request.video_volume,
        request.bgm_volume,
    ) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Background music added successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to add background music: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_change_speed(
    request: ChangeSpeedRequest,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    match ffmpeg.change_speed(&request.input_path, &request.output_path, request.speed) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Speed changed successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to change speed: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_add_fade(request: FadeRequest) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    match ffmpeg.add_fade(
        &request.input_path,
        &request.output_path,
        request.fade_in,
        request.fade_out,
    ) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: "Fade effect added successfully".to_string(),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to add fade: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_rotate(
    input_path: String,
    output_path: String,
    degrees: u32,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&input_path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Input video file not found".to_string(),
        });
    }

    match ffmpeg.rotate_video(&input_path, &output_path, degrees) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: format!("Video rotated successfully: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to rotate video: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_flip(
    input_path: String,
    output_path: String,
    direction: String,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&input_path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Input video file not found".to_string(),
        });
    }

    match ffmpeg.flip_video(&input_path, &output_path, &direction) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: format!("Video flipped successfully: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to flip video: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_adjust_volume(
    input_path: String,
    output_path: String,
    volume: f32,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&input_path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Input video file not found".to_string(),
        });
    }

    match ffmpeg.adjust_volume(&input_path, &output_path, volume) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: format!("Volume adjusted successfully: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to adjust volume: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_add_watermark(
    input_path: String,
    watermark_path: String,
    output_path: String,
    position: String,
    margin_x: u32,
    margin_y: u32,
    opacity: f64,
    scale: Option<f64>,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&input_path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Input video file not found".to_string(),
        });
    }
    if !Path::new(&watermark_path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Watermark file not found".to_string(),
        });
    }
    let pos = match position.as_str() {
        "topleft" => WatermarkPosition::TopLeft,
        "topright" => WatermarkPosition::TopRight,
        "bottomleft" => WatermarkPosition::BottomLeft,
        "bottomright" => WatermarkPosition::BottomRight,
        "center" => WatermarkPosition::Center,
        _ => WatermarkPosition::TopLeft,
    };
    let options = WatermarkOptions {
        position: pos,
        margin_x,
        margin_y,
        opacity,
        scale,
    };
    match ffmpeg.add_image_watermark(&input_path, &watermark_path, &output_path, &options) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: format!("Watermark added successfully: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to add watermark: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_generate_gif(
    input_path: String,
    output_path: String,
    fps: f64,
    width: Option<u32>,
    height: Option<u32>,
    start: f64,
    duration: f64,
    quality: u32,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();
    if !Path::new(&input_path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Input video file not found".to_string(),
        });
    }
    let options = GifOptions {
        fps,
        width,
        height,
        start,
        duration,
        quality,
    };
    match ffmpeg.generate_gif(&input_path, &output_path, &options) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: format!("GIF generated successfully: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to generate GIF: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_compress(
    input_path: String,
    output_path: String,
    crf: u32,
    preset: String,
    video_bitrate: Option<String>,
    audio_bitrate: Option<String>,
    scale_width: Option<u32>,
    scale_height: Option<u32>,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();
    if !Path::new(&input_path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Input video file not found".to_string(),
        });
    }
    let scale = match (scale_width, scale_height) {
        (Some(w), Some(h)) => Some((w, h)),
        _ => None,
    };
    let options = CompressOptions {
        crf,
        preset,
        video_bitrate,
        audio_bitrate,
        scale,
    };
    match ffmpeg.compress_video(&input_path, &output_path, &options) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: format!("Video compressed successfully: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to compress video: {}", e),
        }),
    }
}

#[command]
pub async fn cmd_video_audio_fade(
    input_path: String,
    output_path: String,
    fade_in: f64,
    fade_out: f64,
) -> Result<VideoOperationResult, String> {
    let ffmpeg = Ffmpeg::new();

    if !Path::new(&input_path).exists() {
        return Ok(VideoOperationResult {
            success: false,
            message: "Input video file not found".to_string(),
        });
    }

    match ffmpeg.audio_fade(&input_path, &output_path, fade_in, fade_out) {
        Ok(_) => Ok(VideoOperationResult {
            success: true,
            message: format!("Audio fade added successfully: {}", output_path),
        }),
        Err(e) => Ok(VideoOperationResult {
            success: false,
            message: format!("Failed to add audio fade: {}", e),
        }),
    }
}
