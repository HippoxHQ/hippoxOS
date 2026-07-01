use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Clone)]
pub struct Ffmpeg {
    pub bin_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub width: u32,
    pub height: u32,
    pub duration: f64,
    pub fps: f64,
    pub bitrate: u64,
    pub codec: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThumbnailOptions {
    pub time: f64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub output_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameExtractOptions {
    pub output_dir: String,
    pub filename_pattern: Option<String>,
    pub fps: Option<f64>,
    pub start: Option<f64>,
    pub duration: Option<f64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub format: String,
    pub quality: Option<u32>,
}

impl Default for Ffmpeg {
    fn default() -> Self {
        Self::new()
    }
}

impl Ffmpeg {
    pub fn new() -> Self {
        Self {
            bin_path: "ffmpeg".to_string(),
        }
    }

    pub fn with_bin_path(path: &str) -> Self {
        Self {
            bin_path: path.to_string(),
        }
    }

    pub fn is_available(&self) -> bool {
        Command::new(&self.bin_path)
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    pub fn get_version(&self) -> Option<String> {
        let output = Command::new(&self.bin_path).arg("-version").output().ok()?;
        if !output.status.success() {
            return None;
        }
        let version = String::from_utf8_lossy(&output.stdout);
        version.lines().next().map(|s| s.to_string())
    }

    pub fn get_metadata(&self, path: &str) -> Result<VideoMetadata, String> {
        let path = Path::new(path);
        if !path.exists() {
            return Err(format!("File not found: {}", path.display()));
        }

        let output = Command::new("ffprobe")
            .args([
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_streams",
                "-show_format",
                path.to_str().unwrap(),
            ])
            .output()
            .map_err(|e| format!("Failed to run ffprobe: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("ffprobe failed: {}", stderr));
        }

        let json: serde_json::Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

        Self::parse_metadata_json(&json)
    }

    fn parse_metadata_json(json: &serde_json::Value) -> Result<VideoMetadata, String> {
        let streams = json["streams"].as_array().ok_or("No streams found")?;
        let video_stream = streams
            .iter()
            .find(|s| s["codec_type"].as_str() == Some("video"))
            .ok_or("No video stream found")?;

        let width = video_stream["width"].as_u64().unwrap_or(0) as u32;
        let height = video_stream["height"].as_u64().unwrap_or(0) as u32;
        let fps_str = video_stream["r_frame_rate"].as_str().unwrap_or("0/0");
        let fps = parse_fraction(fps_str).unwrap_or(0.0);
        let codec = video_stream["codec_name"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();

        let format = &json["format"];
        let duration = format["duration"]
            .as_str()
            .unwrap_or("0")
            .parse::<f64>()
            .unwrap_or(0.0);
        let bitrate = format["bit_rate"]
            .as_str()
            .unwrap_or("0")
            .parse::<u64>()
            .unwrap_or(0);

        Ok(VideoMetadata {
            width,
            height,
            duration,
            fps,
            bitrate,
            codec,
        })
    }

    pub fn get_duration(&self, path: &str) -> Result<f64, String> {
        let metadata = self.get_metadata(path)?;
        Ok(metadata.duration)
    }

    pub fn validate_video(&self, path: &str) -> bool {
        self.get_metadata(path).is_ok()
    }

    pub fn generate_thumbnail(
        &self,
        input_path: &str,
        options: &ThumbnailOptions,
    ) -> Result<String, String> {
        let input = Path::new(input_path);
        if !input.exists() {
            return Err(format!("Input file not found: {}", input_path));
        }

        let output_path = match &options.output_path {
            Some(p) => PathBuf::from(p),
            None => {
                let stem = input.file_stem().unwrap_or_default();
                let parent = input.parent().unwrap_or(Path::new("."));
                parent.join(format!("{}_thumb.png", stem.to_string_lossy()))
            }
        };

        let mut args = vec![
            "-i".to_string(),
            input_path.to_string(),
            "-ss".to_string(),
            format!("{}", options.time),
            "-vframes".to_string(),
            "1".to_string(),
        ];

        if let Some(width) = options.width {
            if let Some(height) = options.height {
                args.push(format!("-s={}x{}", width, height));
            } else {
                args.push(format!("-vf=scale={}:-1", width));
            }
        } else if let Some(height) = options.height {
            args.push(format!("-vf=scale=-1:{}", height));
        }

        args.push("-y".to_string());
        args.push(output_path.to_string_lossy().to_string());

        let output = Command::new("ffmpeg")
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to generate thumbnail: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        Ok(output_path.to_string_lossy().to_string())
    }

    pub fn get_first_frame(
        &self,
        input_path: &str,
        output_path: &str,
        width: Option<u32>,
        height: Option<u32>,
    ) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }

        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }

        let mut args = vec![
            "-i".to_string(),
            input_path.to_string(),
            "-ss".to_string(),
            "0".to_string(),
            "-vframes".to_string(),
            "1".to_string(),
        ];

        if let (Some(w), Some(h)) = (width, height) {
            args.push("-vf".to_string());
            args.push(format!(
                "scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2",
                w, h, w, h
            ));
        } else if let Some(w) = width {
            args.push("-vf".to_string());
            args.push(format!("scale={}:-1", w));
        } else if let Some(h) = height {
            args.push("-vf".to_string());
            args.push(format!("scale=-1:{}", h));
        }

        args.push("-y".to_string());
        args.push(output_path.to_string());

        let output = Command::new("ffmpeg")
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to extract first frame: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        Ok(())
    }

    pub fn get_last_frame(
        &self,
        input_path: &str,
        output_path: &str,
        width: Option<u32>,
        height: Option<u32>,
    ) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }

        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }

        let duration = self.get_duration(input_path)?;
        let seek_time = (duration - 0.1).max(0.0);

        let mut args = vec![
            "-sseof".to_string(),
            "-1".to_string(),
            "-i".to_string(),
            input_path.to_string(),
            "-vframes".to_string(),
            "1".to_string(),
        ];

        if let (Some(w), Some(h)) = (width, height) {
            args.push("-vf".to_string());
            args.push(format!(
                "scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2",
                w, h, w, h
            ));
        } else if let Some(w) = width {
            args.push("-vf".to_string());
            args.push(format!("scale={}:-1", w));
        } else if let Some(h) = height {
            args.push("-vf".to_string());
            args.push(format!("scale=-1:{}", h));
        }

        args.push("-y".to_string());
        args.push(output_path.to_string());

        let output = Command::new("ffmpeg")
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to extract last frame: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        Ok(())
    }

    pub fn extract_frames(
        &self,
        input_path: &str,
        options: &FrameExtractOptions,
    ) -> Result<Vec<String>, String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }

        let output_dir = Path::new(&options.output_dir);
        if !output_dir.exists() {
            fs::create_dir_all(output_dir)
                .map_err(|e| format!("Failed to create output directory: {}", e))?;
        }

        let pattern = options
            .filename_pattern
            .as_deref()
            .unwrap_or("frame_%04d.png");

        let ext = match options.format.as_str() {
            "jpg" | "jpeg" => "jpg",
            "webp" => "webp",
            _ => "png",
        };

        let mut args = vec!["-i".to_string(), input_path.to_string()];

        if let Some(start) = options.start {
            args.push("-ss".to_string());
            args.push(start.to_string());
        }

        if let Some(duration) = options.duration {
            args.push("-t".to_string());
            args.push(duration.to_string());
        }

        let mut vf_parts = Vec::new();

        if let Some(fps) = options.fps {
            vf_parts.push(format!("fps={}", fps));
        }

        if let (Some(w), Some(h)) = (options.width, options.height) {
            vf_parts.push(format!(
                "scale={}:{}:force_original_aspect_ratio=decrease",
                w, h
            ));
        } else if let Some(w) = options.width {
            vf_parts.push(format!("scale={}:-1", w));
        } else if let Some(h) = options.height {
            vf_parts.push(format!("scale=-1:{}", h));
        }

        if !vf_parts.is_empty() {
            args.push("-vf".to_string());
            args.push(vf_parts.join(","));
        }

        if options.format == "jpg" || options.format == "jpeg" {
            let quality = options.quality.unwrap_or(85);
            args.push("-q:v".to_string());
            args.push(quality.to_string());
        }

        let output_pattern = output_dir.join(pattern);
        let output_str = output_pattern.to_string_lossy().to_string();
        let final_pattern = if output_str.contains("%") {
            output_str
        } else {
            let stem = Path::new(&output_str).file_stem().unwrap_or_default();
            let parent = Path::new(&output_str).parent().unwrap_or(Path::new("."));
            let ext_str = if options.format == "jpg" || options.format == "jpeg" {
                "jpg"
            } else {
                "png"
            };
            parent
                .join(format!("{}_%04d.{}", stem.to_string_lossy(), ext_str))
                .to_string_lossy()
                .to_string()
        };

        args.push("-y".to_string());
        args.push(final_pattern.clone());

        let output = Command::new("ffmpeg")
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to extract frames: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        let mut extracted_files = Vec::new();
        let pattern_base = if final_pattern.contains("%") {
            let base = final_pattern.split("%04d").next().unwrap_or("");
            base.to_string()
        } else {
            final_pattern.clone()
        };

        if let Ok(entries) = fs::read_dir(output_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let name = path.file_name().unwrap_or_default().to_string_lossy();
                    if name.starts_with(&pattern_base) || name.contains("frame_") {
                        extracted_files.push(path.to_string_lossy().to_string());
                    }
                }
            }
        }

        extracted_files.sort();
        Ok(extracted_files)
    }

    pub fn get_frame_count(&self, input_path: &str) -> Result<u64, String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }

        let output = Command::new("ffprobe")
            .args([
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-count_packets",
                "-show_entries",
                "stream=nb_read_packets",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                input_path,
            ])
            .output()
            .map_err(|e| format!("Failed to get frame count: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("ffprobe failed: {}", stderr));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        stdout
            .trim()
            .parse::<u64>()
            .map_err(|e| format!("Failed to parse frame count: {}", e))
    }

    pub fn get_keyframes(&self, input_path: &str) -> Result<Vec<f64>, String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }

        let output = Command::new("ffprobe")
            .args([
                "-v",
                "error",
                "-skip_frame",
                "nokey",
                "-show_entries",
                "frame=pkt_pts_time",
                "-select_streams",
                "v:0",
                "-of",
                "csv=p=0",
                input_path,
            ])
            .output()
            .map_err(|e| format!("Failed to get keyframes: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("ffprobe failed: {}", stderr));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let mut keyframes = Vec::new();

        for line in stdout.lines() {
            if let Ok(time) = line.trim().parse::<f64>() {
                keyframes.push(time);
            }
        }

        Ok(keyframes)
    }
}

pub fn parse_fraction(s: &str) -> Option<f64> {
    if s.contains('/') {
        let parts: Vec<&str> = s.split('/').collect();
        if parts.len() == 2 {
            let num = parts[0].parse::<f64>().ok()?;
            let den = parts[1].parse::<f64>().ok()?;
            if den != 0.0 {
                return Some(num / den);
            }
        }
        None
    } else {
        s.parse::<f64>().ok()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ffmpeg_available() {
        let ffmpeg = Ffmpeg::new();
        assert!(ffmpeg.is_available());
        println!("FFmpeg version: {:?}", ffmpeg.get_version());
    }

    #[test]
    fn test_parse_fraction() {
        assert_eq!(parse_fraction("30000/1001"), Some(29.97002997002997));
        assert_eq!(parse_fraction("25/1"), Some(25.0));
        assert_eq!(parse_fraction("30"), Some(30.0));
        assert_eq!(parse_fraction("0/0"), None);
    }
}
