use crate::commands::paths::{get_app_root_dir, SUB_SYSTEM_PATH};
/// Docker Client subsystem root directory name
const DOCKER_CLIENT_DIR_NAME: &str = "DockerClient";
/// Docker Client dialog history directory name
const DOCKER_CLIENT_DIALOG_HISTORY_DIR_NAME: &str = "DockerDialogHistory";
/// Docker Client subsystem root directory: HippoX/subsystem/DockerClient
pub fn get_dockerclient_root_dir() -> std::path::PathBuf {
    get_app_root_dir().join(SUB_SYSTEM_PATH).join(DOCKER_CLIENT_DIR_NAME)
}
/// Docker Client dialog history directory: HippoX/subsystem/DockerClient/DockerDialogHistory
pub fn get_dockerclient_dialog_history_dir() -> std::path::PathBuf {
    get_dockerclient_root_dir().join(DOCKER_CLIENT_DIALOG_HISTORY_DIR_NAME)
}