use super::core::Ffmpeg;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Command;
impl Ffmpeg {
    pub fn get_keyframes(&self, file_path: &str) -> Result<Vec<f64>, String> {
        if !std::path::Path::new(file_path).exists() {
            return Err(format!("File not found: {}", file_path));
        }
        let output = std::process::Command::new("ffprobe")
            .args(["-v", "error", "-select_streams", "v:0", "-show_entries", "frame=key_frame,pts_time", "-of", "csv=p=0", file_path])
            .output()
            .map_err(|e| format!("ffprobe failed: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("ffprobe error: {}", stderr));
        }
        let output_str = String::from_utf8_lossy(&output.stdout);
        let mut timestamps = Vec::new();
        for line in output_str.lines() {
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 2 {
                let key_frame = parts[0].trim();
                let pts_time = parts[1].trim();
                if key_frame == "1" {
                    if let Ok(time) = pts_time.parse::<f64>() {
                        timestamps.push(time);
                    }
                }
            }
        }
        if timestamps.is_empty() {
            return self.get_keyframe_timestamps_from_packets(file_path);
        }
        if timestamps.len() > 0 {}
        Ok(timestamps)
    }
    fn get_keyframe_timestamps_from_packets(&self, file_path: &str) -> Result<Vec<f64>, String> {
        let output = std::process::Command::new("ffprobe")
            .args(["-v", "error", "-select_streams", "v:0", "-show_entries", "packet=flags,pts_time", "-of", "csv=p=0", file_path])
            .output()
            .map_err(|e| format!("ffprobe failed: {}", e))?;
        let output_str = String::from_utf8_lossy(&output.stdout);
        let mut timestamps = Vec::new();
        for line in output_str.lines() {
            let parts: Vec<&str> = line.split(',').collect();
            if parts.len() >= 2 {
                let flags = parts[0].trim();
                let pts_time = parts[1].trim();
                if flags.contains('K') {
                    if let Ok(time) = pts_time.parse::<f64>() {
                        timestamps.push(time);
                    }
                }
            }
        }
        if timestamps.len() > 0 {}
        Ok(timestamps)
    }
}
