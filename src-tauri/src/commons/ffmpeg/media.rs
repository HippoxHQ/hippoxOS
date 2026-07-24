use crate::commons::{AudioMetadata, BasicMetadata, Ffmpeg, ImageMetadata};
use serde_json::Value;
use std::{fs, path::Path, process::Command};
/// Get video metadata as JSON from file path
///
/// Convenience wrapper around Ffmpeg::get_video_info_json that returns
/// video metadata as a JSON value suitable for API responses.
///
/// # Arguments
/// * `ffmpeg` - Reference to the Ffmpeg instance
/// * `path` - Path to the video file
///
/// # Returns
/// * `Ok(Value)` - Video metadata as JSON
/// * `Err(String)` - Error message if metadata extraction fails
pub fn get_video_metadata_json(ffmpeg: &Ffmpeg, path: &str) -> Result<Value, String> {
    ffmpeg.get_video_info_json(path)
}
/// Get audio metadata from file path
///
/// Extracts comprehensive audio metadata including core information,
/// quality parameters, and ID3 tags using ffprobe.
///
/// # Arguments
/// * `_ffmpeg` - Reference to the Ffmpeg instance (unused)
/// * `path` - Path to the audio file
///
/// # Returns
/// * `Ok(AudioMetadata)` - Complete audio metadata
/// * `Err(String)` - Error message if metadata extraction fails
pub fn get_audio_metadata(_ffmpeg: &Ffmpeg, path: &str) -> Result<AudioMetadata, String> {
    let output = Command::new("ffprobe")
        .args(["-v", "quiet", "-print_format", "json", "-show_streams", "-show_format", path])
        .output()
        .map_err(|e| format!("ffprobe failed: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("ffprobe failed: {}", stderr));
    }
    let json: serde_json::Value = serde_json::from_slice(&output.stdout).map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;
    AudioMetadata::from_json(&json, path)
}
/// Get basic metadata from file path
///
/// Extracts basic video metadata including duration, dimensions,
/// frame rate, codec, and bitrate.
///
/// # Arguments
/// * `ffmpeg` - Reference to the Ffmpeg instance
/// * `path` - Path to the video file
///
/// # Returns
/// * `Ok(BasicMetadata)` - Basic video metadata
/// * `Err(String)` - Error message if metadata extraction fails
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
/// Get image metadata from file path
///
/// Extracts image metadata including dimensions, frame rate,
/// and duration. GIF files get special handling for duration and fps.
///
/// # Arguments
/// * `ffmpeg` - Reference to the Ffmpeg instance
/// * `path` - Path to the image file
/// * `is_gif` - Whether the file is a GIF animation
///
/// # Returns
/// * `Ok(ImageMetadata)` - Image metadata
/// * `Err(String)` - Error message if metadata extraction fails
pub fn get_image_metadata(ffmpeg: &Ffmpeg, path: &str, is_gif: bool) -> Result<ImageMetadata, String> {
    let info = ffmpeg.get_metadata(path)?;
    let width = info.width;
    let height = info.height;
    let fps = if is_gif { info.fps } else { 1.0 };
    let duration = if is_gif { info.duration.max(0.1) } else { 5.0 };
    Ok(ImageMetadata { width, height, fps, duration })
}
/// Extract frame from video at given time
///
/// Convenience wrapper around Ffmpeg::extract_frame that returns
/// JPEG image data for a single frame at the specified timestamp.
///
/// # Arguments
/// * `ffmpeg` - Reference to the Ffmpeg instance
/// * `source_path` - Path to the video file
/// * `time` - Timestamp in seconds to extract the frame from
///
/// # Returns
/// * `Ok(Vec<u8>)` - JPEG image data
/// * `Err(String)` - Error message if extraction fails
pub fn extract_frame_data(ffmpeg: &Ffmpeg, source_path: &str, time: f64) -> Result<Vec<u8>, String> {
    ffmpeg.extract_frame(source_path, time)
}
/// Generate waveform image from audio file
///
/// Creates a waveform visualization image from an audio file using
/// ffmpeg's showwavespic filter. WAV files receive special handling
/// with explicit sample rate specification.
///
/// # Arguments
/// * `_ffmpeg` - Reference to the Ffmpeg instance (unused)
/// * `source_path` - Path to the audio file
/// * `output_path` - Path where the waveform PNG will be saved
/// * `width` - Image width in pixels
/// * `height` - Image height in pixels
/// * `color` - Color for the waveform (hex format, e.g., "0x2d8a6e")
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` - Error message if generation fails
pub fn generate_waveform_image(_ffmpeg: &Ffmpeg, source_path: &str, output_path: &Path, width: u32, height: u32, color: &str) -> Result<(), String> {
    if !Path::new(source_path).exists() {
        return Err(format!("Source file not found: {}", source_path));
    }
    if let Some(parent) = output_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
        }
    }
    let probe_output = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=sample_rate,channels",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            source_path,
        ])
        .output()
        .map_err(|e| format!("Failed to probe audio: {}", e))?;
    let info = String::from_utf8_lossy(&probe_output.stdout);
    let lines: Vec<&str> = info.lines().collect();
    let sample_rate = if lines.len() >= 1 { lines[0].parse::<u32>().unwrap_or(44100) } else { 44100 };
    let filter = if sample_rate != 44100 {
        format!("aresample=44100,showwavespic=s={}x{}:colors={}", width, height, color)
    } else {
        format!("showwavespic=s={}x{}:colors={}", width, height, color)
    };
    let output = Command::new("ffmpeg")
        .args(["-i", source_path, "-filter_complex", &filter, "-frames:v", "1", "-y", output_path.to_str().unwrap()])
        .output()
        .map_err(|e| format!("Failed to generate waveform: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg waveform generation failed: {}", stderr));
    }
    if !output_path.exists() || output_path.metadata().map(|m| m.len() == 0).unwrap_or(true) {
        return Err(format!("Waveform file not created or empty: {:?}", output_path));
    }
    Ok(())
}
/// Generate text thumbnail image
///
/// Creates a visual representation of text content by rendering it
/// onto a colored background using ffmpeg's drawtext filter.
///
/// # Arguments
/// * `_ffmpeg` - Reference to the Ffmpeg instance (unused)
/// * `content` - Text content to render
/// * `output_path` - Path where the thumbnail image will be saved
/// * `width` - Image width in pixels
/// * `height` - Image height in pixels
/// * `font_size` - Font size in pixels
/// * `font_color` - Font color (e.g., "white")
/// * `font_path` - Optional custom font file path
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` - Error message if generation fails
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
///
/// Reads a previously cached thumbnail image from disk and returns
/// it as a base64-encoded data URL.
///
/// # Arguments
/// * `cache_path` - Path to the cached thumbnail file
///
/// # Returns
/// * `Some(String)` - Base64-encoded data URL
/// * `None` - If the file does not exist or cannot be read
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
///
/// Writes thumbnail image data to the filesystem cache, creating
/// parent directories if they do not exist.
///
/// # Arguments
/// * `cache_path` - Path where the thumbnail will be saved
/// * `data` - Thumbnail image data (JPEG bytes)
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` - Error message if saving fails
pub fn save_thumbnail_to_cache(cache_path: &Path, data: &[u8]) -> Result<(), String> {
    if let Some(parent) = cache_path.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create cache directory: {}", e))?;
        }
    }
    fs::write(cache_path, data).map_err(|e| format!("Failed to write thumbnail: {}", e))
}
/// Detect if file is GIF based on extension
///
/// Checks whether a file name ends with the .gif extension
/// (case-insensitive).
///
/// # Arguments
/// * `file_name` - File name or path to check
///
/// # Returns
/// * `true` if the file is a GIF
/// * `false` otherwise
pub fn is_gif_file(file_name: &str) -> bool {
    file_name.to_lowercase().ends_with(".gif")
}
/// Determine codec from file extension
///
/// Maps common image file extensions to their corresponding
/// codec names. Returns "image" for unknown extensions.
///
/// # Arguments
/// * `file_name` - File name or path to analyze
///
/// # Returns
/// * `String` - Detected codec name
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
