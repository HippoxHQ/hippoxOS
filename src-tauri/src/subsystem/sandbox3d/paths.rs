use crate::commands::get_sandbox3d_dialog_history_dir;
use std::path::PathBuf;
/// SandBox3D GIF export directory for a specific session
/// Format: HippoX/SandBox3DDialogHistory/{session_id}/exports/
pub fn get_sandbox3d_gif_export_dir(session_id: &str) -> PathBuf {
    get_sandbox3d_dialog_history_dir().join(session_id).join("exports")
}
/// Get GIF export path for a specific session and task
/// Format: HippoX/SandBox3DDialogHistory/{session_id}/exports/{task_id}.gif
pub fn get_sandbox3d_gif_path(session_id: &str, task_id: &str) -> PathBuf {
    get_sandbox3d_gif_export_dir(session_id).join(format!("{}.gif", task_id))
}
