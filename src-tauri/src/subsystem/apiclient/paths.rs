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
