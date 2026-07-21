use chrono::Local;
use std::fs;
use std::io::Error as IoError;
use std::path::{Path, PathBuf};
#[derive(Debug)]
pub enum FileError {
    Io(String),
    NotFound(String),
    InvalidFileName(String),
    DirectoryCreation(String),
    UnsupportedType(String),
    ReadError(String),
    WriteError(String),
    CopyError(String),
    RemoveError(String),
}
impl From<IoError> for FileError {
    fn from(err: IoError) -> Self {
        FileError::Io(err.to_string())
    }
}
pub type FileResult<T> = Result<T, FileError>;
pub struct FileUtils;
impl FileUtils {
    pub fn ensure_dir(path: &Path) -> FileResult<()> {
        if !path.exists() {
            fs::create_dir_all(path).map_err(|e| FileError::DirectoryCreation(format!("{}: {}", path.display(), e)))?;
        }
        Ok(())
    }
    pub fn ensure_dir_str(path: &str) -> FileResult<()> {
        Self::ensure_dir(Path::new(path))
    }
    pub fn file_exists(path: &Path) -> bool {
        path.exists() && path.is_file()
    }
    pub fn file_exists_str(path: &str) -> bool {
        Self::file_exists(Path::new(path))
    }
    pub fn path_exists(path: &Path) -> bool {
        path.exists()
    }
    pub fn path_exists_str(path: &str) -> bool {
        Self::path_exists(Path::new(path))
    }
    pub fn get_file_name(path: &Path) -> FileResult<String> {
        path.file_name().and_then(|n| n.to_str()).map(|s| s.to_string()).ok_or_else(|| FileError::InvalidFileName(path.display().to_string()))
    }
    pub fn get_file_stem(path: &Path) -> FileResult<String> {
        path.file_stem().and_then(|n| n.to_str()).map(|s| s.to_string()).ok_or_else(|| FileError::InvalidFileName(path.display().to_string()))
    }
    pub fn get_file_extension(path: &Path) -> Option<String> {
        path.extension().and_then(|e| e.to_str()).map(|s| s.to_string())
    }
    pub fn read_file(path: &Path) -> FileResult<Vec<u8>> {
        fs::read(path).map_err(|e| FileError::ReadError(format!("{}: {}", path.display(), e)))
    }
    pub fn read_file_str(path: &str) -> FileResult<Vec<u8>> {
        Self::read_file(Path::new(path))
    }
    pub fn read_file_to_string(path: &Path) -> FileResult<String> {
        fs::read_to_string(path).map_err(|e| FileError::ReadError(format!("{}: {}", path.display(), e)))
    }
    pub fn read_file_to_string_str(path: &str) -> FileResult<String> {
        Self::read_file_to_string(Path::new(path))
    }
    pub fn write_file(path: &Path, contents: &[u8]) -> FileResult<()> {
        if let Some(parent) = path.parent() {
            let _ = Self::ensure_dir(parent);
        }
        fs::write(path, contents).map_err(|e| FileError::WriteError(format!("{}: {}", path.display(), e)))
    }
    pub fn write_file_str(path: &str, contents: &[u8]) -> FileResult<()> {
        Self::write_file(Path::new(path), contents)
    }
    pub fn write_file_string(path: &Path, contents: &str) -> FileResult<()> {
        Self::write_file(path, contents.as_bytes())
    }
    pub fn write_file_string_str(path: &str, contents: &str) -> FileResult<()> {
        Self::write_file_string(Path::new(path), contents)
    }
    pub fn copy_file(source: &Path, dest: &Path) -> FileResult<u64> {
        if let Some(parent) = dest.parent() {
            let _ = Self::ensure_dir(parent);
        }
        fs::copy(source, dest).map_err(|e| FileError::CopyError(format!("{} -> {}: {}", source.display(), dest.display(), e)))
    }
    pub fn copy_file_str(source: &str, dest: &str) -> FileResult<u64> {
        Self::copy_file(Path::new(source), Path::new(dest))
    }
    pub fn copy_file_with_unique_name(source: &Path, target_dir: &Path) -> FileResult<PathBuf> {
        if !Self::file_exists(source) {
            return Err(FileError::NotFound(source.display().to_string()));
        }
        Self::ensure_dir(target_dir)?;
        let file_name = Self::get_file_name(source)?;
        let target_path = target_dir.join(&file_name);
        let final_path = if target_path.exists() {
            let stem = Self::get_file_stem(source)?;
            let ext = Self::get_file_extension(source).map(|e| format!(".{}", e)).unwrap_or_default();
            let timestamp = Local::now().timestamp();
            let new_name = format!("{}_{}{}", stem, timestamp, ext);
            target_dir.join(new_name)
        } else {
            target_path
        };
        Self::copy_file(source, &final_path)?;
        Ok(final_path)
    }
    pub fn get_file_size(path: &Path) -> FileResult<u64> {
        let metadata = fs::metadata(path)?;
        Ok(metadata.len())
    }
    pub fn get_file_size_str(path: &str) -> FileResult<u64> {
        Self::get_file_size(Path::new(path))
    }
    pub fn remove_file(path: &Path) -> FileResult<()> {
        fs::remove_file(path).map_err(|e| FileError::RemoveError(format!("{}: {}", path.display(), e)))
    }
    pub fn remove_file_str(path: &str) -> FileResult<()> {
        Self::remove_file(Path::new(path))
    }
    pub fn remove_dir_all(path: &Path) -> FileResult<()> {
        fs::remove_dir_all(path).map_err(|e| FileError::RemoveError(format!("{}: {}", path.display(), e)))
    }
    pub fn remove_dir_all_str(path: &str) -> FileResult<()> {
        Self::remove_dir_all(Path::new(path))
    }
    pub fn remove_dir_all_force(path: &Path) -> FileResult<()> {
        if !path.exists() {
            return Ok(());
        }
        let path_str = path.to_string_lossy().to_string();
        if Self::remove_dir_all(path).is_ok() {
            if !path.exists() {
                return Ok(());
            }
        }
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("cmd").args(&["/c", "rmdir", "/s", "/q", &path_str]).output();
            if path.exists() {
                let _ = std::process::Command::new("powershell")
                    .args(&["-Command", &format!("Remove-Item -Path '{}' -Recurse -Force -ErrorAction SilentlyContinue", path_str)])
                    .output();
            }
        }
        #[cfg(any(target_os = "macos", target_os = "linux"))]
        {
            let _ = std::process::Command::new("rm").args(&["-rf", &path_str]).output();
            if path.exists() {
                let _ = std::process::Command::new("chflags").args(&["-R", "nouchg", &path_str]).output();
                let _ = std::process::Command::new("rm").args(&["-rf", &path_str]).output();
            }
        }
        if path.exists() {
            return Err(FileError::RemoveError(format!("Failed to remove directory: {}", path_str)));
        }
        Ok(())
    }
    pub fn read_dir(path: &Path) -> FileResult<Vec<PathBuf>> {
        let mut entries = Vec::new();
        if !path.exists() {
            return Ok(entries);
        }
        for entry in fs::read_dir(path).map_err(|e| FileError::Io(format!("Failed to read directory {}: {}", path.display(), e)))? {
            let entry = entry.map_err(|e| FileError::Io(format!("Failed to read entry: {}", e)))?;
            entries.push(entry.path());
        }
        Ok(entries)
    }
    pub fn read_dir_str(path: &str) -> FileResult<Vec<PathBuf>> {
        Self::read_dir(Path::new(path))
    }
    pub fn read_dir_entries(path: &Path) -> FileResult<Vec<fs::DirEntry>> {
        let mut entries = Vec::new();
        if !path.exists() {
            return Ok(entries);
        }
        for entry in fs::read_dir(path).map_err(|e| FileError::Io(format!("Failed to read directory {}: {}", path.display(), e)))? {
            entries.push(entry.map_err(|e| FileError::Io(format!("Failed to read entry: {}", e)))?);
        }
        Ok(entries)
    }
    pub fn is_video_file(path: &Path) -> bool {
        let video_extensions = ["mp4", "mov", "mkv", "avi", "webm", "flv", "wmv", "m4v", "mpeg", "mpg"];
        Self::get_file_extension(path).map(|ext| video_extensions.contains(&ext.to_lowercase().as_str())).unwrap_or(false)
    }
    pub fn is_audio_file(path: &Path) -> bool {
        let audio_extensions = ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "aiff"];
        Self::get_file_extension(path).map(|ext| audio_extensions.contains(&ext.to_lowercase().as_str())).unwrap_or(false)
    }
    pub fn is_image_file(path: &Path) -> bool {
        let image_extensions = ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "tiff", "ico"];
        Self::get_file_extension(path).map(|ext| image_extensions.contains(&ext.to_lowercase().as_str())).unwrap_or(false)
    }
    pub fn is_text_file(path: &Path) -> bool {
        let text_extensions = ["txt", "md", "csv", "json", "xml", "html", "css", "js", "ts", "rs", "py", "go", "java", "c", "cpp", "h", "hpp"];
        Self::get_file_extension(path).map(|ext| text_extensions.contains(&ext.to_lowercase().as_str())).unwrap_or(false)
    }
    pub fn is_gif_file(path: &Path) -> bool {
        Self::get_file_extension(path).map(|ext| ext.to_lowercase() == "gif").unwrap_or(false)
    }
    pub fn is_gif_file_name(file_name: &str) -> bool {
        file_name.to_lowercase().ends_with(".gif")
    }
    pub fn detect_material_type(path: &Path) -> Option<String> {
        if Self::is_video_file(path) {
            Some("video".to_string())
        } else if Self::is_audio_file(path) {
            Some("audio".to_string())
        } else if Self::is_image_file(path) {
            Some("image".to_string())
        } else if Self::is_text_file(path) {
            Some("text".to_string())
        } else {
            None
        }
    }
    pub fn read_text_file(path: &Path) -> FileResult<String> {
        let content = fs::read_to_string(path)?;
        Ok(content)
    }
    pub fn read_text_file_str(path: &str) -> FileResult<String> {
        Self::read_text_file(Path::new(path))
    }
    pub fn get_modified_time(path: &Path) -> FileResult<i64> {
        let metadata = fs::metadata(path)?;
        let modified = metadata.modified().map_err(|e| FileError::Io(e.to_string()))?;
        let duration = modified.duration_since(std::time::UNIX_EPOCH).map_err(|e| FileError::Io(e.to_string()))?;
        Ok(duration.as_secs() as i64)
    }
    pub fn force_delete_file(path: &Path) -> FileResult<()> {
        let path_str = path.to_string_lossy().to_string();
        if Self::remove_file(path).is_ok() {
            if !path.exists() {
                return Ok(());
            }
        }
        #[cfg(target_os = "windows")]
        {
            let _ = std::process::Command::new("cmd").args(&["/c", "del", "/f", "/q", &path_str]).output();
            if path.exists() {
                let _ = std::process::Command::new("powershell")
                    .args(&["-Command", &format!("Remove-Item -Path '{}' -Force -ErrorAction SilentlyContinue", path_str)])
                    .output();
            }
        }
        #[cfg(any(target_os = "macos", target_os = "linux"))]
        {
            let _ = std::process::Command::new("rm").args(&["-f", &path_str]).output();
            if path.exists() {
                let _ = std::process::Command::new("chflags").args(&["-R", "nouchg", &path_str]).output();
                let _ = std::process::Command::new("rm").args(&["-f", &path_str]).output();
            }
        }
        if path.exists() {
            return Err(FileError::Io("Failed to delete file even with force".to_string()));
        }
        Ok(())
    }
    pub fn delete_cache_files(cache_dir: &Path, file_name: &str) -> FileResult<()> {
        if !cache_dir.exists() {
            return Ok(());
        }
        let _ = fs::read_dir(cache_dir).map(|entries| {
            for entry in entries {
                if let Ok(entry) = entry {
                    let name = entry.file_name();
                    let name_str = name.to_string_lossy();
                    if name_str.contains(file_name) {
                        let _ = fs::remove_file(entry.path());
                    }
                }
            }
        });
        Ok(())
    }
    pub fn get_parent(path: &Path) -> Option<PathBuf> {
        path.parent().map(|p| p.to_path_buf())
    }
    pub fn join_path(parent: &Path, child: &str) -> PathBuf {
        parent.join(child)
    }
    pub fn to_string_lossy(path: &Path) -> String {
        path.to_string_lossy().to_string()
    }
    pub fn get_metadata(path: &Path) -> FileResult<fs::Metadata> {
        fs::metadata(path).map_err(|e| FileError::Io(format!("{}: {}", path.display(), e)))
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    use std::env::temp_dir;
    #[test]
    fn test_is_video_file() {
        assert!(FileUtils::is_video_file(Path::new("video.mp4")));
        assert!(FileUtils::is_video_file(Path::new("video.MOV")));
        assert!(!FileUtils::is_video_file(Path::new("audio.mp3")));
    }
    #[test]
    fn test_is_audio_file() {
        assert!(FileUtils::is_audio_file(Path::new("audio.mp3")));
        assert!(FileUtils::is_audio_file(Path::new("audio.wav")));
        assert!(!FileUtils::is_audio_file(Path::new("video.mp4")));
    }
    #[test]
    fn test_is_image_file() {
        assert!(FileUtils::is_image_file(Path::new("image.png")));
        assert!(FileUtils::is_image_file(Path::new("image.JPG")));
        assert!(!FileUtils::is_image_file(Path::new("video.mp4")));
    }
    #[test]
    fn test_detect_material_type() {
        assert_eq!(FileUtils::detect_material_type(Path::new("video.mp4")), Some("video".to_string()));
        assert_eq!(FileUtils::detect_material_type(Path::new("audio.mp3")), Some("audio".to_string()));
        assert_eq!(FileUtils::detect_material_type(Path::new("image.png")), Some("image".to_string()));
        assert_eq!(FileUtils::detect_material_type(Path::new("text.txt")), Some("text".to_string()));
        assert_eq!(FileUtils::detect_material_type(Path::new("unknown.xyz")), None);
    }
}
