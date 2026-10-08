use crate::commands::paths::{get_app_root_dir, SUB_SYSTEM_PATH};
/// DataBase Client subsystem root directory name
const DATABASE_CLIENT_DIR_NAME: &str = "DataBaseClient";
/// DataBase Client dialog history directory name
const DATABASE_CLIENT_DIALOG_HISTORY_DIR_NAME: &str = "DataBaseDialogHistory";
/// DataBase Client subsystem root directory: HippoX/subsystem/DataBaseClient
pub fn get_databaseclient_root_dir() -> std::path::PathBuf {
    get_app_root_dir().join(SUB_SYSTEM_PATH).join(DATABASE_CLIENT_DIR_NAME)
}
/// DataBase Client dialog history directory: HippoX/subsystem/DataBaseClient/DataBaseDialogHistory
pub fn get_databaseclient_dialog_history_dir() -> std::path::PathBuf {
    get_databaseclient_root_dir().join(DATABASE_CLIENT_DIALOG_HISTORY_DIR_NAME)
}