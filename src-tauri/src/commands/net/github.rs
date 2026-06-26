use tauri::command;

#[command]
pub async fn cmd_verify_github_repo(repo_url: String) -> Result<serde_json::Value, String> {
    use reqwest::header::{ACCEPT, USER_AGENT};
    let clean_url = repo_url.trim();
    let repo_path = if clean_url.ends_with(".git") {
        &clean_url[..clean_url.len() - 4]
    } else {
        clean_url
    };
    let parts: Vec<&str> = repo_path.split("github.com/").collect();
    if parts.len() < 2 {
        return Err("Invalid GitHub URL format".to_string());
    }
    let repo_part = parts[1].trim_end_matches('/');
    let repo_parts: Vec<&str> = repo_part.split('/').collect();
    if repo_parts.len() < 2 {
        return Err("Invalid GitHub URL format".to_string());
    }
    let owner = repo_parts[0];
    let repo_name = repo_parts[1];
    let api_url = format!("https://api.github.com/repos/{}/{}", owner, repo_name);
    let client = reqwest::Client::builder()
        .user_agent("hippox-app/0.1.0 (https://github.com/your-org/hippox)")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build client: {}", e))?;
    match client
        .get(&api_url)
        .header(ACCEPT, "application/vnd.github.v3+json")
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            if status.is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(data) => {
                        let mut result = serde_json::Map::new();
                        result.insert("valid".to_string(), serde_json::Value::Bool(true));
                        result.insert(
                            "owner".to_string(),
                            serde_json::Value::String(owner.to_string()),
                        );
                        result.insert(
                            "name".to_string(),
                            serde_json::Value::String(repo_name.to_string()),
                        );
                        if let Some(description) = data["description"].as_str() {
                            result.insert(
                                "description".to_string(),
                                serde_json::Value::String(description.to_string()),
                            );
                        } else {
                            result.insert(
                                "description".to_string(),
                                serde_json::Value::String("".to_string()),
                            );
                        }
                        if let Some(stars) = data["stargazers_count"].as_u64() {
                            result.insert(
                                "stars".to_string(),
                                serde_json::Value::Number(stars.into()),
                            );
                        }
                        if let Some(forks) = data["forks_count"].as_u64() {
                            result.insert(
                                "forks".to_string(),
                                serde_json::Value::Number(forks.into()),
                            );
                        }
                        if let Some(private) = data["private"].as_bool() {
                            result.insert("private".to_string(), serde_json::Value::Bool(private));
                        }
                        if let Some(default_branch) = data["default_branch"].as_str() {
                            result.insert(
                                "default_branch".to_string(),
                                serde_json::Value::String(default_branch.to_string()),
                            );
                        }
                        Ok(serde_json::Value::Object(result))
                    }
                    Err(e) => Err(format!("Failed to parse GitHub API response: {}", e)),
                }
            } else if status == 404 {
                let mut result = serde_json::Map::new();
                result.insert("valid".to_string(), serde_json::Value::Bool(false));
                result.insert(
                    "error".to_string(),
                    serde_json::Value::String("Repository not found".to_string()),
                );
                Ok(serde_json::Value::Object(result))
            } else {
                let mut result = serde_json::Map::new();
                result.insert("valid".to_string(), serde_json::Value::Bool(false));
                result.insert(
                    "error".to_string(),
                    serde_json::Value::String(format!("GitHub API error: {}", status)),
                );
                Ok(serde_json::Value::Object(result))
            }
        }
        Err(e) => {
            let mut result = serde_json::Map::new();
            result.insert("valid".to_string(), serde_json::Value::Bool(false));
            result.insert(
                "error".to_string(),
                serde_json::Value::String(format!("Failed to connect: {}", e)),
            );
            Ok(serde_json::Value::Object(result))
        }
    }
}

#[command]
pub async fn cmd_get_github_branches(repo_url: String) -> Result<serde_json::Value, String> {
    use reqwest::header::{ACCEPT, USER_AGENT};

    let clean_url = repo_url.trim();
    let repo_path = if clean_url.ends_with(".git") {
        &clean_url[..clean_url.len() - 4]
    } else {
        clean_url
    };
    let parts: Vec<&str> = repo_path.split("github.com/").collect();
    if parts.len() < 2 {
        return Err("Invalid GitHub URL format".to_string());
    }
    let repo_part = parts[1].trim_end_matches('/');
    let repo_parts: Vec<&str> = repo_part.split('/').collect();
    if repo_parts.len() < 2 {
        return Err("Invalid GitHub URL format".to_string());
    }
    let owner = repo_parts[0];
    let repo_name = repo_parts[1];

    let api_url = format!(
        "https://api.github.com/repos/{}/{}/branches",
        owner, repo_name
    );
    let client = reqwest::Client::builder()
        .user_agent("hippox-app/0.1.0 (https://github.com/your-org/hippox)")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build client: {}", e))?;

    match client
        .get(&api_url)
        .header(ACCEPT, "application/vnd.github.v3+json")
        .send()
        .await
    {
        Ok(response) => {
            let status = response.status();
            if status.is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(data) => {
                        let mut result = serde_json::Map::new();
                        let mut branches = Vec::new();
                        if let Some(array) = data.as_array() {
                            for item in array {
                                if let Some(name) = item["name"].as_str() {
                                    branches.push(serde_json::Value::String(name.to_string()));
                                }
                            }
                        }
                        result.insert("branches".to_string(), serde_json::Value::Array(branches));
                        Ok(serde_json::Value::Object(result))
                    }
                    Err(e) => Err(format!("Failed to parse GitHub API response: {}", e)),
                }
            } else if status == 404 {
                let mut result = serde_json::Map::new();
                result.insert(
                    "error".to_string(),
                    serde_json::Value::String("Repository not found".to_string()),
                );
                Ok(serde_json::Value::Object(result))
            } else {
                let mut result = serde_json::Map::new();
                result.insert(
                    "error".to_string(),
                    serde_json::Value::String(format!("GitHub API error: {}", status)),
                );
                Ok(serde_json::Value::Object(result))
            }
        }
        Err(e) => {
            let mut result = serde_json::Map::new();
            result.insert(
                "error".to_string(),
                serde_json::Value::String(format!("Failed to connect: {}", e)),
            );
            Ok(serde_json::Value::Object(result))
        }
    }
}
