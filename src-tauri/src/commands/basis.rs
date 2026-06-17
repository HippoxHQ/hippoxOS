use serde_json::json;
use tauri::command;

#[command]
pub async fn cmd_get_crate_version(crate_name: String) -> Result<String, String> {
    let url = format!("https://crates.io/api/v1/crates/{}", crate_name);
    let client = reqwest::Client::builder()
        .user_agent("hippox-app/0.1.0 (https://github.com/your-org/hippox)")
        .build()
        .map_err(|e| format!("Failed to build client: {}", e))?;
    match client.get(&url).send().await {
        Ok(response) => match response.json::<serde_json::Value>().await {
            Ok(data) => {
                if let Some(version) = data["crate"]["max_stable_version"].as_str() {
                    Ok(version.to_string())
                } else {
                    Ok("unknown".to_string())
                }
            }
            Err(e) => Err(format!("Failed to parse response: {}", e)),
        },
        Err(e) => Err(format!("Failed to fetch from crates.io: {}", e)),
    }
}

#[command]
pub async fn cmd_get_hippox_versions() -> Result<serde_json::Value, String> {
    let crates = vec!["hippox", "hippox-atomic-skills"];
    let mut results = serde_json::Map::new();
    for name in crates {
        match cmd_get_crate_version(name.to_string()).await {
            Ok(version) => {
                results.insert(name.to_string(), serde_json::Value::String(version));
            }
            Err(_) => {
                results.insert(
                    name.to_string(),
                    serde_json::Value::String("unknown".to_string()),
                );
            }
        }
    }
    Ok(serde_json::Value::Object(results))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cmd_get_crate_version() {
        let result = cmd_get_hippox_versions().await;
        println!("{:?}", result);
    }

    #[tokio::test]
    async fn test_cmd_get_crate_version_not_found() {
        let result = cmd_get_crate_version("non-existent-crate-xyz".to_string()).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "unknown");
    }

    #[tokio::test]
    async fn test_cmd_get_hippox_versions() {
        let result = cmd_get_hippox_versions().await;
        println!("{:?}", result);
    }

    #[tokio::test]
    async fn test_cmd_get_crate_version_err() {
        let result = cmd_get_crate_version("serde".to_string()).await;
        match result {
            Ok(v) => println!("Success: {}", v),
            Err(e) => println!("Error: {}", e),
        }
    }
}
