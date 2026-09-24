use crate::{commands::is_codeeditor_metadata_path, commons::cmd_git};
use serde::{Deserialize, Serialize};
use std::{fs, path::Path};
use tauri::command;
/// Optional primary-author override for a commit.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitAuthorOverride {
    pub author_name: String,
    pub author_email: String,
    pub committer_name: String,
    pub committer_email: String,
}
async fn run_git(path: String, args: Vec<String>) -> Result<String, String> {
    let result = tokio::task::spawn_blocking(move || {
        let mut cmd = cmd_git();
        cmd.arg("-C").arg(&path);
        for a in &args {
            cmd.arg(a);
        }
        cmd.output()
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if output.status.success() {
                Ok(String::from_utf8_lossy(&output.stdout).to_string())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("git command failed: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
async fn run_git_with_env(path: String, args: Vec<String>, envs: Vec<(String, String)>) -> Result<String, String> {
    let result = tokio::task::spawn_blocking(move || {
        let mut cmd = cmd_git();
        cmd.arg("-C").arg(&path);
        for (k, v) in &envs {
            cmd.env(k, v);
        }
        for a in &args {
            cmd.arg(a);
        }
        cmd.output()
    })
    .await
    .map_err(|e| format!("Task panicked: {}", e))?;
    match result {
        Ok(output) => {
            if output.status.success() {
                Ok(String::from_utf8_lossy(&output.stdout).to_string())
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("git command failed: {}", stderr))
            }
        }
        Err(e) => Err(format!("Failed to execute git: {}", e)),
    }
}
async fn run_git_allow_fail(path: String, args: Vec<String>) -> Option<String> {
    let result = tokio::task::spawn_blocking(move || {
        let mut cmd = cmd_git();
        cmd.arg("-C").arg(&path);
        for a in &args {
            cmd.arg(a);
        }
        cmd.output()
    })
    .await
    .ok()?;
    match result {
        Ok(output) if output.status.success() => Some(String::from_utf8_lossy(&output.stdout).to_string()),
        _ => None,
    }
}
fn lines_to_vec(raw: &str) -> Vec<String> {
    raw.lines().filter(|line| !line.is_empty()).map(|s| s.trim().to_string()).collect()
}
fn normalize_remote_branch(raw: &str) -> Option<String> {
    let t = raw.trim();
    if t.is_empty() {
        return None;
    }
    let name = if let Some(stripped) = t.strip_prefix("origin/") {
        stripped.to_string()
    } else if t == "origin" {
        return None;
    } else {
        t.to_string()
    };
    if name == "HEAD" || name.is_empty() {
        None
    } else {
        Some(name)
    }
}
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
    let target = Path::new(&target_path);
    if !target.exists() {
        fs::create_dir_all(target).map_err(|e| format!("Failed to create directory: {}", e))?;
    }
    // Use spawn_blocking with cmd_git() for hidden execution.
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
    let raw = run_git(path, vec!["rev-parse".into(), "--abbrev-ref".into(), "HEAD".into()]).await?;
    let branch = raw.trim().to_string();
    // In detached HEAD state, rev-parse returns "HEAD".
    // Return an empty string so callers do not treat it as a branch.
    if branch == "HEAD" {
        Ok(String::new())
    } else {
        Ok(branch)
    }
}
#[command]
pub async fn cmd_get_local_branches(path: String) -> Result<Vec<String>, String> {
    let raw = run_git(path, vec!["branch".into(), "--format=%(refname:short)".into()]).await?;
    Ok(lines_to_vec(&raw))
}
#[command]
pub async fn cmd_get_git_status(path: String) -> Result<serde_json::Value, String> {
    let raw = run_git(path, vec!["-c".into(), "core.quotepath=false".into(), "status".into(), "--porcelain".into(), "-u".into()]).await?;
    let mut changes = Vec::new();
    let mut has_changes = false;
    for line in raw.lines() {
        if line.is_empty() {
            continue;
        }
        let status = line.get(0..2).unwrap_or("??").to_string();
        let file = line.get(3..).unwrap_or("").trim().to_string();
        if is_codeeditor_metadata_path(&file) {
            continue;
        }
        has_changes = true;
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
#[command]
pub async fn cmd_get_remote_url(path: String) -> Result<String, String> {
    let path_for_err = path.clone();
    let result = run_git(path, vec!["remote".into(), "get-url".into(), "origin".into()]).await;
    match result {
        Ok(raw) => {
            let url = raw.trim().to_string();
            if url.is_empty() {
                Err("No remote origin configured".to_string())
            } else {
                Ok(url)
            }
        }
        Err(e) => {
            // Preserve the original "no remote" message when git reports it.
            if e.contains("No such remote") {
                Err("No remote origin configured".to_string())
            } else {
                let _ = path_for_err;
                Err(e)
            }
        }
    }
}
#[command]
pub async fn cmd_get_remote_status(path: String, branch: String) -> Result<serde_json::Value, String> {
    let _ = run_git(path.clone(), vec!["fetch".into(), "origin".into(), branch.clone()]).await;
    let range = format!("origin/{}...{}", branch, branch);
    let probe = run_git_allow_fail(path, vec!["rev-list".into(), "--count".into(), "--left-right".into(), range]).await;
    match probe {
        Some(raw) => {
            let result_str = raw.trim().to_string();
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
        }
        None => Ok(serde_json::json!({
            "ahead": 0,
            "behind": 0,
            "isSynced": true,
            "isAhead": false,
            "isBehind": false,
            "isDiverged": false,
        })),
    }
}
#[command]
pub async fn cmd_get_remote_branches(path: String) -> Result<Vec<String>, String> {
    let raw = run_git(path, vec!["branch".into(), "-r".into(), "--format=%(refname:short)".into()]).await?;
    Ok(lines_to_vec(&raw))
}
#[command]
pub async fn cmd_git_pull(path: String, branch: String) -> Result<String, String> {
    let stdout = run_git(path, vec!["pull".into(), "origin".into(), branch]).await?;
    Ok(format!("Pull successful: {}", stdout))
}
#[command]
pub async fn cmd_git_push(path: String, branch: String) -> Result<String, String> {
    let stdout = run_git(path, vec!["push".into(), "origin".into(), branch]).await?;
    Ok(format!("Push successful: {}", stdout))
}
#[command]
pub async fn cmd_get_file_diff(path: String, file: String) -> Result<serde_json::Value, String> {
    let diff_content = run_git(
        path.clone(),
        vec![
            "-c".into(),
            "core.quotepath=false".into(),
            "diff".into(),
            "--no-color".into(),
            "--no-prefix".into(),
            "--unified=3".into(),
            "--".into(),
            file.clone(),
        ],
    )
    .await?;
    if diff_content.is_empty() {
        let check = run_git_allow_fail(
            path.clone(),
            vec![
                "-c".into(),
                "core.quotepath=false".into(),
                "ls-files".into(),
                "--others".into(),
                "--exclude-standard".into(),
                "--".into(),
                file.clone(),
            ],
        )
        .await;
        let is_untracked = check.map(|o| !o.trim().is_empty()).unwrap_or(false);
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
}
#[command]
pub async fn cmd_git_status_split(path: String) -> Result<serde_json::Value, String> {
    let raw = run_git(path, vec!["-c".into(), "core.quotepath=false".into(), "status".into(), "--porcelain=v1".into(), "-u".into()]).await?;
    // Helper to convert a raw one-char status into a human readable label.
    let status_desc = |c: char| -> &'static str {
        match c {
            'M' => "modified",
            'A' => "added",
            'D' => "deleted",
            'R' => "renamed",
            'C' => "copied",
            '?' => "untracked",
            '!' => "ignored",
            _ => "unknown",
        }
    };
    let mut staged: Vec<serde_json::Value> = Vec::new();
    let mut unstaged: Vec<serde_json::Value> = Vec::new();
    for line in raw.lines() {
        if line.is_empty() || line.len() < 4 {
            continue;
        }
        let index_status = line.chars().nth(0).unwrap_or(' ');
        let worktree_status = line.chars().nth(1).unwrap_or(' ');
        let file = line.get(3..).unwrap_or("").trim().to_string();
        if is_codeeditor_metadata_path(&file) {
            continue;
        }
        if index_status != ' ' && index_status != '?' {
            staged.push(serde_json::json!({
                "file": file,
                "status": format!("{} ", index_status),
                "statusDesc": status_desc(index_status),
            }));
        }
        if worktree_status != ' ' {
            let desc = if index_status == '?' && worktree_status == '?' { "untracked" } else { status_desc(worktree_status) };
            unstaged.push(serde_json::json!({
                "file": file,
                "status": format!(" {}", worktree_status),
                "statusDesc": desc,
            }));
        }
    }
    Ok(serde_json::json!({
        "staged": staged,
        "unstaged": unstaged,
        "hasChanges": !staged.is_empty() || !unstaged.is_empty(),
    }))
}
/// Stage a single file (git add <file>).
#[command]
pub async fn cmd_git_add_file(path: String, file: String) -> Result<bool, String> {
    run_git(path, vec!["add".into(), "--".into(), file]).await?;
    Ok(true)
}
/// Unstage a single file (git reset HEAD -- <file>).
#[command]
pub async fn cmd_git_unstage_file(path: String, file: String) -> Result<bool, String> {
    run_git(path, vec!["reset".into(), "HEAD".into(), "--".into(), file]).await?;
    Ok(true)
}
/// Stage every changed file (git add -A).
#[command]
pub async fn cmd_git_stage_all(path: String) -> Result<bool, String> {
    run_git(path, vec!["add".into(), "-A".into()]).await?;
    Ok(true)
}
/// Unstage every staged file (git reset HEAD -- .).
#[command]
pub async fn cmd_git_unstage_all(path: String) -> Result<bool, String> {
    run_git(path, vec!["reset".into(), "HEAD".into(), "--".into(), ".".into()]).await?;
    Ok(true)
}
/// Diff of a single staged file (git diff --cached -- <file>).
#[command]
pub async fn cmd_git_staged_file_diff(path: String, file: String) -> Result<serde_json::Value, String> {
    let diff_content = run_git(
        path,
        vec![
            "-c".into(),
            "core.quotepath=false".into(),
            "diff".into(),
            "--cached".into(),
            "--no-color".into(),
            "--no-prefix".into(),
            "--unified=3".into(),
            "--".into(),
            file,
        ],
    )
    .await?;
    if diff_content.is_empty() {
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
}
/// Read the local Git user identity (name + email) for a given repository.
#[command]
pub async fn cmd_git_user_config(path: String) -> Result<serde_json::Value, String> {
    let name = run_git_allow_fail(path.clone(), vec!["config".into(), "user.name".into()]).await.map(|s| s.trim().to_string()).unwrap_or_default();
    let email = run_git_allow_fail(path, vec!["config".into(), "user.email".into()]).await.map(|s| s.trim().to_string()).unwrap_or_default();
    Ok(serde_json::json!({
        "name": name,
        "email": email,
    }))
}
/// Commit staged changes with the given message.
#[command]
pub async fn cmd_git_commit(path: String, message: String, author: Option<CommitAuthorOverride>) -> Result<String, String> {
    let trimmed = message.trim().to_string();
    if trimmed.is_empty() {
        return Err("Commit message cannot be empty".to_string());
    }
    let _ = run_git_allow_fail(
        path.clone(),
        vec!["reset".into(), "-q".into(), "HEAD".into(), "--".into(), crate::commands::CODEEDITOR_METADATA_PATH.into()],
    )
    .await;
    let mut envs: Vec<(String, String)> = Vec::new();
    if let Some(a) = author {
        if !a.author_name.trim().is_empty() {
            envs.push(("GIT_AUTHOR_NAME".into(), a.author_name.trim().to_string()));
        }
        if !a.author_email.trim().is_empty() {
            envs.push(("GIT_AUTHOR_EMAIL".into(), a.author_email.trim().to_string()));
        }
        if !a.committer_name.trim().is_empty() {
            envs.push(("GIT_COMMITTER_NAME".into(), a.committer_name.trim().to_string()));
        }
        if !a.committer_email.trim().is_empty() {
            envs.push(("GIT_COMMITTER_EMAIL".into(), a.committer_email.trim().to_string()));
        }
    }
    let stdout = run_git_with_env(path, vec!["commit".into(), "-m".into(), trimmed], envs).await?;
    Ok(format!("Commit successful: {}", stdout))
}
/// Create a new branch and switch to it (git checkout -b <name>).
#[command]
pub async fn cmd_git_create_branch(path: String, branch: String) -> Result<String, String> {
    let name = branch.trim().to_string();
    if name.is_empty() {
        return Err("Branch name cannot be empty".to_string());
    }
    let stdout = run_git(path, vec!["checkout".into(), "-b".into(), name]).await?;
    Ok(format!("Branch created: {}", stdout))
}
/// Delete a local branch (git branch -D <name>).
#[command]
pub async fn cmd_git_delete_branch(path: String, branch: String) -> Result<String, String> {
    let name = branch.trim().to_string();
    if name.is_empty() {
        return Err("Branch name cannot be empty".to_string());
    }
    let stdout = run_git(path, vec!["branch".into(), "-D".into(), name]).await?;
    Ok(format!("Branch deleted: {}", stdout))
}
/// Switch to an existing local branch (git checkout <name>).
#[command]
pub async fn cmd_git_checkout_branch(path: String, branch: String) -> Result<String, String> {
    let name = branch.trim().to_string();
    if name.is_empty() {
        return Err("Branch name cannot be empty".to_string());
    }
    let stdout = run_git(path, vec!["checkout".into(), name]).await?;
    Ok(format!("Checkout successful: {}", stdout))
}
/// Return the number of local commits that are not yet on the remote.
#[command]
pub async fn cmd_git_ahead_count(path: String) -> Result<i64, String> {
    if let Some(raw) = run_git_allow_fail(path.clone(), vec!["rev-list".into(), "--count".into(), "@{u}..HEAD".into()]).await {
        if let Ok(n) = raw.trim().parse::<i64>() {
            return Ok(n);
        }
    }
    if let Some(branch_raw) = run_git_allow_fail(path.clone(), vec!["rev-parse".into(), "--abbrev-ref".into(), "HEAD".into()]).await {
        let branch = branch_raw.trim().to_string();
        if !branch.is_empty() {
            let range = format!("origin/{}..HEAD", branch);
            if let Some(raw) = run_git_allow_fail(path.clone(), vec!["rev-list".into(), "--count".into(), range]).await {
                if let Ok(n) = raw.trim().parse::<i64>() {
                    return Ok(n);
                }
            }
        }
    }
    if let Some(raw) = run_git_allow_fail(path, vec!["rev-list".into(), "--count".into(), "HEAD".into(), "--not".into(), "--remotes".into()]).await {
        if let Ok(n) = raw.trim().parse::<i64>() {
            return Ok(n);
        }
    }
    Ok(0)
}
#[command]
pub async fn cmd_get_commit_history(path: String) -> Result<serde_json::Value, String> {
    let raw = run_git(
        path,
        vec![
            "-c".into(),
            "core.quotepath=false".into(),
            "log".into(),
            "--all".into(),
            "--pretty=format:%H|%h|%s|%an|%ae|%ai|%cn|%d|%p".into(),
            "--topo-order".into(),
        ],
    )
    .await?;
    let mut commits = Vec::new();
    for line in raw.lines() {
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 9 {
            let full_hash = parts[0].to_string();
            let short_hash = parts[1].to_string();
            let message = parts[2].to_string();
            let author = parts[3].to_string();
            let author_email = parts[4].to_string();
            let date = parts[5].to_string();
            let committer = parts[6].to_string();
            let refs = parts[7].to_string();
            let parents = if !parts[8].is_empty() { parts[8].split_whitespace().map(|s| s.to_string()).collect::<Vec<String>>() } else { Vec::new() };
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
                // Skip tags.
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
                "authorEmail": author_email,
                "date": date,
                "committer": committer,
                "branch": branch,
                "isHead": is_head,
                "parents": parents,
            }));
        }
    }
    Ok(serde_json::json!({ "commits": commits }))
}
/// List files changed by a specific commit.
#[command]
pub async fn cmd_git_commit_files(path: String, hash: String) -> Result<serde_json::Value, String> {
    let raw =
        run_git(path, vec!["-c".into(), "core.quotepath=false".into(), "show".into(), "--name-status".into(), "--format=".into(), hash]).await?;
    let mut files: Vec<serde_json::Value> = Vec::new();
    for line in raw.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        // Format: <STATUS>\t<path>  (e.g. "M\tfoo.txt", "A\tbar.rs")
        let mut parts = line.splitn(2, '\t');
        let status = parts.next().unwrap_or("M").trim().to_string();
        let file = match parts.next() {
            Some(f) => f.trim().to_string(),
            None => continue,
        };
        let status_desc = match status.chars().next().unwrap_or('M') {
            'M' => "modified",
            'A' => "added",
            'D' => "deleted",
            'R' => "renamed",
            'C' => "copied",
            _ => "unknown",
        };
        files.push(serde_json::json!({
            "file": file,
            "status": status,
            "statusDesc": status_desc,
        }));
    }
    Ok(serde_json::json!({ "files": files }))
}
/// Diff of a single file in a specific commit.
#[command]
pub async fn cmd_git_commit_file_diff(path: String, hash: String, file: String) -> Result<serde_json::Value, String> {
    let diff_content = run_git(
        path,
        vec![
            "-c".into(),
            "core.quotepath=false".into(),
            "show".into(),
            "--no-color".into(),
            "--no-prefix".into(),
            "--unified=3".into(),
            hash,
            "--".into(),
            file,
        ],
    )
    .await?;
    if diff_content.is_empty() {
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
}
/// Return true when `origin/<branch>` exists locally.
#[command]
pub async fn cmd_git_remote_branch_exists(path: String, branch: String) -> Result<bool, String> {
    let ref_name = format!("refs/remotes/origin/{}", branch);
    let result = run_git_allow_fail(path, vec!["show-ref".into(), "--verify".into(), "--quiet".into(), ref_name]).await;
    Ok(result.is_some())
}
/// List all local tags (`git tag --list`).
#[command]
pub async fn cmd_git_list_tags(path: String) -> Result<Vec<String>, String> {
    let raw = run_git(path, vec!["tag".into(), "--list".into()]).await?;
    Ok(lines_to_vec(&raw))
}
/// Create a tag (`git tag <name>`). An optional `message` turns it into
/// an annotated tag (`git tag -a <name> -m <message>`).
#[command]
pub async fn cmd_git_create_tag(path: String, tag: String, message: Option<String>) -> Result<String, String> {
    let name = tag.trim().to_string();
    if name.is_empty() {
        return Err("Tag name cannot be empty".to_string());
    }
    let mut args: Vec<String> = vec!["tag".into()];
    if let Some(m) = message {
        let trimmed = m.trim().to_string();
        if !trimmed.is_empty() {
            args.push("-a".into());
            args.push(name.clone());
            args.push("-m".into());
            args.push(trimmed);
        } else {
            args.push(name.clone());
        }
    } else {
        args.push(name.clone());
    }
    run_git(path, args).await?;
    Ok(format!("Tag created: {}", name))
}
/// Delete a local tag (`git tag -d <name>`).
#[command]
pub async fn cmd_git_delete_tag(path: String, tag: String) -> Result<String, String> {
    let name = tag.trim().to_string();
    if name.is_empty() {
        return Err("Tag name cannot be empty".to_string());
    }
    run_git(path, vec!["tag".into(), "-d".into(), name.clone()]).await?;
    Ok(format!("Tag deleted: {}", name))
}
/// Return true when a tag with the given name already exists locally.
#[command]
pub async fn cmd_git_tag_exists(path: String, tag: String) -> Result<bool, String> {
    let ref_name = format!("refs/tags/{}", tag);
    let result = run_git_allow_fail(path, vec!["show-ref".into(), "--verify".into(), "--quiet".into(), ref_name]).await;
    Ok(result.is_some())
}
/// Return the full list of remote branch names (with the remote prefix stripped).
#[command]
pub async fn cmd_git_all_remote_branches(path: String) -> Result<Vec<String>, String> {
    let raw = run_git(path, vec!["branch".into(), "-r".into(), "--format=%(refname:short)".into()]).await?;
    let mut names: Vec<String> = Vec::new();
    for line in raw.lines() {
        if let Some(name) = normalize_remote_branch(line) {
            names.push(name);
        }
    }
    let mut seen = std::collections::HashSet::new();
    names.retain(|n| seen.insert(n.clone()));
    Ok(names)
}
/// Return the list of local commits that are not yet pushed to `origin`.
#[command]
pub async fn cmd_git_unpushed_commits(path: String) -> Result<serde_json::Value, String> {
    let branch = run_git_allow_fail(path.clone(), vec!["rev-parse".into(), "--abbrev-ref".into(), "HEAD".into()])
        .await
        .map(|s| s.trim().to_string())
        .unwrap_or_default();
    let mut candidates: Vec<Vec<String>> = Vec::new();
    candidates.push(vec!["@{u}..HEAD".to_string()]);
    if !branch.is_empty() {
        candidates.push(vec![format!("origin/{}..HEAD", branch)]);
    }
    candidates.push(vec!["HEAD".to_string(), "--not".to_string(), "--remotes".to_string()]);
    let mut output_stdout = String::new();
    for args in &candidates {
        let mut full: Vec<String> = vec!["-c".into(), "core.quotepath=false".into(), "log".into(), "--pretty=format:%H|%h|%s|%an".into()];
        full.extend(args.iter().cloned());
        if let Some(out) = run_git_allow_fail(path.clone(), full).await {
            output_stdout = out;
            break;
        }
    }
    let mut commits: Vec<serde_json::Value> = Vec::new();
    for line in output_stdout.lines() {
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 4 {
            commits.push(serde_json::json!({
                "hash": parts[0],
                "shortHash": parts[1],
                "subject": parts[2],
                "author": parts[3],
            }));
        }
    }
    Ok(serde_json::json!({ "commits": commits }))
}
/// Push selected branches and tags to origin.
#[command]
pub async fn cmd_git_push_selected(path: String, branches: Vec<String>, tags: Vec<String>) -> Result<String, String> {
    let mut log: Vec<String> = Vec::new();
    for b in &branches {
        run_git(path.clone(), vec!["push".into(), "origin".into(), b.clone()]).await?;
        log.push(format!("branch {} pushed", b));
    }
    for t in &tags {
        run_git(path.clone(), vec!["push".into(), "origin".into(), t.clone()]).await?;
        log.push(format!("tag {} pushed", t));
    }
    if log.is_empty() {
        Ok("nothing to push".to_string())
    } else {
        Ok(log.join("; "))
    }
}
/// Count local branches that do NOT have a matching origin/<name> ref.
#[command]
pub async fn cmd_git_unpushed_branch_count(path: String) -> Result<i64, String> {
    let locals =
        run_git(path.clone(), vec!["branch".into(), "--format=%(refname:short)".into()]).await.map(|raw| lines_to_vec(&raw)).unwrap_or_default();
    let remotes: std::collections::HashSet<String> = run_git(path, vec!["branch".into(), "-r".into(), "--format=%(refname:short)".into()])
        .await
        .map(|raw| raw.lines().filter_map(normalize_remote_branch).collect())
        .unwrap_or_default();
    let count = locals.iter().filter(|b| !remotes.contains(*b)).count() as i64;
    Ok(count)
}
/// Count local tags that do NOT have a matching remote tag.
#[command]
pub async fn cmd_git_unpushed_tag_count(path: String) -> Result<i64, String> {
    let locals = run_git(path.clone(), vec!["tag".into(), "--list".into()]).await.map(|raw| lines_to_vec(&raw)).unwrap_or_default();
    if locals.is_empty() {
        return Ok(0);
    }
    let remote_tags = collect_remote_tags(path).await;
    let count = locals.iter().filter(|t| !remote_tags.contains(*t)).count() as i64;
    Ok(count)
}
/// Shared helper: read the set of tag names that exist on origin.
/// Used by both `cmd_git_unpushed_tag_count` and `cmd_git_remote_tags`.
async fn collect_remote_tags(path: String) -> std::collections::HashSet<String> {
    let raw = match run_git(path, vec!["ls-remote".into(), "--tags".into(), "origin".into()]).await {
        Ok(r) => r,
        Err(_) => return std::collections::HashSet::new(),
    };
    let mut set = std::collections::HashSet::new();
    for line in raw.lines() {
        // Format: <sha>\trefs/tags/<name>
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() < 2 {
            continue;
        }
        let r = parts[1].trim();
        if let Some(name) = r.strip_prefix("refs/tags/") {
            // Drop the "^{}" suffix for annotated tags.
            let name = name.trim_end_matches("^{}").to_string();
            if !name.is_empty() {
                set.insert(name);
            }
        }
    }
    set
}
/// Return the list of tag names that exist on `origin`.
#[command]
pub async fn cmd_git_remote_tags(path: String) -> Result<Vec<String>, String> {
    let set = collect_remote_tags(path).await;
    let mut names: Vec<String> = set.into_iter().collect();
    names.sort();
    Ok(names)
}
/// Check out a specific commit (detached HEAD).
/// `git checkout <hash>`
#[command]
pub async fn cmd_git_checkout_commit(path: String, hash: String) -> Result<String, String> {
    let h = hash.trim().to_string();
    if h.is_empty() {
        return Err("Commit hash cannot be empty".to_string());
    }
    let stdout = run_git(path, vec!["checkout".into(), h]).await?;
    Ok(format!("Checkout successful: {}", stdout))
}
/// Merge a specific commit into the current branch.
/// `git merge --no-ff <hash>`
#[command]
pub async fn cmd_git_merge_commit(path: String, hash: String) -> Result<String, String> {
    let h = hash.trim().to_string();
    if h.is_empty() {
        return Err("Commit hash cannot be empty".to_string());
    }
    let stdout = run_git(path, vec!["merge".into(), "--no-ff".into(), h]).await?;
    Ok(format!("Merge successful: {}", stdout))
}
/// Rebase the current branch onto a specific commit.
/// `git rebase <hash>`
#[command]
pub async fn cmd_git_rebase_onto(path: String, hash: String) -> Result<String, String> {
    let h = hash.trim().to_string();
    if h.is_empty() {
        return Err("Commit hash cannot be empty".to_string());
    }
    let stdout = run_git(path, vec!["rebase".into(), h]).await?;
    Ok(format!("Rebase successful: {}", stdout))
}
/// Hard-reset the current branch to a specific commit.
/// `git reset --hard <hash>`
#[command]
pub async fn cmd_git_reset_to_commit(path: String, hash: String) -> Result<String, String> {
    let h = hash.trim().to_string();
    if h.is_empty() {
        return Err("Commit hash cannot be empty".to_string());
    }
    let stdout = run_git(path, vec!["reset".into(), "--hard".into(), h]).await?;
    Ok(format!("Reset successful: {}", stdout))
}
/// Revert a specific commit by creating a new "revert" commit.
/// `git revert --no-edit <hash>`
#[command]
pub async fn cmd_git_revert_commit(path: String, hash: String) -> Result<String, String> {
    let h = hash.trim().to_string();
    if h.is_empty() {
        return Err("Commit hash cannot be empty".to_string());
    }
    let stdout = run_git(path, vec!["revert".into(), "--no-edit".into(), h]).await?;
    Ok(format!("Revert successful: {}", stdout))
}
#[command]
pub async fn cmd_git_graph(path: String) -> Result<serde_json::Value, String> {
    let raw = run_git(
        path,
        vec![
            "-c".into(),
            "core.quotepath=false".into(),
            "log".into(),
            "--all".into(),
            "--pretty=format:%H|%h|%s|%an|%ae|%ai|%cn|%d|%p".into(),
            "--topo-order".into(),
        ],
    )
    .await?;
    let mut commits: Vec<serde_json::Value> = Vec::new();
    for line in raw.lines() {
        if line.is_empty() {
            continue;
        }
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 9 {
            let full_hash = parts[0].to_string();
            let short_hash = parts[1].to_string();
            let message = parts[2].to_string();
            let author = parts[3].to_string();
            let author_email = parts[4].to_string();
            let date = parts[5].to_string();
            let committer = parts[6].to_string();
            let refs = parts[7].to_string();
            let parents: Vec<String> = if !parts[8].is_empty() { parts[8].split_whitespace().map(|s| s.to_string()).collect() } else { Vec::new() };
            let mut branches: Vec<String> = Vec::new();
            let mut tags: Vec<String> = Vec::new();
            let mut is_head = false;
            let clean = refs.trim_matches(|c| c == '(' || c == ')' || c == ' ');
            for r in clean.split(',') {
                let r = r.trim();
                if r.is_empty() {
                    continue;
                }
                if r.starts_with("HEAD -> ") {
                    is_head = true;
                    branches.push(r["HEAD -> ".len()..].trim().to_string());
                } else if r == "HEAD" {
                    is_head = true;
                } else if let Some(t) = r.strip_prefix("tag: ") {
                    tags.push(t.trim().to_string());
                } else if !r.starts_with("origin/") && !r.starts_with("refs/") {
                    branches.push(r.to_string());
                }
            }
            commits.push(serde_json::json!({
                "hash": full_hash,
                "shortHash": short_hash,
                "message": message,
                "author": author,
                "authorEmail": author_email,
                "date": date,
                "committer": committer,
                "parents": parents,
                "branches": branches,
                "tags": tags,
                "isHead": is_head,
            }));
        }
    }
    Ok(serde_json::json!({ "commits": commits }))
}
