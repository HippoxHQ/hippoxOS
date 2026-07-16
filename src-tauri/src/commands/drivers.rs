use hippox::{get_driver, list_drivers};
use serde::{Deserialize, Serialize};
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriverInfo {
    pub name: String,
    pub description: String,
    pub category: String,
    pub parameters: Vec<DriverParameterInfo>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriverParameterInfo {
    pub name: String,
    pub param_type: String,
    pub description: String,
    pub required: bool,
}
#[tauri::command]
pub fn cmd_get_driver_categories() -> Vec<String> {
    let drivers = cmd_get_drivers();
    let mut categories: Vec<String> = drivers.into_iter().map(|s| s.category).collect::<std::collections::HashSet<_>>().into_iter().collect();
    categories.sort();
    categories
}
#[tauri::command]
pub async fn cmd_execute_driver(driver_name: String, parameters: std::collections::HashMap<String, serde_json::Value>) -> Result<String, String> {
    let driver = get_driver(&driver_name).ok_or_else(|| format!("Skill not found: {}", driver_name))?;
    driver.execute(&parameters, None, None).await.map_err(|e| e.to_string())
}
#[tauri::command]
pub fn cmd_get_drivers_by_category(category: String) -> Vec<DriverInfo> {
    cmd_get_drivers().into_iter().filter(|s| s.category == category).collect()
}
#[tauri::command]
pub fn cmd_get_drivers() -> Vec<DriverInfo> {
    let driver_names = list_drivers();
    driver_names
        .iter()
        .filter_map(|name| {
            get_driver(name).map(|skill| {
                let params: Vec<DriverParameterInfo> = skill
                    .parameters()
                    .into_iter()
                    .map(|p| DriverParameterInfo { name: p.name, param_type: p.param_type, description: p.description, required: p.required })
                    .collect();
                DriverInfo {
                    name: name.clone(),
                    description: skill.description().to_string(),
                    category: skill.category().name().to_string(),
                    parameters: params,
                }
            })
        })
        .collect()
}
