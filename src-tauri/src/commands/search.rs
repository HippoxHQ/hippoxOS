use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::Mutex;
use walkdir::WalkDir;

use crate::commands::get_skills_market_dir;
use crate::common::{get_logs_dir, get_sessions_dir};

#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
    // "skill", "session", "log"
    pub category: String,
    pub id: String,
    pub title: String,
    pub description: String,
    pub path: String,
    pub timestamp: Option<String>,
    pub highlight: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    pub keyword: String,
    pub limit: Option<usize>,
}

pub struct SearchEngine {
    skills_dir: PathBuf,
    sessions_dir: PathBuf,
    logs_dir: PathBuf,
}

impl SearchEngine {
    pub fn new(skills_dir: PathBuf, sessions_dir: PathBuf, logs_dir: PathBuf) -> Self {
        Self {
            skills_dir,
            sessions_dir,
            logs_dir,
        }
    }

    async fn search_skills(&self, keyword: &str, limit: usize) -> Vec<SearchResult> {
        let keyword_lower = keyword.to_lowercase();
        let mut results = Vec::new();
        if !self.skills_dir.exists() {
            return results;
        }
        for entry in WalkDir::new(&self.skills_dir)
            .max_depth(3)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                let path = e.path();
                path.is_file()
                    && (path
                        .extension()
                        .map_or(false, |ext| ext == "md" || ext == "skill.md")
                        || path.file_name().map_or(false, |name| name == "SKILL.md"))
            })
            .take(limit * 2)
        {
            let path = entry.path();
            let file_name = path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let content = fs::read_to_string(path).unwrap_or_default();
            let description = content
                .lines()
                .find(|line| line.contains("description") || line.contains("Description"))
                .map(|line| line.to_string())
                .unwrap_or_else(|| "Not Description".to_string());
            if file_name.to_lowercase().contains(&keyword_lower)
                || description.to_lowercase().contains(&keyword_lower)
            {
                results.push(SearchResult {
                    category: "skill".to_string(),
                    id: format!("skill_{}", uuid::Uuid::new_v4()),
                    title: file_name,
                    description: description.chars().take(100).collect(),
                    path: path.display().to_string(),
                    timestamp: None,
                    highlight: None,
                });
            }
            if results.len() >= limit {
                break;
            }
        }
        results
    }

    async fn search_sessions(&self, keyword: &str, limit: usize) -> Vec<SearchResult> {
        let keyword_lower = keyword.to_lowercase();
        let mut results = Vec::new();
        if !self.sessions_dir.exists() {
            return results;
        }
        for entry in WalkDir::new(&self.sessions_dir)
            .max_depth(2)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path().is_file() && e.path().extension().map_or(false, |ext| ext == "json")
            })
            .take(limit * 2)
        {
            let path = entry.path();
            let metadata = fs::metadata(path).ok();
            let timestamp = metadata.and_then(|m| m.modified().ok()).map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs()
                    .to_string()
            });
            let content = fs::read_to_string(path).unwrap_or_default();
            let session_name = path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            if session_name.to_lowercase().contains(&keyword_lower)
                || content.to_lowercase().contains(&keyword_lower)
            {
                let highlight = if content.to_lowercase().contains(&keyword_lower) {
                    content
                        .lines()
                        .find(|line| line.to_lowercase().contains(&keyword_lower))
                        .map(|line| {
                            let trimmed = line.trim();
                            if trimmed.len() > 80 {
                                format!("{}...", &trimmed[..80])
                            } else {
                                trimmed.to_string()
                            }
                        })
                } else {
                    None
                };
                results.push(SearchResult {
                    category: "session".to_string(),
                    id: format!("session_{}", session_name),
                    title: session_name,
                    description: format!(
                        "session file - {}",
                        path.file_name().unwrap_or_default().to_string_lossy()
                    ),
                    path: path.display().to_string(),
                    timestamp,
                    highlight,
                });
            }
            if results.len() >= limit {
                break;
            }
        }

        results
    }

    async fn search_logs(&self, keyword: &str, limit: usize) -> Vec<SearchResult> {
        let keyword_lower = keyword.to_lowercase();
        let mut results = Vec::new();
        if !self.logs_dir.exists() {
            return results;
        }
        for entry in WalkDir::new(&self.logs_dir)
            .max_depth(2)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path().is_file() && e.path().extension().map_or(false, |ext| ext == "log")
            })
            .take(limit * 2)
        {
            let path = entry.path();
            let metadata = fs::metadata(path).ok();
            let timestamp = metadata.and_then(|m| m.modified().ok()).map(|t| {
                t.duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs()
                    .to_string()
            });
            let content = fs::read_to_string(path).unwrap_or_default();
            let log_name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            if content.to_lowercase().contains(&keyword_lower) {
                let highlight = content
                    .lines()
                    .find(|line| line.to_lowercase().contains(&keyword_lower))
                    .map(|line| {
                        let trimmed = line.trim();
                        if trimmed.len() > 100 {
                            format!("{}...", &trimmed[..100])
                        } else {
                            trimmed.to_string()
                        }
                    });
                results.push(SearchResult {
                    category: "log".to_string(),
                    id: format!("log_{}", uuid::Uuid::new_v4()),
                    title: log_name,
                    description: format!("log file - size: {} bytes", content.len()),
                    path: path.display().to_string(),
                    timestamp,
                    highlight,
                });
            }
            if results.len() >= limit {
                break;
            }
        }

        results
    }

    pub async fn search_all(&self, keyword: &str, limit: usize) -> Vec<SearchResult> {
        if keyword.trim().is_empty() {
            return Vec::new();
        }
        let limit_per_source = limit / 3 + 1;
        let (skills, sessions, logs) = tokio::join!(
            self.search_skills(keyword, limit_per_source),
            self.search_sessions(keyword, limit_per_source),
            self.search_logs(keyword, limit_per_source)
        );
        let mut all_results = Vec::new();
        all_results.extend(skills);
        all_results.extend(sessions);
        all_results.extend(logs);
        all_results.truncate(limit);
        all_results
    }
}

#[tauri::command]
pub async fn cmd_search_content(request: SearchRequest) -> Result<Vec<SearchResult>, String> {
    let skills_dir = get_skills_market_dir();
    let sessions_dir = get_sessions_dir();
    let logs_dir = get_logs_dir();
    let engine = SearchEngine::new(skills_dir, sessions_dir, logs_dir);
    let results = engine
        .search_all(&request.keyword, request.limit.unwrap_or(30))
        .await;
    Ok(results)
}
