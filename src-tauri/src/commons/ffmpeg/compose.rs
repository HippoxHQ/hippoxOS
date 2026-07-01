use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

use super::core::Ffmpeg;

/// Track item for multi-track composition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackItem {
    /// Path to media file (video/audio/image) or text content
    pub source: String,
    /// Track type: video, audio, image, text, emoji
    pub track_type: String,
    /// Start time in seconds
    pub start: f64,
    /// Duration in seconds
    pub duration: f64,
    /// X position (for overlay)
    pub x: Option<f64>,
    /// Y position (for overlay)
    pub y: Option<f64>,
    /// Width (for scaling overlay)
    pub width: Option<f64>,
    /// Height (for scaling overlay)
    pub height: Option<f64>,
    /// Opacity (0.0 - 1.0)
    pub opacity: Option<f64>,
    /// Z-index (layer order, higher = on top)
    pub z_index: Option<u32>,
    /// Text content (for text/emoji tracks)
    pub text: Option<String>,
    /// Font size (for text tracks)
    pub font_size: Option<u32>,
    /// Font color (for text tracks, hex)
    pub font_color: Option<String>,
    /// Font family (for text tracks)
    pub font_family: Option<String>,
    /// Background color (for text tracks)
    pub background_color: Option<String>,
    /// Audio volume (0.0 - 1.0)
    pub volume: Option<f32>,
}

/// Composition request for multi-track export
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComposeRequest {
    /// Canvas width
    pub width: u32,
    /// Canvas height
    pub height: u32,
    /// Frame rate
    pub fps: f64,
    /// Output path
    pub output_path: String,
    /// Track items
    pub tracks: Vec<TrackItem>,
    /// Background color (hex, e.g. "#000000")
    pub background_color: Option<String>,
    /// Audio bitrate
    pub audio_bitrate: Option<String>,
    /// Video bitrate
    pub video_bitrate: Option<String>,
}

impl Ffmpeg {
    /// Compose multiple tracks (video, audio, image, text, emoji) into a single video
    pub fn compose_tracks(&self, request: &ComposeRequest) -> Result<(), String> {
        if request.tracks.is_empty() {
            return Err("No tracks provided".to_string());
        }

        if let Some(parent) = Path::new(&request.output_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }

        let video_tracks: Vec<&TrackItem> = request.tracks.iter()
            .filter(|t| t.track_type == "video")
            .collect();

        let image_tracks: Vec<&TrackItem> = request.tracks.iter()
            .filter(|t| t.track_type == "image" || t.track_type == "emoji")
            .collect();

        let text_tracks: Vec<&TrackItem> = request.tracks.iter()
            .filter(|t| t.track_type == "text")
            .collect();

        let audio_tracks: Vec<&TrackItem> = request.tracks.iter()
            .filter(|t| t.track_type == "audio")
            .collect();

        let mut filter_parts = Vec::new();
        let mut inputs = Vec::new();
        let mut output_labels = Vec::new();
        let mut audio_inputs = Vec::new();

        // 1. Video tracks
        for (idx, track) in video_tracks.iter().enumerate() {
            let label = format!("v{}", idx);
            inputs.push(format!("-i {}", track.source));
            filter_parts.push(format!(
                "[{}:v]setpts=PTS-STARTPTS,scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2[{}_base]",
                label, request.width, request.height, request.width, request.height, label
            ));
            output_labels.push(format!("[{}_base]", label));
        }

        // 2. Image/Emoji tracks
        for (idx, track) in image_tracks.iter().enumerate() {
            let label = format!("i{}", idx);
            let x = track.x.unwrap_or(0.0);
            let y = track.y.unwrap_or(0.0);
            let opacity = track.opacity.unwrap_or(1.0);

            if track.track_type == "emoji" {
                let font_size = track.font_size.unwrap_or(60);
                let text = track.text.as_deref().unwrap_or("😊");
                let color = track.font_color.as_deref().unwrap_or("#FFFFFF");

                filter_parts.push(format!(
                    "[{}]drawtext=text='{}':fontsize={}:fontcolor={}:x={}:y={}:enable='between(t,{},{})'[e{}_out]",
                    output_labels.last().unwrap_or(&"[0:v]".to_string()),
                    text, font_size, color, x, y,
                    track.start, track.start + track.duration,
                    idx
                ));

                let last_idx = output_labels.len() - 1;
                output_labels[last_idx] = format!("[e{}_out]", idx);
            } else {
                inputs.push(format!("-i {}", track.source));
                filter_parts.push(format!(
                    "[{}:v]setpts=PTS-STARTPTS,scale={}:{},format=rgba,colorchannelmixer=aa={}[i{}_scaled]",
                    label,
                    track.width.unwrap_or(100.0) as u32,
                    track.height.unwrap_or(100.0) as u32,
                    opacity,
                    idx
                ));

                let current_input = if output_labels.is_empty() {
                    format!("[{}:v]", video_tracks.first().map(|_| "0").unwrap_or("0"))
                } else {
                    output_labels.last().unwrap().clone()
                };

                filter_parts.push(format!(
                    "{}[i{}_scaled]overlay={}:{}[o{}]",
                    current_input, idx, x, y, idx
                ));

                output_labels.push(format!("[o{}]", idx));
            }
        }

        // 3. Text tracks
        for (idx, track) in text_tracks.iter().enumerate() {
            let text = track.text.as_deref().unwrap_or("");
            let font_size = track.font_size.unwrap_or(24);
            let font_color = track.font_color.as_deref().unwrap_or("#FFFFFF");
            let font_family = track.font_family.as_deref().unwrap_or("sans-serif");
            let bg_color = track.background_color.as_deref();
            let x = track.x.unwrap_or(10.0);
            let y = track.y.unwrap_or(10.0);

            let mut drawtext_filter = format!(
                "drawtext=text='{}':fontsize={}:fontcolor={}:fontfile={}:x={}:y={}:enable='between(t,{},{})'",
                text.replace("'", "'\\''"),
                font_size,
                font_color,
                font_family,
                x, y,
                track.start,
                track.start + track.duration
            );

            if let Some(bg) = bg_color {
                drawtext_filter.push_str(&format!(":box=1:boxcolor={}:boxborderw=5", bg));
            }

            let current_input = if output_labels.is_empty() {
                if let Some(first_video) = video_tracks.first() {
                    format!("[0:v]")
                } else {
                    let bg_color = request.background_color.as_deref().unwrap_or("black");
                    filter_parts.push(format!(
                        "color=c={}:s={}x{}:r={}:d={}[bg]",
                        bg_color, request.width, request.height, request.fps,
                        text_tracks.iter().map(|t| t.start + t.duration).fold(0.0, f64::max)
                    ));
                    output_labels.push("[bg]".to_string());
                    "[bg]".to_string()
                }
            } else {
                output_labels.last().unwrap().clone()
            };

            filter_parts.push(format!(
                "{}{}[t{}_out]",
                current_input, drawtext_filter, idx
            ));

            output_labels.push(format!("[t{}_out]", idx));
        }

        // 4. Audio mixing
        let mut audio_filter = String::new();
        if !audio_tracks.is_empty() {
            let mut audio_inputs_str = Vec::new();
            for (idx, track) in audio_tracks.iter().enumerate() {
                let label = format!("a{}", idx);
                inputs.push(format!("-i {}", track.source));
                let volume = track.volume.unwrap_or(0.8);
                audio_inputs_str.push(format!("[{}:a]volume={}[a{}_adj]", label, volume, idx));
                audio_inputs.push(format!("[a{}_adj]", idx));
            }

            audio_filter = format!(
                "{};{}amix=inputs={}:duration=longest[aout]",
                audio_inputs_str.join(";"),
                audio_inputs.join(""),
                audio_tracks.len()
            );
        }

        // 5. Build final filter graph
        let video_output = output_labels.last().cloned().unwrap_or_else(|| "[0:v]".to_string());
        let mut filter_graph = filter_parts.join(";");

        if !audio_filter.is_empty() {
            filter_graph.push_str(";");
            filter_graph.push_str(&audio_filter);
        }

        // 6. Build FFmpeg command
        let mut args = Vec::new();

        for input in inputs {
            let parts: Vec<&str> = input.split_whitespace().collect();
            if parts.len() >= 2 {
                args.push("-i".to_string());
                args.push(parts[1].to_string());
            }
        }

        if video_tracks.is_empty() && image_tracks.is_empty() && text_tracks.is_empty() {
            let bg_color = request.background_color.as_deref().unwrap_or("black");
            let duration = request.tracks.iter()
                .map(|t| t.start + t.duration)
                .fold(0.0, f64::max);

            args.push("-f".to_string());
            args.push("lavfi".to_string());
            args.push("-i".to_string());
            args.push(format!(
                "color=c={}:s={}x{}:r={}:d={}",
                bg_color, request.width, request.height, request.fps, duration
            ));
        }

        args.push("-filter_complex".to_string());
        args.push(filter_graph);

        if !audio_tracks.is_empty() {
            args.push("-map".to_string());
            args.push("[aout]".to_string());
        }

        args.push("-map".to_string());
        args.push(video_output);

        args.push("-c:v".to_string());
        args.push("libx264".to_string());
        args.push("-preset".to_string());
        args.push("medium".to_string());
        args.push("-crf".to_string());
        args.push("23".to_string());

        if let Some(bitrate) = &request.video_bitrate {
            args.push("-b:v".to_string());
            args.push(bitrate.clone());
        }

        if !audio_tracks.is_empty() {
            args.push("-c:a".to_string());
            args.push("aac".to_string());
            if let Some(bitrate) = &request.audio_bitrate {
                args.push("-b:a".to_string());
                args.push(bitrate.clone());
            } else {
                args.push("-b:a".to_string());
                args.push("128k".to_string());
            }
        }

        args.push("-pix_fmt".to_string());
        args.push("yuv420p".to_string());
        args.push("-r".to_string());
        args.push(request.fps.to_string());
        args.push("-y".to_string());
        args.push(request.output_path.clone());

        let output = Command::new("ffmpeg")
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to compose tracks: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        Ok(())
    }

    /// Simple overlay: overlay one video/image on top of another
    pub fn overlay_media(
        &self,
        background: &str,
        overlay: &str,
        output_path: &str,
        x: f64,
        y: f64,
        width: Option<f64>,
        height: Option<f64>,
        opacity: f64,
        start: f64,
        duration: f64,
    ) -> Result<(), String> {
        if !Path::new(background).exists() {
            return Err(format!("Background file not found: {}", background));
        }
        if !Path::new(overlay).exists() {
            return Err(format!("Overlay file not found: {}", overlay));
        }

        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }

        let scale_filter = if let (Some(w), Some(h)) = (width, height) {
            format!("scale={}:{},format=rgba,colorchannelmixer=aa={}", w, h, opacity)
        } else if let Some(w) = width {
            format!("scale={}:-1,format=rgba,colorchannelmixer=aa={}", w, opacity)
        } else if let Some(h) = height {
            format!("scale=-1:{},format=rgba,colorchannelmixer=aa={}", h, opacity)
        } else {
            format!("format=rgba,colorchannelmixer=aa={}", opacity)
        };

        let args = vec![
            "-i".to_string(), background.to_string(),
            "-i".to_string(), overlay.to_string(),
            "-filter_complex".to_string(),
            format!(
                "[1:v]{}[ov];[0:v][ov]overlay={}:{}:enable='between(t,{},{})'",
                scale_filter, x, y, start, start + duration
            ),
            "-c:a".to_string(), "copy".to_string(),
            "-y".to_string(),
            output_path.to_string(),
        ];

        let output = Command::new("ffmpeg")
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to overlay media: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        Ok(())
    }
}