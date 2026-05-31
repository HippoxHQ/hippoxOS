use crate::types::{WindowIdentifier, WindowType};
use tauri::{AppHandle, Emitter, Manager, Runtime, WebviewWindowBuilder, WindowEvent};

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
        let tray_window_label = format!("{}", WindowIdentifier::Tray);
        let tray_window = app_handle.get_webview_window(&tray_window_label);

        let (x, y) = if let Some(window) = tray_window {
            let position = window.outer_position()?;
            (position.x as f64, position.y as f64)
        } else {
            let (mouse_x, mouse_y) = Self::get_mouse_position();
            (mouse_x as f64, mouse_y as f64)
        };
        let url_type = format!("{}", WindowType::TraySubmenu);
        let menu_width = 200.0;
        let menu_height = 300.0;
        let mut pos_x = x - menu_width - 5.0;
        let mut pos_y = y;
        if let Some(monitor) = app_handle.primary_monitor()? {
            let screen_width = monitor.size().width as f64;
            let monitor_x = monitor.position().x as f64;
            let screen_left = monitor_x;
            let screen_right = monitor_x + screen_width;
            if pos_x < screen_left {
                pos_x = x + 260.0 + 5.0;
            }
            if pos_x + menu_width > screen_right {
                pos_x = screen_right - menu_width - 5.0;
            }
        }
        let window = WebviewWindowBuilder::new(
            app_handle,
            &window_label,
            tauri::WebviewUrl::App(format!("index.html?type={}", url_type).into()),
        )
        .title("")
        .inner_size(menu_width, menu_height)
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

    fn get_mouse_position() -> (i32, i32) {
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
            point
        }
        #[cfg(target_os = "macos")]
        {
            use objc::{class, msg_send, sel, sel_impl};
            let ns_event: *mut objc::runtime::Object =
                unsafe { msg_send![class!(NSEvent), mouseLocation] };
            let x: f64 = unsafe { msg_send![ns_event, x] };
            let y: f64 = unsafe { msg_send![ns_event, y] };
            (x as i32, y as i32)
        }
        #[cfg(target_os = "linux")]
        {
            (0, 0)
        }
    }
}
