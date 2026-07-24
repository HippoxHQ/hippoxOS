use std::{path::{Path, PathBuf}, thread, time::Duration};

use crate::{commands::{PREVIEW_HEIGHT, PREVIEW_WIDTH}, commons::{Ffmpeg, FileUtils}};

/// Video decoding options for frame extraction
///
/// Controls the parameters for decoding video files into frame sequences,
/// including frame rate, output dimensions, quality, and audio extraction.
pub struct DecodeVideoOptions {
    /// Target frames per second for the output sequence
    pub fps: f64,
    /// Duration in seconds to decode
    pub duration: f64,
    /// Output width in pixels
    pub width: f64,
    /// Output height in pixels
    pub height: f64,
    /// JPEG quality (1-31, lower = better quality)
    pub quality: u32,
    /// Whether to extract audio track alongside video frames
    pub extract_audio: bool,
}

impl Default for DecodeVideoOptions {
    fn default() -> Self {
        Self { fps: 30.0, duration: 0.0, width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, quality: 10, extract_audio: true }
    }
}

/// Image decoding options
///
/// Controls the parameters for decoding image files into frame sequences,
/// useful for static images that need to be treated as video frames.
pub struct DecodeImageOptions {
    /// Target frames per second for the output sequence
    pub fps: f64,
    /// Duration in seconds for the image display
    pub duration: f64,
    /// Output width in pixels
    pub width: f64,
    /// Output height in pixels
    pub height: f64,
    /// JPEG quality (1-31, lower = better quality)
    pub quality: u32,
}

impl Default for DecodeImageOptions {
    fn default() -> Self {
        Self { fps: 1.0, duration: 5.0, width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, quality: 10 }
    }
}

/// GIF decoding options
///
/// Controls the parameters for decoding GIF files into frame sequences,
/// with support for frame rate limiting and maximum frame count.
pub struct DecodeGifOptions {
    /// Target frames per second for the output sequence
    pub fps: f64,
    /// Duration in seconds to decode
    pub duration: f64,
    /// Output width in pixels
    pub width: f64,
    /// Output height in pixels
    pub height: f64,
    /// JPEG quality (1-31, lower = better quality)
    pub quality: u32,
    /// Maximum number of frames to extract
    pub max_frames: u64,
}

impl Default for DecodeGifOptions {
    fn default() -> Self {
        Self { fps: 1.0, duration: 5.0, width: PREVIEW_WIDTH, height: PREVIEW_HEIGHT, quality: 10, max_frames: 300 }
    }
}

impl Ffmpeg {
    /// Decode video: generate frame sequence + optionally extract audio
    ///
    /// Decodes a video file into a sequence of JPEG frames and optionally
    /// extracts the audio track as PCM. Frames are saved with sequential
    /// numbering in the specified output directory.
    ///
    /// # Arguments
    /// * `source_path` - Path to the source video file
    /// * `frames_dir` - Directory where frame images will be saved
    /// * `audio_path` - Path where the extracted audio will be saved
    /// * `options` - Decoding options (fps, dimensions, quality, etc.)
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(String)` - Error message if decoding fails
    pub fn decode_video(&self, source_path: &str, frames_dir: &Path, audio_path: &Path, options: &DecodeVideoOptions) -> Result<(), String> {
        let source_path = Path::new(source_path);
        if !source_path.exists() {
            return Err(format!("Source file not found: {}", source_path.display()));
        }
        FileUtils::ensure_dir(frames_dir).map_err(|e| format!("Failed to create frames dir: {:?}", e))?;
        let source_path_str = source_path.to_string_lossy().to_string();
        let frames_dir_str = frames_dir.to_string_lossy().to_string();
        let fps = options.fps;
        let width = options.width;
        let height = options.height;
        let quality = options.quality.to_string();
        let source_path_clone = source_path_str.clone();
        let frames_dir_clone = frames_dir_str.clone();
        let fps_clone = fps;
        let width_clone = width;
        let height_clone = height;
        let quality_clone = quality.clone();
        let jpg_handle = thread::spawn(move || {
            let max_retries = 2;
            let mut attempt = 0;
            loop {
                attempt += 1;
                let output = std::process::Command::new("ffmpeg")
                    .args([
                        "-i",
                        &source_path_clone,
                        "-vf",
                        &format!("fps={},scale={}:{}", fps_clone, width_clone, height_clone),
                        "-f",
                        "image2",
                        "-q:v",
                        &quality_clone,
                        &format!("{}/%06d.jpg", frames_dir_clone),
                    ])
                    .output();
                let result = match output {
                    Ok(output) if output.status.success() => Ok(()),
                    Ok(output) => {
                        let stderr = String::from_utf8_lossy(&output.stderr);
                        Err(format!("FFmpeg JPG error: {}", stderr))
                    }
                    Err(e) => Err(format!("FFmpeg JPG failed: {}", e)),
                };
                if result.is_ok() || attempt > max_retries + 1 {
                    break result;
                }
                thread::sleep(Duration::from_millis(500));
            }
        });
        if options.extract_audio {
            let audio_path_str = audio_path.to_string_lossy().to_string();
            let source_path_clone2 = source_path_str.clone();
            let audio_handle = thread::spawn(move || {
                let max_retries = 2;
                let mut attempt = 0;
                loop {
                    attempt += 1;
                    let output = std::process::Command::new("ffmpeg")
                        .args(["-i", &source_path_clone2, "-vn", "-acodec", "pcm_s16le", "-ar", "44100", "-ac", "2", "-y", &audio_path_str])
                        .output();
                    let result = match output {
                        Ok(output) if output.status.success() => Ok(()),
                        Ok(output) => {
                            let stderr = String::from_utf8_lossy(&output.stderr);
                            if stderr.contains("Output file does not contain any stream") {
                                Ok(())
                            } else {
                                Err(format!("FFmpeg audio error: {}", stderr))
                            }
                        }
                        Err(e) => Err(format!("FFmpeg audio failed: {}", e)),
                    };
                    if result.is_ok() || attempt > max_retries + 1 {
                        break result;
                    }
                    thread::sleep(Duration::from_millis(500));
                }
            });
            let _ = audio_handle.join();
        }
        let _ = jpg_handle.join();
        let frame_count = self.count_frames(frames_dir);
        if frame_count == 0 {
            return Err("No frames extracted".to_string());
        }
        Ok(())
    }
    
    /// Decode GIF: generate frame sequence
    ///
    /// Decodes a GIF file into a sequence of JPEG frames. Handles frame
    /// rate conversion and limits the total number of frames extracted.
    ///
    /// # Arguments
    /// * `source_path` - Path to the source GIF file
    /// * `frames_dir` - Directory where frame images will be saved
    /// * `options` - Decoding options (fps, dimensions, quality, etc.)
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(String)` - Error message if decoding fails
    pub fn decode_gif(&self, source_path: &str, frames_dir: &Path, options: &DecodeGifOptions) -> Result<(), String> {
        let source_path = Path::new(source_path);
        if !source_path.exists() {
            return Err(format!("Source file not found: {}", source_path.display()));
        }
        if frames_dir.exists() {
            let existing_count = self.count_frames(frames_dir);
            if existing_count > 0 {
                return Ok(());
            }
        }
        FileUtils::ensure_dir(frames_dir).map_err(|e| format!("Failed to create frames dir: {:?}", e))?;
        let source_path_str = source_path.to_string_lossy().to_string();
        let frames_dir_str = frames_dir.to_string_lossy().to_string();
        let fps = options.fps;
        let duration = options.duration;
        let width = options.width;
        let height = options.height;
        let quality = options.quality.to_string();
        let max_frames = options.max_frames;
        let raw_frame_count = (duration * fps) as u64;
        let frame_count = if raw_frame_count > max_frames { max_frames } else { raw_frame_count };
        let frame_count = if frame_count == 0 { 1 } else { frame_count };
        let output = std::process::Command::new("ffmpeg")
            .args([
                "-i",
                &source_path_str,
                "-vf",
                &format!("fps={},scale={}:{}", fps, width, height),
                "-f",
                "image2",
                "-q:v",
                &quality,
                &format!("{}/%06d.jpg", frames_dir_str),
            ])
            .output()
            .map_err(|e| format!("FFmpeg failed: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg GIF extraction failed: {}", stderr));
        }
        let frame_count = self.count_frames(frames_dir);
        if frame_count == 0 {
            return Err("No frames extracted".to_string());
        }
        Ok(())
    }
    
    /// Decode image: generate frame sequence (single frame or multiple frames)
    ///
    /// Decodes an image file into one or more frames. For static images,
    /// the frame is duplicated to fill the desired duration.
    ///
    /// # Arguments
    /// * `source_path` - Path to the source image file
    /// * `frames_dir` - Directory where frame images will be saved
    /// * `options` - Decoding options (fps, duration, dimensions, quality)
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(String)` - Error message if decoding fails
    pub fn decode_image(&self, source_path: &str, frames_dir: &Path, options: &DecodeImageOptions) -> Result<(), String> {
        let source_path = Path::new(source_path);
        if !source_path.exists() {
            return Err(format!("Source file not found: {}", source_path.display()));
        }
        if frames_dir.exists() {
            let existing_count = self.count_frames(frames_dir);
            if existing_count > 0 {
                let first_frame = frames_dir.join("000001.jpg");
                if first_frame.exists() {
                    if let Ok(reader) = image::ImageReader::open(&first_frame) {
                        if reader.into_dimensions().is_ok() {
                            return Ok(());
                        }
                    }
                    let _ = std::fs::remove_file(&first_frame);
                }
            }
        }
        FileUtils::ensure_dir(frames_dir).map_err(|e| format!("Failed to create frames dir: {:?}", e))?;
        let source_path_str = source_path.to_string_lossy().to_string();
        let frames_dir_str = frames_dir.to_string_lossy().to_string();
        let fps = options.fps;
        let duration = options.duration;
        let width = options.width;
        let height = options.height;
        let quality = options.quality.to_string();
        let frame_count = (duration * fps).ceil() as u64;
        let frame_count = if frame_count == 0 { 1 } else { frame_count };
        let output = std::process::Command::new("ffmpeg")
            .args([
                "-i",
                &source_path_str,
                "-vf",
                &format!("fps={},scale={}:{},format=yuvj420p", fps, width, height),
                "-frames:v",
                &frame_count.to_string(),
                "-f",
                "image2",
                "-q:v",
                &quality,
                &format!("{}/%06d.jpg", frames_dir_str),
            ])
            .output();
        let mut success = false;
        if let Ok(output) = output {
            if output.status.success() {
                let first_frame = frames_dir.join("000001.jpg");
                if first_frame.exists() {
                    if let Ok(reader) = image::ImageReader::open(&first_frame) {
                        if reader.into_dimensions().is_ok() {
                            success = true;
                        }
                    }
                }
            }
        }
        if !success {
            match image::ImageReader::open(source_path) {
                Ok(reader) => match reader.decode() {
                    Ok(dynamic_img) => {
                        let rgb_img = dynamic_img.to_rgb8();
                        let frame_path = frames_dir.join("000001.jpg");
                        let _ = rgb_img.save(&frame_path);
                        if frame_path.exists() {
                            if let Ok(reader) = image::ImageReader::open(&frame_path) {
                                if reader.into_dimensions().is_ok() {
                                    for i in 2..=frame_count {
                                        let frame_path = frames_dir.join(format!("{:06}.jpg", i));
                                        let _ = std::fs::copy(&frames_dir.join("000001.jpg"), &frame_path);
                                    }
                                    success = true;
                                }
                            }
                        }
                    }
                    Err(_) => {}
                },
                Err(_) => {}
            }
        }
        if !success {
            let frame_path = frames_dir.join("000001.jpg");
            let _ = std::fs::copy(source_path, &frame_path);
            for i in 2..=frame_count {
                let frame_path = frames_dir.join(format!("{:06}.jpg", i));
                let _ = std::fs::copy(source_path, &frame_path);
            }
            if frame_path.exists() && frame_path.metadata().map(|m| m.len() > 0).unwrap_or(false) {
                success = true;
            }
        }
        if !success {
            return Err("Failed to generate any frame".to_string());
        }
        let frame_count = self.count_frames(frames_dir);
        if frame_count == 0 {
            return Err("No frames extracted".to_string());
        }
        Ok(())
    }

    /// Decode text: generate a single preview frame
    ///
    /// Renders text content as a single JPEG frame for preview purposes.
    ///
    /// # Arguments
    /// * `source_path` - Path to the text file
    /// * `output_path` - Path where the preview frame will be saved
    ///
    /// # Returns
    /// * `Ok(())` on success
    /// * `Err(String)` - Error message if rendering fails
    pub fn decode_text(&self, source_path: &str, output_path: &Path) -> Result<(), String> {
        let source_path = Path::new(source_path);
        if !source_path.exists() {
            return Err(format!("Source file not found: {}", source_path.display()));
        }
        if output_path.exists() {
            return Ok(());
        }
        if let Some(parent) = output_path.parent() {
            FileUtils::ensure_dir(parent).map_err(|e| format!("Failed to create output dir: {:?}", e))?;
        }
        let frame_data = self.extract_frame(source_path.to_str().unwrap(), 0.0)?;
        std::fs::write(output_path, &frame_data).map_err(|e| format!("Failed to write frame: {}", e))?;
        Ok(())
    }

    /// Count the number of frames in a directory
    ///
    /// Counts JPEG/JPG files in the given directory. Used to verify
    /// frame extraction results.
    ///
    /// # Arguments
    /// * `dir` - Directory to scan for frames
    ///
    /// # Returns
    /// * `u64` - Number of frame files found
    pub fn count_frames(&self, dir: &Path) -> u64 {
        if !dir.exists() {
            return 0;
        }
        if let Ok(entries) = std::fs::read_dir(dir) {
            entries
                .filter_map(|e| e.ok())
                .filter(|e| e.path().extension().and_then(|ext| ext.to_str()).map(|s| s == "jpg" || s == "jpeg").unwrap_or(false))
                .count() as u64
        } else {
            0
        }
    }
    /// Get frame sequence information (frame count, file paths, etc.)
    ///
    /// Scans a directory and returns the count and sorted list of
    /// all JPEG frame files in the directory.
    ///
    /// # Arguments
    /// * `frames_dir` - Directory containing frame files
    ///
    /// # Returns
    /// * `Ok((u64, Vec<String>))` - Frame count and list of file paths
    /// * `Err(String)` - Error message if directory cannot be read
    pub fn get_frame_sequence_info(&self, frames_dir: &Path) -> Result<(u64, Vec<String>), String> {
        if !frames_dir.exists() {
            return Err(format!("Frames directory not found: {}", frames_dir.display()));
        }
        let mut frame_files: Vec<PathBuf> = Vec::new();
        for entry in std::fs::read_dir(frames_dir).map_err(|e| format!("Failed to read dir: {}", e))? {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            if path.is_file() {
                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                if ext == "jpg" || ext == "jpeg" {
                    frame_files.push(path);
                }
            }
        }
        frame_files.sort();
        let frame_paths: Vec<String> = frame_files.iter().map(|p| p.to_string_lossy().to_string()).collect();
        Ok((frame_paths.len() as u64, frame_paths))
    }
}
