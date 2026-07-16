use super::core::Ffmpeg;
use std::path::Path;
use std::process::Command;
impl Ffmpeg {
    /// Apply filter to video
    pub fn apply_filter(&self, input_path: &str, output_path: &str, filter_type: &str, intensity: f32) -> Result<(), String> {
        let input = Path::new(input_path);
        if !input.exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let filter = match filter_type {
            "grayscale" | "blackwhite" => "hue=s=0".to_string(),
            "sepia" => "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0,eq=contrast=1.1:brightness=0.05".to_string(),
            "vintage" => "colorchannelmixer=.5:.4:.1:0:.3:.6:.1:0:.2:.3:.5:0,eq=contrast=1.2:brightness=-0.05".to_string(),
            "warm" => "colorchannelmixer=1.1:.1:0:0:.1:1.1:0:0:.1:.1:1.1:0".to_string(),
            "cool" => "colorchannelmixer=0:0:1.1:0:0:1.1:.1:0:1.1:.1:0:0".to_string(),
            "blur" => "boxblur=1.5:1".to_string(),
            "sharpen" => "unsharp=5:5:1.0:5:5:0.0".to_string(),
            "nostalgic" => {
                "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0,eq=contrast=1.1:brightness=-0.02,saturation=0.8".to_string()
            }
            "brightness" => {
                let val = intensity * 2.0 - 0.5;
                format!("eq=brightness={:.2}", val)
            }
            "contrast" => {
                let val = intensity * 2.0 + 0.5;
                format!("eq=contrast={:.2}", val)
            }
            "saturation" => {
                let val = intensity * 2.0;
                format!("eq=saturation={:.2}", val)
            }
            _ => return Err(format!("Unknown filter type: {}", filter_type)),
        };
        let output = Command::new("ffmpeg")
            .args(["-i", input_path, "-vf", &filter, "-c:a", "copy", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to apply filter: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Add text overlay to video
    pub fn add_text_overlay(
        &self,
        input_path: &str,
        output_path: &str,
        text: &str,
        x: f64,
        y: f64,
        font_size: u32,
        font_color: &str,
        font_family: &str,
        start: f64,
        duration: f64,
        background_color: Option<&str>,
    ) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let mut drawtext_filter = format!(
            "drawtext=text='{}':fontsize={}:fontcolor={}:fontfile={}:x={}:y={}:enable='between(t,{},{})'",
            text.replace("'", "'\\''"),
            font_size,
            font_color,
            font_family,
            x,
            y,
            start,
            start + duration
        );
        if let Some(bg) = background_color {
            drawtext_filter.push_str(&format!(":box=1:boxcolor={}:boxborderw=5", bg));
        }
        let output = Command::new("ffmpeg")
            .args(["-i", input_path, "-vf", &drawtext_filter, "-c:a", "copy", "-y", output_path])
            .output()
            .map_err(|e| format!("Failed to add text overlay: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Add emoji overlay (emojis are rendered as text with large font)
    pub fn add_emoji_overlay(
        &self,
        input_path: &str,
        output_path: &str,
        emoji: &str,
        x: f64,
        y: f64,
        size: u32,
        start: f64,
        duration: f64,
    ) -> Result<(), String> {
        self.add_text_overlay(input_path, output_path, emoji, x, y, size, "#FFFFFF", "Apple Color Emoji", start, duration, None)
    }
}
