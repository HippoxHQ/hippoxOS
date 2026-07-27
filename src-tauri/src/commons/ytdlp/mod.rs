use serde_json::Value;
use std::path::PathBuf;
use std::process::Command;
/// yt-dlp wrapper for downloading videos
#[derive(Clone)]
pub struct YtDlp {
    pub bin_path: String,
}
impl Default for YtDlp {
    fn default() -> Self {
        Self::new()
    }
}
impl YtDlp {
    /// Create a new yt-dlp instance
    ///
    /// Uses "yt-dlp" as the binary name, which will be resolved via:
    /// 1. System PATH (if yt-dlp is installed globally)
    /// 2. Tauri sidecar (if configured in externalBin)
    pub fn new() -> Self {
        Self { bin_path: "yt-dlp".to_string() }
    }
    /// Create with custom binary path
    pub fn with_bin_path(path: &str) -> Self {
        Self { bin_path: path.to_string() }
    }
    /// Check if yt-dlp is available
    pub fn is_available(&self) -> bool {
        Command::new(&self.bin_path).arg("--version").output().map(|o| o.status.success()).unwrap_or(false)
    }
    /// Get yt-dlp version
    pub fn get_version(&self) -> Option<String> {
        let output = Command::new(&self.bin_path).arg("--version").output().ok()?;
        if !output.status.success() {
            return None;
        }
        Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
    }
    /// Get video metadata from URL without downloading
    pub fn get_metadata(&self, url: &str) -> Result<Value, String> {
        let output = Command::new(&self.bin_path)
            .args(["--skip-download", "--dump-json", "--no-warnings", url])
            .output()
            .map_err(|e| format!("Failed to run yt-dlp: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("yt-dlp error: {}", stderr));
        }
        let json: Value = serde_json::from_slice(&output.stdout).map_err(|e| format!("Failed to parse JSON: {}", e))?;
        Ok(json)
    }
    /// Download video from URL
    ///
    /// # Arguments
    /// * `url` - Video URL to download
    /// * `output_dir` - Optional output directory
    ///
    /// # Returns
    /// * `Ok(PathBuf)` - Path to the downloaded file
    /// * `Err(String)` - Error message
    pub fn download(&self, url: &str, output_dir: Option<&str>) -> Result<PathBuf, String> {
        // Use bestvideo+bestaudio format for better compatibility
        // This works for YouTube, Bilibili, and most platforms
        let mut args = vec!["-f", "bestvideo+bestaudio/best", "--merge-output-format", "mp4", "--no-warnings"];
        if let Some(dir) = output_dir {
            args.push("-P");
            args.push(dir);
            args.push("-o");
            args.push("%(title)s.%(ext)s");
        }
        args.push(url);
        let output = Command::new(&self.bin_path).args(&args).output().map_err(|e| format!("Failed to run yt-dlp: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("yt-dlp download failed: {}", stderr));
        }
        let dir = output_dir.map(PathBuf::from).unwrap_or_else(|| PathBuf::from("."));
        let mut files = Vec::new();
        find_files_recursively(&dir, &mut files)?;
        if files.is_empty() {
            return Err("No files found in output directory".to_string());
        }
        files.sort_by_key(|f| f.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH));
        let latest_file = files
            .into_iter()
            .rev()
            .find(|f| !f.file_name().and_then(|n| n.to_str()).map(|n| n.ends_with(".part") || n.ends_with(".tmp")).unwrap_or(false));
        match latest_file {
            Some(path) => Ok(path),
            None => Err("Downloaded file not found (no valid file)".to_string()),
        }
    }
    /// Download audio only from video URL
    pub fn download_audio(&self, url: &str, output_dir: Option<&str>) -> Result<PathBuf, String> {
        let mut args = vec!["-x", "--audio-format", "mp3", "--no-warnings"];
        if let Some(dir) = output_dir {
            args.push("-P");
            args.push(dir);
            args.push("-o");
            args.push("%(title)s.%(ext)s");
        }
        args.push(url);
        let output = Command::new(&self.bin_path).args(&args).output().map_err(|e| format!("Failed to run yt-dlp: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("yt-dlp audio download failed: {}", stderr));
        }
        let dir = output_dir.map(PathBuf::from).unwrap_or_else(|| PathBuf::from("."));
        let mut files = Vec::new();
        find_files_recursively(&dir, &mut files)?;
        if files.is_empty() {
            return Err("No files found in output directory".to_string());
        }
        files.sort_by_key(|f| f.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH));
        let audio_exts = ["mp3", "m4a", "opus", "ogg", "wav", "flac", "aac"];
        let latest_audio =
            files.into_iter().rev().find(|f| f.extension().and_then(|ext| ext.to_str()).map(|ext| audio_exts.contains(&ext)).unwrap_or(false));
        match latest_audio {
            Some(path) => Ok(path),
            None => Err("Downloaded audio file not found".to_string()),
        }
    }
}
/// Recursively find all files in a directory
fn find_files_recursively(dir: &PathBuf, files: &mut Vec<PathBuf>) -> Result<(), String> {
    let entries = std::fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            find_files_recursively(&path, files)?;
        } else if path.is_file() {
            files.push(path);
        }
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    #[ignore]
    fn test_ytdlp_available() {
        let ytdlp = YtDlp::new();
        println!("bin_path: {}", ytdlp.bin_path);
        assert!(ytdlp.is_available());
    }
}
