#![allow(warnings)]
mod commands;
mod common;
mod context;
mod state;
mod types;
mod workspace;

use crate::commands::{init_all_hippox_instances, sync_all_to_hippox_core};
use crate::common::init_default_settings;
use crate::context::Context;
use crate::state::AppState;
use crate::workspace::ensure_workspace_config;
use hippox::{get_hippox_core_config, Hippox};
use memcontext::MemContext;
use std::path::PathBuf;
use std::thread;

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
    if let Err(e) = commands::init_default_session_if_empty() {
        eprintln!("Failed to initialize default session: {}", e);
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
    tauri::Builder::default()
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            commands::get_config,
            commands::set_config,
            commands::update_config,
            commands::get_config_value,
            commands::get_llm_instances,
            commands::get_default_llm_instance_id,
            commands::add_llm_instance,
            commands::update_llm_instance,
            commands::delete_llm_instance,
            commands::set_default_llm_instance,
            commands::get_llm_instance,
            commands::add_llm_model,
            commands::remove_llm_model,
            commands::set_default_llm_model,
            commands::send_chat_message_async,
            commands::get_task_status,
            commands::get_session_tasks,
            commands::send_chat_message,
            commands::get_execution_logs,
            commands::clear_execution_logs,
            commands::reset_conversation,
            commands::is_hippox_initialized,
            commands::get_atomic_skills_list,
            commands::set_hippox_language,
            commands::get_hippox_language,
            commands::get_atomic_skills,
            commands::get_atomic_skills_by_category,
            commands::get_skill_categories,
            commands::execute_atomic_skill,
            commands::get_all_models,
            commands::get_all_providers,
            commands::get_models_by_provider,
            commands::get_recommended_models,
            commands::get_data_paths,
            commands::create_dialog_session,
            commands::list_dialog_sessions,
            commands::update_session_config,
            commands::delete_dialog_session,
            commands::save_chat_content,
            commands::save_terminal_content,
            commands::load_chat_content,
            commands::load_terminal_content,
            commands::get_dialog_history_config,
            commands::save_dialog_history_config,
            commands::update_pinned_sessions,
            commands::get_pinned_sessions,
            commands::get_settings_language,
            commands::save_settings_language,
            commands::get_settings_theme,
            commands::save_settings_theme,
            commands::update_skills_market,
            commands::get_market_skills,
            commands::cmd_get_market_categories,
            commands::install_skill,
            commands::uninstall_skill,
            commands::update_skill,
            commands::get_market_config,
            commands::update_market_config,
            commands::get_installed_skills,
            commands::scheduled_save,
            commands::scheduled_delete,
            commands::scheduled_list,
            commands::get_favorited_skills,
            commands::favorite_skill,
            commands::unfavorite_skill,
            // system command
            commands::window_minimize,
            commands::window_maximize,
            commands::window_unmaximize,
            commands::window_close,
            commands::window_is_maximized,
            commands::window_toggle_fullscreen,
            commands::window_get_state,
            commands::window_set_size,
            commands::window_set_position,
            // workspace
            commands::cmd_get_workspace_config,
            commands::cmd_get_all_workspaces,
            commands::cmd_get_default_workspace,
            commands::cmd_add_workspace,
            commands::cmd_update_workspace,
            commands::cmd_delete_workspace,
            commands::cmd_set_default_workspace,
            // files
            commands::cmd_open_path,
            commands::cmd_select_directory,
            commands::cmd_select_file,
            commands::cmd_read_directory,
            commands::cmd_path_exists,
            commands::cmd_read_text_file,
            commands::get_logs_size_command,
            commands::set_max_log_size,
            commands::get_max_log_size,
            commands::get_directory_size,
            commands::get_disk_info,
            commands::get_max_dialog_size,
            commands::set_max_dialog_size,
            commands::cmd_get_max_log_size,
            commands::cmd_set_max_log_size,
            commands::cmd_get_max_dialog_size,
            commands::cmd_set_max_dialog_size,
            commands::cmd_get_all_models,
            commands::cmd_get_all_providers,
            commands::cmd_get_models_by_provider,
            commands::cmd_get_recommended_models,
            // search
            commands::cmd_search_content,
            // Engine Config Commands
            commands::save_container_instance,
            commands::delete_container_instance,
            commands::toggle_container_instance,
            commands::get_container_instances,
            commands::save_database_instance,
            commands::delete_database_instance,
            commands::toggle_database_instance,
            commands::get_database_instances,
            commands::save_network_instance,
            commands::delete_network_instance,
            commands::toggle_network_instance,
            commands::get_network_instances,
            commands::save_notification_instance,
            commands::delete_notification_instance,
            commands::toggle_notification_instance,
            commands::get_notification_instances,
            commands::cmd_sync_all_to_hippox_core,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
