use crate::commands::paths::{get_app_root_dir, SUB_SYSTEM_PATH};
use log::{debug, error};
/// Docker Client subsystem root directory name
const DOCKER_CLIENT_DIR_NAME: &str = "DockerClient";
/// Docker Client dialog history directory name
const DOCKER_CLIENT_DIALOG_HISTORY_DIR_NAME: &str = "DockerDialogHistory";
/// Common statistics file name shared by every subsystem.
const STATISTICS_FILE_NAME: &str = "statistics.json";
/// Docker Client subsystem root directory: HippoX/subsystem/DockerClient
pub fn get_dockerclient_root_dir() -> std::path::PathBuf {
    get_app_root_dir().join(SUB_SYSTEM_PATH).join(DOCKER_CLIENT_DIR_NAME)
}
/// Docker Client dialog history directory: HippoX/subsystem/DockerClient/DockerDialogHistory
pub fn get_dockerclient_dialog_history_dir() -> std::path::PathBuf {
    get_dockerclient_root_dir().join(DOCKER_CLIENT_DIALOG_HISTORY_DIR_NAME)
}
/// Docker Client statistics file: HippoX/subsystem/DockerClient/DockerDialogHistory/statistics.json
pub fn get_dockerclient_history_statistics() -> std::path::PathBuf {
    get_dockerclient_dialog_history_dir().join(STATISTICS_FILE_NAME)
}
/// Get the on-disk directory path of a Docker Client session (project).
#[tauri::command]
pub fn cmd_get_docker_session_dir(session_id: String) -> Result<String, String> {
    debug!("cmd_get_docker_session_dir - START: session_id={}", session_id);
    if session_id.is_empty() {
        return Err("session_id cannot be empty".to_string());
    }
    let dir = get_dockerclient_dialog_history_dir().join(&session_id);
    if !dir.exists() {
        error!("cmd_get_docker_session_dir - Session directory not found: {:?}", dir);
        return Err(format!("Session directory not found: {}", dir.display()));
    }
    debug!("cmd_get_docker_session_dir - DONE: {:?}", dir);
    Ok(dir.to_string_lossy().to_string())
}
