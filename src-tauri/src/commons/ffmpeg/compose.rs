use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

use super::core::Ffmpeg;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackItem {
    pub source: String,
    pub track_type: String,
    pub start: f64,
    pub duration: f64,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub opacity: Option<f64>,
    pub z_index: Option<u32>,
    pub text: Option<String>,
    pub font_size: Option<u32>,
    pub font_color: Option<String>,
    pub font_family: Option<String>,
    pub background_color: Option<String>,
    pub volume: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComposeRequest {
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub output_path: String,
    pub tracks: Vec<TrackItem>,
    pub background_color: Option<String>,
    pub audio_bitrate: Option<String>,
    pub video_bitrate: Option<String>,
}

impl Ffmpeg {
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
        let video_tracks: Vec<&TrackItem> = request
            .tracks
            .iter()
            .filter(|t| t.track_type == "video")
            .collect();
        let image_tracks: Vec<&TrackItem> = request
            .tracks
            .iter()
            .filter(|t| t.track_type == "image")
            .collect();
        let emoji_tracks: Vec<&TrackItem> = request
            .tracks
            .iter()
            .filter(|t| t.track_type == "emoji")
            .collect();
        let text_tracks: Vec<&TrackItem> = request
            .tracks
            .iter()
            .filter(|t| t.track_type == "text")
            .collect();
        let audio_tracks: Vec<&TrackItem> = request
            .tracks
            .iter()
            .filter(|t| t.track_type == "audio")
            .collect();
        let mut filter_parts = Vec::new();
        let mut inputs = Vec::new();
        let mut input_index = 0;
        let mut current_output = String::new();
        let total_duration = request
            .tracks
            .iter()
            .map(|t| t.start + t.duration)
            .fold(0.0, f64::max);
        if video_tracks.is_empty()
            && image_tracks.is_empty()
            && text_tracks.is_empty()
            && emoji_tracks.is_empty()
        {
            let bg_color = request.background_color.as_deref().unwrap_or("black");
            inputs.push(format!(
                "-f lavfi -i color=c={}:s={}x{}:r={}:d={}",
                bg_color, request.width, request.height, request.fps, total_duration
            ));
            current_output = "[0:v]".to_string();
        }
        for track in &video_tracks {
            let idx = input_index;
            input_index += 1;
            inputs.push(format!("-i {}", track.source));
            let label = format!("v{}", idx);
            filter_parts.push(format!(
            "[{}:v]setpts=PTS-STARTPTS,scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2[{}_scaled]",
            idx, request.width, request.height, request.width, request.height, label
        ));
            current_output = format!("[{}_scaled]", label);
        }
        if !video_tracks.is_empty() {
            let last_video_idx = video_tracks.len() - 1;
            current_output = format!("[v{}_scaled]", last_video_idx);
        }
        for track in &image_tracks {
            let idx = input_index;
            input_index += 1;
            inputs.push(format!("-i {}", track.source));
            let w = track.width.unwrap_or(100.0) as u32;
            let h = track.height.unwrap_or(100.0) as u32;
            let x = track.x.unwrap_or(0.0);
            let y = track.y.unwrap_or(0.0);
            let opacity = track.opacity.unwrap_or(1.0);
            let label = format!("i{}", idx);
            let current_input = if current_output.is_empty() {
                format!("[0:v]")
            } else {
                current_output.clone()
            };
            filter_parts.push(format!(
            "[{}:v]setpts=PTS-STARTPTS,scale={}:{},format=rgba,colorchannelmixer=aa={}[{}_scaled]",
            idx, w, h, opacity, label
        ));
            let out_label = format!("o{}", idx);
            filter_parts.push(format!(
                "{}[{}_scaled]overlay={}:{}[{}]",
                current_input, label, x, y, out_label
            ));
            current_output = format!("[{}]", out_label);
        }
        for track in &emoji_tracks {
            let idx = input_index;
            input_index += 1;
            let text = track.text.as_deref().unwrap_or("😊");
            let font_size = track.font_size.unwrap_or(60);
            let color = track.font_color.as_deref().unwrap_or("#FFFFFF");
            let x = track.x.unwrap_or(0.0);
            let y = track.y.unwrap_or(0.0);
            let font_family = track.font_family.as_deref().unwrap_or("Apple Color Emoji");
            let current_input = if current_output.is_empty() {
                format!("[0:v]")
            } else {
                current_output.clone()
            };
            let out_label = format!("e{}", idx);
            filter_parts.push(format!(
            "{}drawtext=text='{}':fontsize={}:fontcolor={}:fontfile={}:x={}:y={}:enable='between(t,{},{})'[{}]",
            current_input, text, font_size, color, font_family, x, y,
            track.start, track.start + track.duration, out_label
        ));
            current_output = format!("[{}]", out_label);
        }
        for (idx, track) in text_tracks.iter().enumerate() {
            let text = track.text.as_deref().unwrap_or("");
            let font_size = track.font_size.unwrap_or(24);
            let color = track.font_color.as_deref().unwrap_or("#FFFFFF");
            let font_family = track.font_family.as_deref().unwrap_or("sans-serif");
            let x = track.x.unwrap_or(10.0);
            let y = track.y.unwrap_or(10.0);
            let current_input = if current_output.is_empty() {
                let bg_color = request.background_color.as_deref().unwrap_or("black");
                inputs.push(format!(
                    "-f lavfi -i color=c={}:s={}x{}:r={}:d={}",
                    bg_color, request.width, request.height, request.fps, total_duration
                ));
                format!("[0:v]")
            } else {
                current_output.clone()
            };
            let mut drawtext = format!(
            "drawtext=text='{}':fontsize={}:fontcolor={}:fontfile={}:x={}:y={}:enable='between(t,{},{})'",
            text.replace("'", "'\\''"), font_size, color, font_family, x, y,
            track.start, track.start + track.duration
        );
            if let Some(bg) = &track.background_color {
                drawtext.push_str(&format!(":box=1:boxcolor={}:boxborderw=5", bg));
            }
            let out_label = format!("t{}", idx);
            filter_parts.push(format!("{}{}[{}]", current_input, drawtext, out_label));
            current_output = format!("[{}]", out_label);
        }
        let mut audio_filter = String::new();
        if !audio_tracks.is_empty() {
            let mut audio_inputs_str = Vec::new();
            let mut audio_labels = Vec::new();
            for (idx, track) in audio_tracks.iter().enumerate() {
                let label = format!("a{}", idx);
                inputs.push(format!("-i {}", track.source));
                let volume = track.volume.unwrap_or(0.8);
                audio_inputs_str.push(format!("[{}:a]volume={}[{}_adj]", idx, volume, label));
                audio_labels.push(format!("[{}_adj]", label));
            }
            audio_filter = format!(
                "{};{}amix=inputs={}:duration=longest[aout]",
                audio_inputs_str.join(";"),
                audio_labels.join(""),
                audio_tracks.len()
            );
        }
        let video_output = if current_output.is_empty() {
            let bg_color = request.background_color.as_deref().unwrap_or("black");
            inputs.push(format!(
                "-f lavfi -i color=c={}:s={}x{}:r={}:d={}",
                bg_color, request.width, request.height, request.fps, total_duration
            ));
            "[0:v]".to_string()
        } else {
            current_output
        };
        let mut filter_graph = filter_parts.join(";");
        if !audio_filter.is_empty() {
            if !filter_graph.is_empty() {
                filter_graph.push(';');
            }
            filter_graph.push_str(&audio_filter);
        }
        let mut args = Vec::new();
        for input in inputs {
            let parts: Vec<&str> = input.split_whitespace().collect();
            if parts.len() >= 2 && parts[0] == "-i" {
                args.push("-i".to_string());
                args.push(parts[1].to_string());
            } else if parts.len() >= 4 && parts[0] == "-f" {
                args.push("-f".to_string());
                args.push(parts[1].to_string());
                args.push("-i".to_string());
                args.push(parts[3].to_string());
            }
        }
        if !filter_graph.is_empty() {
            args.push("-filter_complex".to_string());
            args.push(filter_graph);
        }
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
            format!(
                "scale={}:{},format=rgba,colorchannelmixer=aa={}",
                w, h, opacity
            )
        } else if let Some(w) = width {
            format!(
                "scale={}:-1,format=rgba,colorchannelmixer=aa={}",
                w, opacity
            )
        } else if let Some(h) = height {
            format!(
                "scale=-1:{},format=rgba,colorchannelmixer=aa={}",
                h, opacity
            )
        } else {
            format!("format=rgba,colorchannelmixer=aa={}", opacity)
        };

        let args = vec![
            "-i".to_string(),
            background.to_string(),
            "-i".to_string(),
            overlay.to_string(),
            "-filter_complex".to_string(),
            format!(
                "[1:v]{}[ov];[0:v][ov]overlay={}:{}:enable='between(t,{},{})'",
                scale_filter,
                x,
                y,
                start,
                start + duration
            ),
            "-c:a".to_string(),
            "copy".to_string(),
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
