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
        let mut args = vec!["-f", "best", "--no-warnings"];

        if let Some(dir) = output_dir {
            args.push("-P");
            args.push(dir);
        }

        args.push(url);

        let output = Command::new(&self.bin_path).args(&args).output().map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("yt-dlp download failed: {}", stderr));
        }

        // Find the downloaded file in output directory
        let dir = output_dir.map(PathBuf::from).unwrap_or_else(|| PathBuf::from("."));
        let entries = std::fs::read_dir(&dir).map_err(|e| format!("Failed to read output directory: {}", e))?;

        let latest_file = entries
            .filter_map(|e| e.ok())
            .filter(|e| e.path().is_file())
            .max_by_key(|e| e.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH));

        match latest_file {
            Some(entry) => Ok(entry.path()),
            None => Err("Downloaded file not found".to_string()),
        }
    }

    /// Download audio only from video URL
    pub fn download_audio(&self, url: &str, output_dir: Option<&str>) -> Result<PathBuf, String> {
        let mut args = vec!["-x", "--audio-format", "mp3", "--no-warnings"];

        if let Some(dir) = output_dir {
            args.push("-P");
            args.push(dir);
        }

        args.push(url);

        let output = Command::new(&self.bin_path).args(&args).output().map_err(|e| format!("Failed to run yt-dlp: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("yt-dlp audio download failed: {}", stderr));
        }

        let dir = output_dir.map(PathBuf::from).unwrap_or_else(|| PathBuf::from("."));
        let entries = std::fs::read_dir(&dir).map_err(|e| format!("Failed to read output directory: {}", e))?;

        let latest_file = entries
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path().is_file()
                    && e.path().extension().and_then(|ext| ext.to_str()).map(|ext| ext == "mp3" || ext == "m4a" || ext == "opus").unwrap_or(false)
            })
            .max_by_key(|e| e.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH));

        match latest_file {
            Some(entry) => Ok(entry.path()),
            None => Err("Downloaded audio file not found".to_string()),
        }
    }
}
