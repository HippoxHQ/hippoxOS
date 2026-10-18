use crate::windows::{AboutWindowManager, RegionSelectManager, SubmenuManager};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WindowState {
    pub is_maximized: bool,
    pub is_minimized: bool,
    pub is_fullscreen: bool,
    pub width: u32,
    pub height: u32,
}
/// Resolve the target window for a command.
fn resolve_target_window(caller: &WebviewWindow, window_id: Option<String>) -> Result<WebviewWindow, String> {
    match window_id {
        Some(id) => caller.app_handle().get_webview_window(&id).ok_or_else(|| format!("Window '{}' not found", id)),
        None => Ok(caller.clone()),
    }
}
#[tauri::command]
pub async fn cmd_window_minimize(window: WebviewWindow, window_id: Option<String>) -> Result<(), String> {
    let target = resolve_target_window(&window, window_id)?;
    target.minimize().map_err(|e| format!("Failed to minimize: {}", e))
}
#[tauri::command]
pub async fn cmd_window_maximize(window: WebviewWindow, window_id: Option<String>) -> Result<(), String> {
    let target = resolve_target_window(&window, window_id)?;
    if target.is_maximized().unwrap_or(false) {
        target.unmaximize().map_err(|e| format!("Failed to unmaximize: {}", e))
    } else {
        target.maximize().map_err(|e| format!("Failed to maximize: {}", e))
    }
}
#[tauri::command]
pub async fn cmd_window_unmaximize(window: WebviewWindow, window_id: Option<String>) -> Result<(), String> {
    let target = resolve_target_window(&window, window_id)?;
    target.unmaximize().map_err(|e| format!("Failed to unmaximize: {}", e))
}
#[tauri::command]
pub async fn cmd_window_close(window: WebviewWindow, window_id: Option<String>) -> Result<(), String> {
    let target = resolve_target_window(&window, window_id)?;
    target.close().map_err(|e| format!("Failed to close: {}", e))
}
#[tauri::command]
pub async fn cmd_window_is_maximized(window: WebviewWindow, window_id: Option<String>) -> Result<bool, String> {
    let target = resolve_target_window(&window, window_id)?;
    target.is_maximized().map_err(|e| format!("Failed to check maximized state: {}", e))
}
#[tauri::command]
pub async fn cmd_window_toggle_fullscreen(window: WebviewWindow, window_id: Option<String>) -> Result<(), String> {
    let target = resolve_target_window(&window, window_id)?;
    if target.is_fullscreen().unwrap_or(false) {
        target.set_fullscreen(false).map_err(|e| format!("Failed to exit fullscreen: {}", e))
    } else {
        target.set_fullscreen(true).map_err(|e| format!("Failed to enter fullscreen: {}", e))
    }
}
#[tauri::command]
pub async fn cmd_window_get_state(window: WebviewWindow, window_id: Option<String>) -> Result<WindowState, String> {
    let target = resolve_target_window(&window, window_id)?;
    let size = target.outer_size().unwrap_or_default();
    Ok(WindowState {
        is_maximized: target.is_maximized().unwrap_or(false),
        is_minimized: target.is_minimized().unwrap_or(false),
        is_fullscreen: target.is_fullscreen().unwrap_or(false),
        width: size.width,
        height: size.height,
    })
}
#[tauri::command]
pub async fn cmd_window_set_size(window: WebviewWindow, window_id: Option<String>, width: u32, height: u32) -> Result<(), String> {
    let target = resolve_target_window(&window, window_id)?;
    target
        .set_size(tauri::Size::Logical(tauri::LogicalSize::new(width as f64, height as f64)))
        .map_err(|e| format!("Failed to set window size: {}", e))
}
#[tauri::command]
pub async fn cmd_window_set_position(window: WebviewWindow, window_id: Option<String>, x: i32, y: i32) -> Result<(), String> {
    let target = resolve_target_window(&window, window_id)?;
    target
        .set_position(tauri::Position::Logical(tauri::LogicalPosition::new(x as f64, y as f64)))
        .map_err(|e| format!("Failed to set window position: {}", e))
}
#[tauri::command]
pub async fn cmd_window_hide(window: WebviewWindow, window_id: Option<String>) -> Result<(), String> {
    let target = resolve_target_window(&window, window_id)?;
    target.hide().map_err(|e| format!("Failed to hide: {}", e))
}
#[tauri::command]
pub async fn cmd_window_show(window: WebviewWindow, window_id: Option<String>) -> Result<(), String> {
    let target = resolve_target_window(&window, window_id)?;
    target.show().map_err(|e| format!("Failed to show: {}", e))
}
#[tauri::command]
pub async fn cmd_window_is_visible(window: WebviewWindow, window_id: Option<String>) -> Result<bool, String> {
    let target = resolve_target_window(&window, window_id)?;
    target.is_visible().map_err(|e| format!("Failed to check visibility: {}", e))
}
#[tauri::command]
pub async fn cmd_window_set_focus(window: WebviewWindow, window_id: Option<String>) -> Result<(), String> {
    let target = resolve_target_window(&window, window_id)?;
    target.set_focus().map_err(|e| format!("Failed to set focus: {}", e))
}
#[tauri::command]
pub async fn cmd_create_submenu_window(
    app_handle: tauri::AppHandle,
    items: Vec<serde_json::Value>,
    current_default_id: String,
) -> Result<(), String> {
    SubmenuManager::create_submenu_window(&app_handle, items, current_default_id).map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn cmd_create_about_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    AboutWindowManager::create_about_window(&app_handle).map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn cmd_emit_to_main_window(app_handle: tauri::AppHandle, event: String, payload: Option<serde_json::Value>) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        let _ = window.emit(&event, payload.unwrap_or(serde_json::json!({})));
    }
    Ok(())
}
#[tauri::command]
pub async fn cmd_open_region_select_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    RegionSelectManager::create_region_select_window(&app_handle).map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn cmd_close_region_select_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    RegionSelectManager::close_region_select_window(&app_handle);
    Ok(())
}
#[tauri::command]
pub async fn cmd_confirm_region_select(app_handle: tauri::AppHandle, region: serde_json::Value) -> Result<(), String> {
    RegionSelectManager::close_region_select_window(&app_handle);
    let _ = app_handle.emit("region-selected", region);
    Ok(())
}
#[tauri::command]
pub async fn cmd_create_main_window(app: tauri::AppHandle, subsystem_id: Option<String>) -> Result<String, String> {
    crate::windows::MainWindowManager::create_main_window(&app, subsystem_id).map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn cmd_create_update_window(app_handle: tauri::AppHandle) -> Result<(), String> {
    crate::windows::UpdateWindowManager::create_update_window(&app_handle).map_err(|e| e.to_string())
}