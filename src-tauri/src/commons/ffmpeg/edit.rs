use super::core::Ffmpeg;
use std::fs;
use std::path::Path;
use std::process::Command;
impl Ffmpeg {
    /// Trim video
    pub fn trim_video(&self, input_path: &str, output_path: &str, start: f64, duration: f64) -> Result<(), String> {
        let input = Path::new(input_path);
        if !input.exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let output = Command::new("ffmpeg")
            .args(["-i", input_path, "-ss", &format!("{}", start), "-t", &format!("{}", duration), "-c", "copy", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to trim video: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Extract audio from video
    pub fn extract_audio(&self, input_path: &str, output_path: &str) -> Result<(), String> {
        let input = Path::new(input_path);
        if !input.exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let output = Command::new("ffmpeg")
            .args(["-i", input_path, "-vn", "-acodec", "libmp3lame", "-ab", "192k", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to extract audio: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Concatenate multiple videos
    pub fn concat_videos(&self, inputs: &[String], output_path: &str) -> Result<(), String> {
        if inputs.is_empty() {
            return Err("No input files provided".to_string());
        }
        for input in inputs {
            if !Path::new(input).exists() {
                return Err(format!("Input file not found: {}", input));
            }
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let concat_file_path = Path::new(output_path).parent().unwrap_or(Path::new(".")).join("concat_list.txt");
        let mut concat_content = String::new();
        for input in inputs {
            concat_content.push_str(&format!("file '{}'\n", input));
        }
        fs::write(&concat_file_path, concat_content).map_err(|e| format!("Failed to create concat list file: {}", e))?;
        let output = Command::new("ffmpeg")
            .args(["-f", "concat", "-safe", "0", "-i", concat_file_path.to_str().unwrap(), "-c", "copy", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to concatenate videos: {}", e))?;
        let _ = fs::remove_file(&concat_file_path);
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Change video speed (fast/slow motion)
    pub fn change_speed(&self, input_path: &str, output_path: &str, speed: f64) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let pts = 1.0 / speed;
        let atempo = speed;
        let output = Command::new("ffmpeg")
            .args([
                "-i",
                input_path,
                "-filter_complex",
                &format!("[0:v]setpts={}[v];[0:a]atempo={}[a]", pts, atempo),
                "-map",
                "[v]",
                "-map",
                "[a]",
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                "23",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-y",
                output_path,
            ])
            .output()
            .map_err(|e| format!("Failed to change speed: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Create video with background music
    pub fn add_background_music(
        &self,
        video_path: &str,
        audio_path: &str,
        output_path: &str,
        video_volume: f32,
        bgm_volume: f32,
    ) -> Result<(), String> {
        if !Path::new(video_path).exists() {
            return Err(format!("Video file not found: {}", video_path));
        }
        if !Path::new(audio_path).exists() {
            return Err(format!("Audio file not found: {}", audio_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let output = Command::new("ffmpeg")
            .args([
                "-i",
                video_path,
                "-i",
                audio_path,
                "-filter_complex",
                &format!(
                    "[0:a]volume={}[video_audio];[1:a]volume={}[bgm];[video_audio][bgm]amix=inputs=2:duration=longest[aout]",
                    video_volume, bgm_volume
                ),
                "-map",
                "0:v",
                "-map",
                "[aout]",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-shortest",
                "-y",
                output_path,
            ])
            .output()
            .map_err(|e| format!("Failed to add background music: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Add fade in/out effect
    pub fn add_fade(&self, input_path: &str, output_path: &str, fade_in: f64, fade_out: f64) -> Result<(), String> {
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
        let fade_out_start = duration - fade_out;
        let output = Command::new("ffmpeg")
            .args([
                "-i",
                input_path,
                "-vf",
                &format!(
                    "fade=in:0:{}:alpha=1,fade=out:{}:{}:alpha=1",
                    (fade_in * 30.0) as u32,
                    (fade_out_start * 30.0) as u32,
                    (fade_out * 30.0) as u32
                ),
                "-c:a",
                "copy",
                "-y",
                output_path,
            ])
            .output()
            .map_err(|e| format!("Failed to add fade: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Create a video from sequence of images
    pub fn create_video_from_images(&self, image_pattern: &str, output_path: &str, fps: f64) -> Result<(), String> {
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let output = Command::new("ffmpeg")
            .args(["-framerate", &format!("{}", fps), "-i", image_pattern, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to create video from images: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
}
