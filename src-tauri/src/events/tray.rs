use tauri::{
    AppHandle, Emitter, Manager, Runtime, WebviewWindow, menu::{Menu, MenuItem, PredefinedMenuItem}, tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent}
};

pub(crate) struct TrayManager;

impl TrayManager {
    pub fn setup<R: Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
        let app_handle = app.app_handle().clone();
        let show_item = Self::create_menu_item(app, "show")?;
        let hide_item = Self::create_menu_item(app, "hide")?;
        let new_session_item = Self::create_menu_item(app, "new_session")?;
        let sep1 = PredefinedMenuItem::separator(app)?;
        let settings_item = Self::create_menu_item(app, "settings")?;
        let skills_item = Self::create_menu_item(app, "skills_market")?;
        let sep2 = PredefinedMenuItem::separator(app)?;
        let history_dir_item = Self::create_menu_item(app, "open_history_dir")?;
        let notification_dir_item = Self::create_menu_item(app, "open_notification_dir")?;
        let workspace_dir_item = Self::create_menu_item(app, "open_workspace_dir")?;
        let sep3 = PredefinedMenuItem::separator(app)?;
        let updates_item = Self::create_menu_item(app, "check_updates")?;
        let about_item = Self::create_menu_item(app, "about")?;
        let quit_item = Self::create_menu_item(app, "quit")?;
        let menu = Menu::with_items(
            app,
            &[
                &show_item,
                &hide_item,
                &new_session_item,
                &sep1,
                &settings_item,
                &skills_item,
                &sep2,
                &history_dir_item,
                &notification_dir_item,
                &workspace_dir_item,
                &sep3,
                &updates_item,
                &about_item,
                &quit_item,
            ],
        )?;
        let app_handle_for_menu = app_handle.clone();
        let app_handle_for_icon = app_handle.clone();
        let _tray = TrayIconBuilder::with_id("main_tray")
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&menu)
            .menu_on_left_click(false)
            .on_menu_event(move |_app, event| {
                let handle = &app_handle_for_menu;
                match event.id.as_ref() {
                    "show" => Self::show_window(handle),
                    "hide" => Self::hide_window(handle),
                    "new_session" => Self::new_session(handle),
                    "settings" => Self::open_settings(handle),
                    "skills_market" => Self::open_skills_market(handle),
                    "open_history_dir" => Self::open_history_directory(),
                    "open_notification_dir" => Self::open_notification_directory(),
                    "open_workspace_dir" => Self::open_workspace_directory(),
                    "check_updates" => Self::check_updates(handle),
                    "about" => Self::about(handle),
                    "quit" => std::process::exit(0),
                    _ => {}
                }
            })
            .on_tray_icon_event(move |_tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    Self::toggle_window(&app_handle_for_icon);
                }
            })
            .build(app)?;

        Ok(())
    }

    fn create_menu_item<R: Runtime>(
        app: &tauri::App<R>,
        id: &str,
    ) -> Result<MenuItem<R>, Box<dyn std::error::Error>> {
        let lang = crate::common::get_setting_with_default("language", serde_json::json!("en"))
            .map(|v| v.as_str().unwrap_or("en").to_string())
            .unwrap_or_else(|_| "en".to_string());
        let text = match (lang.as_str(), id) {
            ("zh", "new_session") => "新建对话",
            ("zh", "settings") => "设置",
            ("zh", "skills_market") => "技能市场",
            ("zh", "open_history_dir") => "历史会话目录",
            ("zh", "open_notification_dir") => "通知目录",
            ("zh", "open_workspace_dir") => "默认工作区目录",
            ("zh", "check_updates") => "检查更新",
            ("zh", "about") => "关于",
            ("zh", "quit") => "退出",
            (_, "new_session") => "New Session",
            (_, "settings") => "Settings",
            (_, "skills_market") => "Skills Market",
            (_, "open_history_dir") => "History Directory",
            (_, "open_notification_dir") => "Notification Directory",
            (_, "open_workspace_dir") => "Workspace Directory",
            (_, "check_updates") => "Check for Updates",
            (_, "about") => "About",
            (_, "quit") => "Quit",
            _ => id,
        };
        Ok(MenuItem::with_id(app, id, text, true, None::<&str>)?)
    }

    fn get_webview_window<R: Runtime>(app_handle: &AppHandle<R>) -> Option<WebviewWindow<R>> {
        app_handle.get_webview_window("main")
    }

    fn toggle_window<R: Runtime>(app_handle: &AppHandle<R>) {
        if let Some(window) = Self::get_webview_window(app_handle) {
            if window.is_visible().unwrap_or(false) {
                let _ = window.hide();
            } else {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    }

    fn show_window<R: Runtime>(app_handle: &AppHandle<R>) {
        if let Some(window) = Self::get_webview_window(app_handle) {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }

    fn hide_window<R: Runtime>(app_handle: &AppHandle<R>) {
        if let Some(window) = Self::get_webview_window(app_handle) {
            let _ = window.hide();
        }
    }

    fn new_session<R: Runtime>(app_handle: &AppHandle<R>) {
        let _ = app_handle.emit("new-session", ());
    }

    fn open_settings<R: Runtime>(app_handle: &AppHandle<R>) {
        let _ = app_handle.emit("open-settings", ());
    }

    fn open_skills_market<R: Runtime>(app_handle: &AppHandle<R>) {
        let _ = app_handle.emit("open-skills-market", ());
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
        let _ = app_handle.emit("check-updates", ());
    }

    fn about<R: Runtime>(app_handle: &AppHandle<R>) {
        let _ = app_handle.emit("show-about", ());
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
