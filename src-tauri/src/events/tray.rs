use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager, Runtime, WebviewWindow,
};

pub(crate) struct TrayManager;

impl TrayManager {
    pub fn setup<R: Runtime>(app: &tauri::App<R>) -> Result<(), Box<dyn std::error::Error>> {
        let app_handle = app.app_handle().clone();
        let show_item = MenuItem::with_id(app, "show", "显示窗口", true, None::<&str>)?;
        let hide_item = MenuItem::with_id(app, "hide", "隐藏窗口", true, None::<&str>)?;
        let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
        let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;
        let app_handle_for_menu = app_handle.clone();
        let app_handle_for_icon = app_handle.clone();
        let _tray = TrayIconBuilder::with_id("main_tray")
            .icon(app.default_window_icon().unwrap().clone())
            .menu(&menu)
            .menu_on_left_click(false)
            .on_menu_event(move |_app, event| match event.id.as_ref() {
                "show" => TrayManager::show_window(&app_handle_for_menu),
                "hide" => TrayManager::hide_window(&app_handle_for_menu),
                "quit" => TrayManager::quit_app(),
                _ => {}
            })
            .on_tray_icon_event(move |_tray, event| {
                if let TrayIconEvent::Click {
                    button: MouseButton::Left,
                    button_state: MouseButtonState::Up,
                    ..
                } = event
                {
                    TrayManager::toggle_window(&app_handle_for_icon);
                }
            })
            .build(app)?;
        Ok(())
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

    fn quit_app() {
        std::process::exit(0);
    }
}
