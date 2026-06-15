#![allow(warnings)]
mod cmd_registry;
mod commands;
mod common;
mod context;
mod events;
mod hippox_core;
mod llm;
mod scheduled_task;
mod state;
mod types;
mod windows;
mod workspace;
mod wrokflow;

use crate::cmd_registry::*;
use crate::common::init_default_settings;
use crate::context::Context;
use crate::events::handle_window_event;
use crate::hippox_core::*;
use crate::llm::*;
use crate::scheduled_task::*;
use crate::state::AppState;
use crate::windows::TrayManager;
use crate::workspace::ensure_workspace_config;
use hippox::get_hippox_core_config;
use memcontext::MemContext;
use std::path::PathBuf;
use std::thread;
use tauri::{DragDropEvent, WindowEvent};
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // application status
    let app_state = AppState::new();
    // init dir
    if let Err(e) = commands::init_directories() {
        eprintln!("Failed to initialize directories: {}", e);
    }
    // init settings/config.json using unified settings module
    if let Err(e) = init_default_settings() {
        eprintln!("Failed to initialize settings config: {}", e);
    }
    // init workspace
    if let Err(e) = ensure_workspace_config() {
        eprintln!("Failed to initialize workspace config: {}", e);
    }
    // init favorites directory
    if let Err(e) = commands::init_favorites_directory() {
        eprintln!("Failed to initialize favorites directory: {}", e);
    }
    // Initialize profile
    match commands::init_default_profile() {
        Ok(profile) => {
            println!("Profile initialized: {} ({})", profile.name, profile.id);
        }
        Err(e) => {
            eprintln!("Failed to initialize profile: {}", e);
        }
    }
    let skills_dir = commands::get_skills_market_dir();
    if !skills_dir.exists() {
        let _ = std::fs::create_dir_all(&skills_dir);
    }
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        let _ = commands::load_config_from_file().await;
    });
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        if let Err(e) = sync_all_to_hippox_core().await {
            eprintln!("Failed to sync config to Hippox core: {}", e);
        }
    });
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        if let Err(e) = init_all_hippox_instances().await {
            eprintln!("Failed to initialize Hippox instances: {}", e);
        }
        println!("Hippox Core Config: {:?}", get_hippox_core_config());
    });
    thread::spawn(|| {
        println!("Initializing skills market...");
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            match commands::update_skills_market().await {
                Ok(skills) => {
                    println!("Skills market ready: {} skills available", skills.len());
                }
                Err(e) => eprintln!("Failed to initialize skills market: {}", e),
            }
        });
    });
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        match Context::new().await {
            Ok(mem) => {
                app_state.set_memcontext(mem).await;
            }
            Err(e) => eprintln!("Failed to initialize MemContext: {}", e),
        }
    });
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        scheduled_task_persist_task_pool().await;
    });
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
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
