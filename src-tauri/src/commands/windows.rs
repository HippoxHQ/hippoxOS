use tauri::{AppHandle, Emitter, Manager};

use crate::windows::SubmenuManager;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WindowState {
    pub is_maximized: bool,
    pub is_minimized: bool,
    pub is_fullscreen: bool,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub async fn cmd_window_minimize(
    app_handle: AppHandle,
    window_id: Option<String>,
) -> Result<(), String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        window
            .minimize()
            .map_err(|e| format!("Failed to minimize: {}", e))
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_maximize(
    app_handle: AppHandle,
    window_id: Option<String>,
) -> Result<(), String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        if window.is_maximized().unwrap_or(false) {
            window
                .unmaximize()
                .map_err(|e| format!("Failed to unmaximize: {}", e))
        } else {
            window
                .maximize()
                .map_err(|e| format!("Failed to maximize: {}", e))
        }
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_unmaximize(
    app_handle: AppHandle,
    window_id: Option<String>,
) -> Result<(), String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        window
            .unmaximize()
            .map_err(|e| format!("Failed to unmaximize: {}", e))
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_close(
    app_handle: AppHandle,
    window_id: Option<String>,
) -> Result<(), String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        window
            .close()
            .map_err(|e| format!("Failed to close: {}", e))
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_is_maximized(
    app_handle: AppHandle,
    window_id: Option<String>,
) -> Result<bool, String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        window
            .is_maximized()
            .map_err(|e| format!("Failed to check maximized state: {}", e))
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_toggle_fullscreen(
    app_handle: AppHandle,
    window_id: Option<String>,
) -> Result<(), String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        if window.is_fullscreen().unwrap_or(false) {
            window
                .set_fullscreen(false)
                .map_err(|e| format!("Failed to exit fullscreen: {}", e))
        } else {
            window
                .set_fullscreen(true)
                .map_err(|e| format!("Failed to enter fullscreen: {}", e))
        }
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_get_state(
    app_handle: AppHandle,
    window_id: Option<String>,
) -> Result<WindowState, String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        let size = window.outer_size().unwrap_or_default();
        Ok(WindowState {
            is_maximized: window.is_maximized().unwrap_or(false),
            is_minimized: window.is_minimized().unwrap_or(false),
            is_fullscreen: window.is_fullscreen().unwrap_or(false),
            width: size.width,
            height: size.height,
        })
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_set_size(
    app_handle: AppHandle,
    window_id: Option<String>,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        window
            .set_size(tauri::Size::Logical(tauri::LogicalSize::new(
                width as f64,
                height as f64,
            )))
            .map_err(|e| format!("Failed to set window size: {}", e))
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_set_position(
    app_handle: AppHandle,
    window_id: Option<String>,
    x: i32,
    y: i32,
) -> Result<(), String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        window
            .set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
                x as f64, y as f64,
            )))
            .map_err(|e| format!("Failed to set window position: {}", e))
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_hide(
    app_handle: AppHandle,
    window_id: Option<String>,
) -> Result<(), String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        window.hide().map_err(|e| format!("Failed to hide: {}", e))
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_show(
    app_handle: AppHandle,
    window_id: Option<String>,
) -> Result<(), String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        window.show().map_err(|e| format!("Failed to show: {}", e))
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_is_visible(
    app_handle: AppHandle,
    window_id: Option<String>,
) -> Result<bool, String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        window
            .is_visible()
            .map_err(|e| format!("Failed to check visibility: {}", e))
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

#[tauri::command]
pub async fn cmd_window_set_focus(
    app_handle: AppHandle,
    window_id: Option<String>,
) -> Result<(), String> {
    let id = window_id.as_deref().unwrap_or("main");
    if let Some(window) = app_handle.get_webview_window(id) {
        window
            .set_focus()
            .map_err(|e| format!("Failed to set focus: {}", e))
    } else {
        Err(format!("Window '{}' not found", id))
    }
}

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
