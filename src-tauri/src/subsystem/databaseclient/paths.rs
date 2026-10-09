use log::{debug, error};
use crate::commands::paths::{get_app_root_dir, SUB_SYSTEM_PATH};
/// DataBase Client subsystem root directory name
const DATABASE_CLIENT_DIR_NAME: &str = "DataBaseClient";
/// DataBase Client dialog history directory name
const DATABASE_CLIENT_DIALOG_HISTORY_DIR_NAME: &str = "DataBaseDialogHistory";
/// Common statistics file name shared by every subsystem.
const STATISTICS_FILE_NAME: &str = "statistics.json";
/// DataBase Client subsystem root directory: HippoX/subsystem/DataBaseClient
pub fn get_databaseclient_root_dir() -> std::path::PathBuf {
    get_app_root_dir().join(SUB_SYSTEM_PATH).join(DATABASE_CLIENT_DIR_NAME)
}
/// DataBase Client dialog history directory: HippoX/subsystem/DataBaseClient/DataBaseDialogHistory
pub fn get_databaseclient_dialog_history_dir() -> std::path::PathBuf {
    get_databaseclient_root_dir().join(DATABASE_CLIENT_DIALOG_HISTORY_DIR_NAME)
}
/// DataBase Client statistics file: HippoX/subsystem/DataBaseClient/DataBaseDialogHistory/statistics.json
pub fn get_databaseclient_history_statistics() -> std::path::PathBuf {
    get_databaseclient_dialog_history_dir().join(STATISTICS_FILE_NAME)
}
/// Get the on-disk directory path of a DataBase Client session (project).
#[tauri::command]
pub fn cmd_get_database_session_dir(session_id: String) -> Result<String, String> {
    debug!("cmd_get_database_session_dir - START: session_id={}", session_id);
    if session_id.is_empty() {
        return Err("session_id cannot be empty".to_string());
    }
    let dir = get_databaseclient_dialog_history_dir().join(&session_id);
    if !dir.exists() {
        error!("cmd_get_database_session_dir - Session directory not found: {:?}", dir);
        return Err(format!("Session directory not found: {}", dir.display()));
    }
    debug!("cmd_get_database_session_dir - DONE: {:?}", dir);
    Ok(dir.to_string_lossy().to_string())
}
