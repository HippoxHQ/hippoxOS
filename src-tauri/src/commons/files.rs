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
            fs::create_dir_all(path)
                .map_err(|e| FileError::DirectoryCreation(format!("{}: {}", path.display(), e)))?;
        }
        Ok(())
    }

    pub fn file_exists(path: &Path) -> bool {
        path.exists() && path.is_file()
    }

    pub fn get_file_name(path: &Path) -> FileResult<String> {
        path.file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
            .ok_or_else(|| FileError::InvalidFileName(path.display().to_string()))
    }

    pub fn get_file_stem(path: &Path) -> FileResult<String> {
        path.file_stem()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
            .ok_or_else(|| FileError::InvalidFileName(path.display().to_string()))
    }

    pub fn get_file_extension(path: &Path) -> Option<String> {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_string())
    }

    pub fn copy_file_with_unique_name(source: &Path, target_dir: &Path) -> FileResult<PathBuf> {
        if !source.exists() {
            return Err(FileError::NotFound(source.display().to_string()));
        }
        Self::ensure_dir(target_dir)?;
        let file_name = Self::get_file_name(source)?;
        let target_path = target_dir.join(&file_name);
        let final_path = if target_path.exists() {
            let stem = Self::get_file_stem(source)?;
            let ext = Self::get_file_extension(source)
                .map(|e| format!(".{}", e))
                .unwrap_or_default();
            let timestamp = Local::now().timestamp();
            let new_name = format!("{}_{}{}", stem, timestamp, ext);
            target_dir.join(new_name)
        } else {
            target_path
        };
        fs::copy(source, &final_path)?;
        Ok(final_path)
    }

    pub fn get_file_size(path: &Path) -> FileResult<u64> {
        let metadata = fs::metadata(path)?;
        Ok(metadata.len())
    }

    pub fn is_video_file(path: &Path) -> bool {
        let video_extensions = [
            "mp4", "mov", "mkv", "avi", "webm", "flv", "wmv", "m4v", "mpeg", "mpg",
        ];
        Self::get_file_extension(path)
            .map(|ext| video_extensions.contains(&ext.to_lowercase().as_str()))
            .unwrap_or(false)
    }

    pub fn is_audio_file(path: &Path) -> bool {
        let audio_extensions = ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma", "aiff"];
        Self::get_file_extension(path)
            .map(|ext| audio_extensions.contains(&ext.to_lowercase().as_str()))
            .unwrap_or(false)
    }

    pub fn is_image_file(path: &Path) -> bool {
        let image_extensions = [
            "png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "tiff", "ico",
        ];
        Self::get_file_extension(path)
            .map(|ext| image_extensions.contains(&ext.to_lowercase().as_str()))
            .unwrap_or(false)
    }

    pub fn is_text_file(path: &Path) -> bool {
        let text_extensions = [
            "txt", "md", "csv", "json", "xml", "html", "css", "js", "ts", "rs", "py", "go", "java",
            "c", "cpp", "h", "hpp",
        ];
        Self::get_file_extension(path)
            .map(|ext| text_extensions.contains(&ext.to_lowercase().as_str()))
            .unwrap_or(false)
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

    pub fn get_modified_time(path: &Path) -> FileResult<i64> {
        let metadata = fs::metadata(path)?;
        let modified = metadata
            .modified()
            .map_err(|e| FileError::Io(e.to_string()))?;
        let duration = modified
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| FileError::Io(e.to_string()))?;
        Ok(duration.as_secs() as i64)
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
        assert_eq!(
            FileUtils::detect_material_type(Path::new("video.mp4")),
            Some("video".to_string())
        );
        assert_eq!(
            FileUtils::detect_material_type(Path::new("audio.mp3")),
            Some("audio".to_string())
        );
        assert_eq!(
            FileUtils::detect_material_type(Path::new("image.png")),
            Some("image".to_string())
        );
        assert_eq!(
            FileUtils::detect_material_type(Path::new("text.txt")),
            Some("text".to_string())
        );
        assert_eq!(
            FileUtils::detect_material_type(Path::new("unknown.xyz")),
            None
        );
    }
}
