#![allow(warnings)]
#![windows_subsystem = "windows"]
mod callback;
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
use crate::context::Context;
use crate::events::handle_window_event;
use crate::hippox_core::*;
use crate::scheduled_task::*;
use crate::state::AppState;
use crate::windows::TrayManager;
use crate::workspace::ensure_workspace_config;
use hippox::get_hippox_core_config;
use memcontext::MemContext;
use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use tauri::{DragDropEvent, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_dialog;
use tauri_plugin_fs;
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let rt = tokio::runtime::Runtime::new().unwrap();
    let app_state = AppState::new();
    let app_state_clone = app_state.clone();
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
                let _ = std::fs::create_dir_all(&skills_dir);
            }
            // ========== Load configuration from file ==========
            let _ = commands::load_config_from_file().await;
            // ========== Sync all instances to Hippox core ==========
            if let Err(e) = sync_all_to_hippox_core().await {
                log::error!("Failed to sync config to Hippox core: {}", e);
            }
            // ========== Initialize all Hippox LLM instances ==========
            if let Err(e) = init_all_hippox_instances().await {
                log::error!("Failed to initialize Hippox instances: {}", e);
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
            // ========== Update skills market ==========
            match commands::update_skills_market().await {
                Ok(skills) => {}
                Err(e) => log::error!("Failed to initialize skills market: {}", e),
            }
            log::info!("All initialization completed successfully");
        });
    });
    // ========== Build and run Tauri application immediately ==========
    // The app starts without waiting for any initialization
    let _guard = rt.enter();
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state)
        .setup(|app| {
            TrayManager::setup(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            handle_window_event(window, event);
        })
        .invoke_handler(register_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
