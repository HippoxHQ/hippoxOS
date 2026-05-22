mod commands;

use commands::AppStateWithChat;
use std::path::PathBuf;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let skills_dir = dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".hippox")
        .join("skills");

    if !skills_dir.exists() {
        let _ = std::fs::create_dir_all(&skills_dir);
    }

    tauri::Builder::default()
        .manage(AppStateWithChat::new())
        .invoke_handler(tauri::generate_handler![
            commands::init_hippox,
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
