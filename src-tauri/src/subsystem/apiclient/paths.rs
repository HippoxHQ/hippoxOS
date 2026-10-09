use log::{debug, error};
use crate::commands::paths::{get_app_root_dir, SUB_SYSTEM_PATH};
/// Api Client subsystem root directory name
const API_CLIENT_DIR_NAME: &str = "ApiClient";
/// Api Client dialog history directory name
const API_CLIENT_DIALOG_HISTORY_DIR_NAME: &str = "ApiDialogHistory";
/// Common statistics file name shared by every subsystem.
const STATISTICS_FILE_NAME: &str = "statistics.json";
/// Api Client subsystem root directory: HippoX/subsystem/ApiClient
pub fn get_apiclient_root_dir() -> std::path::PathBuf {
    get_app_root_dir().join(SUB_SYSTEM_PATH).join(API_CLIENT_DIR_NAME)
}
/// Api Client dialog history directory: HippoX/subsystem/ApiClient/ApiDialogHistory
pub fn get_apiclient_dialog_history_dir() -> std::path::PathBuf {
    get_apiclient_root_dir().join(API_CLIENT_DIALOG_HISTORY_DIR_NAME)
}
/// Api Client statistics file: HippoX/subsystem/ApiClient/ApiDialogHistory/statistics.json
pub fn get_apiclient_history_statistics() -> std::path::PathBuf {
    get_apiclient_dialog_history_dir().join(STATISTICS_FILE_NAME)
}
/// Get the on-disk directory path of an Api Client session (project).
#[tauri::command]
pub fn cmd_get_api_session_dir(session_id: String) -> Result<String, String> {
    debug!("cmd_get_api_session_dir - START: session_id={}", session_id);
    if session_id.is_empty() {
        return Err("session_id cannot be empty".to_string());
    }
    let dir = get_apiclient_dialog_history_dir().join(&session_id);
    if !dir.exists() {
        error!("cmd_get_api_session_dir - Session directory not found: {:?}", dir);
        return Err(format!("Session directory not found: {}", dir.display()));
    }
    debug!("cmd_get_api_session_dir - DONE: {:?}", dir);
    Ok(dir.to_string_lossy().to_string())
}
