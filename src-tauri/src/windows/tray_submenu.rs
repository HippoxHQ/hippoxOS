use crate::windows::{WindowIdentifier, WindowType};
use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewWindowBuilder, WindowEvent};
const TRAY_SUB_MENU_WIDTH: f64 = 200.0;
const TRAY_SUB_MENU_HEIGHT: f64 = 160.0;
pub struct SubmenuManager;
impl SubmenuManager {
    pub fn create_submenu_window<R: Runtime>(
        app_handle: &AppHandle<R>,
        items: Vec<serde_json::Value>,
        current_default_id: String,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let window_label = format!("{}", WindowIdentifier::TraySubmenu);
        if let Some(window) = app_handle.get_webview_window(&window_label) {
            let _ = window.close();
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
        // Anchor the submenu to the tray popover if it exists, otherwise use
        // the cursor. Both are normalized to LOGICAL top-left coordinates.
        let tray_window_label = format!("{}", WindowIdentifier::Tray);
        let tray_window = app_handle.get_webview_window(&tray_window_label);
        let (anchor_x, anchor_y) = if let Some(window) = tray_window {
            // `outer_position` returns PHYSICAL pixels with top-left origin.
            let position = window.outer_position()?;
            let scale = window.scale_factor().unwrap_or(1.0);
            (position.x as f64 / scale, position.y as f64 / scale)
        } else {
            let (mouse_x, mouse_y) = Self::get_mouse_position();
            #[cfg(target_os = "macos")]
            {
                // Cocoa: origin bottom-left, physical points -> flip Y.
                let (scale, screen_h_logical) = if let Some(monitor) = app_handle.primary_monitor()? {
                    (monitor.scale_factor(), monitor.size().height as f64 / monitor.scale_factor())
                } else {
                    (1.0, 0.0)
                };
                (mouse_x / scale, screen_h_logical - (mouse_y / scale))
            }
            #[cfg(not(target_os = "macos"))]
            {
                (mouse_x, mouse_y)
            }
        };
        let url_type = format!("{}", WindowType::TraySubmenu);
        // Place the submenu to the LEFT of the tray popover.
        let mut pos_x = anchor_x - TRAY_SUB_MENU_WIDTH - 5.0;
        let mut pos_y = anchor_y;
        if let Some(monitor) = app_handle.primary_monitor()? {
            let scale = monitor.scale_factor();
            let screen_width = monitor.size().width as f64 / scale;
            let screen_height = monitor.size().height as f64 / scale;
            let monitor_x = monitor.position().x as f64 / scale;
            let monitor_y = monitor.position().y as f64 / scale;
            let screen_left = monitor_x;
            let screen_right = monitor_x + screen_width;
            let screen_top = monitor_y;
            let screen_bottom = monitor_y + screen_height;
            if pos_x < screen_left {
                pos_x = anchor_x + 260.0 + 5.0;
            }
            if pos_x + TRAY_SUB_MENU_WIDTH > screen_right {
                pos_x = screen_right - TRAY_SUB_MENU_WIDTH - 5.0;
            }
            if pos_y < screen_top {
                pos_y = screen_top;
            }
            if pos_y + TRAY_SUB_MENU_HEIGHT > screen_bottom {
                pos_y = screen_bottom - TRAY_SUB_MENU_HEIGHT;
            }
        }
        let window = WebviewWindowBuilder::new(app_handle, &window_label, tauri::WebviewUrl::App(format!("index.html?type={}", url_type).into()))
            .title("")
            .inner_size(TRAY_SUB_MENU_WIDTH, TRAY_SUB_MENU_HEIGHT)
            .position(pos_x, pos_y)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(true)
            .resizable(false)
            .transparent(true)
            .shadow(false)
            .build()?;
        let data = serde_json::json!({
            "x": pos_x,
            "y": pos_y,
            "items": items,
            "defaultId": current_default_id,
        });
        let window_clone = window.clone();
        tauri::async_runtime::spawn(async move {
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            let _ = window_clone.emit("submenu-data", data);
        });
        let window_clone2 = window.clone();
        let app_handle_clone2 = app_handle.clone();
        let tray_window_label = format!("{}", WindowIdentifier::Tray);
        window.on_window_event(move |event| {
            if let WindowEvent::Focused(false) = event {
                let _ = window_clone2.close();
                let app = app_handle_clone2.clone();
                let tray_label = tray_window_label.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
                    if let Some(tray_window) = app.get_webview_window(&tray_label) {
                        let _ = tray_window.close();
                    }
                });
            }
        });
        Ok(())
    }
    /// Return the current cursor position.
    ///
    /// - Windows: physical pixels, origin top-left, Y grows down.
    /// - macOS:   physical points, origin bottom-left, Y grows up (Cocoa).
    ///            The caller flips Y because it needs the monitor height.
    /// - Linux:   not implemented, returns (0, 0).
    fn get_mouse_position() -> (f64, f64) {
        #[cfg(target_os = "windows")]
        {
            type POINT = (i32, i32);
            extern "system" {
                fn GetCursorPos(lpPoint: *mut POINT) -> i32;
            }
            let mut point = (0, 0);
            unsafe {
                GetCursorPos(&mut point);
            }
            (point.0 as f64, point.1 as f64)
        }
        #[cfg(target_os = "macos")]
        {
            use objc::{class, msg_send, sel, sel_impl};
            let ns_event: *mut objc::runtime::Object = unsafe { msg_send![class!(NSEvent), mouseLocation] };
            let x: f64 = unsafe { msg_send![ns_event, x] };
            let y: f64 = unsafe { msg_send![ns_event, y] };
            (x, y)
        }
        #[cfg(target_os = "linux")]
        {
            (0.0, 0.0)
        }
    }
}
