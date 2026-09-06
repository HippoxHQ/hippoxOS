use super::paths::{get_app_root_dir, get_skills_market_dir};
use crate::commands::{get_favorites_config_path, load_favorites_config, save_favorites_config, SKILLS_MARKET_MIRROR_URL, SKILLS_MARKET_REPO_URL};
use crate::commons::{hidden_cmd, FileUtils};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::command;
const MARKET_CONFIG_FILE: &str = "market_config.json";
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
        Self { repo_url: SKILLS_MARKET_REPO_URL.to_string(), branch: "main".to_string(), last_update: None }
    }
}
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FavoritesConfig {
    pub favorites: Vec<String>,
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
        FileUtils::ensure_dir(&natural_dir).map_err(|e| format!("Failed to create natural directory: {:?}", e))?;
        log::debug!("Created natural directory: {:?}", natural_dir);
    }
    if !skill_dir.exists() {
        FileUtils::ensure_dir(&skill_dir).map_err(|e| format!("Failed to create skill directory: {:?}", e))?;
        log::debug!("Created skill directory: {:?}", skill_dir);
    }
    Ok(())
}
fn get_market_config_path() -> PathBuf {
    get_skills_market_dir().join(MARKET_CONFIG_FILE)
}
fn load_market_config() -> MarketConfig {
    let config_path = get_market_config_path();
    if config_path.exists() {
        match FileUtils::read_file_to_string(&config_path) {
            Ok(content) => {
                if let Ok(config) = serde_json::from_str(&content) {
                    return config;
                }
            }
            Err(e) => {
                log::warn!("Failed to read market config: {:?}", e);
            }
        }
    }
    MarketConfig::default()
}
fn save_market_config(config: &MarketConfig) -> Result<(), String> {
    let config_path = get_market_config_path();
    if let Some(parent) = config_path.parent() {
        FileUtils::ensure_dir(parent).map_err(|e| format!("Failed to create directory: {:?}", e))?;
    }
    let content = serde_json::to_string_pretty(config).map_err(|e| format!("Failed to serialize market config: {}", e))?;
    FileUtils::write_file_string(&config_path, &content).map_err(|e| format!("Failed to save market config: {:?}", e))?;
    Ok(())
}
/**
 * Clone or update repository with automatic mirror fallback
 * Returns: true if using mirror, false if using primary
 * Note: This function is only called when user explicitly opens Skills Market
 */
fn clone_or_pull_repo(market_dir: &Path, config: &MarketConfig) -> Result<bool, String> {
    let git_dir = market_dir.join(".git");
    let branch = &config.branch;
    // First try: Use the configured repo URL (primary)
    let primary_url = &config.repo_url;
    log::debug!("Attempting to use primary repo: {}", primary_url);
    if !git_dir.exists() {
        // Clone with primary URL
        match clone_repo(primary_url, market_dir, branch) {
            Ok(_) => {
                log::debug!("Successfully cloned from primary repository");
                return Ok(false);
            }
            Err(e) => {
                log::warn!("Primary clone failed: {}, trying mirror...", e);
            }
        }
    } else {
        // Pull with primary URL
        match pull_repo(market_dir, branch) {
            Ok(_) => {
                log::debug!("Successfully pulled from primary repository");
                return Ok(false);
            }
            Err(e) => {
                log::warn!("Primary pull failed: {}, trying mirror...", e);
            }
        }
    }
    // Fallback: Try mirror URL
    let mirror_url = SKILLS_MARKET_MIRROR_URL;
    log::debug!("Attempting to use mirror repo: {}", mirror_url);
    if !git_dir.exists() {
        match clone_repo(mirror_url, market_dir, branch) {
            Ok(_) => {
                log::info!("Successfully cloned from mirror repository (git.bdnb.cn)");
                return Ok(true);
            }
            Err(e) => {
                return Err(format!("Failed to clone from both primary and mirror: {}", e));
            }
        }
    } else {
        match set_remote_url(market_dir, mirror_url) {
            Ok(_) => match pull_repo(market_dir, branch) {
                Ok(_) => {
                    log::info!("Successfully pulled from mirror repository (git.bdnb.cn)");
                    let _ = set_remote_url(market_dir, primary_url);
                    return Ok(true);
                }
                Err(e) => {
                    return Err(format!("Failed to pull from mirror: {}", e));
                }
            },
            Err(e) => {
                return Err(format!("Failed to set mirror remote: {}", e));
            }
        }
    }
}
/**
 * Helper: Clone repository from given URL
 */
fn clone_repo(url: &str, target_dir: &Path, branch: &str) -> Result<(), String> {
    let output = hidden_cmd("git")
        .args(["clone", "--branch", branch, url, target_dir.to_str().unwrap()])
        .output()
        .map_err(|e| format!("Git clone failed: {}. Is git installed?", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to clone repository: {}", stderr));
    }
    Ok(())
}
/**
 * Helper: Pull latest changes in repository
 */
fn pull_repo(repo_dir: &Path, branch: &str) -> Result<(), String> {
    let output = hidden_cmd("git").current_dir(repo_dir).args(["pull", "origin", branch]).output().map_err(|e| format!("Git pull failed: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Git pull failed: {}", stderr));
    }
    Ok(())
}
/**
 * Helper: Set remote URL for existing repository
 */
fn set_remote_url(repo_dir: &Path, url: &str) -> Result<(), String> {
    let output = hidden_cmd("git")
        .current_dir(repo_dir)
        .args(["remote", "set-url", "origin", url])
        .output()
        .map_err(|e| format!("Failed to set remote URL: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to set remote URL: {}", stderr));
    }
    Ok(())
}
/**
 * Parse SKILL.md frontmatter
 */
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
            // Parse parameters if present
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
/**
 * Get all categories from market directory (first-level folders)
 */
fn get_categories_from_dir(dir_path: &Path) -> Vec<String> {
    let mut categories = Vec::new();
    if !FileUtils::path_exists(dir_path) {
        return categories;
    }
    match FileUtils::read_dir_entries(dir_path) {
        Ok(entries) => {
            for entry in entries {
                let path = entry.path();
                if path.is_dir() {
                    let category_name = FileUtils::get_file_name(&path).unwrap_or_default();
                    if !category_name.starts_with('.') && category_name != "assets" && category_name != "images" {
                        categories.push(category_name);
                    }
                }
            }
        }
        Err(e) => {
            log::error!("Failed to read categories directory: {:?}", e);
        }
    }
    categories
}
/**
 * Scan skills from directory with structure: category/skill_folder/SKILL.md
 */
fn scan_skills_from_dir(dir_path: &Path, favorites: &FavoritesConfig) -> Vec<MarketSkill> {
    let mut skills = Vec::new();
    if !FileUtils::path_exists(dir_path) {
        return skills;
    }
    // Read first-level directories (categories)
    match FileUtils::read_dir_entries(dir_path) {
        Ok(category_entries) => {
            for category_entry in category_entries {
                let category_path = category_entry.path();
                if !category_path.is_dir() {
                    continue;
                }
                let category_name = FileUtils::get_file_name(&category_path).unwrap_or_default();
                if category_name.starts_with('.') || category_name == "assets" || category_name == "images" {
                    continue;
                }
                match FileUtils::read_dir_entries(&category_path) {
                    Ok(skill_entries) => {
                        for skill_entry in skill_entries {
                            let skill_path = skill_entry.path();
                            if !skill_path.is_dir() {
                                continue;
                            }
                            let skill_folder_name = FileUtils::get_file_name(&skill_path).unwrap_or_default();
                            let skill_md_path = skill_path.join("SKILL.md");
                            if !FileUtils::file_exists(&skill_md_path) {
                                continue;
                            }
                            match FileUtils::read_file_to_string(&skill_md_path) {
                                Ok(content) => {
                                    if let Some(mut skill) = parse_skill_markdown(&content, &skill_folder_name, &category_name) {
                                        skill.local_path = Some(FileUtils::to_string_lossy(&skill_md_path));
                                        skill.favorited = favorites.favorites.contains(&skill.id);
                                        skills.push(skill);
                                    }
                                }
                                Err(e) => {
                                    log::error!("Failed to read SKILL.md at {}: {:?}", skill_md_path.display(), e);
                                }
                            }
                        }
                    }
                    Err(e) => {
                        log::error!("Failed to read skills in category {}: {:?}", category_name, e);
                    }
                }
            }
        }
        Err(e) => {
            log::error!("Failed to read market directory: {:?}", e);
        }
    }
    skills
}
/**
 * Update skills market repository with mirror fallback
 * This is called ON DEMAND when user opens Skills Market panel
 */
#[command]
pub async fn update_skills_market() -> Result<Vec<MarketSkill>, String> {
    let market_dir = get_skills_market_dir();
    let config = load_market_config();
    let branch = config.branch.clone();
    // Ensure market directory exists
    if !market_dir.exists() {
        FileUtils::ensure_dir(&market_dir).map_err(|e| format!("Failed to create skills market directory: {:?}", e))?;
    }
    // Clone or pull with mirror fallback
    match clone_or_pull_repo(&market_dir, &config) {
        Ok(used_mirror) => {
            if used_mirror {
                log::info!("Skills market synced from mirror (git.bdnb.cn)");
            } else {
                log::info!("Skills market synced from primary repository");
            }
        }
        Err(e) => {
            log::error!("Failed to sync skills market: {}", e);
            return Err(e);
        }
    }
    // Update config timestamp
    let mut updated_config = config;
    updated_config.last_update = Some(chrono::Local::now().to_rfc3339());
    save_market_config(&updated_config)?;
    // Scan and return skills
    let favorites = load_favorites_config();
    let mut skills = scan_skills_from_dir(&market_dir, &favorites);
    // Check installation status
    let local_skills_dir = get_app_root_dir().join("skills");
    for skill in &mut skills {
        let skill_dir = local_skills_dir.join(&skill.id);
        if skill_dir.exists() && skill_dir.join("SKILL.md").exists() {
            skill.installed = true;
            match FileUtils::read_file_to_string(&skill_dir.join("SKILL.md")) {
                Ok(content) => {
                    if let Some(installed_skill) = parse_skill_markdown(&content, &skill.id.split('/').last().unwrap_or(&skill.id), &skill.category) {
                        skill.installed_version = Some(installed_skill.version);
                    }
                }
                Err(e) => {
                    log::error!("Failed to read installed skill: {:?}", e);
                }
            }
        }
    }
    Ok(skills)
}
/**
 * Get all available skills from market (without updating)
 * This will NOT clone/pull the repository - uses existing local copy
 */
#[command]
pub async fn get_market_skills() -> Result<Vec<MarketSkill>, String> {
    let market_dir = get_skills_market_dir();
    // If market directory doesn't exist or isn't a git repo, return empty
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
            match FileUtils::read_file_to_string(&skill_dir.join("SKILL.md")) {
                Ok(content) => {
                    if let Some(installed_skill) = parse_skill_markdown(&content, &skill.id.split('/').last().unwrap_or(&skill.id), &skill.category) {
                        skill.installed_version = Some(installed_skill.version);
                    }
                }
                Err(e) => {
                    log::error!("Failed to read installed skill: {:?}", e);
                }
            }
        }
    }
    Ok(skills)
}
/**
 * Get all categories from market (first-level folders)
 */
#[command]
pub async fn cmd_get_market_categories() -> Result<Vec<String>, String> {
    let market_dir = get_skills_market_dir();
    if !market_dir.exists() {
        return Ok(vec![]);
    }
    Ok(get_categories_from_dir(&market_dir))
}
/**
 * Install a skill from market
 */
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
    if !FileUtils::file_exists(&source_skill_md) {
        return Err(format!("Skill '{}' not found in market", skill_id));
    }
    let local_skills_dir = get_app_root_dir().join("skills");
    if !local_skills_dir.exists() {
        FileUtils::ensure_dir(&local_skills_dir).map_err(|e| format!("Failed to create skills directory: {:?}", e))?;
    }
    let target_skill_dir = local_skills_dir.join(&skill_id);
    if target_skill_dir.exists() {
        FileUtils::remove_dir_all_force(&target_skill_dir).map_err(|e| format!("Failed to remove existing skill: {:?}", e))?;
    }
    if let Some(parent) = target_skill_dir.parent() {
        if !parent.exists() {
            FileUtils::ensure_dir(parent).map_err(|e| format!("Failed to create parent directory: {:?}", e))?;
        }
    }
    let copy_options = fs_extra::dir::CopyOptions::new().overwrite(true).copy_inside(true);
    fs_extra::dir::copy(&source_skill_dir, &target_skill_dir, &copy_options).map_err(|e| format!("Failed to copy skill: {}", e))?;
    Ok(true)
}
/**
 * Uninstall a skill
 */
#[command]
pub async fn uninstall_skill(skill_id: String) -> Result<bool, String> {
    let local_skills_dir = get_app_root_dir().join("skills").join(&skill_id);
    if local_skills_dir.exists() {
        FileUtils::remove_dir_all_force(&local_skills_dir).map_err(|e| format!("Failed to uninstall skill: {:?}", e))?;
    }
    Ok(true)
}
/**
 * Get market config
 */
#[command]
pub async fn get_market_config() -> Result<MarketConfig, String> {
    Ok(load_market_config())
}
/**
 * Update market config (change repo URL)
 */
#[command]
pub async fn update_market_config(repo_url: String, branch: String) -> Result<(), String> {
    let config = MarketConfig { repo_url, branch, last_update: None };
    save_market_config(&config)?;
    Ok(())
}
/**
 * Get installed skills list
 */
#[command]
pub async fn get_installed_skills() -> Result<Vec<MarketSkill>, String> {
    let local_skills_dir = get_app_root_dir().join("skills");
    let mut skills = Vec::new();
    if !local_skills_dir.exists() {
        return Ok(skills);
    }
    match FileUtils::read_dir_entries(&local_skills_dir) {
        Ok(entries) => {
            for entry in entries {
                let path = entry.path();
                if path.is_dir() {
                    let skill_id = FileUtils::get_file_name(&path).unwrap_or_default();
                    let skill_md_path = path.join("SKILL.md");
                    if FileUtils::file_exists(&skill_md_path) {
                        match FileUtils::read_file_to_string(&skill_md_path) {
                            Ok(content) => {
                                let category = skill_id.split('/').next().unwrap_or("general").to_string();
                                let skill_name = skill_id.split('/').last().unwrap_or(&skill_id);
                                if let Some(mut skill) = parse_skill_markdown(&content, skill_name, &category) {
                                    skill.installed = true;
                                    skill.id = skill_id;
                                    skill.local_path = Some(FileUtils::to_string_lossy(&skill_md_path));
                                    skills.push(skill);
                                }
                            }
                            Err(e) => {
                                log::error!("Failed to read installed skill: {:?}", e);
                            }
                        }
                    }
                }
            }
        }
        Err(e) => {
            log::error!("Failed to read installed skills directory: {:?}", e);
        }
    }
    Ok(skills)
}
/**
 * Add a skill to favorites
 */
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
    if !FileUtils::file_exists(&source_skill_md) {
        return Err(format!("Skill '{}' not found in market", skill_id));
    }
    let content = FileUtils::read_file_to_string(&source_skill_md).map_err(|e| format!("Failed to read SKILL.md: {:?}", e))?;
    let is_natural = content.contains("type: natural") || content.contains("type: natural_language");
    let target_dir = if is_natural { get_favorites_natural_dir() } else { get_favorites_skill_dir() };
    let target_skill_dir = target_dir.join(&skill_id);
    if target_skill_dir.exists() {
        FileUtils::remove_dir_all_force(&target_skill_dir).map_err(|e| format!("Failed to remove existing favorite: {:?}", e))?;
    }
    if let Some(parent) = target_skill_dir.parent() {
        if !parent.exists() {
            FileUtils::ensure_dir(parent).map_err(|e| format!("Failed to create parent directory: {:?}", e))?;
        }
    }
    let copy_options = fs_extra::dir::CopyOptions::new().overwrite(true).copy_inside(true);
    fs_extra::dir::copy(&source_skill_dir, &target_skill_dir, &copy_options).map_err(|e| format!("Failed to copy skill to favorites: {}", e))?;
    let mut favorites = load_favorites_config();
    if !favorites.favorites.contains(&skill_id) {
        favorites.favorites.push(skill_id);
        save_favorites_config(&favorites)?;
    }
    Ok(true)
}
/**
 * Remove a skill from favorites
 */
#[command]
pub async fn unfavorite_skill(skill_id: String) -> Result<bool, String> {
    let favorites_dir = get_favorites_dir();
    let target_skill_dir = favorites_dir.join(&skill_id);
    if target_skill_dir.exists() {
        FileUtils::remove_dir_all_force(&target_skill_dir).map_err(|e| format!("Failed to remove favorite: {:?}", e))?;
    }
    let mut favorites = load_favorites_config();
    favorites.favorites.retain(|id| id != &skill_id);
    save_favorites_config(&favorites)?;
    Ok(true)
}
/**
 * Initialize favorites directory structure
 */
pub fn init_favorites_directory() -> Result<(), String> {
    ensure_favorites_dir()
}
