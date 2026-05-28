use hippox::registry;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AtomicSkillInfo {
    pub name: String,
    pub description: String,
    pub category: String,
    pub parameters: Vec<SkillParameterInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillParameterInfo {
    pub name: String,
    pub param_type: String,
    pub description: String,
    pub required: bool,
}

// pub struct AppState {
//     pub skills_dir: PathBuf,
// }

// impl AppState {
//     pub fn new(skills_dir: PathBuf) -> Self {
//         Self { skills_dir }
//     }
// }

#[tauri::command]
pub fn get_atomic_skills() -> Vec<AtomicSkillInfo> {
    let skill_names = registry::list_skills();
    skill_names
        .iter()
        .filter_map(|name| {
            registry::get_skill(name).map(|skill| {
                let params: Vec<SkillParameterInfo> = skill
                    .parameters()
                    .into_iter()
                    .map(|p| SkillParameterInfo {
                        name: p.name,
                        param_type: p.param_type,
                        description: p.description,
                        required: p.required,
                    })
                    .collect();
                AtomicSkillInfo {
                    name: name.clone(),
                    description: skill.description().to_string(),
                    category: skill.category().to_string(),
                    parameters: params,
                }
            })
        })
        .collect()
}

#[tauri::command]
pub fn get_atomic_skills_by_category(category: String) -> Vec<AtomicSkillInfo> {
    get_atomic_skills()
        .into_iter()
        .filter(|s| s.category == category)
        .collect()
}

#[tauri::command]
pub fn get_skill_categories() -> Vec<String> {
    let skills = get_atomic_skills();
    let mut categories: Vec<String> = skills
        .into_iter()
        .map(|s| s.category)
        .collect::<std::collections::HashSet<_>>()
        .into_iter()
        .collect();
    categories.sort();
    categories
}

#[tauri::command]
pub async fn execute_atomic_skill(
    skill_name: String,
    parameters: std::collections::HashMap<String, serde_json::Value>,
) -> Result<String, String> {
    let skill = registry::get_skill(&skill_name)
        .ok_or_else(|| format!("Skill not found: {}", skill_name))?;
    skill.execute(&parameters).await.map_err(|e| e.to_string())
}
