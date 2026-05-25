use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use crate::commands::{get_app_root_dir, get_settings_dir};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceInstance {
    pub id: String,
    pub name: String,
    pub workspace_path: String,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceConfigData {
    pub instances: Vec<WorkspaceInstance>,
    pub default_instance_id: String,
}

impl Default for WorkspaceConfigData {
    fn default() -> Self {
        Self {
            instances: vec![],
            default_instance_id: String::new(),
        }
    }
}

fn get_main_config_path() -> PathBuf {
    get_settings_dir().join("config.json")
}

pub fn load_workspace_config() -> Result<WorkspaceConfigData, String> {
    let config_path = get_main_config_path();
    if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        let full_config: serde_json::Value =
            serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}));

        if let Some(workspace_config) = full_config.get("workspace_config") {
            let config: WorkspaceConfigData = serde_json::from_value(workspace_config.clone())
                .unwrap_or_else(|_| WorkspaceConfigData::default());
            Ok(config)
        } else {
            Ok(WorkspaceConfigData::default())
        }
    } else {
        Ok(WorkspaceConfigData::default())
    }
}

pub fn save_workspace_config(config: &WorkspaceConfigData) -> Result<(), String> {
    let settings_dir = get_settings_dir();
    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    let config_path = get_main_config_path();
    let mut full_config: serde_json::Value = if config_path.exists() {
        let content = fs::read_to_string(&config_path)
            .map_err(|e| format!("Failed to read config: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({}))
    } else {
        serde_json::json!({})
    };
    full_config["workspace_config"] = serde_json::to_value(config)
        .map_err(|e| format!("Failed to serialize workspace config: {}", e))?;
    let content = serde_json::to_string_pretty(&full_config)
        .map_err(|e| format!("Failed to serialize config: {}", e))?;
    fs::write(&config_path, content).map_err(|e| format!("Failed to save config: {}", e))?;
    Ok(())
}

pub fn ensure_workspace_directory() -> Result<PathBuf, String> {
    let app_root = get_app_root_dir();
    let workspace_dir = app_root.join("workspace");
    if !workspace_dir.exists() {
        fs::create_dir_all(&workspace_dir)
            .map_err(|e| format!("Failed to create workspace directory: {}", e))?;
        println!("Created workspace directory: {:?}", workspace_dir);
    }
    Ok(workspace_dir)
}

pub fn init_default_workspace() -> Result<WorkspaceInstance, String> {
    let workspace_dir = ensure_workspace_directory()?;
    let now = Local::now().to_rfc3339();
    let instance = WorkspaceInstance {
        id: format!("workspace_{}", Local::now().timestamp()),
        name: "workspace".to_string(),
        workspace_path: workspace_dir.to_string_lossy().to_string(),
        is_default: true,
        created_at: now.clone(),
        updated_at: now,
    };
    Ok(instance)
}

pub fn ensure_workspace_config() -> Result<(), String> {
    ensure_workspace_directory()?;
    let mut config = load_workspace_config()?;
    if config.instances.is_empty() {
        let default_instance = init_default_workspace()?;
        config.instances.push(default_instance.clone());
        config.default_instance_id = default_instance.id;
        save_workspace_config(&config)?;
    }
    Ok(())
}

pub fn get_default_workspace() -> Result<Option<WorkspaceInstance>, String> {
    let config = load_workspace_config()?;
    if config.default_instance_id.is_empty() {
        return Ok(None);
    }
    Ok(config
        .instances
        .into_iter()
        .find(|i| i.id == config.default_instance_id))
}

pub fn get_all_workspaces() -> Result<Vec<WorkspaceInstance>, String> {
    let config = load_workspace_config()?;
    Ok(config.instances)
}

pub fn add_workspace(instance: WorkspaceInstance) -> Result<(), String> {
    let mut config = load_workspace_config()?;
    config.instances.push(instance);
    save_workspace_config(&config)?;
    Ok(())
}

pub fn update_workspace(instance: WorkspaceInstance) -> Result<(), String> {
    let mut config = load_workspace_config()?;
    if let Some(existing) = config.instances.iter_mut().find(|i| i.id == instance.id) {
        existing.name = instance.name;
        existing.workspace_path = instance.workspace_path;
        existing.updated_at = Local::now().to_rfc3339();
        save_workspace_config(&config)?;
        Ok(())
    } else {
        Err("Workspace not found".to_string())
    }
}

pub fn delete_workspace(instance_id: &str) -> Result<(), String> {
    let mut config = load_workspace_config()?;
    if config.instances.len() <= 1 {
        return Err("Cannot delete the last workspace".to_string());
    }
    if config.default_instance_id == instance_id {
        return Err("Cannot delete default workspace".to_string());
    }
    config.instances.retain(|i| i.id != instance_id);
    save_workspace_config(&config)?;
    Ok(())
}

pub fn set_default_workspace(instance_id: &str) -> Result<(), String> {
    let mut config = load_workspace_config()?;
    if config.instances.iter().any(|i| i.id == instance_id) {
        config.default_instance_id = instance_id.to_string();
        for instance in &mut config.instances {
            instance.is_default = instance.id == instance_id;
        }
        save_workspace_config(&config)?;
        Ok(())
    } else {
        Err("Workspace not found".to_string())
    }
}
