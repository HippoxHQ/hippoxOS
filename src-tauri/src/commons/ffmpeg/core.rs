use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;

/// FFmpeg command builder and executor
#[derive(Clone)]
pub struct Ffmpeg {
    pub bin_path: String,
}

/// Video metadata structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub width: u32,
    pub height: u32,
    pub duration: f64,
    pub fps: f64,
    pub bitrate: u64,
    pub codec: String,
}

/// Thumbnail options
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThumbnailOptions {
    pub time: f64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub output_path: Option<String>,
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

    /// Check if FFmpeg is available
    pub fn is_available(&self) -> bool {
        Command::new(&self.bin_path)
            .arg("-version")
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    /// Get FFmpeg version
    pub fn get_version(&self) -> Option<String> {
        let output = Command::new(&self.bin_path)
            .arg("-version")
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let version = String::from_utf8_lossy(&output.stdout);
        version.lines().next().map(|s| s.to_string())
    }

    /// Get video metadata using ffprobe
    pub fn get_metadata(&self, path: &str) -> Result<VideoMetadata, String> {
        let path = Path::new(path);
        if !path.exists() {
            return Err(format!("File not found: {}", path.display()));
        }

        let output = Command::new("ffprobe")
            .args([
                "-v", "quiet",
                "-print_format", "json",
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

    /// Get video duration only (faster)
    pub fn get_duration(&self, path: &str) -> Result<f64, String> {
        let metadata = self.get_metadata(path)?;
        Ok(metadata.duration)
    }

    /// Validate video file
    pub fn validate_video(&self, path: &str) -> bool {
        self.get_metadata(path).is_ok()
    }

    /// Generate thumbnail
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
}

/// Helper: parse fraction string like "30000/1001" to f64
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