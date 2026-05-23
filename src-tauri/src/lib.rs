#![allow(warnings)]
mod commands;

use commands::AppStateWithChat;
use std::path::PathBuf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // init dir
    if let Err(e) = commands::init_directories() {
        eprintln!("Failed to initialize directories: {}", e);
    }
    let skills_dir = commands::get_skills_market_dir();
    if !skills_dir.exists() {
        let _ = std::fs::create_dir_all(&skills_dir);
    }
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        let _ = commands::load_config_from_file().await;
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
