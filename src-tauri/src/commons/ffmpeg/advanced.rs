use super::core::Ffmpeg;
use std::fs;
use std::path::Path;
use std::process::Command;
#[derive(Debug, Clone)]
pub struct WatermarkOptions {
    pub position: WatermarkPosition,
    pub margin_x: u32,
    pub margin_y: u32,
    pub opacity: f64,
    pub scale: Option<f64>,
}
#[derive(Debug, Clone)]
pub enum WatermarkPosition {
    TopLeft,
    TopRight,
    BottomLeft,
    BottomRight,
    Center,
    Custom(f64, f64),
}
#[derive(Debug, Clone)]
pub struct GifOptions {
    pub fps: f64,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub start: f64,
    pub duration: f64,
    pub quality: u32,
}
#[derive(Debug, Clone)]
pub struct CompressOptions {
    pub crf: u32,
    pub preset: String,
    pub video_bitrate: Option<String>,
    pub audio_bitrate: Option<String>,
    pub scale: Option<(u32, u32)>,
}
impl Ffmpeg {
    pub fn rotate_video(&self, input_path: &str, output_path: &str, degrees: u32) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let rotate_filter = match degrees % 360 {
            90 => "rotate=PI/2",
            180 => "rotate=PI",
            270 => "rotate=3*PI/2",
            0 => "",
            _ => return Err("Rotation must be 0, 90, 180, or 270 degrees".to_string()),
        };
        if rotate_filter.is_empty() {
            return Err("Rotation of 0 degrees is a no-op".to_string());
        }
        let output = Command::new("ffmpeg")
            .args(["-i", input_path, "-vf", rotate_filter, "-c:a", "copy", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to rotate video: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    pub fn flip_video(&self, input_path: &str, output_path: &str, direction: &str) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let flip_filter = match direction {
            "horizontal" | "h" => "hflip",
            "vertical" | "v" => "vflip",
            "both" => "hflip,vflip",
            _ => return Err("Direction must be 'horizontal', 'vertical', or 'both'".to_string()),
        };
        let output = Command::new("ffmpeg")
            .args(["-i", input_path, "-vf", flip_filter, "-c:a", "copy", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to flip video: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    pub fn adjust_volume(&self, input_path: &str, output_path: &str, volume: f32) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        if volume < 0.0 {
            return Err("Volume cannot be negative".to_string());
        }
        let output = Command::new("ffmpeg")
            .args(["-i", input_path, "-filter:a", &format!("volume={}", volume), "-c:v", "copy", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to adjust volume: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    pub fn add_image_watermark(&self, input_path: &str, watermark_path: &str, output_path: &str, options: &WatermarkOptions) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if !Path::new(watermark_path).exists() {
            return Err(format!("Watermark file not found: {}", watermark_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let (x, y) = match options.position {
            WatermarkPosition::TopLeft => (options.margin_x, options.margin_y),
            WatermarkPosition::TopRight => {
                format!("W-w-{}", options.margin_x);
                (options.margin_x, options.margin_y)
            }
            WatermarkPosition::BottomLeft => (options.margin_x, options.margin_y),
            WatermarkPosition::BottomRight => (options.margin_x, options.margin_y),
            WatermarkPosition::Center => (0, 0),
            WatermarkPosition::Custom(x, y) => (x as u32, y as u32),
        };
        let scale_filter = if let Some(scale) = options.scale { format!("scale=iw*{}:ih*{}", scale, scale) } else { "".to_string() };
        let pos_x = match options.position {
            WatermarkPosition::TopRight | WatermarkPosition::BottomRight => {
                format!("W-w-{}", x)
            }
            WatermarkPosition::Center => "(W-w)/2".to_string(),
            _ => x.to_string(),
        };
        let pos_y = match options.position {
            WatermarkPosition::BottomLeft | WatermarkPosition::BottomRight => {
                format!("H-h-{}", y)
            }
            WatermarkPosition::Center => "(H-h)/2".to_string(),
            _ => y.to_string(),
        };
        let overlay_filter = if !scale_filter.is_empty() {
            format!("[1:v]{}[wm];[0:v][wm]overlay={}:{}:format=auto,colorchannelmixer=aa={}", scale_filter, pos_x, pos_y, options.opacity)
        } else {
            format!("[0:v][1:v]overlay={}:{}:format=auto,colorchannelmixer=aa={}", pos_x, pos_y, options.opacity)
        };
        let output = Command::new("ffmpeg")
            .args(["-i", input_path, "-i", watermark_path, "-filter_complex", &overlay_filter, "-c:a", "copy", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to add watermark: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    pub fn generate_gif(&self, input_path: &str, output_path: &str, options: &GifOptions) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let mut args = vec![
            "-i".to_string(),
            input_path.to_string(),
            "-ss".to_string(),
            options.start.to_string(),
            "-t".to_string(),
            options.duration.to_string(),
        ];
        if let (Some(w), Some(h)) = (options.width, options.height) {
            args.push("-vf".to_string());
            args.push(format!("fps={},scale={}:{}:flags=lanczos", options.fps, w, h));
        } else {
            args.push("-vf".to_string());
            args.push(format!("fps={}", options.fps));
        }
        args.push("-c:v".to_string());
        args.push("gif".to_string());
        if options.quality < 100 {
            args.push("-f".to_string());
            args.push("gif".to_string());
        }
        args.push("-y".to_string());
        args.push(output_path.to_string());
        let output = Command::new("ffmpeg").args(&args).output().map_err(|e| format!("Failed to generate GIF: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    pub fn compress_video(&self, input_path: &str, output_path: &str, options: &CompressOptions) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let mut args = vec![
            "-i".to_string(),
            input_path.to_string(),
            "-c:v".to_string(),
            "libx264".to_string(),
            "-preset".to_string(),
            options.preset.clone(),
            "-crf".to_string(),
            options.crf.to_string(),
        ];
        if let Some(bitrate) = &options.video_bitrate {
            args.push("-b:v".to_string());
            args.push(bitrate.clone());
        }
        if let Some(bitrate) = &options.audio_bitrate {
            args.push("-b:a".to_string());
            args.push(bitrate.clone());
        }
        if let Some((w, h)) = options.scale {
            args.push("-vf".to_string());
            args.push(format!("scale={}:{}", w, h));
        }
        args.push("-c:a".to_string());
        args.push("aac".to_string());
        args.push("-y".to_string());
        args.push(output_path.to_string());
        let output = Command::new("ffmpeg").args(&args).output().map_err(|e| format!("Failed to compress video: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    pub fn audio_fade(&self, input_path: &str, output_path: &str, fade_in: f64, fade_out: f64) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let metadata = self.get_metadata(input_path)?;
        let duration = metadata.duration;
        let mut filter_parts = Vec::new();
        if fade_in > 0.0 {
            filter_parts.push(format!("afade=t=in:st=0:d={}", fade_in));
        }
        if fade_out > 0.0 {
            let start = (duration - fade_out).max(0.0);
            filter_parts.push(format!("afade=t=out:st={}:d={}", start, fade_out));
        }
        let filter = if filter_parts.is_empty() {
            return Err("No fade specified".to_string());
        } else {
            filter_parts.join(",")
        };
        let output = Command::new("ffmpeg")
            .args(["-i", input_path, "-af", &filter, "-c:v", "copy", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to add audio fade: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
}
