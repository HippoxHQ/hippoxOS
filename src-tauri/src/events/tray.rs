use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, Runtime, WebviewWindow,
};

pub(crate) struct TrayManager;

use once_cell::sync::Lazy;
use std::sync::Mutex;
static LLM_HEALTH_CACHE: Lazy<Mutex<std::collections::HashMap<String, bool>>> =
    Lazy::new(|| Mutex::new(std::collections::HashMap::new()));

impl TrayManager {
    pub fn setup<R: Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
        let app_handle = app.app_handle().clone();
        let new_session_item = Self::create_menu_item(app, "new_session")?;
        let sep1 = PredefinedMenuItem::separator(app)?;
        let llm_status_submenu = Self::create_llm_status_submenu_with_retry(app)?;
        let llm_config_item = Self::create_menu_item(app, "llm_config")?;
        let sep2 = PredefinedMenuItem::separator(app)?;
        let skills_market_item = Self::create_menu_item(app, "skills_market")?;
        let history_item = Self::create_menu_item(app, "history")?;
        let favorites_item = Self::create_menu_item(app, "favorites")?;
        let tasks_item = Self::create_menu_item(app, "scheduled_tasks")?;
        let sep3 = PredefinedMenuItem::separator(app)?;
        let history_dir_item = Self::create_menu_item(app, "open_history_dir")?;
        let notification_dir_item = Self::create_menu_item(app, "open_notification_dir")?;
        let workspace_dir_item = Self::create_menu_item(app, "open_workspace_dir")?;
        let sep4 = PredefinedMenuItem::separator(app)?;
        let settings_item = Self::create_menu_item(app, "settings")?;
        let updates_item = Self::create_menu_item(app, "check_updates")?;
        let about_item = Self::create_menu_item(app, "about")?;
        let quit_item = Self::create_menu_item(app, "quit")?;
        let menu = Menu::with_items(
            app,
            &[
                &new_session_item,
                &sep1,
                &llm_status_submenu,
                &llm_config_item,
                &sep2,
                &skills_market_item,
                &history_item,
                &favorites_item,
                &tasks_item,
                &sep3,
                &history_dir_item,
                &notification_dir_item,
                &workspace_dir_item,
                &sep4,
                &settings_item,
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
                let event_id = event.id.as_ref();
                if let Some(instance_id) = event_id.strip_prefix("llm_instance_") {
                    Self::set_default_llm(handle, instance_id.to_string());
                    return;
                }
                match event_id {
                    "new_session" => Self::new_session(handle),
                    "llm_config" => Self::open_llm_config(handle),
                    "skills_market" => Self::open_skills_market(handle),
                    "history" => Self::open_history(handle),
                    "favorites" => Self::open_favorites(handle),
                    "scheduled_tasks" => Self::open_scheduled_tasks(handle),
                    "open_history_dir" => Self::open_history_directory(),
                    "open_notification_dir" => Self::open_notification_directory(),
                    "open_workspace_dir" => Self::open_workspace_directory(),
                    "settings" => Self::open_settings(handle),
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
                if let Some(tray) = app_handle.tray_by_id("main_tray") {
                    if let Ok(new_menu) = Self::rebuild_menu(app_handle) {
                        let _ = tray.set_menu(Some(new_menu));
                    }
                }
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

    fn rebuild_menu<R: Runtime>(
        app_handle: &AppHandle<R>,
    ) -> Result<Menu<R>, Box<dyn std::error::Error>> {
        let new_session_item = Self::create_menu_item_from_handle(app_handle, "new_session")?;
        let sep1 = PredefinedMenuItem::separator(app_handle)?;
        let llm_status_submenu = Self::create_llm_status_submenu_from_handle(app_handle)?;
        let llm_config_item = Self::create_menu_item_from_handle(app_handle, "llm_config")?;
        let sep2 = PredefinedMenuItem::separator(app_handle)?;
        let skills_market_item = Self::create_menu_item_from_handle(app_handle, "skills_market")?;
        let history_item = Self::create_menu_item_from_handle(app_handle, "history")?;
        let favorites_item = Self::create_menu_item_from_handle(app_handle, "favorites")?;
        let tasks_item = Self::create_menu_item_from_handle(app_handle, "scheduled_tasks")?;
        let sep3 = PredefinedMenuItem::separator(app_handle)?;
        let history_dir_item = Self::create_menu_item_from_handle(app_handle, "open_history_dir")?;
        let notification_dir_item =
            Self::create_menu_item_from_handle(app_handle, "open_notification_dir")?;
        let workspace_dir_item =
            Self::create_menu_item_from_handle(app_handle, "open_workspace_dir")?;
        let sep4 = PredefinedMenuItem::separator(app_handle)?;
        let settings_item = Self::create_menu_item_from_handle(app_handle, "settings")?;
        let updates_item = Self::create_menu_item_from_handle(app_handle, "check_updates")?;
        let about_item = Self::create_menu_item_from_handle(app_handle, "about")?;
        let quit_item = Self::create_menu_item_from_handle(app_handle, "quit")?;
        let menu = Menu::with_items(
            app_handle,
            &[
                &new_session_item,
                &sep1,
                &llm_status_submenu,
                &llm_config_item,
                &sep2,
                &skills_market_item,
                &history_item,
                &favorites_item,
                &tasks_item,
                &sep3,
                &history_dir_item,
                &notification_dir_item,
                &workspace_dir_item,
                &sep4,
                &settings_item,
                &updates_item,
                &about_item,
                &quit_item,
            ],
        )
        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        Ok(menu)
    }

    fn create_menu_item_from_handle<R: Runtime>(
        app_handle: &AppHandle<R>,
        id: &str,
    ) -> Result<MenuItem<R>, Box<dyn std::error::Error>> {
        let lang = crate::common::get_setting_with_default("language", serde_json::json!("en"))
            .map(|v| v.as_str().unwrap_or("en").to_string())
            .unwrap_or_else(|_| "en".to_string());
        let text = match (lang.as_str(), id) {
            ("zh", "new_session") => "新建对话",
            ("zh", "llm_config") => "LLM 配置",
            ("zh", "skills_market") => "技能市场",
            ("zh", "history") => "对话历史",
            ("zh", "favorites") => "我的收藏",
            ("zh", "scheduled_tasks") => "定时任务",
            ("zh", "open_history_dir") => "历史会话目录",
            ("zh", "open_notification_dir") => "通知目录",
            ("zh", "open_workspace_dir") => "默认工作区目录",
            ("zh", "settings") => "设置",
            ("zh", "check_updates") => "检查更新",
            ("zh", "about") => "关于",
            ("zh", "quit") => "退出",
            (_, "new_session") => "New Session",
            (_, "llm_config") => "LLM Config",
            (_, "skills_market") => "Skills Market",
            (_, "history") => "History",
            (_, "favorites") => "Favorites",
            (_, "scheduled_tasks") => "Scheduled Tasks",
            (_, "open_history_dir") => "History Directory",
            (_, "open_notification_dir") => "Notification Directory",
            (_, "open_workspace_dir") => "Workspace Directory",
            (_, "settings") => "Settings",
            (_, "check_updates") => "Check for Updates",
            (_, "about") => "About",
            (_, "quit") => "Quit",
            _ => id,
        };
        Ok(MenuItem::with_id(app_handle, id, text, true, None::<&str>)?)
    }

    fn create_llm_status_submenu_from_handle<R: Runtime>(
        app_handle: &AppHandle<R>,
    ) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
        let lang = crate::common::get_setting_with_default("language", serde_json::json!("en"))
            .map(|v| v.as_str().unwrap_or("en").to_string())
            .unwrap_or_else(|_| "en".to_string());
        let submenu_title = match lang.as_str() {
            "zh" => "LLM 状态",
            _ => "LLM Status",
        };
        let mut submenu = Submenu::with_id(app_handle, "llm_status", submenu_title, true)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        let instances_result = Self::get_llm_instances_with_retry();
        match instances_result {
            Ok((mut instances, default_id)) => {
                instances.sort_by(|a, b| a.1.cmp(&b.1));
                let default_text = match lang.as_str() {
                    "zh" => "  [默认]",
                    _ => "  [Default]",
                };
                if instances.is_empty() {
                    let empty_text = match lang.as_str() {
                        "zh" => "暂无 LLM 配置",
                        _ => "No LLM configured",
                    };
                    let empty_item =
                        MenuItem::with_id(app_handle, "llm_empty", empty_text, false, None::<&str>)
                            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
                    let _ = submenu.append(&empty_item);
                } else {
                    for (id, name, is_default) in instances {
                        let status_icon = "🟢";
                        let default_mark = if is_default { default_text } else { "" };
                        let item_text = format!("{} {}{}", status_icon, name, default_mark);

                        let item = MenuItem::with_id(
                            app_handle,
                            &format!("llm_instance_{}", id),
                            &item_text,
                            true,
                            None::<&str>,
                        )
                        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
                        let _ = submenu.append(&item);
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to get LLM instances: {}", e);
                let error_text = match lang.as_str() {
                    "zh" => "加载失败，请检查配置",
                    _ => "Load failed, check config",
                };
                let error_item =
                    MenuItem::with_id(app_handle, "llm_error", error_text, false, None::<&str>)
                        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
                let _ = submenu.append(&error_item);
            }
        }
        Ok(submenu)
    }

    fn create_llm_status_submenu_with_retry<R: Runtime>(
        app: &tauri::App<R>,
    ) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
        let lang = crate::common::get_setting_with_default("language", serde_json::json!("en"))
            .map(|v| v.as_str().unwrap_or("en").to_string())
            .unwrap_or_else(|_| "en".to_string());
        let submenu_title = match lang.as_str() {
            "zh" => "LLM 状态",
            _ => "LLM Status",
        };
        let mut submenu = Submenu::with_id(app, "llm_status", submenu_title, true)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
        let instances_result = Self::get_llm_instances_with_retry();
        match instances_result {
            Ok((mut instances, default_id)) => {
                instances.sort_by(|a, b| a.1.cmp(&b.1));
                let default_text = match lang.as_str() {
                    "zh" => "  [默认]",
                    _ => "  [Default]",
                };
                if instances.is_empty() {
                    let empty_text = match lang.as_str() {
                        "zh" => "暂无 LLM 配置",
                        _ => "No LLM configured",
                    };
                    let empty_item =
                        MenuItem::with_id(app, "llm_empty", empty_text, false, None::<&str>)
                            .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
                    let _ = submenu.append(&empty_item);
                } else {
                    for (id, name, is_default) in instances {
                        let status_icon = "🟢";
                        let default_mark = if is_default { default_text } else { "" };
                        let item_text = format!("{} {}{}", status_icon, name, default_mark);

                        let item = MenuItem::with_id(
                            app,
                            &format!("llm_instance_{}", id),
                            &item_text,
                            true,
                            None::<&str>,
                        )
                        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
                        let _ = submenu.append(&item);
                    }
                }
            }
            Err(e) => {
                eprintln!("Failed to get LLM instances after retry: {}", e);
                let error_text = match lang.as_str() {
                    "zh" => "加载失败，请检查配置",
                    _ => "Load failed, check config",
                };
                let error_item =
                    MenuItem::with_id(app, "llm_error", error_text, false, None::<&str>)
                        .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
                let _ = submenu.append(&error_item);
            }
        }
        Ok(submenu)
    }

    fn get_llm_instances_with_retry() -> Result<(Vec<(String, String, bool)>, String), String> {
        use crate::commands::{get_default_llm_instance_id, get_llm_instances};
        let rt = tokio::runtime::Runtime::new().map_err(|e| e.to_string())?;
        let max_retries = 10;
        let retry_delay_ms = 300;
        for attempt in 0..max_retries {
            let _ = rt.block_on(crate::commands::load_config_from_file());
            match rt.block_on(get_llm_instances()) {
                Ok(instances) => {
                    if !instances.is_empty() {
                        let default_id = rt
                            .block_on(get_default_llm_instance_id())
                            .unwrap_or_default();
                        let mut instance_list: Vec<(String, String, bool)> = Vec::new();
                        for (id, instance) in instances.iter() {
                            instance_list.push((
                                id.clone(),
                                instance.name.clone(),
                                id == &default_id,
                            ));
                        }
                        instance_list.sort_by(|a, b| a.1.cmp(&b.1));
                        return Ok((instance_list, default_id));
                    }
                }
                Err(e) => {
                    eprintln!(
                        "[Attempt {}] Failed to get LLM instances: {}",
                        attempt + 1,
                        e
                    );
                }
            }
            if attempt < max_retries - 1 {
                std::thread::sleep(std::time::Duration::from_millis(retry_delay_ms));
            } else {
                eprintln!("[Attempt {}] Max retries reached, giving up", attempt + 1);
            }
        }
        Err("Failed to load LLM instances after retries".to_string())
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
            ("zh", "llm_config") => "LLM 配置",
            ("zh", "skills_market") => "技能市场",
            ("zh", "history") => "对话历史",
            ("zh", "favorites") => "我的收藏",
            ("zh", "scheduled_tasks") => "定时任务",
            ("zh", "open_history_dir") => "历史会话目录",
            ("zh", "open_notification_dir") => "通知目录",
            ("zh", "open_workspace_dir") => "默认工作区目录",
            ("zh", "settings") => "设置",
            ("zh", "check_updates") => "检查更新",
            ("zh", "about") => "关于",
            ("zh", "quit") => "退出",
            (_, "new_session") => "New Session",
            (_, "llm_config") => "LLM Config",
            (_, "skills_market") => "Skills Market",
            (_, "history") => "History",
            (_, "favorites") => "Favorites",
            (_, "scheduled_tasks") => "Scheduled Tasks",
            (_, "open_history_dir") => "History Directory",
            (_, "open_notification_dir") => "Notification Directory",
            (_, "open_workspace_dir") => "Workspace Directory",
            (_, "settings") => "Settings",
            (_, "check_updates") => "Check for Updates",
            (_, "about") => "About",
            (_, "quit") => "Quit",
            _ => id,
        };
        Ok(MenuItem::with_id(app, id, text, true, None::<&str>)?)
    }

    fn ensure_window_and_emit<R: Runtime>(app_handle: &AppHandle<R>, event: &str) {
        if let Some(window) = Self::get_webview_window(app_handle) {
            if !window.is_visible().unwrap_or(false) {
                let _ = window.show();
            }
            let _ = window.set_focus();
        }
        let _ = app_handle.emit(event, ());
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
