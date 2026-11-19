use once_cell::sync::OnceCell;
use tauri::AppHandle;
static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();
pub fn set_app_handle(handle: AppHandle) {
    let _ = APP_HANDLE.set(handle);
}
pub fn get_app_handle() -> Option<AppHandle> {
    APP_HANDLE.get().cloned()
}
