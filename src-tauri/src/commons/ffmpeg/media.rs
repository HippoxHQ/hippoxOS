use crate::commons::Ffmpeg;
use serde_json::Value;
use std::fs;
use std::path::Path;
use std::process::Command;
/// Get video metadata as JSON from file path
pub fn get_video_metadata_json(ffmpeg: &Ffmpeg, path: &str) -> Result<Value, String> {
    ffmpeg.get_video_info_json(path)
}
/// Get audio metadata (duration, sample_rate, channels, codec) from file path
pub fn get_audio_metadata(ffmpeg: &Ffmpeg, path: &str) -> Result<AudioMetadata, String> {
    let info = ffmpeg.get_metadata(path)?;
    Ok(AudioMetadata { duration: info.duration, sample_rate: 0, channels: 0, codec: info.codec, file_size: 0 })
}
/// Get basic metadata (duration only) from file path
pub fn get_basic_metadata(ffmpeg: &Ffmpeg, path: &str) -> Result<BasicMetadata, String> {
    let metadata = ffmpeg.get_metadata(path)?;
    Ok(BasicMetadata {
        duration: metadata.duration,
        width: metadata.width,
        height: metadata.height,
        fps: metadata.fps,
        codec: metadata.codec,
        bitrate: metadata.bitrate,
    })
}
/// Get image metadata (width, height, fps, duration) from file path
pub fn get_image_metadata(ffmpeg: &Ffmpeg, path: &str, is_gif: bool) -> Result<ImageMetadata, String> {
    let info = ffmpeg.get_metadata(path)?;
    let width = info.width;
    let height = info.height;
    let fps = if is_gif { info.fps } else { 1.0 };
    let duration = if is_gif { info.duration.max(0.1) } else { 5.0 };
    Ok(ImageMetadata { width, height, fps, duration })
}
/// Extract frame from video at given time
pub fn extract_frame_data(ffmpeg: &Ffmpeg, source_path: &str, time: f64) -> Result<Vec<u8>, String> {
    ffmpeg.extract_frame(source_path, time)
}
/// Generate waveform image from audio file
pub fn generate_waveform_image(_ffmpeg: &Ffmpeg, source_path: &str, output_path: &Path, width: u32, height: u32, color: &str) -> Result<(), String> {
    let output = Command::new("ffmpeg")
        .args([
            "-i",
            source_path,
            "-filter_complex",
            &format!("showwavespic=s={}x{}:colors={}", width, height, color),
            "-frames:v",
            "1",
            "-y",
            output_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("Failed to generate waveform: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg waveform generation failed: {}", stderr));
    }
    Ok(())
}
/// Generate text thumbnail image
pub fn generate_text_thumbnail(
    _ffmpeg: &Ffmpeg,
    content: &str,
    output_path: &Path,
    width: u32,
    height: u32,
    font_size: u32,
    font_color: &str,
    font_path: Option<&str>,
) -> Result<(), String> {
    let display_text = if content.len() > 100 { format!("{}...", &content[..100]) } else { content.to_string() };
    let escaped_text = display_text.replace("'", "'\\\\\\''").replace(":", "\\:").replace("[", "\\[").replace("]", "\\]").replace("=", "\\=");
    let default_font = if cfg!(target_os = "macos") {
        "/System/Library/Fonts/Helvetica.ttc"
    } else if cfg!(target_os = "windows") {
        "C:\\\\Windows\\\\Fonts\\\\arial.ttf"
    } else {
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
    };
    let font = font_path.unwrap_or(default_font);
    let output = Command::new("ffmpeg")
        .args([
            "-f",
            "lavfi",
            "-i",
            &format!("color=c=black:s={}x{}:d=1", width, height),
            "-vf",
            &format!(
                "drawtext=text='{}':fontcolor={}:fontsize={}:x=(w-text_w)/2:y=(h-text_h)/2:fontfile={}",
                escaped_text, font_color, font_size, font
            ),
            "-frames:v",
            "1",
            "-y",
            output_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("Failed to generate text thumbnail: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg text thumbnail generation failed: {}", stderr));
    }
    Ok(())
}
/// Read cached thumbnail from file system
pub fn read_cached_thumbnail(cache_path: &Path) -> Option<String> {
    if !cache_path.exists() {
        return None;
    }
    match fs::read(cache_path) {
        Ok(data) => {
            let base64_str = base64::encode(&data);
            Some(format!("data:image/jpeg;base64,{}", base64_str))
        }
        Err(_) => None,
    }
}
/// Save thumbnail data to cache
pub fn save_thumbnail_to_cache(cache_path: &Path, data: &[u8]) -> Result<(), String> {
    if let Some(parent) = cache_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create cache directory: {}", e))?;
        }
    }
    fs::write(cache_path, data).map_err(|e| format!("Failed to write thumbnail: {}", e))
}
/// Detect if file is GIF based on extension
pub fn is_gif_file(file_name: &str) -> bool {
    file_name.to_lowercase().ends_with(".gif")
}
/// Determine codec from file extension
pub fn detect_codec_from_extension(file_name: &str) -> String {
    let ext = file_name.to_lowercase();
    if ext.ends_with(".png") {
        "png".to_string()
    } else if ext.ends_with(".jpg") || ext.ends_with(".jpeg") {
        "jpeg".to_string()
    } else if ext.ends_with(".webp") {
        "webp".to_string()
    } else if ext.ends_with(".bmp") {
        "bmp".to_string()
    } else if ext.ends_with(".svg") {
        "svg".to_string()
    } else if ext.ends_with(".gif") {
        "gif".to_string()
    } else {
        "image".to_string()
    }
}
// ============================================================================
// Metadata Structures
// ============================================================================
#[derive(Debug, Clone)]
pub struct AudioMetadata {
    pub duration: f64,
    pub sample_rate: u32,
    pub channels: u32,
    pub codec: String,
    pub file_size: u64,
}
#[derive(Debug, Clone)]
pub struct BasicMetadata {
    pub duration: f64,
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub codec: String,
    pub bitrate: u64,
}
#[derive(Debug, Clone)]
pub struct ImageMetadata {
    pub width: u32,
    pub height: u32,
    pub fps: f64,
    pub duration: f64,
}
