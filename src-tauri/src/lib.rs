#![allow(warnings)]
mod commands;
mod common;

use commands::AppStateWithChat;
use std::path::PathBuf;
use crate::common::init_default_settings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // init dir
    if let Err(e) = commands::init_directories() {
        eprintln!("Failed to initialize directories: {}", e);
    }
    // init settings/config.json using unified settings module
    if let Err(e) = init_default_settings() {
        eprintln!("Failed to initialize settings config: {}", e);
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
    let rt = tokio::runtime::Runtime::new().unwrap();
    rt.spawn(async {
        let market_dir = commands::get_skills_market_dir();
        if !market_dir.exists() || !market_dir.join(".git").exists() {
            println!("🔄 Initializing skills market...");
            match commands::update_skills_market().await {
                Ok(skills) => println!(
                    "✅ Skills market initialized: {} skills found",
                    skills.len()
                ),
                Err(e) => eprintln!("❌ Failed to initialize skills market: {}", e),
            }
        } else {
            println!("✅ Skills market already exists");
        }
    });
    tauri::Builder::default()
        .manage(AppStateWithChat::new())
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
            commands::install_skill,
            commands::uninstall_skill,
            commands::update_skill,
            commands::get_market_config,
            commands::update_market_config,
            commands::get_installed_skills,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
