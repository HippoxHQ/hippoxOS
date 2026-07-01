use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;

use super::core::Ffmpeg;

/// Export options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub output_path: String,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub bitrate: Option<String>,
    pub fps: Option<f64>,
    pub format: Option<String>,
}

impl Ffmpeg {
    /// Export video with custom options
    pub fn export_video(&self, input_path: &str, options: &ExportOptions) -> Result<(), String> {
        let input = Path::new(input_path);
        if !input.exists() {
            return Err(format!("Input file not found: {}", input_path));
        }

        if let Some(parent) = Path::new(&options.output_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }

        let mut args = vec!["-i".to_string(), input_path.to_string()];

        match options.format.as_deref() {
            Some("webm") => {
                args.push("-c:v".to_string());
                args.push("libvpx-vp9".to_string());
                if let Some(bitrate) = &options.bitrate {
                    args.push("-b:v".to_string());
                    args.push(bitrate.clone());
                } else {
                    args.push("-b:v".to_string());
                    args.push("2M".to_string());
                }
            }
            Some("mov") | Some("quicktime") => {
                args.push("-c:v".to_string());
                args.push("libx264".to_string());
                if let Some(bitrate) = &options.bitrate {
                    args.push("-b:v".to_string());
                    args.push(bitrate.clone());
                }
                args.push("-pix_fmt".to_string());
                args.push("yuv420p".to_string());
            }
            _ => {
                args.push("-c:v".to_string());
                args.push("libx264".to_string());
                if let Some(bitrate) = &options.bitrate {
                    args.push("-b:v".to_string());
                    args.push(bitrate.clone());
                } else {
                    args.push("-b:v".to_string());
                    args.push("2M".to_string());
                }
                args.push("-pix_fmt".to_string());
                args.push("yuv420p".to_string());
                args.push("-preset".to_string());
                args.push("medium".to_string());
            }
        }

        args.push("-c:a".to_string());
        match options.format.as_deref() {
            Some("webm") => {
                args.push("libopus".to_string());
                args.push("-b:a".to_string());
                args.push("96k".to_string());
            }
            _ => {
                args.push("aac".to_string());
                args.push("-b:a".to_string());
                args.push("128k".to_string());
            }
        }

        if let (Some(width), Some(height)) = (options.width, options.height) {
            args.push("-vf".to_string());
            args.push(format!("scale={}:{}", width, height));
        }

        if let Some(fps) = options.fps {
            args.push("-r".to_string());
            args.push(format!("{}", fps));
        }

        args.push("-y".to_string());
        args.push(options.output_path.clone());

        let output = Command::new("ffmpeg")
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to export video: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        Ok(())
    }

    /// Create split screen (multiple videos side by side)
    pub fn create_split_screen(
        &self,
        inputs: &[String],
        output_path: &str,
        layout: &str,
    ) -> Result<(), String> {
        if inputs.is_empty() {
            return Err("No inputs provided".to_string());
        }

        for input in inputs {
            if !Path::new(input).exists() {
                return Err(format!("Input file not found: {}", input));
            }
        }

        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }

        let mut args = Vec::new();
        for input in inputs {
            args.push("-i".to_string());
            args.push(input.to_string());
        }

        let mut filter_parts = Vec::new();
        for idx in 0..inputs.len() {
            let label = format!("v{}", idx);
            filter_parts.push(format!("[{}:v]setpts=PTS-STARTPTS,scale=iw/2:ih/2[{}]", idx, label));
        }

        let video_labels: Vec<String> = (0..inputs.len()).map(|i| format!("[v{}]", i)).collect();

        let final_label = match layout {
            "2x2" => {
                filter_parts.push(format!(
                    "{}[v0][v1]hstack=inputs=2[top];{}[v2][v3]hstack=inputs=2[bottom];[top][bottom]vstack=inputs=2[out]",
                    video_labels.join(""),
                    video_labels[2..].join("")
                ));
                "[out]".to_string()
            }
            _ if layout.contains('x') => {
                let parts: Vec<&str> = layout.split('x').collect();
                if parts.len() == 2 {
                    let cols: usize = parts[0].parse().unwrap_or(2);
                    let rows: usize = parts[1].parse().unwrap_or(1);
                    let total = cols * rows;
                    let mut row_parts = Vec::new();
                    for r in 0..rows {
                        let start = r * cols;
                        let end = (start + cols).min(total);
                        let row_labels: Vec<String> = (start..end).map(|i| format!("[v{}]", i)).collect();
                        row_parts.push(row_labels.join(""));
                    }
                    let filter_str: Vec<String> = row_parts.iter()
                        .map(|r| format!("{}hstack=inputs={}", r, r.len()))
                        .collect();
                    filter_parts.push(format!(
                        "{};{}[vstack_out]",
                        video_labels.join(""),
                        filter_str.join("")
                    ));
                    "[vstack_out]".to_string()
                } else {
                    format!("{}hstack=inputs={}[out]", video_labels.join(""), inputs.len())
                }
            }
            _ => {
                format!("{}hstack=inputs={}[out]", video_labels.join(""), inputs.len())
            }
        };

        if !final_label.is_empty() {
            filter_parts.push(final_label);
        }

        let filter = filter_parts.join(";");

        args.push("-filter_complex".to_string());
        args.push(filter);
        args.push("-map".to_string());
        args.push("[out]".to_string());
        args.push("-c:v".to_string());
        args.push("libx264".to_string());
        args.push("-preset".to_string());
        args.push("medium".to_string());
        args.push("-crf".to_string());
        args.push("23".to_string());
        args.push("-y".to_string());
        args.push(output_path.to_string());

        let output = Command::new("ffmpeg")
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to create split screen: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        Ok(())
    }

    /// Mix multiple audio tracks
    pub fn mix_audio(
        &self,
        inputs: &[String],
        output_path: &str,
        volumes: Option<Vec<f32>>,
    ) -> Result<(), String> {
        if inputs.is_empty() {
            return Err("No audio inputs provided".to_string());
        }

        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }

        let mut args = Vec::new();
        for input in inputs {
            if !Path::new(input).exists() {
                return Err(format!("Audio file not found: {}", input));
            }
            args.push("-i".to_string());
            args.push(input.to_string());
        }

        let mut filter_parts = Vec::new();
        let mut audio_labels = Vec::new();

        for (idx, input) in inputs.iter().enumerate() {
            let volume = volumes.as_ref().and_then(|v| v.get(idx)).unwrap_or(&1.0);
            let label = format!("a{}", idx);
            filter_parts.push(format!("[{}:a]volume={}[{}_adj]", idx, volume, label));
            audio_labels.push(format!("[{}_adj]", label));
        }

        let filter = format!(
            "{};{}amix=inputs={}:duration=longest[aout]",
            filter_parts.join(";"),
            audio_labels.join(""),
            inputs.len()
        );

        args.push("-filter_complex".to_string());
        args.push(filter);
        args.push("-map".to_string());
        args.push("[aout]".to_string());
        args.push("-c:a".to_string());
        args.push("aac".to_string());
        args.push("-b:a".to_string());
        args.push("192k".to_string());
        args.push("-y".to_string());
        args.push(output_path.to_string());

        let output = Command::new("ffmpeg")
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to mix audio: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        Ok(())
    }
}