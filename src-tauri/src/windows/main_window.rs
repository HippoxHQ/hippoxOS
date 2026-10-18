use crate::windows::{WindowIdentifier, WindowType};
use tauri::{AppHandle, Manager, Runtime, WebviewWindowBuilder};
pub struct MainWindowManager;
impl MainWindowManager {
    /// Create an additional main app window.
    pub fn create_main_window<R: Runtime>(app_handle: &AppHandle<R>, subsystem: Option<String>) -> Result<String, Box<dyn std::error::Error>> {
        let timestamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_millis()).unwrap_or(0);
        let window_label = format!("main-window-{}", timestamp);
        let mut url = String::from("index.html?type=main");
        if let Some(sub) = subsystem.as_deref() {
            if !sub.is_empty() {
                url.push_str(&format!("&panel={}", sub));
            }
        }
        let window_width = 1200.0;
        let window_height = 800.0;
        let (pos_x, pos_y) = Self::calculate_offset_position(app_handle, window_width, window_height)?;
        let mut window_builder = WebviewWindowBuilder::new(app_handle, &window_label, tauri::WebviewUrl::App(url.into()))
            .title("HippoxOS")
            .inner_size(window_width, window_height)
            .position(pos_x, pos_y)
            .min_inner_size(800.0, 600.0);
        if cfg!(target_os = "macos") {
            window_builder = window_builder.decorations(true);
        } else {
            window_builder = window_builder.decorations(false);
        }
        let _window = window_builder.build()?;
        Ok(window_label)
    }
    /// Compute a centered position for a window of the given LOGICAL size.
    fn calculate_offset_position<R: Runtime>(app_handle: &AppHandle<R>, width: f64, height: f64) -> Result<(f64, f64), Box<dyn std::error::Error>> {
        let mut x = 100.0;
        let mut y = 100.0;
        if let Some(monitor) = app_handle.primary_monitor()? {
            let scale = monitor.scale_factor();
            let screen_width = monitor.size().width as f64 / scale;
            let screen_height = monitor.size().height as f64 / scale;
            let monitor_x = monitor.position().x as f64 / scale;
            let monitor_y = monitor.position().y as f64 / scale;
            x = monitor_x + (screen_width - width) / 2.0;
            y = monitor_y + (screen_height - height) / 2.0;
            let count = app_handle.webview_windows().keys().filter(|label| label.starts_with("main-window-")).count() as f64;
            let offset = (count * 24.0) % 240.0;
            x += offset;
            y += offset;
            x = x.max(monitor_x);
            y = y.max(monitor_y);
        }
        Ok((x, y))
    }
}
