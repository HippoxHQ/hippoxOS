use crate::windows::SubmenuManager;

#[tauri::command]
pub async fn cmd_create_submenu_window(
    app_handle: tauri::AppHandle,
    items: Vec<serde_json::Value>,
    current_default_id: String,
) -> Result<(), String> {
    SubmenuManager::create_submenu_window(&app_handle, items, current_default_id)
        .map_err(|e| e.to_string())
}
