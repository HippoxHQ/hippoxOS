use crate::windows::{WindowIdentifier, WindowType};
use tauri::{AppHandle, Manager, Runtime, WebviewWindowBuilder};
/// Manager for the region‑selection overlay window.
pub struct RegionSelectManager;
impl RegionSelectManager {
    /// Create (or recreate) the region‑selection overlay.
    pub fn create_region_select_window<R: Runtime>(app_handle: &AppHandle<R>) -> Result<(), Box<dyn std::error::Error>> {
        let window_label = format!("{}", WindowIdentifier::RegionSelect);
        if let Some(window) = app_handle.get_webview_window(&window_label) {
            let _ = window.close();
            std::thread::sleep(std::time::Duration::from_millis(120));
        }
        let url_type = format!("{}", WindowType::RegionSelect);
        let mut min_x = f64::INFINITY;
        let mut min_y = f64::INFINITY;
        let mut max_x = f64::NEG_INFINITY;
        let mut max_y = f64::NEG_INFINITY;
        for monitor in app_handle.available_monitors()? {
            let scale = monitor.scale_factor();
            let m_x = monitor.position().x as f64 / scale;
            let m_y = monitor.position().y as f64 / scale;
            let m_w = monitor.size().width as f64 / scale;
            let m_h = monitor.size().height as f64 / scale;
            if m_x < min_x {
                min_x = m_x;
            }
            if m_y < min_y {
                min_y = m_y;
            }
            if m_x + m_w > max_x {
                max_x = m_x + m_w;
            }
            if m_y + m_h > max_y {
                max_y = m_y + m_h;
            }
        }
        if !min_x.is_finite() || !min_y.is_finite() || !max_x.is_finite() || !max_y.is_finite() {
            min_x = 0.0;
            min_y = 0.0;
            max_x = 1920.0;
            max_y = 1080.0;
        }
        let pos_x = min_x;
        let pos_y = min_y;
        let width = max_x - min_x;
        let height = max_y - min_y;
        let window = WebviewWindowBuilder::new(app_handle, &window_label, tauri::WebviewUrl::App(format!("index.html?type={}", url_type).into()))
            .title("")
            .inner_size(width, height)
            .position(pos_x, pos_y)
            .min_inner_size(1.0, 1.0)
            .decorations(false)
            .transparent(true)
            .shadow(false)
            .resizable(false)
            // .fullscreen(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(true)
            .visible(true)
            .build()?;
        // Keep the overlay pinned to the top when focus drifts away.
        let window_clone = window.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::Focused(false) = event {
                // Re‑assert top‑most ordering when focus drifts away.
                let _ = window_clone.set_always_on_top(true);
            }
        });
        Ok(())
    }
    /// Close the region‑selection overlay if it exists.
    pub fn close_region_select_window<R: Runtime>(app_handle: &AppHandle<R>) {
        let window_label = format!("{}", WindowIdentifier::RegionSelect);
        if let Some(window) = app_handle.get_webview_window(&window_label) {
            let _ = window.close();
        }
    }
}
