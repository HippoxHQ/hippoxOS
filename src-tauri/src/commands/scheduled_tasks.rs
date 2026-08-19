use crate::commands::paths::get_app_root_dir;
use crate::commons::FileUtils;
use crate::scheduled_task::scheduled_task_executor;
use crate::scheduled_task_pool;
use crate::state::AppState;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use uuid::Uuid;
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTask {
    pub id: String,
    pub name: String,
    pub schedule_type: ScheduleType,
    pub schedule_config: ScheduleConfig,
    pub enabled: bool,
    pub action_type: ActionType,
    pub created_at: String,
    pub updated_at: String,
    pub last_executed_at: Option<String>,
    pub next_execution_at: Option<String>,
    pub completed: bool,
    pub execution_count: u32,
    pub last_status: Option<String>,
    #[serde(default)]
    pub workflow_mode: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ScheduleType {
    Fixed,
    Interval,
}
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ActionType {
    NaturalLanguage,
    SkillFile,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "config", rename_all = "lowercase")]
pub enum ScheduleConfig {
    Fixed(FixedScheduleConfig),
    Interval(IntervalScheduleConfig),
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FixedScheduleConfig {
    pub frequency: Frequency,
    pub time: String,
    pub day_of_week: Option<Vec<u8>>,
    pub day_of_month: Option<Vec<u8>>,
    pub date: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Frequency {
    Daily,
    Weekly,
    Monthly,
    Once,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntervalScheduleConfig {
    pub unit: IntervalUnit,
    pub value: u32,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IntervalUnit {
    Second,
    Minute,
    Hour,
    Day,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NaturalLanguageContent {
    pub content: String,
}
/// Get the root directory for ScheduledTasks
pub fn get_scheduled_tasks_root_dir() -> PathBuf {
    get_app_root_dir().join("ScheduledTasks")
}
/// Get the directory for a specific task
pub fn get_task_dir(task_id: &str) -> PathBuf {
    get_scheduled_tasks_root_dir().join(task_id)
}
/// Get the config.json path for a task
pub fn get_task_config_path(task_id: &str) -> PathBuf {
    get_task_dir(task_id).join("config.json")
}
/// Get the natural_language.json path for a task
pub fn get_task_natural_language_path(task_id: &str) -> PathBuf {
    get_task_dir(task_id).join("natural_language.json")
}
/// Get the SKILL.md path for a task
pub fn get_task_skill_md_path(task_id: &str) -> PathBuf {
    get_task_dir(task_id).join("SKILL.md")
}
/// Ensure the ScheduledTasks directory exists
fn ensure_scheduled_tasks_dir() -> Result<(), String> {
    let dir = get_scheduled_tasks_root_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create ScheduledTasks directory: {}", e))?;
    }
    Ok(())
}
/// Get the next available task ID (auto-incrementing number)
fn get_next_task_id() -> Result<String, String> {
    let root_dir = get_scheduled_tasks_root_dir();
    ensure_scheduled_tasks_dir()?;
    let mut max_num = 0;
    if root_dir.exists() {
        for entry in fs::read_dir(&root_dir).map_err(|e| format!("Failed to read directory: {}", e))? {
            let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
            let path = entry.path();
            if path.is_dir() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if let Some(num_str) = name.strip_prefix("task-") {
                        if let Ok(num) = num_str.parse::<u32>() {
                            if num > max_num {
                                max_num = num;
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(format!("task-{}", max_num + 1))
}
/// Create a task directory
fn create_task_directory(task_id: &str) -> Result<(), String> {
    let task_dir = get_task_dir(task_id);
    if task_dir.exists() {
       FileUtils::remove_dir_all_force(&task_dir).map_err(|e| format!("Failed to remove existing task directory: {:?}", e))?;
    }
    fs::create_dir_all(&task_dir).map_err(|e| format!("Failed to create task directory: {}", e))?;
    Ok(())
}
/// Save task configuration to file
pub fn save_task_config(task: &ScheduledTask) -> Result<(), String> {
    let task_dir = get_task_dir(&task.id);
    if !task_dir.exists() {
        create_task_directory(&task.id)?;
    }
    let config_path = get_task_config_path(&task.id);
    let content = serde_json::to_string_pretty(task).map_err(|e| format!("Failed to serialize task config: {}", e))?;
    fs::write(&config_path, content).map_err(|e| format!("Failed to write task config: {}", e))?;
    Ok(())
}
/// Save natural language content (always created, even if empty)
pub fn save_natural_language_content(task_id: &str, content: &str) -> Result<(), String> {
    let natural_lang_path = get_task_natural_language_path(task_id);
    let natural_lang = NaturalLanguageContent { content: content.to_string() };
    let json_content = serde_json::to_string_pretty(&natural_lang).map_err(|e| format!("Failed to serialize natural language content: {}", e))?;
    fs::write(&natural_lang_path, json_content).map_err(|e| format!("Failed to write natural_language.json: {}", e))?;
    Ok(())
}
/// Save SKILL.md content
pub fn save_skill_md_content(task_id: &str, content: &str) -> Result<(), String> {
    let skill_md_path = get_task_skill_md_path(task_id);
    fs::write(&skill_md_path, content).map_err(|e| format!("Failed to write SKILL.md: {}", e))?;
    Ok(())
}
/// Load task configuration from file
pub fn load_task_config(task_id: &str) -> Result<Option<ScheduledTask>, String> {
    let config_path = get_task_config_path(task_id);
    if !config_path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&config_path).map_err(|e| format!("Failed to read task config: {}", e))?;
    let task: ScheduledTask = serde_json::from_str(&content).map_err(|e| format!("Failed to parse task config: {}", e))?;
    Ok(Some(task))
}
/// Load natural language content from file
pub fn load_natural_language_content(task_id: &str) -> Result<Option<NaturalLanguageContent>, String> {
    let natural_lang_path = get_task_natural_language_path(task_id);
    if !natural_lang_path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&natural_lang_path).map_err(|e| format!("Failed to read natural_language.json: {}", e))?;
    let natural_lang: NaturalLanguageContent = serde_json::from_str(&content).map_err(|e| format!("Failed to parse natural_language.json: {}", e))?;
    Ok(Some(natural_lang))
}
/// Load SKILL.md content from file
pub fn load_skill_md_content(task_id: &str) -> Result<Option<String>, String> {
    let skill_md_path = get_task_skill_md_path(task_id);
    if !skill_md_path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&skill_md_path).map_err(|e| format!("Failed to read SKILL.md: {}", e))?;
    Ok(Some(content))
}
/// Get all task IDs
fn list_task_ids() -> Result<Vec<String>, String> {
    let root_dir = get_scheduled_tasks_root_dir();
    if !root_dir.exists() {
        return Ok(vec![]);
    }
    let mut task_ids = Vec::new();
    for entry in fs::read_dir(&root_dir).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_dir() {
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with("task-") {
                    task_ids.push(name.to_string());
                }
            }
        }
    }
    // Sort by numeric order
    task_ids.sort_by(|a, b| {
        let a_num = a.strip_prefix("task-").unwrap_or("0").parse::<u32>().unwrap_or(0);
        let b_num = b.strip_prefix("task-").unwrap_or("0").parse::<u32>().unwrap_or(0);
        a_num.cmp(&b_num)
    });
    Ok(task_ids)
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateScheduledTaskRequest {
    pub name: String,
    pub schedule_type: ScheduleType,
    pub schedule_config: ScheduleConfig,
    pub enabled: bool,
    pub action_type: ActionType,
    pub natural_language_content: Option<String>,
    pub skill_md_content: Option<String>,
    pub workflow_mode: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateScheduledTaskRequest {
    pub id: String,
    pub name: String,
    pub schedule_type: ScheduleType,
    pub schedule_config: ScheduleConfig,
    pub enabled: bool,
    pub action_type: ActionType,
    pub natural_language_content: Option<String>,
    pub skill_md_content: Option<String>,
    pub workflow_mode: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTaskResponse {
    pub task: ScheduledTask,
    pub natural_language_content: Option<String>,
    pub skill_md_content: Option<String>,
}
/// Create a scheduled task
#[tauri::command]
pub async fn cmd_scheduled_task_create(state: State<'_, AppState>, request: CreateScheduledTaskRequest) -> Result<ScheduledTaskResponse, String> {
    let task_id = get_next_task_id()?;
    let now = chrono::Local::now().to_rfc3339();
    let task = ScheduledTask {
        id: task_id.clone(),
        name: request.name,
        schedule_type: request.schedule_type,
        schedule_config: request.schedule_config,
        enabled: request.enabled,
        action_type: request.action_type,
        created_at: now.clone(),
        updated_at: now.clone(),
        last_executed_at: None,
        next_execution_at: None,
        completed: false,
        execution_count: 0,
        last_status: None,
        workflow_mode: request.workflow_mode,
    };
    // Create task directory and save files
    create_task_directory(&task_id)?;
    save_task_config(&task)?;
    // Save natural language content (always created)
    let natural_content = request.natural_language_content.unwrap_or_default();
    save_natural_language_content(&task_id, &natural_content)?;
    // Save SKILL.md content (if provided)
    let skill_content = request.skill_md_content.unwrap_or_default();
    if !skill_content.is_empty() {
        save_skill_md_content(&task_id, &skill_content)?;
    }
    // Add to task pool
    if let Some(pool) = state.get_task_pool().await {
        let _ = scheduled_task_pool::add_task_to_pool(pool, task.clone()).await;
    }
    Ok(ScheduledTaskResponse {
        task,
        natural_language_content: Some(natural_content),
        skill_md_content: if skill_content.is_empty() { None } else { Some(skill_content) },
    })
}
/// Update a scheduled task
#[tauri::command]
pub async fn cmd_scheduled_task_update(state: State<'_, AppState>, request: UpdateScheduledTaskRequest) -> Result<ScheduledTaskResponse, String> {
    let now = chrono::Local::now().to_rfc3339();
    let mut task = ScheduledTask {
        id: request.id.clone(),
        name: request.name,
        schedule_type: request.schedule_type,
        schedule_config: request.schedule_config,
        enabled: request.enabled,
        action_type: request.action_type,
        created_at: now.clone(),
        updated_at: now.clone(),
        last_executed_at: None,
        next_execution_at: None,
        completed: false,
        execution_count: 0,
        last_status: None,
        workflow_mode: request.workflow_mode,
    };
    // Load existing task to preserve created_at and other fields
    if let Some(existing_task) = load_task_config(&request.id)? {
        task.created_at = existing_task.created_at;
        task.last_executed_at = existing_task.last_executed_at;
        task.next_execution_at = existing_task.next_execution_at;
        task.completed = existing_task.completed;
        task.execution_count = existing_task.execution_count;
        task.last_status = existing_task.last_status;
    }
    save_task_config(&task)?;
    // Save natural language content
    let natural_content = request.natural_language_content.unwrap_or_default();
    save_natural_language_content(&request.id, &natural_content)?;
    // Save SKILL.md content (if provided)
    let skill_content = request.skill_md_content.unwrap_or_default();
    if !skill_content.is_empty() {
        save_skill_md_content(&request.id, &skill_content)?;
    }
    // Update task pool
    if let Some(pool) = state.get_task_pool().await {
        let _ = scheduled_task_pool::update_task_in_pool(pool, task.clone()).await;
    }
    Ok(ScheduledTaskResponse {
        task,
        natural_language_content: Some(natural_content),
        skill_md_content: if skill_content.is_empty() { None } else { Some(skill_content) },
    })
}
/// Get a single scheduled task details
#[tauri::command]
pub async fn cmd_scheduled_task_get(task_id: String) -> Result<Option<ScheduledTaskResponse>, String> {
    let task = match load_task_config(&task_id)? {
        Some(t) => t,
        None => return Ok(None),
    };
    let natural_language_content = load_natural_language_content(&task_id)?.map(|n| n.content);
    let skill_md_content = load_skill_md_content(&task_id)?;
    Ok(Some(ScheduledTaskResponse { task, natural_language_content, skill_md_content }))
}
/// Get all scheduled tasks list (config only, without file contents)
#[tauri::command]
pub async fn cmd_scheduled_task_list() -> Result<Vec<ScheduledTask>, String> {
    let task_ids = list_task_ids()?;
    let mut tasks = Vec::new();
    for task_id in task_ids {
        if let Some(task) = load_task_config(&task_id)? {
            tasks.push(task);
        }
    }
    // Sort by creation time descending
    tasks.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(tasks)
}
/// Delete a scheduled task
#[tauri::command]
pub async fn cmd_scheduled_task_delete(state: State<'_, AppState>, task_id: String) -> Result<bool, String> {
    // Remove from task pool first
    if let Some(pool) = state.get_task_pool().await {
        scheduled_task_pool::remove_task_from_pool(pool, &task_id).await;
    }
    let task_dir = get_task_dir(&task_id);
    if task_dir.exists() {
       FileUtils::remove_dir_all_force(&task_dir).map_err(|e| format!("Failed to delete task directory: {:?}", e))?;
    }
    Ok(true)
}
/// Enable/disable a scheduled task
#[tauri::command]
pub async fn cmd_scheduled_task_toggle(state: State<'_, AppState>, task_id: String, enabled: bool) -> Result<ScheduledTask, String> {
    let mut task = load_task_config(&task_id)?.ok_or_else(|| format!("Task not found: {}", task_id))?;
    task.enabled = enabled;
    task.updated_at = chrono::Local::now().to_rfc3339();
    save_task_config(&task)?;
    // Sync with task pool
    if let Some(pool) = state.get_task_pool().await {
        let _ = scheduled_task_pool::toggle_task_in_pool(pool, &task_id, enabled).await;
    }
    Ok(task)
}
/// Mark a task as completed
#[tauri::command]
pub async fn cmd_scheduled_task_complete(state: State<'_, AppState>, task_id: String) -> Result<ScheduledTask, String> {
    let mut task = load_task_config(&task_id)?.ok_or_else(|| format!("Task not found: {}", task_id))?;
    task.completed = true;
    task.enabled = false;
    task.updated_at = chrono::Local::now().to_rfc3339();
    task.last_executed_at = Some(chrono::Local::now().to_rfc3339());
    save_task_config(&task)?;
    // Remove from task pool (disable)
    if let Some(pool) = state.get_task_pool().await {
        let _ = scheduled_task_pool::toggle_task_in_pool(pool, &task_id, false).await;
    }
    Ok(task)
}
/// Get natural language content
#[tauri::command]
pub async fn cmd_scheduled_task_get_natural_language(task_id: String) -> Result<Option<String>, String> {
    Ok(load_natural_language_content(&task_id)?.map(|n| n.content))
}
/// Get SKILL.md content
#[tauri::command]
pub async fn cmd_scheduled_task_get_skill_md(task_id: String) -> Result<Option<String>, String> {
    load_skill_md_content(&task_id)
}
