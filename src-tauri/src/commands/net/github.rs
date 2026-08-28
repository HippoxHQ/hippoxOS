use crate::commons::cmd_git;
use std::{fs, path::Path};
use tauri::command;
#[command]
pub async fn cmd_verify_github_repo(repo_url: String) -> Result<serde_json::Value, String> {
    use reqwest::header::{ACCEPT, USER_AGENT};
    let clean_url = repo_url.trim();
    let repo_path = if clean_url.ends_with(".git") { &clean_url[..clean_url.len() - 4] } else { clean_url };
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
    match client.get(&api_url).header(ACCEPT, "application/vnd.github.v3+json").send().await {
        Ok(response) => {
            let status = response.status();
            if status.is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(data) => {
                        let mut result = serde_json::Map::new();
                        result.insert("valid".to_string(), serde_json::Value::Bool(true));
                        result.insert("owner".to_string(), serde_json::Value::String(owner.to_string()));
                        result.insert("name".to_string(), serde_json::Value::String(repo_name.to_string()));
                        if let Some(description) = data["description"].as_str() {
                            result.insert("description".to_string(), serde_json::Value::String(description.to_string()));
                        } else {
                            result.insert("description".to_string(), serde_json::Value::String("".to_string()));
                        }
                        if let Some(stars) = data["stargazers_count"].as_u64() {
                            result.insert("stars".to_string(), serde_json::Value::Number(stars.into()));
                        }
                        if let Some(forks) = data["forks_count"].as_u64() {
                            result.insert("forks".to_string(), serde_json::Value::Number(forks.into()));
                        }
                        if let Some(private) = data["private"].as_bool() {
                            result.insert("private".to_string(), serde_json::Value::Bool(private));
                        }
                        if let Some(default_branch) = data["default_branch"].as_str() {
                            result.insert("default_branch".to_string(), serde_json::Value::String(default_branch.to_string()));
                        }
                        Ok(serde_json::Value::Object(result))
                    }
                    Err(e) => Err(format!("Failed to parse GitHub API response: {}", e)),
                }
            } else if status == 404 {
                let mut result = serde_json::Map::new();
                result.insert("valid".to_string(), serde_json::Value::Bool(false));
                result.insert("error".to_string(), serde_json::Value::String("Repository not found".to_string()));
                Ok(serde_json::Value::Object(result))
            } else {
                let mut result = serde_json::Map::new();
                result.insert("valid".to_string(), serde_json::Value::Bool(false));
                result.insert("error".to_string(), serde_json::Value::String(format!("GitHub API error: {}", status)));
                Ok(serde_json::Value::Object(result))
            }
        }
        Err(e) => {
            let mut result = serde_json::Map::new();
            result.insert("valid".to_string(), serde_json::Value::Bool(false));
            result.insert("error".to_string(), serde_json::Value::String(format!("Failed to connect: {}", e)));
            Ok(serde_json::Value::Object(result))
        }
    }
}
#[command]
pub async fn cmd_get_github_branches(repo_url: String) -> Result<serde_json::Value, String> {
    use reqwest::header::{ACCEPT, USER_AGENT};
    let clean_url = repo_url.trim();
    let repo_path = if clean_url.ends_with(".git") { &clean_url[..clean_url.len() - 4] } else { clean_url };
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
    let api_url = format!("https://api.github.com/repos/{}/{}/branches", owner, repo_name);
    let client = reqwest::Client::builder()
        .user_agent("hippox-app/0.1.0 (https://github.com/your-org/hippox)")
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| format!("Failed to build client: {}", e))?;
    match client.get(&api_url).header(ACCEPT, "application/vnd.github.v3+json").send().await {
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
                result.insert("error".to_string(), serde_json::Value::String("Repository not found".to_string()));
                Ok(serde_json::Value::Object(result))
            } else {
                let mut result = serde_json::Map::new();
                result.insert("error".to_string(), serde_json::Value::String(format!("GitHub API error: {}", status)));
                Ok(serde_json::Value::Object(result))
            }
        }
        Err(e) => {
            let mut result = serde_json::Map::new();
            result.insert("error".to_string(), serde_json::Value::String(format!("Failed to connect: {}", e)));
            Ok(serde_json::Value::Object(result))
        }
    }
}
#[command]
pub async fn cmd_clone_github_repo(repo_url: String, target_path: String, branch: Option<String>) -> Result<String, String> {
    use tokio::time::{timeout, Duration};
    let target = Path::new(&target_path);
    if !target.exists() {
        fs::create_dir_all(target).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    // Use spawn_blocking with cmd_git() for hidden execution
    let repo_url_clone = repo_url.clone();
    let target_path_clone = target_path.clone();
    let branch_clone = branch.clone();
    let result = tokio::task::spawn_blocking(move || {
        let mut cmd = cmd_git();
        cmd.arg("clone");
        if let Some(b) = branch_clone {
            if !b.is_empty() {
                cmd.arg("-b").arg(&b);
            }
        }
        cmd.arg(&repo_url_clone).arg(&target_path_clone);
        // Use timeout manually since we're in spawn_blocking
        cmd.output()
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if output.status.success() {
                Ok(format!("Successfully cloned to: {}", target_path))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Git clone failed: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
#[command]
pub async fn cmd_is_git_repo(path: String) -> Result<bool, String> {
    let git_dir = Path::new(&path).join(".git");
    Ok(git_dir.exists() && git_dir.is_dir())
}
#[command]
pub async fn cmd_get_current_branch(path: String) -> Result<String, String> {
    let path_clone = path.clone();
    let result = tokio::task::spawn_blocking(move || cmd_git().arg("-C").arg(&path_clone).arg("rev-parse").arg("--abbrev-ref").arg("HEAD").output())
        .await
        .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if output.status.success() {
                let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Ok(branch)
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to get current branch: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
#[command]
pub async fn cmd_get_local_branches(path: String) -> Result<Vec<String>, String> {
    let path_clone = path.clone();
    let result = tokio::task::spawn_blocking(move || cmd_git().arg("-C").arg(&path_clone).arg("branch").arg("--format=%(refname:short)").output())
        .await
        .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if output.status.success() {
                let branches =
                    String::from_utf8_lossy(&output.stdout).lines().filter(|line| !line.is_empty()).map(|s| s.trim().to_string()).collect();
                Ok(branches)
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to get branches: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
#[command]
pub async fn cmd_get_commit_history(path: String) -> Result<serde_json::Value, String> {
    let path_clone = path.clone();
    let result = tokio::task::spawn_blocking(move || {
        cmd_git().arg("-C").arg(&path_clone).arg("log").arg("--all").arg("--pretty=format:%H|%h|%s|%an|%ai|%d|%p").arg("--topo-order").output()
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Failed to get commit history: {}", stderr));
            }
            let output_str = String::from_utf8_lossy(&output.stdout);
            let mut commits = Vec::new();
            for line in output_str.lines() {
                if line.is_empty() {
                    continue;
                }
                let parts: Vec<&str> = line.split('|').collect();
                if parts.len() >= 6 {
                    let full_hash = parts[0].to_string();
                    let short_hash = parts[1].to_string();
                    let message = parts[2].to_string();
                    let author = parts[3].to_string();
                    let date = parts[4].to_string();
                    let refs = parts[5].to_string();
                    let parents = if parts.len() > 6 && !parts[6].is_empty() {
                        parts[6].split_whitespace().map(|s| s.to_string()).collect::<Vec<String>>()
                    } else {
                        Vec::new()
                    };
                    let mut branch = None;
                    let mut is_head = false;
                    if refs.contains("HEAD ->") {
                        is_head = true;
                        if let Some(start) = refs.find("HEAD -> ") {
                            let rest = &refs[start + 8..];
                            if let Some(end) = rest.find(',') {
                                branch = Some(rest[..end].trim().to_string());
                            } else if let Some(end) = rest.find(')') {
                                branch = Some(rest[..end].trim().to_string());
                            } else {
                                branch = Some(rest.trim().to_string());
                            }
                        }
                    } else if refs.contains("tag:") {
                        // Skip tags
                    } else if !refs.is_empty() && refs != " " {
                        let clean_refs = refs.trim_matches(|c| c == '(' || c == ')' || c == ' ');
                        for r in clean_refs.split(',') {
                            let r = r.trim();
                            if !r.is_empty() && !r.contains("tag:") && !r.contains("HEAD") {
                                branch = Some(r.to_string());
                                break;
                            }
                        }
                    }
                    commits.push(serde_json::json!({
                        "hash": full_hash,
                        "shortHash": short_hash,
                        "message": message,
                        "author": author,
                        "date": date,
                        "branch": branch,
                        "isHead": is_head,
                        "parents": parents,
                    }));
                }
            }
            Ok(serde_json::json!({ "commits": commits }))
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
#[command]
pub async fn cmd_get_git_status(path: String) -> Result<serde_json::Value, String> {
    let path_clone = path.clone();
    let result = tokio::task::spawn_blocking(move || cmd_git().arg("-C").arg(&path_clone).arg("status").arg("--porcelain").arg("-u").output())
        .await
        .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("Failed to get git status: {}", stderr));
            }
            let output_str = String::from_utf8_lossy(&output.stdout);
            let mut changes = Vec::new();
            let has_changes = !output_str.trim().is_empty();
            for line in output_str.lines() {
                if line.is_empty() {
                    continue;
                }
                let status = line.get(0..2).unwrap_or("??").to_string();
                let file = line.get(3..).unwrap_or("").trim().to_string();
                let status_desc = match status.as_str() {
                    "M " => "modified",
                    " M" => "modified",
                    "A " => "added",
                    "AM" => "added",
                    "D " => "deleted",
                    " D" => "deleted",
                    "R " => "renamed",
                    "C " => "copied",
                    "??" => "untracked",
                    "!!" => "ignored",
                    _ => "unknown",
                };
                changes.push(serde_json::json!({
                    "file": file,
                    "status": status,
                    "statusDesc": status_desc,
                }));
            }
            Ok(serde_json::json!({
                "hasChanges": has_changes,
                "changes": changes,
            }))
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
#[command]
pub async fn cmd_get_remote_url(path: String) -> Result<String, String> {
    let path_clone = path.clone();
    let result = tokio::task::spawn_blocking(move || cmd_git().arg("-C").arg(&path_clone).arg("remote").arg("get-url").arg("origin").output())
        .await
        .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if output.status.success() {
                let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if url.is_empty() {
                    Err("No remote origin configured".to_string())
                } else {
                    Ok(url)
                }
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                if stderr.contains("No such remote") {
                    Err("No remote origin configured".to_string())
                } else {
                    Err(format!("Failed to get remote URL: {}", stderr))
                }
            }
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
#[command]
pub async fn cmd_get_remote_status(path: String, branch: String) -> Result<serde_json::Value, String> {
    let path_clone = path.clone();
    let branch_clone = branch.clone();
    // First, fetch the latest from remote
    let fetch_result =
        tokio::task::spawn_blocking(move || cmd_git().arg("-C").arg(&path_clone).arg("fetch").arg("origin").arg(&branch_clone).output())
            .await
            .map_err(|e| format!("Task panicked: {}", e))?;
    // Ignore fetch errors (e.g., no remote branch yet)
    let path_clone2 = path.clone();
    let branch_clone2 = branch.clone();
    let result = tokio::task::spawn_blocking(move || {
        cmd_git()
            .arg("-C")
            .arg(&path_clone2)
            .arg("rev-list")
            .arg("--count")
            .arg("--left-right")
            .arg(&format!("origin/{}...{}", branch_clone2, branch_clone2))
            .output()
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if output.status.success() {
                let result_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let parts: Vec<&str> = result_str.split_whitespace().collect();
                let behind = if parts.len() > 0 { parts[0].parse::<i32>().unwrap_or(0) } else { 0 };
                let ahead = if parts.len() > 1 { parts[1].parse::<i32>().unwrap_or(0) } else { 0 };
                Ok(serde_json::json!({
                    "ahead": ahead,
                    "behind": behind,
                    "isSynced": ahead == 0 && behind == 0,
                    "isAhead": ahead > 0,
                    "isBehind": behind > 0,
                    "isDiverged": ahead > 0 && behind > 0,
                }))
            } else {
                Ok(serde_json::json!({
                    "ahead": 0,
                    "behind": 0,
                    "isSynced": true,
                    "isAhead": false,
                    "isBehind": false,
                    "isDiverged": false,
                }))
            }
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
#[command]
pub async fn cmd_get_remote_branches(path: String) -> Result<Vec<String>, String> {
    let path_clone = path.clone();
    let result =
        tokio::task::spawn_blocking(move || cmd_git().arg("-C").arg(&path_clone).arg("branch").arg("-r").arg("--format=%(refname:short)").output())
            .await
            .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if output.status.success() {
                let branches =
                    String::from_utf8_lossy(&output.stdout).lines().filter(|line| !line.is_empty()).map(|s| s.trim().to_string()).collect();
                Ok(branches)
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to get remote branches: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
#[command]
pub async fn cmd_git_pull(path: String, branch: String) -> Result<String, String> {
    let path_clone = path.clone();
    let branch_clone = branch.clone();
    let result = tokio::task::spawn_blocking(move || cmd_git().arg("-C").arg(&path_clone).arg("pull").arg("origin").arg(&branch_clone).output())
        .await
        .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                Ok(format!("Pull successful: {}", stdout))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Pull failed: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
#[command]
pub async fn cmd_git_push(path: String, branch: String) -> Result<String, String> {
    let path_clone = path.clone();
    let branch_clone = branch.clone();
    let result = tokio::task::spawn_blocking(move || cmd_git().arg("-C").arg(&path_clone).arg("push").arg("origin").arg(&branch_clone).output())
        .await
        .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                Ok(format!("Push successful: {}", stdout))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Push failed: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
#[command]
pub async fn cmd_get_file_diff(path: String, file: String) -> Result<serde_json::Value, String> {
    let path_clone = path.clone();
    let file_clone = file.clone();
    // Get the diff
    let diff_result = tokio::task::spawn_blocking(move || {
        cmd_git().arg("-C").arg(&path_clone).arg("diff").arg("--no-color").arg("--no-prefix").arg("--unified=3").arg("--").arg(&file_clone).output()
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?;
    match diff_result {
        Ok(output) => {
            if output.status.success() {
                let diff_content = String::from_utf8_lossy(&output.stdout).to_string();
                if diff_content.is_empty() {
                    // Check if file is untracked
                    let path_clone2 = path.clone();
                    let file_clone2 = file.clone();
                    let check_result = tokio::task::spawn_blocking(move || {
                        cmd_git()
                            .arg("-C")
                            .arg(&path_clone2)
                            .arg("ls-files")
                            .arg("--others")
                            .arg("--exclude-standard")
                            .arg("--")
                            .arg(&file_clone2)
                            .output()
                    })
                    .await
                    .map_err(|e| format!("Task panicked: {}", e))?;
                    match check_result {
                        Ok(check_output) => {
                            let is_untracked = !String::from_utf8_lossy(&check_output.stdout).trim().is_empty();
                            if is_untracked {
                                let file_path = Path::new(&path).join(&file);
                                if file_path.exists() {
                                    let content = std::fs::read_to_string(&file_path).map_err(|e| format!("Failed to read file: {}", e))?;
                                    return Ok(serde_json::json!({
                                        "type": "new_file",
                                        "content": content,
                                        "diff": diff_content,
                                    }));
                                }
                            }
                        }
                        Err(e) => {
                            // Continue with no_diff result
                        }
                    }
                    return Ok(serde_json::json!({
                        "type": "no_diff",
                        "diff": "",
                    }));
                }
                let mut additions = 0;
                let mut deletions = 0;
                for line in diff_content.lines() {
                    if line.starts_with("+") && !line.starts_with("+++") {
                        additions += 1;
                    } else if line.starts_with("-") && !line.starts_with("---") {
                        deletions += 1;
                    }
                }
                Ok(serde_json::json!({
                    "type": "diff",
                    "diff": diff_content,
                    "additions": additions,
                    "deletions": deletions,
                }))
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("Failed to get diff: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
