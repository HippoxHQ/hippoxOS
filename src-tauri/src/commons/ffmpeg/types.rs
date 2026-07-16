use serde::{Deserialize, Serialize};
use std::process::{Child, ChildStdin, ChildStdout};

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInfo {
    pub width: u32,
    pub height: u32,
    pub duration: f64,
    pub fps: f64,
    pub bitrate: u64,
    pub codec: String,
    pub resource_path: String,
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
    pub track_start_time: f64,
    pub track_end_time: f64,
    pub internal_start_time: f64,
    pub internal_end_time: f64,
    pub track_id: String,
    pub track_block_id: String,
    pub visible: bool,
    pub resource_frames: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum PreviewQuality {
    Excellent,
    High,
    Medium,
    Low,
    VeryLow,
}

impl PreviewQuality {
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

pub const PREVIEW_FRAME_QUALITY: PreviewQuality = PreviewQuality::Medium;
