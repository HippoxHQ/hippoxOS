use log::debug;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
/// yt-dlp wrapper for downloading videos and other media
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
    /// Download media from URL (supports videos, audio, images, documents, etc.)
    ///
    /// # Arguments
    /// * `url` - URL to download
    /// * `output_dir` - Optional output directory
    ///
    /// # Returns
    /// * `Ok(PathBuf)` - Path to the downloaded file
    /// * `Err(String)` - Error message
    pub fn download(&self, url: &str, output_dir: Option<&str>) -> Result<PathBuf, String> {
        // Use default best format (no -f restriction) to support all file types
        // --no-playlist: prevent downloading entire playlists if only one URL is provided
        let mut args = vec![
            "--no-playlist",
            "--no-warnings",
            "--no-embed-metadata", // Don't embed metadata to avoid extension issues
        ];
        if let Some(dir) = output_dir {
            args.push("-P");
            args.push(dir);
            args.push("-o");
            // Use generic filename template
            args.push("%(title)s.%(ext)s");
        }
        args.push(url);
        let output = Command::new(&self.bin_path).args(&args).output().map_err(|e| format!("Failed to run yt-dlp: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("yt-dlp download failed: {}", stderr));
        }
        let dir = output_dir.map(PathBuf::from).unwrap_or_else(|| PathBuf::from("."));
        // Find the downloaded file
        let mut files = Vec::new();
        find_files_recursively(&dir, &mut files)?;
        if files.is_empty() {
            return Err("No files found in output directory".to_string());
        }
        // Sort by modification time (newest first) to get the latest file
        files.sort_by_key(|f| f.metadata().and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH));
        // Filter out temporary/partial files
        let latest_file = files.into_iter().rev().find(|f| {
            let name = f.file_name().and_then(|n| n.to_str()).unwrap_or("");
            !name.ends_with(".part") && !name.ends_with(".tmp") && !name.ends_with(".ytdl")
        });
        match latest_file {
            Some(path) => {
                // Fix file extension if needed
                let final_path = fix_file_extension(&path, url)?;
                // Verify file is not empty
                let size = fs::metadata(&final_path).map(|m| m.len()).unwrap_or(0);
                if size == 0 {
                    return Err(format!("Downloaded file is empty: {:?}", final_path));
                }
                Ok(final_path)
            }
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
            Some(path) => {
                let size = fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                if size == 0 {
                    return Err(format!("Downloaded audio file is empty: {:?}", path));
                }
                Ok(path)
            }
            None => Err("Downloaded audio file not found".to_string()),
        }
    }
    /// Download with custom format selection (advanced use)
    ///
    /// # Arguments
    /// * `url` - URL to download
    /// * `output_dir` - Optional output directory
    /// * `format` - yt-dlp format string (e.g., "bestvideo+bestaudio/best", "worst", "mp4")
    pub fn download_with_format(&self, url: &str, output_dir: Option<&str>, format: &str) -> Result<PathBuf, String> {
        let mut args = vec!["-f", format, "--no-playlist", "--no-warnings"];
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
        let latest_file = files.into_iter().rev().find(|f| {
            let name = f.file_name().and_then(|n| n.to_str()).unwrap_or("");
            !name.ends_with(".part") && !name.ends_with(".tmp") && !name.ends_with(".ytdl")
        });
        match latest_file {
            Some(path) => {
                let final_path = fix_file_extension(&path, url)?;
                let size = fs::metadata(&final_path).map(|m| m.len()).unwrap_or(0);
                if size == 0 {
                    return Err(format!("Downloaded file is empty: {:?}", final_path));
                }
                Ok(final_path)
            }
            None => Err("Downloaded file not found".to_string()),
        }
    }
}
/// Recursively find all files in a directory
fn find_files_recursively(dir: &PathBuf, files: &mut Vec<PathBuf>) -> Result<(), String> {
    let entries = fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {}", e))?;
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
/// Fix file extension based on URL or file content
fn fix_file_extension(path: &Path, url: &str) -> Result<PathBuf, String> {
    let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
    // Known valid extensions that don't need fixing
    let known_extensions = [
        // Video
        "mp4", "webm", "mkv", "avi", "mov", "flv", "wmv", "m4v", "3gp", // Audio
        "mp3", "m4a", "wav", "flac", "ogg", "aac", "opus", "wma", // Image
        "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico", "tiff", "heic", // Document
        "pdf", "txt", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "rtf", // Archive
        "zip", "rar", "7z", "tar", "gz", "bz2", "xz", // Other
        "json", "xml", "csv", "html", "css", "js",
    ];
    // If extension is already a known type, keep it
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        if known_extensions.contains(&ext.to_lowercase().as_str()) {
            return Ok(path.to_path_buf());
        }
    }
    // If filename ends with unknown_video or has no extension, try to detect
    if file_name.ends_with(".unknown_video") || path.extension().is_none() {
        // Try to detect from URL first
        let detected_ext = detect_extension_from_url(url).or_else(|| detect_extension_from_content(path)).unwrap_or_else(|| "unknown".to_string());
        if detected_ext != "unknown" && detected_ext != "unknown_video" {
            let new_path = path.with_extension(&detected_ext);
            // Remove the old file and rename
            if new_path.exists() {
                // If new path already exists, add a number suffix
                let stem = new_path.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
                let mut counter = 1;
                let mut final_path = new_path.clone();
                while final_path.exists() {
                    final_path = path.parent().unwrap_or(Path::new(".")).join(format!("{}_{}.{}", stem, counter, detected_ext));
                    counter += 1;
                }
                fs::rename(path, &final_path).map_err(|e| format!("Failed to rename file: {}", e))?;
                debug!("Renamed {:?} -> {:?}", path, final_path);
                return Ok(final_path);
            } else {
                fs::rename(path, &new_path).map_err(|e| format!("Failed to rename file: {}", e))?;
                debug!("Renamed {:?} -> {:?}", path, new_path);
                return Ok(new_path);
            }
        }
    }
    Ok(path.to_path_buf())
}
/// Detect file extension from URL
fn detect_extension_from_url(url: &str) -> Option<String> {
    let url_lower = url.to_lowercase();
    // Image extensions
    if url_lower.contains(".jpg") || url_lower.contains(".jpeg") {
        return Some("jpg".to_string());
    }
    if url_lower.contains(".png") {
        return Some("png".to_string());
    }
    if url_lower.contains(".gif") {
        return Some("gif".to_string());
    }
    if url_lower.contains(".webp") {
        return Some("webp".to_string());
    }
    if url_lower.contains(".bmp") {
        return Some("bmp".to_string());
    }
    if url_lower.contains(".svg") {
        return Some("svg".to_string());
    }
    if url_lower.contains(".ico") {
        return Some("ico".to_string());
    }
    if url_lower.contains(".tiff") || url_lower.contains(".tif") {
        return Some("tiff".to_string());
    }
    // Video extensions
    if url_lower.contains(".mp4") {
        return Some("mp4".to_string());
    }
    if url_lower.contains(".webm") {
        return Some("webm".to_string());
    }
    if url_lower.contains(".mkv") {
        return Some("mkv".to_string());
    }
    if url_lower.contains(".avi") {
        return Some("avi".to_string());
    }
    if url_lower.contains(".mov") {
        return Some("mov".to_string());
    }
    if url_lower.contains(".flv") {
        return Some("flv".to_string());
    }
    if url_lower.contains(".wmv") {
        return Some("wmv".to_string());
    }
    if url_lower.contains(".m4v") {
        return Some("m4v".to_string());
    }
    if url_lower.contains(".3gp") {
        return Some("3gp".to_string());
    }
    // Audio extensions
    if url_lower.contains(".mp3") {
        return Some("mp3".to_string());
    }
    if url_lower.contains(".m4a") {
        return Some("m4a".to_string());
    }
    if url_lower.contains(".wav") {
        return Some("wav".to_string());
    }
    if url_lower.contains(".flac") {
        return Some("flac".to_string());
    }
    if url_lower.contains(".ogg") {
        return Some("ogg".to_string());
    }
    if url_lower.contains(".aac") {
        return Some("aac".to_string());
    }
    if url_lower.contains(".opus") {
        return Some("opus".to_string());
    }
    if url_lower.contains(".wma") {
        return Some("wma".to_string());
    }
    // Document extensions
    if url_lower.contains(".pdf") {
        return Some("pdf".to_string());
    }
    if url_lower.contains(".docx") {
        return Some("docx".to_string());
    }
    if url_lower.contains(".doc") {
        return Some("doc".to_string());
    }
    if url_lower.contains(".xlsx") {
        return Some("xlsx".to_string());
    }
    if url_lower.contains(".xls") {
        return Some("xls".to_string());
    }
    if url_lower.contains(".pptx") {
        return Some("pptx".to_string());
    }
    if url_lower.contains(".ppt") {
        return Some("ppt".to_string());
    }
    if url_lower.contains(".txt") {
        return Some("txt".to_string());
    }
    // Archive extensions
    if url_lower.contains(".zip") {
        return Some("zip".to_string());
    }
    if url_lower.contains(".rar") {
        return Some("rar".to_string());
    }
    if url_lower.contains(".7z") {
        return Some("7z".to_string());
    }
    if url_lower.contains(".tar") {
        return Some("tar".to_string());
    }
    if url_lower.contains(".gz") {
        return Some("gz".to_string());
    }
    None
}
/// Detect file extension from file content using magic bytes
fn detect_extension_from_content(path: &Path) -> Option<String> {
    use std::fs::File;
    use std::io::Read;
    let mut file = File::open(path).ok()?;
    let mut buffer = [0u8; 16];
    if file.read_exact(&mut buffer).is_err() {
        return None;
    }
    // Image formats
    if buffer.starts_with(b"\xFF\xD8\xFF") {
        return Some("jpg".to_string()); // JPEG
    }
    if buffer.starts_with(b"\x89PNG\r\n\x1A\n") {
        return Some("png".to_string()); // PNG
    }
    if buffer.starts_with(b"GIF87a") || buffer.starts_with(b"GIF89a") {
        return Some("gif".to_string()); // GIF
    }
    if buffer.starts_with(b"RIFF") && buffer[8..12] == *b"WEBP" {
        return Some("webp".to_string()); // WebP
    }
    if buffer.starts_with(b"BM") {
        return Some("bmp".to_string()); // BMP
    }
    if buffer.starts_with(b"<svg") || buffer.starts_with(b"<?xml") {
        // Check if it's SVG
        let mut content = String::new();
        let _ = file.read_to_string(&mut content);
        if content.contains("<svg") || content.contains("xmlns=\"http://www.w3.org/2000/svg\"") {
            return Some("svg".to_string());
        }
    }
    // Video formats
    if buffer.starts_with(b"\x00\x00\x00\x18ftyp") || buffer.starts_with(b"\x00\x00\x00\x1Cftyp") {
        return Some("mp4".to_string()); // MP4
    }
    if buffer.starts_with(b"\x1A\x45\xDF\xA3") {
        return Some("mkv".to_string()); // Matroska
    }
    if buffer.starts_with(b"RIFF") && buffer[8..12] == *b"AVI " {
        return Some("avi".to_string()); // AVI
    }
    if buffer.starts_with(b"fLaC") {
        return Some("flac".to_string()); // FLAC
    }
    if buffer.starts_with(b"OggS") {
        return Some("ogg".to_string()); // OGG
    }
    // Audio formats
    if buffer.starts_with(b"ID3") {
        return Some("mp3".to_string()); // MP3
    }
    if buffer.starts_with(b"#EXTM3U") || buffer.starts_with(b"#EXTINF") {
        return Some("m3u".to_string()); // M3U playlist
    }
    // Document formats
    if buffer.starts_with(b"%PDF") {
        return Some("pdf".to_string()); // PDF
    }
    if buffer.starts_with(b"PK") {
        // Could be ZIP, DOCX, XLSX, PPTX, etc.
        // Check if it's a ZIP-based Office file
        let mut content = String::new();
        let _ = file.read_to_string(&mut content);
        if content.contains("word/") || content.contains("xl/") || content.contains("ppt/") {
            // It's an Office document
            if content.contains("word/") {
                return Some("docx".to_string());
            } else if content.contains("xl/") {
                return Some("xlsx".to_string());
            } else if content.contains("ppt/") {
                return Some("pptx".to_string());
            }
        }
        return Some("zip".to_string()); // Generic ZIP
    }
    None
}
