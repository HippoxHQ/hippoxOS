use serde::{Deserialize, Serialize};
use std::process::{Child, ChildStdin, ChildStdout};
use uuid::Uuid;

/// Persistent ffmpeg process for fast frame extraction
///
/// Holds the child process handles and state for a persistent ffmpeg
/// process that can extract frames without restarting for each request.
pub struct PersistentProcess {
    /// Child process handle
    pub child: Child,
    /// Standard input pipe for sending commands
    pub stdin: ChildStdin,
    /// Standard output pipe for receiving frame data
    pub stdout: ChildStdout,
    /// Path of the video file currently loaded in the process
    pub video_path: String,
}

/// Thumbnail generation options
///
/// Controls the parameters for extracting a single frame as a thumbnail
/// image, including timestamp, dimensions, and output path.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThumbnailOptions {
    /// Timestamp in seconds to extract the frame from
    pub time: f64,
    /// Optional output width in pixels
    pub width: Option<u32>,
    /// Optional output height in pixels
    pub height: Option<u32>,
    /// Optional custom output path
    pub output_path: Option<String>,
}

/// Frame extraction options for batch processing
///
/// Controls the parameters for extracting multiple frames from a video,
/// including frame rate, time range, dimensions, and output format.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FrameExtractOptions {
    /// Output directory for extracted frames
    pub output_dir: String,
    /// Optional filename pattern (e.g., "frame_%04d.png")
    pub filename_pattern: Option<String>,
    /// Optional target frame rate for the output sequence
    pub fps: Option<f64>,
    /// Optional start time in seconds
    pub start: Option<f64>,
    /// Optional duration in seconds
    pub duration: Option<f64>,
    /// Optional output width in pixels
    pub width: Option<u32>,
    /// Optional output height in pixels
    pub height: Option<u32>,
    /// Output image format ("jpg", "jpeg", or "png")
    pub format: String,
    /// Optional quality setting for JPEG (1-100)
    pub quality: Option<u32>,
}

/// Preview quality levels for frame extraction
///
/// Controls the trade-off between image quality and file size
/// when extracting preview frames.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PreviewQuality {
    /// Best quality, largest file size (q=2)
    Excellent,
    /// High quality (q=6)
    High,
    /// Medium quality (q=10)
    Medium,
    /// Low quality (q=15)
    Low,
    /// Lowest quality, smallest file size (q=20)
    VeryLow,
}

impl PreviewQuality {
    /// Convert quality level to ffmpeg q:v value
    ///
    /// Returns the numeric q value used by ffmpeg's JPEG encoder,
    /// where lower numbers mean better quality and larger file sizes.
    ///
    /// # Returns
    /// * `u32` - The q value (1-31)
    pub fn as_q_value(&self) -> u32 {
        match self {
            PreviewQuality::Excellent => 2,
            PreviewQuality::High => 6,
            PreviewQuality::Medium => 10,
            PreviewQuality::Low => 15,
            PreviewQuality::VeryLow => 20,
        }
    }
}

/// Default preview quality for frame extraction
pub const PREVIEW_FRAME_QUALITY: PreviewQuality = PreviewQuality::Medium;

/// Basic metadata structure for video files
///
/// Contains essential video information including dimensions,
/// duration, frame rate, codec, and bitrate.
#[derive(Debug, Clone)]
pub struct BasicMetadata {
    /// Duration in seconds
    pub duration: f64,
    /// Video width in pixels
    pub width: f64,
    /// Video height in pixels
    pub height: f64,
    /// Frames per second
    pub fps: f64,
    /// Codec name
    pub codec: String,
    /// Bitrate in bits per second
    pub bitrate: u64,
}

/// Image metadata structure
///
/// Contains information about image files including dimensions,
/// frame rate, and duration (useful for animated images like GIFs).
#[derive(Debug, Clone)]
pub struct ImageMetadata {
    /// Image width in pixels
    pub width: f64,
    /// Image height in pixels
    pub height: f64,
    /// Frames per second (1.0 for static images)
    pub fps: f64,
    /// Duration in seconds (5.0 default for static images)
    pub duration: f64,
}

// Audio Metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioMetadata {
    // ===== Core Information =====
    pub duration: f64,    // Duration in seconds
    pub sample_rate: u32, // Sample rate in Hz
    pub channels: u32,    // Number of audio channels
    pub codec: String,    // Audio codec name
    pub file_size: u64,   // File size in bytes
    // ===== Audio Quality =====
    pub bit_depth: Option<u32>,         // Bit depth (16, 24, 32)
    pub bitrate: Option<u64>,           // Bitrate in bps
    pub sample_format: Option<String>,  // Sample format (fltp, s16p, etc.)
    pub channel_layout: Option<String>, // Channel layout (stereo, 5.1, etc.)
    // ===== ID3 Metadata =====
    pub title: Option<String>,     // Track title
    pub artist: Option<String>,    // Artist name
    pub album: Option<String>,     // Album name
    pub genre: Option<String>,     // Music genre
    pub year: Option<u32>,         // Release year
    pub track_number: Option<u32>, // Track number
}

impl AudioMetadata {
    /// Parse audio metadata from ffprobe JSON output
    ///
    /// Extracts all available audio metadata from the ffprobe JSON
    /// output, including core information, quality parameters, and ID3 tags.
    ///
    /// # Arguments
    /// * `json` - The parsed ffprobe JSON output
    /// * `path` - Path to the audio file (for reference)
    ///
    /// # Returns
    /// * `Ok(Self)` - Complete audio metadata
    /// * `Err(String)` - Error message if parsing fails
    pub fn from_json(json: &serde_json::Value, path: &str) -> Result<Self, String> {
        let streams = json["streams"].as_array().ok_or("No streams found")?;
        let audio_stream = streams.iter().find(|s| s["codec_type"].as_str() == Some("audio")).ok_or("No audio stream found")?;
        let format = &json["format"];
        let duration = format["duration"]
            .as_str()
            .and_then(|s| s.parse::<f64>().ok())
            .or_else(|| format["duration"].as_f64())
            .or_else(|| audio_stream["duration"].as_str().and_then(|s| s.parse::<f64>().ok()))
            .or_else(|| audio_stream["duration"].as_f64())
            .unwrap_or(0.0);
        let sample_rate = audio_stream["sample_rate"]
            .as_str()
            .and_then(|s| s.parse::<u32>().ok())
            .or_else(|| audio_stream["sample_rate"].as_u64().map(|v| v as u32))
            .unwrap_or(0);
        let channels = audio_stream["channels"].as_u64().map(|v| v as u32).unwrap_or(0);
        let codec = audio_stream["codec_name"].as_str().unwrap_or("unknown").to_string();
        let file_size = format["size"].as_str().and_then(|s| s.parse::<u64>().ok()).or_else(|| format["size"].as_u64()).unwrap_or(0);
        let bit_depth = audio_stream["bits_per_sample"]
            .as_str()
            .and_then(|s| s.parse::<u32>().ok())
            .or_else(|| audio_stream["bits_per_sample"].as_u64().map(|v| v as u32));
        let bitrate = format["bit_rate"]
            .as_str()
            .and_then(|s| s.parse::<u64>().ok())
            .or_else(|| format["bit_rate"].as_u64())
            .or_else(|| audio_stream["bit_rate"].as_str().and_then(|s| s.parse::<u64>().ok()))
            .or_else(|| audio_stream["bit_rate"].as_u64());
        let sample_format = audio_stream["sample_fmt"].as_str().map(|s| s.to_string());
        let channel_layout = audio_stream["channel_layout"].as_str().map(|s| s.to_string());
        let tags = format["tags"].as_object();
        let title = tags.and_then(|t| t.get("TITLE")).or_else(|| tags.and_then(|t| t.get("title"))).and_then(|v| v.as_str()).map(|s| s.to_string());
        let artist =
            tags.and_then(|t| t.get("ARTIST")).or_else(|| tags.and_then(|t| t.get("artist"))).and_then(|v| v.as_str()).map(|s| s.to_string());
        let album = tags.and_then(|t| t.get("ALBUM")).or_else(|| tags.and_then(|t| t.get("album"))).and_then(|v| v.as_str()).map(|s| s.to_string());
        let genre = tags.and_then(|t| t.get("GENRE")).or_else(|| tags.and_then(|t| t.get("genre"))).and_then(|v| v.as_str()).map(|s| s.to_string());
        let year = tags
            .and_then(|t| t.get("DATE"))
            .or_else(|| tags.and_then(|t| t.get("date")))
            .or_else(|| tags.and_then(|t| t.get("YEAR")))
            .or_else(|| tags.and_then(|t| t.get("year")))
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<u32>().ok());
        let track_number = tags
            .and_then(|t| t.get("TRACK"))
            .or_else(|| tags.and_then(|t| t.get("track")))
            .and_then(|v| v.as_str())
            .and_then(|s| s.parse::<u32>().ok());
        Ok(Self {
            duration,
            sample_rate,
            channels,
            codec,
            file_size,
            bit_depth,
            bitrate,
            sample_format,
            channel_layout,
            title,
            artist,
            album,
            genre,
            year,
            track_number,
        })
    }
    /// Serialize audio metadata to JSON
    ///
    /// # Returns
    /// * `Ok(serde_json::Value)` - Serialized metadata as JSON
    /// * `Err(String)` - Error message if serialization fails
    pub fn to_json(&self) -> Result<serde_json::Value, String> {
        serde_json::to_value(self).map_err(|e| format!("Failed to serialize audio metadata: {}", e))
    }
}

// Video Metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoMetadata {
    // ===== Core Video Information =====
    pub width: f64,            // Video width in pixels
    pub height: f64,           // Video height in pixels
    pub duration: f64,         // Duration in seconds
    pub fps: f64,              // Frames per second
    pub bitrate: u64,          // Bitrate in bps
    pub codec: String,         // Video codec name
    pub resource_path: String, // Path to the resource file
    // ===== Video Properties =====
    pub aspect_ratio: Option<String>, // Aspect ratio (16:9, 4:3, etc.)
    pub pixel_format: Option<String>, // Pixel format (yuv420p, etc.)
    pub color_space: Option<String>,  // Color space
    pub bit_depth: Option<u32>,       // Bit depth (8, 10, 12)
    pub frame_count: Option<u64>,     // Total number of frames
    pub keyframe_count: Option<u64>,  // Number of keyframes
    // ===== Embedded Audio Track =====
    pub has_audio: bool,                // Whether the video has an audio track
    pub audio_codec: Option<String>,    // Audio codec name
    pub audio_sample_rate: Option<u32>, // Audio sample rate in Hz
    pub audio_channels: Option<u32>,    // Number of audio channels
    pub audio_bitrate: Option<u64>,     // Audio bitrate in bps
    // ===== File Information =====
    pub file_size: Option<u64>,           // File size in bytes
    pub container_format: Option<String>, // Container format (mp4, avi, etc.)
    pub creation_time: Option<String>,    // File creation time
    pub tags: Option<serde_json::Value>,  // Metadata tags
    // ===== Stream Indexes =====
    pub video_stream_index: Option<u32>, // Video stream index
    pub audio_stream_index: Option<u32>, // Audio stream index
    // ===== Track Timeline =====
    pub track_start_time: f64,    // Track start time on timeline
    pub track_end_time: f64,      // Track end time on timeline
    pub internal_start_time: f64, // Internal start time within the media
    pub internal_end_time: f64,   // Internal end time within the media
    // ===== Track Identity =====
    pub track_id: String,                // Unique track identifier
    pub track_block_id: String,          // Unique track block identifier
    pub visible: bool,                   // Whether the track is visible
    pub resource_frames: Option<String>, // Path to extracted frames
}

impl VideoMetadata {
    /// Parse video metadata from ffprobe JSON output
    ///
    /// Extracts all available video metadata from the ffprobe JSON
    /// output, including core information, video properties, audio
    /// track information, and file metadata.
    ///
    /// # Arguments
    /// * `json` - The parsed ffprobe JSON output
    /// * `path` - Path to the video file
    ///
    /// # Returns
    /// * `Ok(Self)` - Complete video metadata
    /// * `Err(String)` - Error message if parsing fails
    pub fn from_json(json: &serde_json::Value, path: &str) -> Result<Self, String> {
        let streams = json["streams"].as_array().ok_or("No streams found")?;
        let video_stream = streams.iter().find(|s| s["codec_type"].as_str() == Some("video")).ok_or("No video stream found")?;
        let audio_stream = streams.iter().find(|s| s["codec_type"].as_str() == Some("audio"));
        let format = &json["format"];
        let width = video_stream["width"].as_f64().unwrap_or(0.0) as f64;
        let height = video_stream["height"].as_f64().unwrap_or(0.0) as f64;
        let fps_str = video_stream["r_frame_rate"].as_str().unwrap_or("0/0");
        let fps = parse_fraction(fps_str).unwrap_or(0.0);
        let codec = video_stream["codec_name"].as_str().unwrap_or("unknown").to_string();
        let frame_count = video_stream["nb_frames"].as_str().and_then(|s| s.parse::<u64>().ok());
        let file_size = format["size"].as_str().and_then(|s| s.parse::<u64>().ok());
        let duration_from_frames = frame_count.and_then(|fc| if fps > 0.0 { Some(fc as f64 / fps) } else { None }).unwrap_or(0.0);
        let duration = format["duration"]
            .as_str()
            .and_then(|s| s.parse::<f64>().ok())
            .or_else(|| format["duration"].as_f64())
            .or_else(|| video_stream["duration"].as_str().and_then(|s| s.parse::<f64>().ok()))
            .or_else(|| video_stream["duration"].as_f64())
            .or_else(|| if duration_from_frames > 0.0 { Some(duration_from_frames) } else { None })
            .unwrap_or(0.0);
        let bitrate = format["bit_rate"]
            .as_str()
            .and_then(|s| s.parse::<u64>().ok())
            .or_else(|| format["bit_rate"].as_u64())
            .or_else(|| video_stream["bit_rate"].as_str().and_then(|s| s.parse::<u64>().ok()))
            .or_else(|| video_stream["bit_rate"].as_u64())
            .unwrap_or(0);
        let mut final_bitrate = bitrate;
        if final_bitrate == 0 {
            if let Some(size) = file_size {
                let dur = if duration > 0.0 { duration } else { duration_from_frames };
                if dur > 0.0 {
                    final_bitrate = ((size as f64 * 8.0) / dur) as u64;
                }
            }
        }
        let aspect_ratio = if width > 0.0 && height > 0.0 {
            let gcd = gcd(width as u64, height as u64);
            Some(format!("{}:{}", width / gcd as f64, height / gcd as f64))
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
        let tags = if let Some(tags_obj) = format["tags"].as_object() { Some(serde_json::Value::Object(tags_obj.clone())) } else { None };
        let has_audio = audio_stream.is_some();
        let audio_codec = audio_stream.and_then(|s| s["codec_name"].as_str()).map(|s| s.to_string());
        let audio_sample_rate = audio_stream.and_then(|s| s["sample_rate"].as_str()).and_then(|s| s.parse::<u32>().ok());
        let audio_channels = audio_stream.and_then(|s| s["channels"].as_u64()).map(|v| v as u32);
        let audio_bitrate = audio_stream.and_then(|s| s["bit_rate"].as_str()).and_then(|s| s.parse::<u64>().ok());
        Ok(Self {
            width,
            height,
            duration: if duration > 0.0 { duration } else { duration_from_frames },
            fps,
            bitrate: final_bitrate,
            codec,
            resource_path: path.to_string(),
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
            track_start_time: 0.0,
            track_end_time: 0.0,
            internal_start_time: 0.0,
            internal_end_time: duration,
            track_id: Uuid::new_v4().to_string(),
            track_block_id: Uuid::new_v4().to_string(),
            visible: true,
            resource_frames: None,
        })
    }

    /// Serialize video metadata to JSON
    ///
    /// # Returns
    /// * `Ok(serde_json::Value)` - Serialized metadata as JSON
    /// * `Err(String)` - Error message if serialization fails
    pub fn to_json(&self) -> Result<serde_json::Value, String> {
        serde_json::to_value(self).map_err(|e| format!("Failed to serialize video metadata: {}", e))
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
    use crate::commons::Ffmpeg;
    #[test]
    fn test_ffmpeg_available() {
        let ffmpeg = Ffmpeg::new();
        assert!(ffmpeg.is_available());
    }
    #[test]
    fn test_parse_fraction() {
        assert_eq!(parse_fraction("30000/1001"), Some(29.97002997002997));
        assert_eq!(parse_fraction("25/1"), Some(25.0));
        assert_eq!(parse_fraction("30"), Some(30.0));
        assert_eq!(parse_fraction("0/0"), None);
    }
}
