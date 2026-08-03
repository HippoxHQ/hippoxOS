//! FFmpeg wrapper for video/audio processing operations
//!
//! This module provides a high-level interface to ffmpeg and ffprobe commands,
//! supporting video metadata extraction, frame extraction, thumbnail generation,
//! and independent process management. Each Ffmpeg instance owns its own
//! process resources, ensuring no state conflicts between parallel operations.
use crate::commons::{AudioMetadata, FrameExtractOptions, ImageMetadata, PersistentProcess, ThumbnailOptions, VideoMetadata};
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    process::{Command, Stdio},
};
/// FFmpeg wrapper for video/audio processing operations
///
/// This struct provides a high-level interface to ffmpeg and ffprobe commands.
/// Each instance is independent and owns its own resources, making it safe
/// for parallel use in multi-threaded environments like sharded decoding.
///
/// # Important
/// - Each instance manages its own persistent process (if any)
/// - Instances are NOT shared between threads by default
/// - Use `Ffmpeg::new()` to create independent instances for each task
#[derive(Clone)]
pub struct Ffmpeg {
    /// Path to the ffmpeg binary
    pub bin_path: String,
    /// Persistent ffmpeg process for fast frame extraction
    /// Each instance owns its own persistent process, preventing state conflicts
    pub persistent: std::sync::Arc<std::sync::Mutex<Option<PersistentProcess>>>,
}
impl Default for Ffmpeg {
    fn default() -> Self {
        Self::new()
    }
}
impl Ffmpeg {
    /// Create a new Ffmpeg instance with default binary path
    ///
    /// The default binary path is "ffmpeg", which assumes ffmpeg is in the system PATH.
    /// Each instance is independent and can be used safely in parallel operations.
    ///
    /// # Returns
    /// A new independent Ffmpeg instance
    pub fn new() -> Self {
        Self { bin_path: "ffmpeg".to_string(), persistent: std::sync::Arc::new(std::sync::Mutex::new(None)) }
    }
    /// Create a new Ffmpeg instance with custom binary path
    ///
    /// # Arguments
    /// * `path` - Custom path to the ffmpeg binary
    ///
    /// # Returns
    /// A new independent Ffmpeg instance with custom binary path
    pub fn with_bin_path(path: &str) -> Self {
        Self { bin_path: path.to_string(), persistent: std::sync::Arc::new(std::sync::Mutex::new(None)) }
    }
    /// Initialize persistent ffmpeg process for fast frame extraction
    ///
    /// Starts a persistent ffmpeg process in image2pipe mode, which allows
    /// fast frame extraction without restarting ffmpeg for each frame.
    ///
    /// # Important
    /// - This process is owned by this instance only
    /// - Not shared with other instances
    /// - Will be automatically cleaned up when the instance is dropped
    ///
    /// # Arguments
    /// * `video_path` - Path to the video file to process
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(String)` - Error message if initialization fails
    pub fn init_persistent(&self, video_path: &str) -> Result<(), String> {
        let mut guard = self.persistent.lock().unwrap();
        // Check if we already have a persistent process for this video
        if let Some(ref mut proc) = *guard {
            if proc.video_path == video_path {
                return Ok(());
            }
            // Different video, kill old process
            let _ = proc.child.kill();
            *guard = None;
        }
        // Start new persistent ffmpeg process
        let mut child = Command::new(&self.bin_path)
            .args(["-i", video_path, "-f", "image2pipe", "-vcodec", "mjpeg", "-q:v", "2", "-"])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start persistent ffmpeg: {}", e))?;
        let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
        *guard = Some(PersistentProcess { child, stdin, stdout, video_path: video_path.to_string() });
        Ok(())
    }
    /// Extract a frame from the persistent ffmpeg process at the given time
    ///
    /// Uses the persistent ffmpeg process to extract a frame at the specified
    /// timestamp. This is faster than starting a new ffmpeg process for each frame.
    ///
    /// # Arguments
    /// * `time` - Timestamp in seconds to extract the frame from
    ///
    /// # Returns
    /// * `Ok(Vec<u8>)` - JPEG image data
    /// * `Err(String)` - Error message if extraction fails
    pub fn extract_frame_persistent(&self, time: f64) -> Result<Vec<u8>, String> {
        let mut guard = self.persistent.lock().unwrap();
        let proc = guard.as_mut().ok_or("Persistent process not initialized. Call init_persistent() first.")?;
        // Send seek command to ffmpeg
        let seek_cmd = format!("seek {} 2\n", time);
        proc.stdin.write_all(seek_cmd.as_bytes()).map_err(|e| format!("Failed to send seek command: {}", e))?;
        proc.stdin.flush().map_err(|e| format!("Failed to flush stdin: {}", e))?;
        // Read JPEG data from stdout
        let mut buffer = Vec::new();
        let mut temp = [0u8; 65536];
        let mut found_jpeg = false;
        loop {
            let n = proc.stdout.read(&mut temp).map_err(|e| format!("Failed to read frame data: {}", e))?;
            if n == 0 {
                break;
            }
            buffer.extend_from_slice(&temp[..n]);
            // Check for JPEG end marker
            if buffer.len() > 2 {
                let last_two = &buffer[buffer.len() - 2..];
                if last_two == [0xFF, 0xD9] {
                    found_jpeg = true;
                    break;
                }
            }
        }
        if buffer.is_empty() {
            return Err("No frame data received from persistent process".to_string());
        }
        Ok(buffer)
    }
    /// Clean up the persistent ffmpeg process
    ///
    /// Terminates the persistent ffmpeg process if it is currently running.
    /// This is automatically called when the instance is dropped, but can be
    /// called manually to release resources earlier.
    pub fn cleanup_persistent(&self) {
        let mut guard = self.persistent.lock().unwrap();
        if let Some(mut proc) = guard.take() {
            let _ = proc.child.kill();
        }
    }
    /// Check if ffmpeg is available on the system
    ///
    /// # Returns
    /// * `true` if ffmpeg is available and executable
    /// * `false` otherwise
    pub fn is_available(&self) -> bool {
        Command::new(&self.bin_path).arg("-version").output().map(|o| o.status.success()).unwrap_or(false)
    }
    /// Get ffmpeg version string
    ///
    /// # Returns
    /// * `Some(String)` - The ffmpeg version string
    /// * `None` - If ffmpeg is not available or version cannot be determined
    pub fn get_version(&self) -> Option<String> {
        let output = Command::new(&self.bin_path).arg("-version").output().ok()?;
        if !output.status.success() {
            return None;
        }
        let version = String::from_utf8_lossy(&output.stdout);
        version.lines().next().map(|s| s.to_string())
    }
    /// Get complete video metadata from file path
    ///
    /// Uses ffprobe to extract comprehensive metadata including video properties,
    /// stream information, and file format details.
    ///
    /// # Arguments
    /// * `path` - Path to the video file
    ///
    /// # Returns
    /// * `Ok(VideoMetadata)` - Complete video metadata
    /// * `Err(String)` - Error message if metadata extraction fails
    pub fn get_video_metadata(&self, path: &str) -> Result<VideoMetadata, String> {
        let path_obj = Path::new(path);
        if !path_obj.exists() {
            return Err(format!("File not found: {}", path_obj.display()));
        }
        let output = Command::new("ffprobe")
            .args([
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_streams",
                "-show_format",
                "-show_entries",
                "stream=index,codec_name,codec_type,width,height,r_frame_rate,pix_fmt,color_space,bit_depth,nb_frames",
                "-show_entries",
                "stream=codec_tag_string,profile,level,has_b_frames,refs",
                "-show_entries",
                "format=format_name,format_long_name,size,creation_time,tags",
                path,
            ])
            .output()
            .map_err(|e| format!("Failed to run ffprobe: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("ffprobe failed: {}", stderr));
        }
        let json: serde_json::Value = serde_json::from_slice(&output.stdout).map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;
        let mut metadata = VideoMetadata::from_json(&json, path)?;
        if let Ok(count) = self.get_keyframe_count(path) {
            metadata.keyframe_count = Some(count);
        }
        Ok(metadata)
    }
    /// Get audio metadata from file path
    ///
    /// Extracts comprehensive audio metadata including core information,
    /// quality parameters, and ID3 tags using ffprobe.
    ///
    /// # Arguments
    /// * `path` - Path to the audio file
    ///
    /// # Returns
    /// * `Ok(AudioMetadata)` - Complete audio metadata
    /// * `Err(String)` - Error message if metadata extraction fails
    pub fn get_audio_metadata(&self, path: &str) -> Result<AudioMetadata, String> {
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
    /// Get image metadata from file path
    ///
    /// Extracts image metadata including dimensions, frame rate,
    /// and duration. GIF files get special handling for duration and fps.
    ///
    /// # Arguments
    /// * `path` - Path to the image file
    /// * `is_gif` - Whether the file is a GIF animation
    ///
    /// # Returns
    /// * `Ok(ImageMetadata)` - Image metadata
    /// * `Err(String)` - Error message if metadata extraction fails
    pub fn get_image_metadata(&self, path: &str, is_gif: bool) -> Result<ImageMetadata, String> {
        let info = self.get_video_metadata(path)?;
        let width = info.width;
        let height = info.height;
        let fps = if is_gif { info.fps } else { 1.0 };
        let duration = if is_gif { info.duration.max(0.1) } else { 5.0 };
        Ok(ImageMetadata { width, height, fps, duration })
    }
    /// Extract a single frame from video at given time as JPEG bytes
    ///
    /// This function starts a new ffmpeg process for each extraction.
    /// For repeated extractions, consider using the persistent process.
    ///
    /// # Arguments
    /// * `video_path` - Path to the video file
    /// * `time` - Timestamp in seconds to extract the frame from
    ///
    /// # Returns
    /// * `Ok(Vec<u8>)` - JPEG image data
    /// * `Err(String)` - Error message if extraction fails
    pub fn extract_frame(&self, video_path: &str, time: f64) -> Result<Vec<u8>, String> {
        let output = Command::new(&self.bin_path)
            .args(["-ss", &time.to_string(), "-i", video_path, "-vframes", "1", "-f", "image2pipe", "-vcodec", "mjpeg", "-"])
            .output()
            .map_err(|e| format!("FFmpeg failed: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg error: {}", stderr));
        }
        if output.stdout.is_empty() {
            return Err("No frame data received".to_string());
        }
        Ok(output.stdout)
    }
    /// Get the number of keyframes in a video file
    ///
    /// Uses multiple methods to count keyframes, falling back to alternative
    /// approaches if the primary method fails.
    ///
    /// # Arguments
    /// * `path` - Path to the video file
    ///
    /// # Returns
    /// * `Ok(u64)` - Number of keyframes
    /// * `Err(String)` - Error message if counting fails
    pub fn get_keyframe_count(&self, path: &str) -> Result<u64, String> {
        if !Path::new(path).exists() {
            return Err(format!("File not found: {}", path));
        }
        // Method 1: Count keyframes from packet flags
        let output = Command::new("ffprobe")
            .args(["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=flags", "-of", "csv=p=0", path])
            .output()
            .map_err(|e| format!("Failed to get keyframes: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("ffprobe failed: {}", stderr));
        }
        let stdout = String::from_utf8_lossy(&output.stdout);
        let count = stdout.lines().filter(|line| line.contains('K')).count();
        // Method 2: Fallback to frame analysis
        if count == 0 {
            let output2 = Command::new("ffprobe")
                .args(["-v", "error", "-select_streams", "v:0", "-show_entries", "frame=key_frame", "-of", "csv=p=0", path])
                .output()
                .map_err(|e| format!("Failed to get keyframes (method 2): {}", e))?;
            if output2.status.success() {
                let stdout2 = String::from_utf8_lossy(&output2.stdout);
                let count2 = stdout2.lines().filter(|line| line.trim() == "1").count();
                return Ok(count2 as u64);
            }
        }
        // Method 3: Use ffmpeg filter
        if count == 0 {
            let output3 = Command::new("ffmpeg")
                .args(["-i", path, "-vf", "select='eq(pict_type,I)'", "-vsync", "0", "-f", "null", "-"])
                .stderr(std::process::Stdio::piped())
                .output()
                .map_err(|e| format!("Failed to get keyframes (method 3): {}", e))?;
            if !output3.status.success() {
                let stderr = String::from_utf8_lossy(&output3.stderr);
                for line in stderr.lines() {
                    if let Some(idx) = line.find("frame=") {
                        let rest = &line[idx + 6..];
                        if let Some(end) = rest.find(' ') {
                            if let Ok(num) = rest[..end].trim().parse::<u64>() {
                                return Ok(num);
                            }
                        }
                    }
                }
            }
        }
        Ok(count as u64)
    }
    /// Get video metadata as JSON value
    ///
    /// # Arguments
    /// * `path` - Path to the video file
    ///
    /// # Returns
    /// * `Ok(serde_json::Value)` - Video metadata as JSON
    /// * `Err(String)` - Error message if serialization fails
    pub fn get_video_info_json(&self, path: &str) -> Result<serde_json::Value, String> {
        let metadata = self.get_video_metadata(path)?;
        serde_json::to_value(&metadata).map_err(|e| format!("Failed to serialize video metadata: {}", e))
    }
    /// Create an empty video with black screen
    ///
    /// Generates a synthetic video file with a black screen using the lavfi filter.
    /// Useful for testing and placeholder videos.
    ///
    /// # Arguments
    /// * `output_path` - Path where the output video will be saved
    /// * `duration` - Duration in seconds
    /// * `width` - Video width in pixels
    /// * `height` - Video height in pixels
    /// * `fps` - Frames per second
    ///
    /// # Returns
    /// * `Ok(String)` - The output path on success
    /// * `Err(String)` - Error message if creation fails
    pub fn create_empty_video(&self, output_path: &str, duration: f64, width: u32, height: u32, fps: f64) -> Result<String, String> {
        let path = Path::new(output_path);
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let args = vec![
            "-f".to_string(),
            "lavfi".to_string(),
            "-i".to_string(),
            format!("color=c=black:s={}x{}:d={}:r={}", width, height, duration, fps),
            "-c:v".to_string(),
            "libx264".to_string(),
            "-preset".to_string(),
            "ultrafast".to_string(),
            "-crf".to_string(),
            "23".to_string(),
            "-pix_fmt".to_string(),
            "yuv420p".to_string(),
            "-y".to_string(),
            output_path.to_string(),
        ];
        let output = Command::new(&self.bin_path).args(&args).output().map_err(|e| format!("Failed to create empty video: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(output_path.to_string())
    }
    /// Get duration of a media file in seconds
    ///
    /// # Arguments
    /// * `path` - Path to the media file
    ///
    /// # Returns
    /// * `Ok(f64)` - Duration in seconds
    /// * `Err(String)` - Error message if duration cannot be determined
    pub fn get_duration(&self, path: &str) -> Result<f64, String> {
        let metadata = self.get_video_metadata(path)?;
        Ok(metadata.duration)
    }
    /// Validate if the given file is a valid video file
    ///
    /// # Arguments
    /// * `path` - Path to the file to validate
    ///
    /// # Returns
    /// * `true` if the file is a valid video file
    /// * `false` otherwise
    pub fn validate_video(&self, path: &str) -> bool {
        self.get_video_metadata(path).is_ok()
    }
    /// Generate a thumbnail from video at specified time
    ///
    /// Extracts a single frame from the video at the specified time and saves
    /// it as an image file. The output format is determined by the output_path extension.
    ///
    /// # Arguments
    /// * `input_path` - Path to the input video file
    /// * `options` - Thumbnail generation options (time, size, output path)
    ///
    /// # Returns
    /// * `Ok(String)` - Path to the generated thumbnail
    /// * `Err(String)` - Error message if generation fails
    pub fn generate_thumbnail(&self, input_path: &str, options: &ThumbnailOptions) -> Result<String, String> {
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
        let mut args =
            vec!["-i".to_string(), input_path.to_string(), "-ss".to_string(), format!("{}", options.time), "-vframes".to_string(), "1".to_string()];
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
        let output = Command::new(&self.bin_path).args(&args).output().map_err(|e| format!("Failed to generate thumbnail: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(output_path.to_string_lossy().to_string())
    }
    /// Extract the first frame of a video
    ///
    /// Saves the first frame of the video as an image file. Useful for
    /// generating preview thumbnails or cover images.
    ///
    /// # Arguments
    /// * `input_path` - Path to the input video file
    /// * `output_path` - Path where the extracted frame will be saved
    /// * `width` - Optional output width
    /// * `height` - Optional output height
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(String)` - Error message if extraction fails
    pub fn get_first_frame(&self, input_path: &str, output_path: &str, width: Option<u32>, height: Option<u32>) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let mut args = vec!["-i".to_string(), input_path.to_string(), "-ss".to_string(), "0".to_string(), "-vframes".to_string(), "1".to_string()];
        if let (Some(w), Some(h)) = (width, height) {
            args.push("-vf".to_string());
            args.push(format!("scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2", w, h, w, h));
        } else if let Some(w) = width {
            args.push("-vf".to_string());
            args.push(format!("scale={}:-1", w));
        } else if let Some(h) = height {
            args.push("-vf".to_string());
            args.push(format!("scale=-1:{}", h));
        }
        args.push("-y".to_string());
        args.push(output_path.to_string());
        let output = Command::new(&self.bin_path).args(&args).output().map_err(|e| format!("Failed to extract first frame: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Extract the last frame of a video
    ///
    /// Saves the last frame of the video as an image file. Useful for
    /// end-of-video previews or thumbnails.
    ///
    /// # Arguments
    /// * `input_path` - Path to the input video file
    /// * `output_path` - Path where the extracted frame will be saved
    /// * `width` - Optional output width
    /// * `height` - Optional output height
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(String)` - Error message if extraction fails
    pub fn get_last_frame(&self, input_path: &str, output_path: &str, width: Option<u32>, height: Option<u32>) -> Result<(), String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        if let Some(parent) = Path::new(output_path).parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let mut args =
            vec!["-sseof".to_string(), "-1".to_string(), "-i".to_string(), input_path.to_string(), "-vframes".to_string(), "1".to_string()];
        if let (Some(w), Some(h)) = (width, height) {
            args.push("-vf".to_string());
            args.push(format!("scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2", w, h, w, h));
        } else if let Some(w) = width {
            args.push("-vf".to_string());
            args.push(format!("scale={}:-1", w));
        } else if let Some(h) = height {
            args.push("-vf".to_string());
            args.push(format!("scale=-1:{}", h));
        }
        args.push("-y".to_string());
        args.push(output_path.to_string());
        let output = Command::new(&self.bin_path).args(&args).output().map_err(|e| format!("Failed to extract last frame: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }
        Ok(())
    }
    /// Extract frames from video with custom options
    ///
    /// Extracts multiple frames from a video file using the specified options.
    /// Supports custom frame rate, dimensions, start time, and duration.
    ///
    /// # Arguments
    /// * `input_path` - Path to the input video file
    /// * `options` - Frame extraction options
    ///
    /// # Returns
    /// * `Ok(Vec<String>)` - List of extracted frame file paths
    /// * `Err(String)` - Error message if extraction fails
    pub fn extract_frames(&self, input_path: &str, options: &FrameExtractOptions) -> Result<Vec<String>, String> {
        if !Path::new(input_path).exists() {
            return Err(format!("Input file not found: {}", input_path));
        }
        let output_dir = Path::new(&options.output_dir);
        if !output_dir.exists() {
            fs::create_dir_all(output_dir).map_err(|e| format!("Failed to create output directory: {}", e))?;
        }
        let pattern = options.filename_pattern.as_deref().unwrap_or("frame_%04d.png");
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
            vf_parts.push(format!("scale={}:{}:force_original_aspect_ratio=decrease", w, h));
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
            let ext_str = if options.format == "jpg" || options.format == "jpeg" { "jpg" } else { "png" };
            parent.join(format!("{}_%04d.{}", stem.to_string_lossy(), ext_str)).to_string_lossy().to_string()
        };
        args.push("-y".to_string());
        args.push(final_pattern.clone());
        let output = Command::new(&self.bin_path).args(&args).output().map_err(|e| format!("Failed to extract frames: {}", e))?;
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
    /// Get the total number of frames in a video file
    ///
    /// # Arguments
    /// * `input_path` - Path to the video file
    ///
    /// # Returns
    /// * `Ok(u64)` - Total number of frames
    /// * `Err(String)` - Error message if counting fails
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
        stdout.trim().parse::<u64>().map_err(|e| format!("Failed to parse frame count: {}", e))
    }
    /// Reset the persistent ffmpeg process
    ///
    /// Kills the current persistent process and starts a new one with the
    /// specified video file.
    ///
    /// # Arguments
    /// * `video_path` - Path to the video file
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(String)` - Error message if reset fails
    pub fn reset_persistent(&self, video_path: &str) -> Result<(), String> {
        // Clean up existing persistent process
        let mut guard = self.persistent.lock().unwrap();
        if let Some(mut proc) = guard.take() {
            let _ = proc.child.kill();
        }
        drop(guard);
        // Initialize new persistent process
        self.init_persistent(video_path)?;
        Ok(())
    }
    /// Extract a single frame at the specified timestamp from a video file
    ///
    /// Saves a single frame from the video at the given timestamp to the
    /// specified output path with optional scaling and quality control.
    ///
    /// # Arguments
    /// * `source_path` - Path to the source video file
    /// * `timestamp` - Timestamp in seconds to extract the frame from
    /// * `output_path` - Path where the extracted frame will be saved
    /// * `width` - Optional output width (maintains aspect ratio if height not specified)
    /// * `height` - Optional output height (maintains aspect ratio if width not specified)
    /// * `quality` - JPEG quality (1-31, lower is better, default 2)
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(String)` - Error message if extraction fails
    pub fn extract_frame_at(
        &self,
        source_path: &str,
        timestamp: f64,
        output_path: &Path,
        width: Option<f64>,
        height: Option<f64>,
        quality: Option<u32>,
    ) -> Result<(), String> {
        if !Path::new(source_path).exists() {
            return Err(format!("Source file not found: {}", source_path));
        }
        if let Some(parent) = output_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent).map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let mut args =
            vec!["-ss".to_string(), timestamp.to_string(), "-i".to_string(), source_path.to_string(), "-vframes".to_string(), "1".to_string()];
        if let (Some(w), Some(h)) = (width, height) {
            args.push("-vf".to_string());
            args.push(format!("scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:(ow-iw)/2:(oh-ih)/2", w, h, w, h));
        } else if let Some(w) = width {
            args.push("-vf".to_string());
            args.push(format!("scale={}:-1", w));
        } else if let Some(h) = height {
            args.push("-vf".to_string());
            args.push(format!("scale=-1:{}", h));
        }
        let q = quality.unwrap_or(2);
        args.push("-q:v".to_string());
        args.push(q.to_string());
        args.push("-y".to_string());
        args.push(output_path.to_string_lossy().to_string());
        let output = Command::new(&self.bin_path).args(&args).output().map_err(|e| format!("FFmpeg failed: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg error: {}", stderr));
        }
        Ok(())
    }
}
/// Automatic cleanup of persistent ffmpeg process when Ffmpeg instance is dropped
///
/// This ensures that no orphaned ffmpeg processes remain, even if the instance
/// is dropped abruptly. The cleanup is graceful (sends 'q' command) but also
/// forcefully kills the process if it doesn't exit within 1 second.
impl Drop for Ffmpeg {
    fn drop(&mut self) {
        let mut guard = self.persistent.lock().unwrap();
        if let Some(mut proc) = guard.take() {
            // Send quit command to gracefully terminate ffmpeg
            let _ = proc.stdin.write_all(b"q\n");
            let _ = proc.stdin.flush();
            // Wait up to 1 second for graceful exit
            let start = std::time::Instant::now();
            while start.elapsed() < std::time::Duration::from_secs(1) {
                if let Ok(Some(_)) = proc.child.try_wait() {
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(50));
            }
            // Force kill the process if it's still running
            let _ = proc.child.kill();
            let _ = proc.child.wait();
            // Explicitly drop stdin/stdout to release resources early
            drop(proc.stdin);
            drop(proc.stdout);
        }
        drop(guard);
    }
}
