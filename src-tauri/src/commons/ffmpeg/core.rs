use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

#[derive(Clone)]
pub struct Ffmpeg {
    pub bin_path: String,
    pub persistent: std::sync::Arc<std::sync::Mutex<Option<PersistentProcess>>>,
}

pub struct PersistentProcess {
    pub child: Child,
    pub stdin: ChildStdin,
    pub stdout: ChildStdout,
    pub video_path: String,
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
pub struct VideoInfo {
    pub width: u32,
    pub height: u32,
    pub duration: f64,
    pub fps: f64,
    pub bitrate: u64,
    pub codec: String,
    pub path: String,
    pub aspect_ratio: Option<String>,
    pub pixel_format: Option<String>,
    pub color_space: Option<String>,
    pub bit_depth: Option<u32>,
    pub frame_count: Option<u64>,
    pub keyframe_count: Option<u64>,
    pub has_audio: bool,
    pub audio_codec: Option<String>,
    pub audio_sample_rate: Option<u32>,
    pub audio_channels: Option<u32>,
    pub audio_bitrate: Option<u64>,
    pub file_size: Option<u64>,
    pub container_format: Option<String>,
    pub creation_time: Option<String>,
    pub tags: Option<serde_json::Value>,
    pub video_stream_index: Option<u32>,
    pub audio_stream_index: Option<u32>,
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
            persistent: std::sync::Arc::new(std::sync::Mutex::new(None)),
        }
    }

    pub fn with_bin_path(path: &str) -> Self {
        Self {
            bin_path: path.to_string(),
            persistent: std::sync::Arc::new(std::sync::Mutex::new(None)),
        }
    }

    pub fn init_persistent(&self, video_path: &str) -> Result<(), String> {
        let mut guard = self.persistent.lock().unwrap();

        if let Some(ref mut proc) = *guard {
            if proc.video_path == video_path {
                return Ok(());
            }
            let _ = proc.child.kill();
            *guard = None;
        }

        println!("[FFmpeg] Starting persistent process for: {}", video_path);

        let mut child = Command::new(&self.bin_path)
            .args([
                "-i",
                video_path,
                "-f",
                "image2pipe",
                "-vcodec",
                "mjpeg",
                "-q:v",
                "2",
                "-",
            ])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start persistent ffmpeg: {}", e))?;

        let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to get stdout")?;

        *guard = Some(PersistentProcess {
            child,
            stdin,
            stdout,
            video_path: video_path.to_string(),
        });

        println!("[FFmpeg] Persistent process started successfully");
        Ok(())
    }

    pub fn extract_frame_persistent(&self, time: f64) -> Result<Vec<u8>, String> {
        let mut guard = self.persistent.lock().unwrap();
        let proc = guard
            .as_mut()
            .ok_or("Persistent process not initialized. Call init_persistent() first.")?;

        let seek_cmd = format!("seek {} 2\n", time);
        proc.stdin
            .write_all(seek_cmd.as_bytes())
            .map_err(|e| format!("Failed to send seek command: {}", e))?;
        proc.stdin
            .flush()
            .map_err(|e| format!("Failed to flush stdin: {}", e))?;

        let mut buffer = Vec::new();
        let mut temp = [0u8; 65536];
        let mut found_jpeg = false;

        loop {
            let n = proc
                .stdout
                .read(&mut temp)
                .map_err(|e| format!("Failed to read frame data: {}", e))?;
            if n == 0 {
                break;
            }
            buffer.extend_from_slice(&temp[..n]);

            if buffer.len() > 2 {
                let last_two = &buffer[buffer.len() - 2..];
                if last_two == [0xFF, 0xD9] {
                    found_jpeg = true;
                    break;
                }
            }
        }

        if !found_jpeg && !buffer.is_empty() {
            println!(
                "[FFmpeg] Warning: JPEG end marker not found, returning {} bytes",
                buffer.len()
            );
        }

        if buffer.is_empty() {
            return Err("No frame data received from persistent process".to_string());
        }

        Ok(buffer)
    }

    pub fn cleanup_persistent(&self) {
        let mut guard = self.persistent.lock().unwrap();
        if let Some(mut proc) = guard.take() {
            let _ = proc.child.kill();
            println!("[FFmpeg] Persistent process cleaned up");
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

    pub fn extract_frame(&self, video_path: &str, time: f64) -> Result<Vec<u8>, String> {
        let output = Command::new(&self.bin_path)
            .args([
                "-ss",
                &time.to_string(),
                "-i",
                video_path,
                "-vframes",
                "1",
                "-f",
                "image2pipe",
                "-vcodec",
                "mjpeg",
                "-",
            ])
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

    pub fn get_video_info(&self, path: &str) -> Result<VideoInfo, String> {
        let path_obj = Path::new(path);
        if !path_obj.exists() {
            return Err(format!("File not found: {}", path));
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

        let json: serde_json::Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("Failed to parse ffprobe output: {}", e))?;

        let mut info = Self::parse_video_info_json(&json, path)?;

        if let Ok(count) = self.get_keyframe_count(path) {
            info.keyframe_count = Some(count);
        } else {
            info.keyframe_count = None;
        }

        Ok(info)
    }

    fn parse_video_info_json(json: &serde_json::Value, path: &str) -> Result<VideoInfo, String> {
        let streams = json["streams"].as_array().ok_or("No streams found")?;
        let video_stream = streams
            .iter()
            .find(|s| s["codec_type"].as_str() == Some("video"))
            .ok_or("No video stream found")?;
        let audio_stream = streams
            .iter()
            .find(|s| s["codec_type"].as_str() == Some("audio"));
        let format = &json["format"];
        let width = video_stream["width"].as_u64().unwrap_or(0) as u32;
        let height = video_stream["height"].as_u64().unwrap_or(0) as u32;
        let fps_str = video_stream["r_frame_rate"].as_str().unwrap_or("0/0");
        let fps = parse_fraction(fps_str).unwrap_or(0.0);
        let codec = video_stream["codec_name"]
            .as_str()
            .unwrap_or("unknown")
            .to_string();
        let frame_count = video_stream["nb_frames"]
            .as_str()
            .and_then(|s| s.parse::<u64>().ok());
        let file_size = format["size"].as_str().and_then(|s| s.parse::<u64>().ok());
        let duration_from_frames = frame_count
            .and_then(|fc| {
                if fps > 0.0 {
                    Some(fc as f64 / fps)
                } else {
                    None
                }
            })
            .unwrap_or(0.0);
        let duration = format["duration"]
            .as_str()
            .and_then(|s| s.parse::<f64>().ok())
            .or_else(|| format["duration"].as_f64())
            .or_else(|| {
                video_stream["duration"]
                    .as_str()
                    .and_then(|s| s.parse::<f64>().ok())
            })
            .or_else(|| video_stream["duration"].as_f64())
            .or_else(|| {
                if duration_from_frames > 0.0 {
                    Some(duration_from_frames)
                } else {
                    None
                }
            })
            .unwrap_or(0.0);
        let bitrate = format["bit_rate"]
            .as_str()
            .and_then(|s| s.parse::<u64>().ok())
            .or_else(|| format["bit_rate"].as_u64())
            .or_else(|| {
                video_stream["bit_rate"]
                    .as_str()
                    .and_then(|s| s.parse::<u64>().ok())
            })
            .or_else(|| video_stream["bit_rate"].as_u64())
            .unwrap_or(0);
        let mut final_bitrate = bitrate;
        if final_bitrate == 0 {
            if let Some(size) = file_size {
                let dur = if duration > 0.0 {
                    duration
                } else {
                    duration_from_frames
                };
                if dur > 0.0 {
                    final_bitrate = ((size as f64 * 8.0) / dur) as u64;
                }
            }
        }
        let aspect_ratio = if width > 0 && height > 0 {
            let gcd = gcd(width as u64, height as u64);
            Some(format!("{}:{}", width / gcd as u32, height / gcd as u32))
        } else {
            None
        };
        let pixel_format = video_stream["pix_fmt"].as_str().map(|s| s.to_string());
        let color_space = video_stream["color_space"].as_str().map(|s| s.to_string());
        let bit_depth = video_stream["bit_depth"].as_u64().map(|v| v as u32);
        let video_index = video_stream["index"].as_u64().map(|v| v as u32);
        let audio_index = audio_stream.and_then(|s| s["index"].as_u64().map(|v| v as u32));
        let container_format = format["format_name"].as_str().map(|s| s.to_string());
        let creation_time = format["creation_time"].as_str().map(|s| s.to_string());
        let tags = if let Some(tags_obj) = format["tags"].as_object() {
            Some(serde_json::Value::Object(tags_obj.clone()))
        } else {
            None
        };
        let has_audio = audio_stream.is_some();
        let audio_codec = audio_stream
            .and_then(|s| s["codec_name"].as_str())
            .map(|s| s.to_string());
        let audio_sample_rate = audio_stream
            .and_then(|s| s["sample_rate"].as_str())
            .and_then(|s| s.parse::<u32>().ok());
        let audio_channels = audio_stream
            .and_then(|s| s["channels"].as_u64())
            .map(|v| v as u32);
        let audio_bitrate = audio_stream
            .and_then(|s| s["bit_rate"].as_str())
            .and_then(|s| s.parse::<u64>().ok());
        Ok(VideoInfo {
            width,
            height,
            duration: if duration > 0.0 {
                duration
            } else {
                duration_from_frames
            },
            fps,
            bitrate: final_bitrate,
            codec,
            path: path.to_string(),
            aspect_ratio,
            pixel_format,
            color_space,
            bit_depth,
            frame_count,
            keyframe_count: None,
            has_audio,
            audio_codec,
            audio_sample_rate,
            audio_channels,
            audio_bitrate,
            file_size,
            container_format,
            creation_time,
            tags,
            video_stream_index: video_index,
            audio_stream_index: audio_index,
        })
    }

    pub fn get_keyframe_count(&self, path: &str) -> Result<u64, String> {
        if !Path::new(path).exists() {
            return Err(format!("File not found: {}", path));
        }
        let output = Command::new("ffprobe")
            .args([
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "packet=flags",
                "-of",
                "csv=p=0",
                path,
            ])
            .output()
            .map_err(|e| format!("Failed to get keyframes: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("ffprobe failed: {}", stderr));
        }
        let stdout = String::from_utf8_lossy(&output.stdout);
        let count = stdout.lines().filter(|line| line.contains('K')).count();
        if count == 0 {
            let output2 = Command::new("ffprobe")
                .args([
                    "-v",
                    "error",
                    "-select_streams",
                    "v:0",
                    "-show_entries",
                    "frame=key_frame",
                    "-of",
                    "csv=p=0",
                    path,
                ])
                .output()
                .map_err(|e| format!("Failed to get keyframes (method 2): {}", e))?;
            if output2.status.success() {
                let stdout2 = String::from_utf8_lossy(&output2.stdout);
                let count2 = stdout2.lines().filter(|line| line.trim() == "1").count();
                return Ok(count2 as u64);
            }
        }
        if count == 0 {
            let output3 = Command::new("ffmpeg")
                .args([
                    "-i",
                    path,
                    "-vf",
                    "select='eq(pict_type,I)'",
                    "-vsync",
                    "0",
                    "-f",
                    "null",
                    "-",
                ])
                .stderr(std::process::Stdio::piped())
                .output()
                .map_err(|e| format!("Failed to get keyframes (method 3): {}", e))?;
            if !output3.status.success() {
                let stderr = String::from_utf8_lossy(&output3.stderr);
                if let Some(caps) = stderr.lines().find(|line| line.contains("frame=")) {
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
        }
        Ok(count as u64)
    }

    pub fn get_video_info_json(&self, path: &str) -> Result<serde_json::Value, String> {
        let info = self.get_video_info(path)?;
        Ok(serde_json::json!({
            "width": info.width,
            "height": info.height,
            "duration": info.duration,
            "fps": info.fps,
            "bitrate": info.bitrate,
            "codec": info.codec,
            "path": info.path,
            "aspect_ratio": info.aspect_ratio,
            "pixel_format": info.pixel_format,
            "color_space": info.color_space,
            "bit_depth": info.bit_depth,
            "frame_count": info.frame_count,
            "keyframe_count": info.keyframe_count,
            "has_audio": info.has_audio,
            "audio_codec": info.audio_codec,
            "audio_sample_rate": info.audio_sample_rate,
            "audio_channels": info.audio_channels,
            "audio_bitrate": info.audio_bitrate,
            "file_size": info.file_size,
            "container_format": info.container_format,
            "creation_time": info.creation_time,
            "tags": info.tags,
            "video_stream_index": info.video_stream_index,
            "audio_stream_index": info.audio_stream_index,
        }))
    }

    pub fn create_empty_video(
        &self,
        output_path: &str,
        duration: f64,
        width: u32,
        height: u32,
        fps: f64,
    ) -> Result<String, String> {
        let path = Path::new(output_path);
        if let Some(parent) = path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create output directory: {}", e))?;
            }
        }
        let args = vec![
            "-f".to_string(),
            "lavfi".to_string(),
            "-i".to_string(),
            format!(
                "color=c=black:s={}x{}:d={}:r={}",
                width, height, duration, fps
            ),
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

        let output = Command::new(&self.bin_path)
            .args(&args)
            .output()
            .map_err(|e| format!("Failed to create empty video: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg failed: {}", stderr));
        }

        Ok(output_path.to_string())
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

        let output = Command::new(&self.bin_path)
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

        let output = Command::new(&self.bin_path)
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

        let output = Command::new(&self.bin_path)
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

        let output = Command::new(&self.bin_path)
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

fn gcd(a: u64, b: u64) -> u64 {
    if b == 0 {
        a
    } else {
        gcd(b, a % b)
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
