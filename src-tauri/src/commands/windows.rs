use tauri::{Emitter, Manager};

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

#[tauri::command]
pub async fn cmd_emit_to_main_window(
    app_handle: tauri::AppHandle,
    event: String,
    payload: Option<serde_json::Value>,
) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.emit(&event, payload.unwrap_or(serde_json::json!({})));
    }
    Ok(())
}
