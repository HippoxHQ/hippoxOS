use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::command;

use super::paths::{get_app_root_dir, get_skills_market_dir};

const SKILLS_MARKET_REPO_URL: &str = "https://github.com/HippoxHQ/skills-market.git";
const MARKET_CONFIG_FILE: &str = "market_config.json";
const FAVORITES_CONFIG_FILE: &str = "favorites.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketSkill {
    pub id: String,
    pub name: String,
    pub description: String,
    pub category: String,
    pub version: String,
    pub author: String,
    pub author_avatar: Option<String>,
    pub installed: bool,
    pub favorited: bool,
    pub installed_version: Option<String>,
    pub local_path: Option<String>,
    pub readme: Option<String>,
    pub parameters: Vec<SkillParameterInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillParameterInfo {
    pub name: String,
    pub param_type: String,
    pub description: String,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketConfig {
    pub repo_url: String,
    pub branch: String,
    pub last_update: Option<String>,
}

impl Default for MarketConfig {
    fn default() -> Self {
        Self {
            repo_url: SKILLS_MARKET_REPO_URL.to_string(),
            branch: "main".to_string(),
            last_update: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FavoritesConfig {
    pub favorites: Vec<String>,
}

fn get_favorites_config_path() -> PathBuf {
    get_skills_market_dir().join(FAVORITES_CONFIG_FILE)
}

fn load_favorites_config() -> FavoritesConfig {
    let config_path = get_favorites_config_path();
    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }
    FavoritesConfig::default()
}

fn save_favorites_config(config: &FavoritesConfig) -> Result<(), String> {
    let config_path = get_favorites_config_path();
    if let Some(parent) = config_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize favorites config: {}", e))?;
    fs::write(&config_path, content)
        .map_err(|e| format!("Failed to save favorites config: {}", e))?;
    Ok(())
}

fn get_favorites_dir() -> PathBuf {
    get_app_root_dir().join("favorites")
}

fn get_favorites_natural_dir() -> PathBuf {
    get_favorites_dir().join("natural")
}

fn get_favorites_skill_dir() -> PathBuf {
    get_favorites_dir().join("skill")
}

fn ensure_favorites_dir() -> Result<(), String> {
    let natural_dir = get_favorites_natural_dir();
    let skill_dir = get_favorites_skill_dir();
    if !natural_dir.exists() {
        fs::create_dir_all(&natural_dir)
            .map_err(|e| format!("Failed to create natural directory: {}", e))?;
        println!("Created natural directory: {:?}", natural_dir);
    }
    if !skill_dir.exists() {
        fs::create_dir_all(&skill_dir)
            .map_err(|e| format!("Failed to create skill directory: {}", e))?;
        println!("Created skill directory: {:?}", skill_dir);
    }
    Ok(())
}

fn get_market_config_path() -> PathBuf {
    get_skills_market_dir().join(MARKET_CONFIG_FILE)
}

fn load_market_config() -> MarketConfig {
    let config_path = get_market_config_path();
    if config_path.exists() {
        if let Ok(content) = fs::read_to_string(&config_path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }
    MarketConfig::default()
}

fn save_market_config(config: &MarketConfig) -> Result<(), String> {
    let config_path = get_market_config_path();
    let content = serde_json::to_string_pretty(config)
        .map_err(|e| format!("Failed to serialize market config: {}", e))?;
    fs::write(&config_path, content).map_err(|e| format!("Failed to save market config: {}", e))?;
    Ok(())
}

/// Parse SKILL.md frontmatter
fn parse_skill_markdown(content: &str, skill_name: &str, category: &str) -> Option<MarketSkill> {
    let mut name = skill_name.to_string();
    let mut description = String::new();
    let mut version = "0.1.0".to_string();
    let mut author = "Unknown".to_string();
    let mut author_avatar = None;
    let mut parameters = Vec::new();
    let mut readme = String::new();
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
                        "version" => version = value.to_string(),
                        "author" => author = value.to_string(),
                        "author_avatar" => author_avatar = Some(value.to_string()),
                        _ => {}
                    }
                }
            }
            readme = body.trim().to_string();
            if let Some(params_start) = frontmatter.find("parameters:") {
                let params_section = &frontmatter[params_start + 11..];
                if let Some(first_line) = params_section.lines().next() {
                    if first_line.trim() == "[" || first_line.contains('-') {
                        for line in params_section.lines() {
                            if line.trim().starts_with('-') {
                                if let Some(param_name) = line.trim().strip_prefix('-') {
                                    let param_name = param_name.trim();
                                    parameters.push(SkillParameterInfo {
                                        name: param_name.to_string(),
                                        param_type: "string".to_string(),
                                        description: String::new(),
                                        required: false,
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    } else {
        readme = content.to_string();
        description = content.lines().next().unwrap_or("").to_string();
    }
    if name.is_empty() {
        return None;
    }
    Some(MarketSkill {
        id: format!("{}/{}", category, skill_name),
        name,
        description: description.chars().take(200).collect(),
        category: category.to_string(),
        version,
        author,
        author_avatar,
        installed: false,
        favorited: false,
        installed_version: None,
        local_path: None,
        readme: Some(readme.chars().take(2000).collect()),
        parameters,
    })
}

/// Get all categories from market directory (first-level folders)
fn get_categories_from_dir(dir_path: &Path) -> Vec<String> {
    let mut categories = Vec::new();
    if !dir_path.exists() {
        return categories;
    }
    if let Ok(entries) = fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let category_name = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                if !category_name.starts_with('.')
                    && category_name != "assets"
                    && category_name != "images"
                {
                    categories.push(category_name);
                }
            }
        }
    }
    categories
}

/// Scan skills from directory with structure: category/skill_folder/SKILL.md
fn scan_skills_from_dir(dir_path: &Path, favorites: &FavoritesConfig) -> Vec<MarketSkill> {
    let mut skills = Vec::new();
    if !dir_path.exists() {
        return skills;
    }
    // Read first-level directories (categories)
    if let Ok(category_entries) = fs::read_dir(dir_path) {
        for category_entry in category_entries.flatten() {
            let category_path = category_entry.path();
            if !category_path.is_dir() {
                continue;
            }
            let category_name = category_path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            if category_name.starts_with('.')
                || category_name == "assets"
                || category_name == "images"
            {
                continue;
            }
            if let Ok(skill_entries) = fs::read_dir(&category_path) {
                for skill_entry in skill_entries.flatten() {
                    let skill_path = skill_entry.path();
                    if !skill_path.is_dir() {
                        continue;
                    }
                    let skill_folder_name = skill_path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    let skill_md_path = skill_path.join("SKILL.md");
                    if !skill_md_path.exists() {
                        continue;
                    }
                    if let Ok(content) = fs::read_to_string(&skill_md_path) {
                        if let Some(mut skill) =
                            parse_skill_markdown(&content, &skill_folder_name, &category_name)
                        {
                            skill.local_path = Some(skill_md_path.to_string_lossy().to_string());
                            skill.favorited = favorites.favorites.contains(&skill.id);
                            skills.push(skill);
                        }
                    }
                }
            }
        }
    }
    skills
}

/// Clone or update skills market repository
#[command]
pub async fn update_skills_market() -> Result<Vec<MarketSkill>, String> {
    let market_dir = get_skills_market_dir();
    let git_dir = market_dir.join(".git");
    let config = load_market_config();
    let repo_url = &config.repo_url;
    let branch = &config.branch;
    if !market_dir.exists() {
        fs::create_dir_all(&market_dir)
            .map_err(|e| format!("Failed to create skills market directory: {}", e))?;
    }
    if !git_dir.exists() {
        println!("Cloning skills market repository from {}...", repo_url);
        let output = Command::new("git")
            .args([
                "clone",
                "--branch",
                branch,
                repo_url,
                market_dir.to_str().unwrap(),
            ])
            .output()
            .map_err(|e| format!("Git clone failed: {}. Is git installed?", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Failed to clone repository: {}", stderr));
        }
        println!("Skills market cloned successfully");
    } else {
        println!("Pulling latest skills market updates...");
        let output = Command::new("git")
            .current_dir(&market_dir)
            .args(["pull", "origin", branch])
            .output()
            .map_err(|e| format!("Git pull failed: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            eprintln!("Git pull warning: {}", stderr);
        } else {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if stdout.contains("Already up to date") {
                println!("Skills market already up to date");
            } else {
                println!("Skills market updated successfully");
            }
        }
    }
    let mut updated_config = config;
    updated_config.last_update = Some(chrono::Local::now().to_rfc3339());
    save_market_config(&updated_config)?;
    let favorites = load_favorites_config();
    let mut skills = scan_skills_from_dir(&market_dir, &favorites);
    let local_skills_dir = get_app_root_dir().join("skills");
    for skill in &mut skills {
        let skill_dir = local_skills_dir.join(&skill.id);
        if skill_dir.exists() && skill_dir.join("SKILL.md").exists() {
            skill.installed = true;
            if let Ok(content) = fs::read_to_string(skill_dir.join("SKILL.md")) {
                if let Some(installed_skill) = parse_skill_markdown(
                    &content,
                    &skill.id.split('/').last().unwrap_or(&skill.id),
                    &skill.category,
                ) {
                    skill.installed_version = Some(installed_skill.version);
                }
            }
        }
    }
    Ok(skills)
}

/// Get all available skills from market (without updating)
#[command]
pub async fn get_market_skills() -> Result<Vec<MarketSkill>, String> {
    let market_dir = get_skills_market_dir();
    if !market_dir.exists() || !market_dir.join(".git").exists() {
        return Ok(vec![]);
    }
    let favorites = load_favorites_config();
    let mut skills = scan_skills_from_dir(&market_dir, &favorites);
    let local_skills_dir = get_app_root_dir().join("skills");
    for skill in &mut skills {
        let skill_dir = local_skills_dir.join(&skill.id);
        if skill_dir.exists() && skill_dir.join("SKILL.md").exists() {
            skill.installed = true;
            if let Ok(content) = fs::read_to_string(skill_dir.join("SKILL.md")) {
                if let Some(installed_skill) = parse_skill_markdown(
                    &content,
                    &skill.id.split('/').last().unwrap_or(&skill.id),
                    &skill.category,
                ) {
                    skill.installed_version = Some(installed_skill.version);
                }
            }
        }
    }
    Ok(skills)
}

/// Get all categories from market (first-level folders)
#[command]
pub async fn cmd_get_market_categories() -> Result<Vec<String>, String> {
    let market_dir = get_skills_market_dir();
    if !market_dir.exists() {
        return Ok(vec![]);
    }
    Ok(get_categories_from_dir(&market_dir))
}

/// Install a skill from market
#[command]
pub async fn install_skill(skill_id: String) -> Result<bool, String> {
    let market_dir = get_skills_market_dir();
    let parts: Vec<&str> = skill_id.split('/').collect();
    if parts.len() != 2 {
        return Err(format!("Invalid skill id format: {}", skill_id));
    }
    let category = parts[0];
    let skill_folder_name = parts[1];
    let source_skill_dir = market_dir.join(category).join(skill_folder_name);
    let source_skill_md = source_skill_dir.join("SKILL.md");
    if !source_skill_md.exists() {
        return Err(format!("Skill '{}' not found in market", skill_id));
    }
    let local_skills_dir = get_app_root_dir().join("skills");
    if !local_skills_dir.exists() {
        fs::create_dir_all(&local_skills_dir)
            .map_err(|e| format!("Failed to create skills directory: {}", e))?;
    }
    let target_skill_dir = local_skills_dir.join(&skill_id);
    if target_skill_dir.exists() {
        fs::remove_dir_all(&target_skill_dir)
            .map_err(|e| format!("Failed to remove existing skill: {}", e))?;
    }
    if let Some(parent) = target_skill_dir.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    let copy_options = fs_extra::dir::CopyOptions::new()
        .overwrite(true)
        .copy_inside(true);
    fs_extra::dir::copy(&source_skill_dir, &target_skill_dir, &copy_options)
        .map_err(|e| format!("Failed to copy skill: {}", e))?;
    Ok(true)
}

/// Uninstall a skill
#[command]
pub async fn uninstall_skill(skill_id: String) -> Result<bool, String> {
    let local_skills_dir = get_app_root_dir().join("skills").join(&skill_id);
    if local_skills_dir.exists() {
        fs::remove_dir_all(&local_skills_dir)
            .map_err(|e| format!("Failed to uninstall skill: {}", e))?;
    }
    Ok(true)
}

/// Update a specific skill (reinstall from market)
#[command]
pub async fn update_skill(skill_id: String) -> Result<bool, String> {
    update_skills_market().await?;
    install_skill(skill_id).await
}

/// Get market config
#[command]
pub async fn get_market_config() -> Result<MarketConfig, String> {
    Ok(load_market_config())
}

/// Update market config (change repo URL)
#[command]
pub async fn update_market_config(repo_url: String, branch: String) -> Result<(), String> {
    let config = MarketConfig {
        repo_url,
        branch,
        last_update: None,
    };
    save_market_config(&config)?;
    Ok(())
}

/// Get installed skills list
#[command]
pub async fn get_installed_skills() -> Result<Vec<MarketSkill>, String> {
    let local_skills_dir = get_app_root_dir().join("skills");
    let mut skills = Vec::new();
    if !local_skills_dir.exists() {
        return Ok(skills);
    }

    if let Ok(entries) = fs::read_dir(&local_skills_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let skill_id = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                let skill_md_path = path.join("SKILL.md");
                if skill_md_path.exists() {
                    if let Ok(content) = fs::read_to_string(&skill_md_path) {
                        let category = skill_id.split('/').next().unwrap_or("general").to_string();
                        let skill_name = skill_id.split('/').last().unwrap_or(&skill_id);
                        if let Some(mut skill) =
                            parse_skill_markdown(&content, skill_name, &category)
                        {
                            skill.installed = true;
                            skill.id = skill_id;
                            skill.local_path = Some(skill_md_path.to_string_lossy().to_string());
                            skills.push(skill);
                        }
                    }
                }
            }
        }
    }
    Ok(skills)
}

#[command]
pub async fn get_favorited_skills() -> Result<Vec<String>, String> {
    let favorites = load_favorites_config();
    Ok(favorites.favorites)
}

#[command]
pub async fn favorite_skill(skill_id: String) -> Result<bool, String> {
    ensure_favorites_dir()?;
    let market_dir = get_skills_market_dir();
    let parts: Vec<&str> = skill_id.split('/').collect();
    if parts.len() != 2 {
        return Err(format!("Invalid skill id format: {}", skill_id));
    }
    let category = parts[0];
    let skill_folder_name = parts[1];

    let source_skill_dir = market_dir.join(category).join(skill_folder_name);
    let source_skill_md = source_skill_dir.join("SKILL.md");
    if !source_skill_md.exists() {
        return Err(format!("Skill '{}' not found in market", skill_id));
    }
    let content = fs::read_to_string(&source_skill_md)
        .map_err(|e| format!("Failed to read SKILL.md: {}", e))?;
    let is_natural =
        content.contains("type: natural") || content.contains("type: natural_language");
    let target_dir = if is_natural {
        get_favorites_natural_dir()
    } else {
        get_favorites_skill_dir()
    };
    let target_skill_dir = target_dir.join(&skill_id);
    if target_skill_dir.exists() {
        fs::remove_dir_all(&target_skill_dir)
            .map_err(|e| format!("Failed to remove existing favorite: {}", e))?;
    }
    if let Some(parent) = target_skill_dir.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent directory: {}", e))?;
        }
    }
    let copy_options = fs_extra::dir::CopyOptions::new()
        .overwrite(true)
        .copy_inside(true);
    fs_extra::dir::copy(&source_skill_dir, &target_skill_dir, &copy_options)
        .map_err(|e| format!("Failed to copy skill to favorites: {}", e))?;
    let mut favorites = load_favorites_config();
    if !favorites.favorites.contains(&skill_id) {
        favorites.favorites.push(skill_id);
        save_favorites_config(&favorites)?;
    }
    Ok(true)
}

#[command]
pub async fn unfavorite_skill(skill_id: String) -> Result<bool, String> {
    let favorites_dir = get_favorites_dir();
    let target_skill_dir = favorites_dir.join(&skill_id);
    if target_skill_dir.exists() {
        fs::remove_dir_all(&target_skill_dir)
            .map_err(|e| format!("Failed to remove favorite: {}", e))?;
    }
    let mut favorites = load_favorites_config();
    favorites.favorites.retain(|id| id != &skill_id);
    save_favorites_config(&favorites)?;
    Ok(true)
}

pub fn init_favorites_directory() -> Result<(), String> {
    ensure_favorites_dir()
}
