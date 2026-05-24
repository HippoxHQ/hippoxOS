use tauri::{AppHandle, Manager, Window};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct WindowState {
    pub is_maximized: bool,
    pub is_minimized: bool,
    pub is_fullscreen: bool,
    pub width: u32,
    pub height: u32,
}

#[tauri::command]
pub async fn window_minimize(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .minimize()
            .map_err(|e| format!("Failed to minimize: {}", e))
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub async fn window_maximize(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
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
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub async fn window_unmaximize(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .unmaximize()
            .map_err(|e| format!("Failed to unmaximize: {}", e))
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub async fn window_close(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .close()
            .map_err(|e| format!("Failed to close: {}", e))
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub async fn window_is_maximized(app_handle: AppHandle) -> Result<bool, String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .is_maximized()
            .map_err(|e| format!("Failed to check maximized state: {}", e))
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub async fn window_toggle_fullscreen(app_handle: AppHandle) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
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
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub async fn window_get_state(app_handle: AppHandle) -> Result<WindowState, String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        let size = window.outer_size().unwrap_or_default();
        Ok(WindowState {
            is_maximized: window.is_maximized().unwrap_or(false),
            is_minimized: window.is_minimized().unwrap_or(false),
            is_fullscreen: window.is_fullscreen().unwrap_or(false),
            width: size.width,
            height: size.height,
        })
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub async fn window_set_size(app_handle: AppHandle, width: u32, height: u32) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .set_size(tauri::Size::Logical(tauri::LogicalSize::new(
                width as f64,
                height as f64,
            )))
            .map_err(|e| format!("Failed to set window size: {}", e))
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub async fn window_set_position(app_handle: AppHandle, x: i32, y: i32) -> Result<(), String> {
    if let Some(window) = app_handle.get_webview_window("main") {
        window
            .set_position(tauri::Position::Logical(tauri::LogicalPosition::new(
                x as f64, y as f64,
            )))
            .map_err(|e| format!("Failed to set window position: {}", e))
    } else {
        Err("Window not found".to_string())
    }
}
