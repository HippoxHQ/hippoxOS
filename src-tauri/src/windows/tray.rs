use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime, WebviewWindow, WebviewWindowBuilder, WindowEvent,
};

use crate::types::{WindowIdentifier, WindowType};

pub(crate) struct TrayManager;

use once_cell::sync::Lazy;
use std::sync::Mutex;
static LLM_HEALTH_CACHE: Lazy<Mutex<std::collections::HashMap<String, bool>>> =
    Lazy::new(|| Mutex::new(std::collections::HashMap::new()));

impl TrayManager {
    pub fn setup<R: Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
        let app_handle = app.app_handle().clone();
        let empty_menu = Menu::new(app)?;
        let _tray = TrayIconBuilder::with_id("main_tray")
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&empty_menu)
            .menu_on_left_click(false)
            .on_tray_icon_event(move |_tray, event| match event {
                TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } => {
                    Self::toggle_window(&app_handle);
                }
                TrayIconEvent::Click {
                    button: MouseButton::Right,
                    button_state: MouseButtonState::Up,
                    ..
                } => {
                    let _ = Self::create_tray_window(&app_handle);
                }
                _ => {}
            })
            .build(app)?;
        Ok(())
    }

    fn create_tray_window<R: Runtime>(
        app_handle: &AppHandle<R>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let (mouse_x, mouse_y) = Self::get_mouse_position();
        let menu_width = 260.0;
        let menu_height = 350.0;
        let (pos_x, pos_y) = Self::calculate_window_position(
            app_handle,
            (mouse_x - 100) as f64,
            (mouse_y - 15) as f64,
            menu_width,
            menu_height,
        )?;
        let window_label = format!("{}", WindowIdentifier::Tray);
        let url_type = format!("{}", WindowType::Tray);
        if let Some(window) = app_handle.get_webview_window(&window_label) {
            let _ = window.close();
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
        let window_clone = window.clone();
        let app_handle_clone = app_handle.clone();
        window.on_window_event(move |event| {
            if let WindowEvent::Focused(false) = event {
                let submenu_label = format!("{}", WindowIdentifier::Submenu);
                let submenu_window = app_handle_clone.get_webview_window(&submenu_label);
                let window = window_clone.clone();
                let app = app_handle_clone.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(150)).await;
                    let submenu = app.get_webview_window(&submenu_label);
                    if submenu.is_none() {
                        let _ = window.close();
                    }
                });
            }
        });
        Ok(())
    }

    fn calculate_window_position<R: Runtime>(
        app_handle: &AppHandle<R>,
        mouse_x: f64,
        mouse_y: f64,
        menu_width: f64,
        menu_height: f64,
    ) -> Result<(f64, f64), Box<dyn std::error::Error>> {
        let mut pos_x = mouse_x;
        let mut pos_y = mouse_y;

        if let Some(monitor) = app_handle.primary_monitor()? {
            let screen_width = monitor.size().width as f64;
            let screen_height = monitor.size().height as f64;

            let monitor_x = monitor.position().x as f64;
            let monitor_y = monitor.position().y as f64;

            let screen_left = monitor_x;
            let screen_right = monitor_x + screen_width;
            let screen_top = monitor_y;
            let screen_bottom = monitor_y + screen_height;

            pos_x = mouse_x;
            pos_y = mouse_y;

            if pos_x + menu_width > screen_right {
                pos_x = mouse_x - menu_width;
            }

            if pos_y + menu_height > screen_bottom {
                pos_y = mouse_y - menu_height;
            }

            if pos_x < screen_left {
                pos_x = screen_left;
            }

            if pos_y < screen_top {
                pos_y = screen_top;
            }
        }

        Ok((pos_x, pos_y))
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

    fn toggle_window<R: Runtime>(app_handle: &AppHandle<R>) {
        if let Some(window) = app_handle.get_webview_window("main") {
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }

    fn set_default_llm<R: Runtime>(app_handle: &AppHandle<R>, instance_id: String) {
        use crate::commands::set_default_llm_instance;
        let lang = crate::common::get_setting_with_default("language", serde_json::json!("en"))
            .map(|v| v.as_str().unwrap_or("en").to_string())
            .unwrap_or_else(|_| "en".to_string());
        let rt = tokio::runtime::Runtime::new().unwrap();
        match rt.block_on(set_default_llm_instance(instance_id.clone())) {
            Ok(_) => {
                let message = if lang == "zh" {
                    "默认 LLM 已更新"
                } else {
                    "Default LLM updated"
                };
                let _ = app_handle.emit(
                    "show-notification",
                    serde_json::json!({ "message": message }),
                );
            }
            Err(e) => {
                eprintln!("Failed to set default LLM: {}", e);
                let error_msg = if lang == "zh" {
                    format!("设置默认 LLM 失败: {}", e)
                } else {
                    format!("Failed to set default LLM: {}", e)
                };
                let _ = app_handle.emit(
                    "show-notification",
                    serde_json::json!({ "message": error_msg, "type": "error" }),
                );
            }
        }
    }

    fn ensure_window_and_emit<R: Runtime>(app_handle: &AppHandle<R>, event: &str) {
        if let Some(window) = app_handle.get_webview_window("main") {
            if !window.is_visible().unwrap_or(false) {
                let _ = window.show();
            }
            let _ = window.set_focus();
        }
        let _ = app_handle.emit(event, ());
    }

    fn new_session<R: Runtime>(app_handle: &AppHandle<R>) {
        Self::ensure_window_and_emit(app_handle, "new-session");
    }

    fn open_llm_config<R: Runtime>(app_handle: &AppHandle<R>) {
        Self::ensure_window_and_emit(app_handle, "open-llm-config");
    }

    fn open_skills_market<R: Runtime>(app_handle: &AppHandle<R>) {
        Self::ensure_window_and_emit(app_handle, "open-skills-market");
    }

    fn open_history<R: Runtime>(app_handle: &AppHandle<R>) {
        Self::ensure_window_and_emit(app_handle, "open-history");
    }

    fn open_favorites<R: Runtime>(app_handle: &AppHandle<R>) {
        Self::ensure_window_and_emit(app_handle, "open-favorites");
    }

    fn open_scheduled_tasks<R: Runtime>(app_handle: &AppHandle<R>) {
        Self::ensure_window_and_emit(app_handle, "open-scheduled-tasks");
    }

    fn open_settings<R: Runtime>(app_handle: &AppHandle<R>) {
        Self::ensure_window_and_emit(app_handle, "open-settings");
    }

    fn open_history_directory() {
        let history_dir = crate::commands::get_dialog_history_dir();
        if !history_dir.exists() {
            let _ = std::fs::create_dir_all(&history_dir);
        }
        Self::open_path(&history_dir);
    }

    fn open_notification_directory() {
        let notification_dir = crate::commands::get_notifications_dir();
        if !notification_dir.exists() {
            let _ = std::fs::create_dir_all(&notification_dir);
        }
        Self::open_path(&notification_dir);
    }

    fn open_workspace_directory() {
        let workspace_path = crate::workspace::get_default_workspace()
            .ok()
            .flatten()
            .map(|ws| ws.workspace_path)
            .unwrap_or_else(|| {
                crate::commands::get_app_root_dir()
                    .join("workspace")
                    .to_string_lossy()
                    .to_string()
            });
        let workspace_dir = std::path::PathBuf::from(&workspace_path);
        if !workspace_dir.exists() {
            let _ = std::fs::create_dir_all(&workspace_dir);
        }
        Self::open_path(&workspace_dir);
    }

    fn check_updates<R: Runtime>(app_handle: &AppHandle<R>) {
        Self::ensure_window_and_emit(app_handle, "check-updates");
    }

    fn about<R: Runtime>(app_handle: &AppHandle<R>) {
        Self::ensure_window_and_emit(app_handle, "show-about");
    }

    #[cfg(target_os = "windows")]
    fn open_path(path: &std::path::Path) {
        let _ = std::process::Command::new("explorer").arg(path).spawn();
    }

    #[cfg(target_os = "macos")]
    fn open_path(path: &std::path::Path) {
        let _ = std::process::Command::new("open").arg(path).spawn();
    }

    #[cfg(target_os = "linux")]
    fn open_path(path: &std::path::Path) {
        let _ = std::process::Command::new("xdg-open").arg(path).spawn();
    }
}
