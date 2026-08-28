use crate::windows::{WindowIdentifier, WindowType};
use tauri::{AppHandle, Manager, Runtime, WebviewWindowBuilder};
pub struct AboutWindowManager;
impl AboutWindowManager {
    pub fn create_about_window<R: Runtime>(app_handle: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
        let window_label = format!("{}", WindowIdentifier::About);
        // Close existing about window if open
        if let Some(window) = app_handle.get_webview_window(&window_label) {
            let _ = window.close();
            std::thread::sleep(std::time::Duration::from_millis(150));
        }
        let url_type = format!("{}", WindowType::About);
        let window_width = 500.0;
        let window_height = 650.0;
        let (pos_x, pos_y) = Self::calculate_center_position(app_handle, window_width, window_height)?;
        let window = WebviewWindowBuilder::new(app_handle, &window_label, tauri::WebviewUrl::App(format!("index.html?type={}", url_type).into()))
            .title("")
            .inner_size(window_width, window_height)
            .position(pos_x, pos_y)
            .decorations(false)
            .always_on_top(true)
            .focused(true)
            .resizable(true)
            .min_inner_size(400.0, 400.0)
            .transparent(true)
            .shadow(false)
            .build()?;
        Ok(())
    }
    fn calculate_center_position<R: Runtime>(app_handle: &AppHandle<R>, width: f64, height: f64) -> Result<(f64, f64), Box<dyn std::error::Error>> {
        let mut x = 100.0;
        let mut y = 100.0;
        if let Some(monitor) = app_handle.primary_monitor()? {
            let screen_width = monitor.size().width as f64;
            let screen_height = monitor.size().height as f64;
            let monitor_x = monitor.position().x as f64;
            let monitor_y = monitor.position().y as f64;
            x = monitor_x + (screen_width - width) / 2.0;
            y = monitor_y + (screen_height - height) / 2.0;
            x = x.max(monitor_x);
            y = y.max(monitor_y);
        }
        Ok((x, y))
    }
    pub fn close_about_window<R: Runtime>(app_handle: &AppHandle<R>) {
        let window_label = format!("{}", WindowIdentifier::About);
        if let Some(window) = app_handle.get_webview_window(&window_label) {
            let _ = window.close();
        }
    }
}
