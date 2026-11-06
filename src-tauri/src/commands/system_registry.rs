use crate::PENDING_FILE_OPEN;
/// Frontend calls this after it is ready to receive a pending file-open path.
#[tauri::command]
pub fn cmd_take_pending_file_open() -> Option<String> {
    PENDING_FILE_OPEN.lock().unwrap().take()
}
