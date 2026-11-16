use crate::commands::paths::{get_app_root_dir, SUB_SYSTEM_PATH};
use log::{debug, error};
/// Office subsystem root directory name
const OFFICE_DIR_NAME: &str = "Office";
/// Office dialog history directory name
const OFFICE_DIALOG_HISTORY_DIR_NAME: &str = "OfficeDialogHistory";
/// Common statistics file name shared by every subsystem.
const STATISTICS_FILE_NAME: &str = "statistics.json";
/// Office subsystem root directory: HippoX/subsystem/Office
pub fn get_office_root_dir() -> std::path::PathBuf {
    get_app_root_dir().join(SUB_SYSTEM_PATH).join(OFFICE_DIR_NAME)
}
/// Office dialog history directory: HippoX/subsystem/Office/OfficeDialogHistory
pub fn get_office_dialog_history_dir() -> std::path::PathBuf {
    get_office_root_dir().join(OFFICE_DIALOG_HISTORY_DIR_NAME)
}
/// Office statistics file: HippoX/subsystem/Office/OfficeDialogHistory/statistics.json
pub fn get_office_history_statistics() -> std::path::PathBuf {
    get_office_dialog_history_dir().join(STATISTICS_FILE_NAME)
}
/// Get the on-disk directory path of an Office session (project).
#[tauri::command]
pub fn cmd_get_office_session_dir(session_id: String) -> Result<String, String> {
    debug!("cmd_get_office_session_dir - START: session_id={}", session_id);
    if session_id.is_empty() {
        return Err("session_id cannot be empty".to_string());
    }
    let dir = get_office_dialog_history_dir().join(&session_id);
    if !dir.exists() {
        error!("cmd_get_office_session_dir - Session directory not found: {:?}", dir);
        return Err(format!("Session directory not found: {}", dir.display()));
    }
    debug!("cmd_get_office_session_dir - DONE: {:?}", dir);
    Ok(dir.to_string_lossy().to_string())
}
