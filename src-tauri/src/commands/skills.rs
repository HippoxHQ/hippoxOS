use crate::commands::paths::get_app_root_dir;
use crate::commands::{load_favorites_config, save_favorites_config};
use hippox::{get_driver, list_drivers};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillParameterInfo {
    pub name: String,
    pub param_type: String,
    pub description: String,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillData {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub tags: String,
    pub steps: Vec<SkillStep>,
    pub created_at: String,
    pub updated_at: String,
    pub installed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillStep {
    pub name: String,
    pub description: String,
    pub materials: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillHistory {
    pub id: String,
    pub skill_id: String,
    pub skill_name: String,
    pub action: String,
    pub timestamp: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSkillRequest {
    pub name: String,
    pub description: String,
    pub category: String,
    pub tags: String,
    pub steps: Vec<SkillStep>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSkillRequest {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub old_category: String, 
    pub tags: String,
    pub steps: Vec<SkillStep>,
}

pub fn get_skills_local_dir() -> PathBuf {
    get_app_root_dir().join("skills")
}

pub fn get_skill_dir(category: &str, skill_id: &str) -> PathBuf {
    let safe_category = category
        .to_lowercase()
        .replace(|c: char| !c.is_alphanumeric() && c != '_' && c != '-', "_")
        .replace(" ", "_");
    get_skills_local_dir().join(safe_category).join(skill_id)
}

pub fn get_skill_md_path(category: &str, skill_id: &str) -> PathBuf {
    get_skill_dir(category, skill_id).join("SKILL.md")
}

pub fn get_skills_dir() -> PathBuf {
    get_app_root_dir().join("skills")
}

pub fn get_skill_history_dir() -> PathBuf {
    get_app_root_dir().join("skills_history")
}

fn get_skill_history_file_path(skill_id: &str) -> PathBuf {
    get_skill_history_dir().join(format!("{}.json", skill_id))
}

fn ensure_skills_dir() -> Result<(), String> {
    let dir = get_skills_local_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create skills directory: {}", e))?;
    }
    Ok(())
}

fn ensure_history_dir() -> Result<(), String> {
    let dir = get_skill_history_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create history directory: {}", e))?;
    }
    Ok(())
}

fn skill_to_markdown(skill: &SkillData) -> String {
    let mut content = String::new();
    content.push_str("---\n");
    content.push_str(&format!("name: {}\n", skill.name));
    content.push_str(&format!("description: {}\n", skill.description));
    content.push_str(&format!("category: {}\n", skill.category));
    content.push_str(&format!("tags: {}\n", skill.tags));
    content.push_str(&format!("version: 1.0.0\n"));
    content.push_str(&format!("created_at: {}\n", skill.created_at));
    content.push_str(&format!("updated_at: {}\n", skill.updated_at));
    content.push_str("---\n\n");
    content.push_str("# Steps\n\n");
    for (idx, step) in skill.steps.iter().enumerate() {
        content.push_str(&format!("## Step {}: {}\n\n", idx + 1, step.name));
        content.push_str(&format!("{}\n\n", step.description));
        if !step.materials.is_empty() {
            content.push_str("### Materials\n\n");
            for material in &step.materials {
                content.push_str(&format!("- {}\n", material));
            }
            content.push_str("\n");
        }
    }
    content
}

fn parse_skill_from_markdown(path: &PathBuf, skill_id: &str) -> Result<SkillData, String> {
    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read SKILL.md: {}", e))?;
    let mut name = String::new();
    let mut description = String::new();
    let mut tags = String::new();
    let mut created_at = String::new();
    let mut updated_at = String::new();
    let mut steps = Vec::new();
    if content.starts_with("---") {
        if let Some(end_idx) = content[3..].find("---") {
            let frontmatter = &content[3..3 + end_idx];
            let body = &content[3 + end_idx + 3..];

            for line in frontmatter.lines() {
                if let Some(colon_idx) = line.find(':') {
                    let key = line[..colon_idx].trim();
                    let value = line[colon_idx + 1..].trim();
                    match key {
                        "name" => name = value.to_string(),
                        "description" => description = value.to_string(),
                        "tags" => tags = value.to_string(),
                        "created_at" => created_at = value.to_string(),
                        "updated_at" => updated_at = value.to_string(),
                        _ => {}
                    }
                }
            }
            let mut current_step: Option<SkillStep> = None;
            let lines: Vec<&str> = body.lines().collect();
            let mut i = 0;
            while i < lines.len() {
                let line = lines[i];
                if line.starts_with("## Step ") {
                    // Save previous step
                    if let Some(step) = current_step.take() {
                        steps.push(step);
                    }
                    let step_name = line.trim_start_matches("## Step ").to_string();
                    let step_name = step_name
                        .split(':')
                        .nth(1)
                        .unwrap_or(&step_name)
                        .trim()
                        .to_string();
                    current_step = Some(SkillStep {
                        name: step_name,
                        description: String::new(),
                        materials: Vec::new(),
                    });
                } else if let Some(ref mut step) = current_step {
                    if line.starts_with("### Materials") {
                        i += 1;
                        while i < lines.len() && lines[i].trim().starts_with('-') {
                            let material =
                                lines[i].trim().trim_start_matches('-').trim().to_string();
                            step.materials.push(material);
                            i += 1;
                        }
                        continue;
                    } else if !line.trim().is_empty() && !line.starts_with('#') {
                        if step.description.is_empty() {
                            step.description = line.trim().to_string();
                        } else {
                            step.description.push_str("\n");
                            step.description.push_str(line.trim());
                        }
                    }
                }
                i += 1;
            }
            if let Some(step) = current_step {
                steps.push(step);
            }
        }
    }
    Ok(SkillData {
        id: skill_id.to_string(),
        name: if name.is_empty() {
            skill_id.to_string()
        } else {
            name
        },
        description,
        category: "other".to_string(),
        tags,
        steps,
        created_at: if created_at.is_empty() {
            chrono::Local::now().to_rfc3339()
        } else {
            created_at
        },
        updated_at: if updated_at.is_empty() {
            chrono::Local::now().to_rfc3339()
        } else {
            updated_at
        },
        installed: true,
    })
}

fn save_skill_history(history: &SkillHistory) -> Result<(), String> {
    ensure_history_dir()?;
    let history_file = get_skill_history_file_path(&history.skill_id);
    let mut histories = Vec::new();
    if history_file.exists() {
        let content = fs::read_to_string(&history_file)
            .map_err(|e| format!("Failed to read history: {}", e))?;
        histories = serde_json::from_str(&content).unwrap_or_default();
    }
    histories.push(history.clone());
    if histories.len() > 100 {
        let start_index = histories.len() - 100;
        histories = histories.into_iter().skip(start_index).collect();
    }
    let content = serde_json::to_string_pretty(&histories)
        .map_err(|e| format!("Failed to serialize history: {}", e))?;
    fs::write(&history_file, content).map_err(|e| format!("Failed to save history: {}", e))?;
    Ok(())
}

fn get_skill_history_by_id(skill_id: &str) -> Result<Vec<SkillHistory>, String> {
    let history_file = get_skill_history_file_path(skill_id);
    if history_file.exists() {
        let content = fs::read_to_string(&history_file)
            .map_err(|e| format!("Failed to read history: {}", e))?;
        Ok(serde_json::from_str(&content).unwrap_or_default())
    } else {
        Ok(vec![])
    }
}

fn get_all_skill_history_records() -> Result<Vec<SkillHistory>, String> {
    let history_dir = get_skill_history_dir();
    if !history_dir.exists() {
        return Ok(vec![]);
    }
    let mut all_history = Vec::new();
    for entry in
        fs::read_dir(&history_dir).map_err(|e| format!("Failed to read history dir: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("json") {
            let content = fs::read_to_string(&path)
                .map_err(|e| format!("Failed to read history file: {}", e))?;
            if let Ok(histories) = serde_json::from_str::<Vec<SkillHistory>>(&content) {
                all_history.extend(histories);
            }
        }
    }
    all_history.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(all_history)
}

#[tauri::command]
pub async fn cmd_list_local_skills() -> Result<Vec<SkillData>, String> {
    let skills_dir = get_skills_local_dir();
    if !skills_dir.exists() {
        return Ok(vec![]);
    }
    let mut skills = Vec::new();
    for category_entry in
        fs::read_dir(&skills_dir).map_err(|e| format!("Failed to read skills directory: {}", e))?
    {
        let category_entry = category_entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let category_path = category_entry.path();
        if category_path.is_dir() {
            let category_name = category_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            for skill_entry in fs::read_dir(&category_path)
                .map_err(|e| format!("Failed to read category dir: {}", e))?
            {
                let skill_entry =
                    skill_entry.map_err(|e| format!("Failed to read entry: {}", e))?;
                let skill_path = skill_entry.path();
                if skill_path.is_dir() {
                    let skill_id = skill_path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    let skill_md_path = skill_path.join("SKILL.md");
                    if skill_md_path.exists() {
                        match parse_skill_from_markdown(&skill_md_path, &skill_id) {
                            Ok(mut skill) => {
                                skill.category = category_name.clone();
                                skills.push(skill);
                            }
                            Err(e) => eprintln!("Failed to parse skill {}: {}", skill_id, e),
                        }
                    }
                }
            }
        }
    }
    Ok(skills)
}

#[tauri::command]
pub async fn cmd_create_skill(request: CreateSkillRequest) -> Result<SkillData, String> {
    ensure_skills_dir()?;
    let category = if request.category.trim().is_empty() {
        "other".to_string()
    } else {
        request.category.trim().to_string()
    };
    let safe_category = category
        .to_lowercase()
        .replace(|c: char| !c.is_alphanumeric() && c != '_' && c != '-', "_")
        .replace(" ", "_");
    let base_name = request
        .name
        .to_lowercase()
        .replace(|c: char| !c.is_alphanumeric() && c != '_' && c != '-', "_")
        .replace(" ", "_");
    let mut skill_id = base_name.clone();
    let mut counter = 1;
    let category_dir = get_skills_local_dir().join(&safe_category);
    if !category_dir.exists() {
        fs::create_dir_all(&category_dir)
            .map_err(|e| format!("Failed to create category directory: {}", e))?;
    }
    while get_skill_dir(&category, &skill_id).exists() {
        skill_id = format!("{}_{}", base_name, counter);
        counter += 1;
    }
    let now = chrono::Local::now().to_rfc3339();
    let skill = SkillData {
        id: skill_id.clone(),
        name: request.name,
        description: request.description,
        category: category.clone(),
        tags: request.tags,
        steps: request.steps,
        created_at: now.clone(),
        updated_at: now.clone(),
        installed: true,
    };
    let skill_dir = get_skill_dir(&category, &skill_id);
    fs::create_dir_all(&skill_dir)
        .map_err(|e| format!("Failed to create skill directory: {}", e))?;
    let markdown_content = skill_to_markdown(&skill);
    let skill_md_path = get_skill_md_path(&category, &skill_id);
    fs::write(&skill_md_path, markdown_content)
        .map_err(|e| format!("Failed to write SKILL.md: {}", e))?;
    let history = SkillHistory {
        id: Uuid::new_v4().to_string(),
        skill_id: skill_id.clone(),
        skill_name: skill.name.clone(),
        action: "create".to_string(),
        timestamp: now,
        details: None,
    };
    save_skill_history(&history)?;
    Ok(skill)
}

#[tauri::command]
pub async fn cmd_update_skill(request: UpdateSkillRequest) -> Result<SkillData, String> {
    let new_category = if request.category.trim().is_empty() {
        "other".to_string()
    } else {
        request.category.trim().to_string()
    };
    let old_skill_dir = get_skill_dir(&request.old_category, &request.id);
    if !old_skill_dir.exists() {
        return Err(format!("Skill not found: {}", request.id));
    }
    let old_skill_md_path = get_skill_md_path(&request.old_category, &request.id);
    let old_skill = parse_skill_from_markdown(&old_skill_md_path, &request.id)?;
    let base_name = request
        .name
        .to_lowercase()
        .replace(|c: char| !c.is_alphanumeric() && c != '_' && c != '-', "_")
        .replace(" ", "_");
    let mut new_id = base_name.clone();
    let mut counter = 1;
    while get_skill_dir(&new_category, &new_id).exists() && new_id != request.id {
        new_id = format!("{}_{}", base_name, counter);
        counter += 1;
    }
    let now = chrono::Local::now().to_rfc3339();
    let skill = SkillData {
        id: new_id.clone(),
        name: request.name,
        description: request.description,
        category: new_category.clone(),
        tags: request.tags,
        steps: request.steps,
        created_at: old_skill.created_at,
        updated_at: now.clone(),
        installed: true,
    };
    let category_changed = request.old_category != new_category;
    if new_id != request.id || category_changed {
        let new_skill_dir = get_skill_dir(&new_category, &new_id);
        if new_skill_dir.exists() {
            return Err(format!("Skill already exists: {}", new_id));
        }
        let category_dir = new_skill_dir
            .parent()
            .ok_or_else(|| "Invalid category path".to_string())?;
        if !category_dir.exists() {
            std::fs::create_dir_all(category_dir)
                .map_err(|e| format!("Failed to create category directory: {}", e))?;
        }
        std::fs::rename(&old_skill_dir, &new_skill_dir)
            .map_err(|e| format!("Failed to move skill directory: {}", e))?;
        let new_skill_md_path = get_skill_md_path(&new_category, &new_id);
        let markdown_content = skill_to_markdown(&skill);
        std::fs::write(&new_skill_md_path, markdown_content)
            .map_err(|e| format!("Failed to write SKILL.md: {}", e))?;
        let old_category_dir = get_skill_dir(&request.old_category, "");
        if let Some(parent) = old_category_dir.parent() {
            if parent.exists() {
                let is_empty = std::fs::read_dir(parent)
                    .map(|mut dir| dir.next().is_none())
                    .unwrap_or(false);
                if is_empty {
                    let _ = std::fs::remove_dir(parent);
                }
            }
        }
        let history_file = get_skill_history_file_path(&request.id);
        if history_file.exists() {
            let content = std::fs::read_to_string(&history_file)
                .map_err(|e| format!("Failed to read history: {}", e))?;
            if let Ok(mut histories) = serde_json::from_str::<Vec<SkillHistory>>(&content) {
                for h in histories.iter_mut() {
                    h.skill_id = new_id.clone();
                }
                let new_content = serde_json::to_string_pretty(&histories)
                    .map_err(|e| format!("Failed to serialize history: {}", e))?;
                let new_history_file = get_skill_history_file_path(&new_id);
                std::fs::write(&new_history_file, new_content)
                    .map_err(|e| format!("Failed to save history: {}", e))?;
                let _ = std::fs::remove_file(&history_file);
            }
        }
    } else {
        let markdown_content = skill_to_markdown(&skill);
        std::fs::write(&old_skill_md_path, markdown_content)
            .map_err(|e| format!("Failed to write SKILL.md: {}", e))?;
    }
    let history = SkillHistory {
        id: Uuid::new_v4().to_string(),
        skill_id: new_id.clone(),
        skill_name: skill.name.clone(),
        action: "update".to_string(),
        timestamp: now,
        details: None,
    };
    save_skill_history(&history)?;
    Ok(skill)
}

#[tauri::command]
pub async fn cmd_delete_skill(skill_id: String, category: String) -> Result<bool, String> {
    let category = if category.trim().is_empty() {
        "other".to_string()
    } else {
        category.trim().to_string()
    };
    let skill_dir = get_skill_dir(&category, &skill_id);
    if !skill_dir.exists() {
        return Err(format!("Skill not found: {}", skill_id));
    }
    let skill_name = if let Ok(skill) =
        parse_skill_from_markdown(&get_skill_md_path(&category, &skill_id), &skill_id)
    {
        skill.name
    } else {
        skill_id.clone()
    };
    fs::remove_dir_all(&skill_dir).map_err(|e| format!("Failed to delete skill: {}", e))?;
    let now = chrono::Local::now().to_rfc3339();
    let history = SkillHistory {
        id: Uuid::new_v4().to_string(),
        skill_id: skill_id.clone(),
        skill_name,
        action: "delete".to_string(),
        timestamp: now,
        details: None,
    };
    let _ = save_skill_history(&history);
    Ok(true)
}

#[tauri::command]
pub async fn cmd_get_skill(
    skill_id: String,
    category: String,
) -> Result<Option<SkillData>, String> {
    let category = if category.trim().is_empty() {
        "other".to_string()
    } else {
        category.trim().to_string()
    };
    let skill_md_path = get_skill_md_path(&category, &skill_id);
    if skill_md_path.exists() {
        Ok(Some(parse_skill_from_markdown(&skill_md_path, &skill_id)?))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn cmd_get_all_skill_history() -> Result<Vec<SkillHistory>, String> {
    get_all_skill_history_records()
}

#[tauri::command]
pub async fn cmd_get_skill_history(skill_id: String) -> Result<Vec<SkillHistory>, String> {
    get_skill_history_by_id(&skill_id)
}

#[tauri::command]
pub async fn cmd_skill_exists(skill_id: String, category: String) -> Result<bool, String> {
    let category = if category.trim().is_empty() {
        "other".to_string()
    } else {
        category.trim().to_string()
    };

    Ok(get_skill_dir(&category, &skill_id).exists())
}

#[tauri::command]
pub async fn cmd_favorite_local_skill(skill_id: String, category: String) -> Result<bool, String> {
    let category = if category.trim().is_empty() {
        "other".to_string()
    } else {
        category.trim().to_string()
    };
    let source_dir = get_skill_dir(&category, &skill_id);

    if !source_dir.exists() {
        return Err(format!("Skill not found: {}/{}", category, skill_id));
    }
    let favorites_skill_dir = get_app_root_dir()
        .join("favorites")
        .join("skill")
        .join(&category);
    let target_dir = favorites_skill_dir.join(&skill_id);

    if target_dir.exists() {
        fs::remove_dir_all(&target_dir).map_err(|e| format!("Failed to remove existing: {}", e))?;
    }
    if let Some(parent) = target_dir.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent: {}", e))?;
        }
    }
    let copy_options = fs_extra::dir::CopyOptions::new()
        .overwrite(true)
        .copy_inside(true);
    fs_extra::dir::copy(&source_dir, &target_dir, &copy_options)
        .map_err(|e| format!("Failed to copy skill: {}", e))?;
    let favorite_id = format!("{}/{}", category, skill_id);
    let mut favorites = load_favorites_config();
    if !favorites.favorites.contains(&favorite_id) {
        favorites.favorites.push(favorite_id);
        save_favorites_config(&favorites)?;
    }
    Ok(true)
}

#[tauri::command]
pub async fn cmd_unfavorite_local_skill(
    skill_id: String,
    category: String,
) -> Result<bool, String> {
    let category = if category.trim().is_empty() {
        "other".to_string()
    } else {
        category.trim().to_string()
    };
    let favorite_id = format!("{}/{}", category, skill_id);
    let target_dir = get_app_root_dir()
        .join("favorites")
        .join("skill")
        .join(&category)
        .join(&skill_id);
    if target_dir.exists() {
        fs::remove_dir_all(&target_dir).map_err(|e| format!("Failed to remove favorite: {}", e))?;
    }
    let mut favorites = crate::commands::favorites::load_favorites_config();
    favorites.favorites.retain(|id| id != &favorite_id);
    crate::commands::favorites::save_favorites_config(&favorites)?;
    Ok(true)
}
