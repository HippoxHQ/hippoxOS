#![allow(warnings)]
#![windows_subsystem = "windows"]
mod cmd_registry;
mod commands;
mod commons;
mod context;
mod events;
mod hippox_core;
mod scheduled_task;
mod sessions;
mod state;
mod subsystem;
mod types;
mod windows;
mod workspace;
use crate::cmd_registry::*;
use crate::commons::init_default_settings;
use crate::commons::FileUtils;
use crate::context::Context;
use crate::events::handle_window_event;
use crate::hippox_core::*;
use crate::scheduled_task::*;
use crate::state::AppState;
use crate::windows::TrayManager;
use crate::windows::UpdateWindowManager;
use crate::workspace::ensure_workspace_config;
use hippox::get_hippox_core_config;
use memcontext::MemContext;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::webview::WebviewWindowBuilder;
use tauri::{DragDropEvent, WindowEvent};
use tauri::{Manager, WebviewUrl};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_dialog;
use tauri_plugin_fs;
use tokio::time::sleep;
static STARTUP_UPDATE_CHECK_RUN: AtomicBool = AtomicBool::new(false);
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let _guard = rt.enter();
    let app_state = AppState::new();
    let app_state_clone = app_state.clone();
    // ========== Start media generation task pools ==========
    crate::subsystem::spawn_image_task_pool();
    crate::subsystem::spawn_video_task_pool();
    crate::subsystem::spawn_audio_task_pool();
    // ========== All initialization runs asynchronously in background ==========
    // Spawn a single background thread for ALL initialization operations
    std::thread::spawn(move || {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // ========== Initialize directories ==========
            if let Err(e) = commands::init_directories() {
                log::error!("Failed to initialize directories: {}", e);
            }
            // ========== Initialize settings/config.json ==========
            if let Err(e) = init_default_settings() {
                log::error!("Failed to initialize settings config: {}", e);
            }
            // ========== Initialize workspace ==========
            if let Err(e) = ensure_workspace_config() {
                log::error!("Failed to initialize workspace config: {}", e);
            }
            // ========== Initialize favorites directory ==========
            if let Err(e) = commands::init_favorites_directory() {
                log::error!("Failed to initialize favorites directory: {}", e);
            }
            // ========== Initialize profile ==========
            match commands::init_default_profile() {
                Ok(profile) => {}
                Err(e) => {
                    log::error!("Failed to initialize profile: {}", e);
                }
            }
            // ========== Ensure skills market directory exists ==========
            let skills_dir = commands::get_skills_market_dir();
            if !skills_dir.exists() {
                let _ = FileUtils::ensure_dir(&skills_dir);
            }
            // ========== Load configuration from file ==========
            let _ = commands::load_config_from_file().await;
            // ========== Sync all instances to Hippox core ==========
            if let Err(e) = sync_all_to_hippox_core().await {
                log::error!("Failed to sync config to Hippox core: {}", e);
            }
            // ========== Initialize ONLY default Hippox LLM instance ==========
            if let Err(e) = init_default_hippox_instance().await {
                log::error!("Failed to initialize default Hippox instance: {}", e);
            }
            // ========== Initialize MemContext (database) ==========
            match Context::new().await {
                Ok(mem) => {
                    app_state_clone.set_memcontext(mem).await;
                }
                Err(e) => log::error!("Failed to initialize MemContext: {}", e),
            }
            // ========== Initialize task pool ==========
            let task_pool = scheduled_task_pool::init_task_pool().await;
            let task_pool_for_state = task_pool.clone();
            app_state_clone.set_task_pool(task_pool_for_state).await;
            // ========== Persist task pool ==========
            scheduled_task_persist_task_pool::scheduled_task_persist_task_pool(task_pool.clone()).await;
            // ========== SKILLS MARKET: Load on demand only ==========
            log::info!("All initialization completed successfully");
        });
    });
    // ========== Build and run Tauri application immediately ==========
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                crate::subsystem::videoeditor::audio::init_audio_threads();
                nokhwa::nokhwa_initialize(|granted| {
                    if granted {
                        log::info!("macOS camera permission granted");
                    } else {
                        log::warn!("macOS camera permission not granted");
                    }
                    crate::subsystem::screen_record::service::emit_cameras_ready();
                });
                // use objc2::msg_send;
                // use objc2::runtime::AnyObject;
                // for (_label, win) in app.webview_windows() {
                //     let _ = win.with_webview(|webview| unsafe {
                //         let ns_window: *mut AnyObject = webview.ns_window().cast();
                //         let style: i64 = 1; // NSScrollerStyleLegacy
                //         let _: () = msg_send![ns_window, setScrollerStyle: style];
                //     });
                // }
            }
            TrayManager::setup(app)?;
            crate::subsystem::screen_record::service::init_mouse_tracker(app.handle().clone());
            // ========== Startup update check (runs once per process) ==========
            let app_handle_for_update = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                run_startup_update_check(app_handle_for_update).await;
            });
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::Destroyed => {
                if window.label() == "main" {
                    log::warn!("WebView destroyed for main window, attempting to restart...");
                    let app_handle = window.app_handle().clone();
                    let label = window.label().to_string();
                    tokio::spawn(async move {
                        sleep(Duration::from_millis(500)).await;
                        if app_handle.get_webview_window(&label).is_none() {
                            log::info!("Auto-restarting main webview after crash");
                            if let Err(e) = recreate_main_window(&app_handle, &label).await {
                                log::error!("Failed to auto-restart webview: {}", e);
                            }
                        }
                    });
                }
            }
            _ => {}
        })
        .invoke_handler(register_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
/// Startup update check.
async fn run_startup_update_check(app_handle: tauri::AppHandle) {
    if STARTUP_UPDATE_CHECK_RUN.swap(true, Ordering::SeqCst) {
        log::info!("[Startup] Update check already executed; skipping.");
        return;
    }
    sleep(Duration::from_secs(1)).await;
    let info = match crate::commands::cmd_check_version_update().await {
        Ok(info) => info,
        Err(e) => {
            log::warn!("[Startup] Update check failed: {}", e);
            return;
        }
    };
    if !info.has_update {
        log::info!("[Startup] No update available (current={}, latest={}).", info.current_version, info.latest_version);
        return;
    }
    log::info!("[Startup] Update available: {} -> {}", info.current_version, info.latest_version);
    for i in 0..30 {
        if app_handle.get_webview_window("main").is_some() {
            break;
        }
        sleep(Duration::from_millis(200)).await;
    }
    let update_label = "update-window";
    if let Some(existing) = app_handle.get_webview_window(update_label) {
        let _ = existing.close();
        let deadline = std::time::Instant::now() + Duration::from_secs(3);
        while app_handle.get_webview_window(update_label).is_some() {
            if std::time::Instant::now() >= deadline {
                return;
            }
            sleep(Duration::from_millis(50)).await;
        }
    }
    match UpdateWindowManager::create_update_window(&app_handle) {
        Ok(()) => {
            let exists = app_handle.get_webview_window(update_label).is_some();
        }
        Err(e) => {
            log::warn!("[Startup] Failed to open update window: {}", e);
        }
    }
}
/// Recreate the main window when WebView crashes
pub async fn recreate_main_window(app_handle: &tauri::AppHandle, label: &str) -> Result<tauri::WebviewWindow, String> {
    log::info!("Recreating main window: {}", label);
    sleep(Duration::from_millis(500)).await;
    let window = WebviewWindowBuilder::new(app_handle, label, WebviewUrl::App("index.html".into()))
        .title("HippoxOS")
        .inner_size(1200.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .build()
        .map_err(|e| e.to_string())?;
    log::info!("Main window recreated successfully");
    Ok(window)
}
