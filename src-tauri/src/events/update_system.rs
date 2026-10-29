use serde::{Deserialize, Serialize};
use tauri::Emitter;
/// Event name for system update download progress.
pub const SYSTEM_UPDATE_DOWNLOAD_PROGRESS: &str = "system-update:download-progress";
/// Payload for the system update download progress event.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemUpdateDownloadProgressPayload {
    /// Number of bytes downloaded so far.
    pub downloaded: u64,
    /// Total number of bytes, when known.
    pub total: Option<u64>,
    /// Download percentage (0-100). `None` when the total size is unknown.
    pub percent: Option<u8>,
    /// Timestamp of the progress event.
    pub timestamp: String,
}
/// Emit a system update download progress event to the frontend.
///
/// # Arguments
/// * `app_handle` - The Tauri app handle for emitting events
/// * `downloaded` - Bytes downloaded so far
/// * `total` - Total bytes to download, if the server reported it
pub fn emit_system_update_download_progress(app_handle: &tauri::AppHandle, downloaded: u64, total: Option<u64>) {
    let percent = match total {
        Some(t) if t > 0 => {
            let p = (downloaded as f64 / t as f64) * 100.0;
            Some(p.clamp(0.0, 100.0) as u8)
        }
        _ => None,
    };
    let payload = SystemUpdateDownloadProgressPayload { downloaded, total, percent, timestamp: chrono::Local::now().to_rfc3339() };
    let _ = app_handle.emit(SYSTEM_UPDATE_DOWNLOAD_PROGRESS, payload);
}
