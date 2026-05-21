mod commands;

use commands::{
    AppState, get_atomic_skills, get_atomic_skills_by_category, 
    get_skill_categories, execute_atomic_skill,
    get_all_models, get_all_providers, get_models_by_provider, get_recommended_models
};
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
        .manage(AppState::new(skills_dir))
        .invoke_handler(tauri::generate_handler![
            get_atomic_skills,
            get_atomic_skills_by_category,
            get_skill_categories,
            execute_atomic_skill,
            get_all_models,
            get_all_providers,
            get_models_by_provider,
            get_recommended_models,
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