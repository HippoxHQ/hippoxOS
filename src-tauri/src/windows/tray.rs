use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime, WebviewWindow, WebviewWindowBuilder, WindowEvent,
};
pub(crate) struct TrayManager;
use crate::commons::FileUtils;
use crate::windows::{WindowIdentifier, WindowType};
use once_cell::sync::Lazy;
use std::sync::Mutex;
static LLM_HEALTH_CACHE: Lazy<Mutex<std::collections::HashMap<String, bool>>> = Lazy::new(|| Mutex::new(std::collections::HashMap::new()));
const TRAY_MENU_WIDTH: f64 = 200.0;
const TRAY_MENU_HEIGHT: f64 = 145.0;
impl TrayManager {
    pub fn setup<R: Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
        let app_handle = app.app_handle().clone();
        let app_handle_for_events = app_handle.clone();
        let empty_menu = Menu::new(app)?;
        let _tray = TrayIconBuilder::with_id("main_tray")
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&empty_menu)
            .menu_on_left_click(false)
            .on_tray_icon_event(move |_tray, event| match event {
                TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } => {
                    Self::toggle_window(&app_handle_for_events);
                }
                TrayIconEvent::Click { button: MouseButton::Right, button_state: MouseButtonState::Up, position, .. } => {
                    let _ = Self::show_tray_window(&app_handle_for_events, position.x, position.y);
                }
                _ => {}
            })
            .build(app)?;
        let _ = Self::ensure_tray_window_precreated(&app_handle);
        let _ = crate::windows::SubmenuManager::precreate_submenu_window(&app_handle);
        Ok(())
    }
    /// Create the tray webview window once (hidden, off-screen). 
    fn ensure_tray_window_precreated<R: Runtime>(app_handle: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
        let window_label = format!("{}", WindowIdentifier::Tray);
        if app_handle.get_webview_window(&window_label).is_some() {
            return Ok(());
        }
        let url_type = format!("{}", WindowType::Tray);
        let window = WebviewWindowBuilder::new(app_handle, &window_label, tauri::WebviewUrl::App(format!("index.html?type={}", url_type).into()))
            .title("")
            .inner_size(TRAY_MENU_WIDTH, TRAY_MENU_HEIGHT)
            // Start far off-screen so nothing flashes on launch.
            .position(-10000.0, -10000.0)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false)
            .resizable(false)
            .transparent(true)
            .shadow(false)
            .visible(false)
            .build()?;
        let window_clone = window.clone();
        let app_handle_clone = app_handle.clone();
        window.on_window_event(move |event| {
            if let WindowEvent::Focused(false) = event {
                let submenu_label = format!("{}", WindowIdentifier::TraySubmenu);
                let app = app_handle_clone.clone();
                let window = window_clone.clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(tokio::time::Duration::from_millis(120)).await;
                    let submenu = app.get_webview_window(&submenu_label);
                    // Hide only when the submenu is not visible (or missing).
                    let submenu_visible = submenu.as_ref().map(|w| w.is_visible().unwrap_or(false)).unwrap_or(false);
                    if !submenu_visible {
                        let _ = window.hide();
                    }
                });
            }
        });
        Ok(())
    }
    /// Reposition the pre-created tray window next to the icon and show it.
    fn show_tray_window<R: Runtime>(app_handle: &AppHandle<R>, icon_physical_x: f64, icon_physical_y: f64) -> Result<(), Box<dyn std::error::Error>> {
        let window_label = format!("{}", WindowIdentifier::Tray);
        // Defensive: if the window was somehow destroyed, recreate it.
        if app_handle.get_webview_window(&window_label).is_none() {
            Self::ensure_tray_window_precreated(app_handle)?;
        }
        let (pos_x, pos_y) = Self::calculate_window_position(app_handle, icon_physical_x, icon_physical_y, TRAY_MENU_WIDTH, TRAY_MENU_HEIGHT)?;
        if let Some(window) = app_handle.get_webview_window(&window_label) {
            // `set_position` expects LOGICAL coordinates; calculate_window_position
            // already returns logical values.
            let _ = window.set_position(tauri::LogicalPosition::new(pos_x, pos_y));
            let _ = window.show();
            let _ = window.set_focus();
            // Notify the frontend so it can refresh live data (update status,
            // health checks, etc.) without blocking the first paint.
            let _ = window.emit("tray-opened", ());
        }
        Ok(())
    }
    /// Place the tray popover next to the tray icon.
    fn calculate_window_position<R: Runtime>(
        app_handle: &AppHandle<R>,
        icon_physical_x: f64,
        icon_physical_y: f64,
        menu_width: f64,
        menu_height: f64,
    ) -> Result<(f64, f64), Box<dyn std::error::Error>> {
        let monitor = match app_handle.primary_monitor()? {
            Some(m) => m,
            None => {
                // No monitor info: best-effort, place at the raw icon position.
                return Ok((icon_physical_x, icon_physical_y));
            }
        };
        let scale = monitor.scale_factor();
        // Convert icon physical position -> logical, top-left origin.
        let icon_x = icon_physical_x / scale;
        let icon_y = icon_physical_y / scale;
        let screen_width = monitor.size().width as f64 / scale;
        let screen_height = monitor.size().height as f64 / scale;
        let monitor_x = monitor.position().x as f64 / scale;
        let monitor_y = monitor.position().y as f64 / scale;
        let screen_left = monitor_x;
        let screen_right = monitor_x + screen_width;
        let screen_top = monitor_y;
        let screen_bottom = monitor_y + screen_height;
        // Default: below-left of the icon, like a status bar dropdown.
        let mut pos_x = icon_x - menu_width + 24.0;
        let mut pos_y = icon_y + 8.0;
        // If it overflows the bottom, open upward instead.
        if pos_y + menu_height > screen_bottom {
            pos_y = icon_y - menu_height - 8.0;
        }
        // If it overflows the right, shift left.
        if pos_x + menu_width > screen_right {
            pos_x = screen_right - menu_width;
        }
        // Clamp to the visible frame.
        if pos_x < screen_left {
            pos_x = screen_left;
        }
        if pos_y < screen_top {
            pos_y = screen_top;
        }
        Ok((pos_x, pos_y))
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
        use crate::commands::cmd_set_default_llm_instance;
        let lang = crate::commons::get_setting_with_default("language", serde_json::json!("en"))
            .map(|v| v.as_str().unwrap_or("en").to_string())
            .unwrap_or_else(|_| "en".to_string());
        let rt = tokio::runtime::Runtime::new().unwrap();
        match rt.block_on(cmd_set_default_llm_instance(instance_id.clone())) {
            Ok(_) => {
                let message = if lang == "zh" { "默认 LLM 已更新" } else { "Default LLM updated" };
                let _ = app_handle.emit("show-notification", serde_json::json!({ "message": message }));
            }
            Err(e) => {
                log::error!("Failed to set default LLM: {}", e);
                let error_msg = if lang == "zh" { format!("设置默认 LLM 失败: {}", e) } else { format!("Failed to set default LLM: {}", e) };
                let _ = app_handle.emit("show-notification", serde_json::json!({ "message": error_msg, "type": "error" }));
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
        let history_dir = crate::commands::get_general_history_dir();
        if !history_dir.exists() {
            let _ = FileUtils::ensure_dir(&history_dir);
        }
        Self::open_path(&history_dir);
    }
    fn open_notification_directory() {
        let notification_dir = crate::commands::get_notifications_dir();
        if !notification_dir.exists() {
            let _ = FileUtils::ensure_dir(&notification_dir);
        }
        Self::open_path(&notification_dir);
    }
    fn open_workspace_directory() {
        let workspace_path = crate::workspace::get_default_workspace()
            .ok()
            .flatten()
            .map(|ws| ws.workspace_path)
            .unwrap_or_else(|| crate::commands::get_app_root_dir().join("workspace").to_string_lossy().to_string());
        let workspace_dir = std::path::PathBuf::from(&workspace_path);
        if !workspace_dir.exists() {
            let _ = FileUtils::ensure_dir(&workspace_dir);
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
        let _ = crate::commons::hidden_cmd("explorer").arg(path).spawn();
    }
    #[cfg(target_os = "macos")]
    fn open_path(path: &std::path::Path) {
        let _ = crate::commons::hidden_cmd("open").arg(path).spawn();
    }
    #[cfg(target_os = "linux")]
    fn open_path(path: &std::path::Path) {
        let _ = crate::commons::hidden_cmd("xdg-open").arg(path).spawn();
    }
}
