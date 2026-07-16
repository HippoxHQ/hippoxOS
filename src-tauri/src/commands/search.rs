use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::command;
use uuid::Uuid;
use walkdir::WalkDir;

use crate::commands::get_skills_market_dir;
use crate::commands::paths::get_dialog_history_dir;
use crate::commons::{get_logs_dir, get_sessions_dir};

#[derive(Debug, Clone, Serialize)]
pub struct SearchResult {
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageSearchResult {
    pub session_id: String,
    pub session_title: String,
    pub message_id: String,
    pub message_content: String,
    pub message_role: String,
    pub timestamp: String,
    pub highlight: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMessagesRequest {
    pub keyword: String,
    pub limit: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchMessagesResponse {
    pub results: Vec<MessageSearchResult>,
    pub total: usize,
}

fn safe_truncate(text: &str, max_len: usize) -> String {
    if text.len() <= max_len {
        return text.to_string();
    }

    let mut chars = text.chars();
    let mut result = String::new();
    let mut count = 0;

    for ch in chars.by_ref() {
        if count + ch.len_utf8() <= max_len {
            result.push(ch);
            count += ch.len_utf8();
        } else {
            break;
        }
    }

    if result.len() < text.len() {
        result.push_str("...");
    }
    result
}

fn generate_highlight(text: &str, keyword: &str) -> String {
    if text.is_empty() || keyword.is_empty() {
        return text.to_string();
    }

    let keyword_lower = keyword.to_lowercase();
    let text_lower = text.to_lowercase();

    if let Some(index) = text_lower.find(&keyword_lower) {
        let char_indices: Vec<(usize, char)> = text.char_indices().collect();

        let mut start_char_idx = 0;
        for (i, (byte_idx, _)) in char_indices.iter().enumerate() {
            if *byte_idx >= index {
                start_char_idx = i;
                break;
            }
        }

        let keyword_char_len = keyword.chars().count();
        let end_char_idx = (start_char_idx + keyword_char_len).min(char_indices.len());

        let snippet_start = start_char_idx.saturating_sub(30);
        let snippet_end = (end_char_idx + 30).min(char_indices.len());

        let mut snippet = String::new();
        if snippet_start > 0 {
            snippet.push_str("...");
        }

        for (i, (_, ch)) in char_indices.iter().enumerate().take(snippet_end).skip(snippet_start) {
            snippet.push(*ch);
        }

        if snippet_end < char_indices.len() {
            snippet.push_str("...");
        }

        snippet
    } else {
        safe_truncate(text, 100)
    }
}

fn parse_skill_name_from_markdown(content: &str, default_name: &str) -> String {
    if content.starts_with("---") {
        if let Some(end_idx) = content[3..].find("---") {
            let frontmatter = &content[3..3 + end_idx];
            for line in frontmatter.lines() {
                if let Some(colon_idx) = line.find(':') {
                    let key = line[..colon_idx].trim();
                    let value = line[colon_idx + 1..].trim();
                    if key == "name" && !value.is_empty() {
                        return value.to_string();
                    }
                }
            }
        }
    }
    default_name.to_string()
}

fn parse_skill_description_from_markdown(content: &str, default_desc: &str) -> String {
    if content.starts_with("---") {
        if let Some(end_idx) = content[3..].find("---") {
            let frontmatter = &content[3..3 + end_idx];
            for line in frontmatter.lines() {
                if let Some(colon_idx) = line.find(':') {
                    let key = line[..colon_idx].trim();
                    let value = line[colon_idx + 1..].trim();
                    if key == "description" && !value.is_empty() {
                        return value.to_string();
                    }
                }
            }
        }
    }
    default_desc.to_string()
}

fn extract_chat_content(content: &str) -> String {
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(content) {
        if let Some(chat_response) = json.get("chatResponse") {
            if let Some(m) = chat_response.get("m").and_then(|v| v.as_str()) {
                return m.to_string();
            }
        }
        if let Some(terminal) = json.get("terminalResponse") {
            if let Some(m) = terminal.get("m").and_then(|v| v.as_str()) {
                if !m.is_empty() {
                    return m.to_string();
                }
            }
        }
        if let Some(metrics) = json.get("metrics") {
            if let Some(metrics_array) = metrics.as_array() {
                let mut result = Vec::new();
                for metric in metrics_array {
                    if let Some(key) = metric.get("key").and_then(|v| v.as_str()) {
                        if let Some(value) = metric.get("value") {
                            let value_str = if value.is_number() {
                                value.to_string()
                            } else if let Some(s) = value.as_str() {
                                s.to_string()
                            } else {
                                "".to_string()
                            };
                            if !value_str.is_empty() {
                                let mut item = format!("{}: {}", key, value_str);
                                if let Some(unit) = metric.get("unit").and_then(|v| v.as_str()) {
                                    if !unit.is_empty() {
                                        item.push_str(&format!(" {}", unit));
                                    }
                                }
                                result.push(item);
                            }
                        }
                    }
                }
                if !result.is_empty() {
                    return result.join("  ");
                }
            }
        }
        if let Some(status) = json.get("status").and_then(|v| v.as_str()) {
            if let Some(message) = json.get("message").and_then(|v| v.as_str()) {
                if !message.is_empty() {
                    return format!("{}: {}", status, message);
                }
            }
        }
    }

    if content.len() > 200 {
        format!("{}...", &content[..200])
    } else {
        content.to_string()
    }
}

fn get_message_preview(content: &str, max_len: usize) -> String {
    let extracted = extract_chat_content(content);
    if extracted.len() > max_len {
        safe_truncate(&extracted, max_len)
    } else {
        extracted
    }
}

pub struct SearchEngine {
    skills_dir: PathBuf,
    sessions_dir: PathBuf,
    logs_dir: PathBuf,
}

impl SearchEngine {
    pub fn new(skills_dir: PathBuf, sessions_dir: PathBuf, logs_dir: PathBuf) -> Self {
        Self { skills_dir, sessions_dir, logs_dir }
    }

    async fn search_skills(&self, keyword: &str, limit: usize) -> Vec<SearchResult> {
        let keyword_lower = keyword.to_lowercase();
        let mut results = Vec::new();
        if !self.skills_dir.exists() {
            return results;
        }
        for entry in WalkDir::new(&self.skills_dir)
            .max_depth(4)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| {
                let path = e.path();
                path.is_file() && path.file_name().map_or(false, |name| name == "SKILL.md")
            })
            .take(limit * 2)
        {
            let path = entry.path();
            let content = fs::read_to_string(path).unwrap_or_default();

            let skill_name = parse_skill_name_from_markdown(
                &content,
                &path.parent().and_then(|p| p.file_name()).map(|n| n.to_string_lossy().to_string()).unwrap_or_else(|| "unknown".to_string()),
            );

            let skill_description = parse_skill_description_from_markdown(&content, "No description available");

            let name_lower = skill_name.to_lowercase();
            let desc_lower = skill_description.to_lowercase();

            if name_lower.contains(&keyword_lower) || desc_lower.contains(&keyword_lower) {
                let highlight = if desc_lower.contains(&keyword_lower) { Some(generate_highlight(&skill_description, keyword)) } else { None };

                results.push(SearchResult {
                    category: "skill".to_string(),
                    id: format!("skill_{}", Uuid::new_v4()),
                    title: skill_name,
                    description: safe_truncate(&skill_description, 150),
                    path: path.display().to_string(),
                    timestamp: None,
                    highlight,
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
            .filter(|e| e.path().is_file() && e.path().extension().map_or(false, |ext| ext == "json"))
            .take(limit * 2)
        {
            let path = entry.path();
            let metadata = fs::metadata(path).ok();
            let timestamp =
                metadata.and_then(|m| m.modified().ok()).map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs().to_string());
            let content = fs::read_to_string(path).unwrap_or_default();
            let session_name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
            if session_name.to_lowercase().contains(&keyword_lower) || content.to_lowercase().contains(&keyword_lower) {
                let highlight = if content.to_lowercase().contains(&keyword_lower) {
                    content.lines().find(|line| line.to_lowercase().contains(&keyword_lower)).map(|line| {
                        let trimmed = line.trim();
                        safe_truncate(trimmed, 80)
                    })
                } else {
                    None
                };
                results.push(SearchResult {
                    category: "session".to_string(),
                    id: format!("session_{}", session_name),
                    title: session_name,
                    description: format!("session file - {}", path.file_name().unwrap_or_default().to_string_lossy()),
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
            .filter(|e| e.path().is_file() && e.path().extension().map_or(false, |ext| ext == "log"))
            .take(limit * 2)
        {
            let path = entry.path();
            let metadata = fs::metadata(path).ok();
            let timestamp =
                metadata.and_then(|m| m.modified().ok()).map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs().to_string());
            let content = fs::read_to_string(path).unwrap_or_default();
            let log_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            if content.to_lowercase().contains(&keyword_lower) {
                let highlight = content.lines().find(|line| line.to_lowercase().contains(&keyword_lower)).map(|line| {
                    let trimmed = line.trim();
                    safe_truncate(trimmed, 100)
                });
                results.push(SearchResult {
                    category: "log".to_string(),
                    id: format!("log_{}", Uuid::new_v4()),
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

fn read_session_config(session_dir: &PathBuf) -> Result<serde_json::Value, String> {
    let config_path = session_dir.join("config.json");
    if !config_path.exists() {
        return Ok(serde_json::json!({}));
    }
    let content = fs::read_to_string(&config_path).map_err(|e| format!("Failed to read config: {}", e))?;
    let config: serde_json::Value = serde_json::from_str(&content).map_err(|e| format!("Failed to parse config: {}", e))?;
    Ok(config)
}

fn read_session_chat(session_dir: &PathBuf) -> Result<Vec<serde_json::Value>, String> {
    let chat_path = session_dir.join("chat.json");
    if !chat_path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&chat_path).map_err(|e| format!("Failed to read chat: {}", e))?;
    let messages: Vec<serde_json::Value> = serde_json::from_str(&content).unwrap_or_else(|_| vec![]);
    Ok(messages)
}

#[command]
pub async fn cmd_search_messages(request: SearchMessagesRequest) -> Result<SearchMessagesResponse, String> {
    let keyword = request.keyword.trim();
    if keyword.is_empty() {
        return Ok(SearchMessagesResponse { results: vec![], total: 0 });
    }

    let limit = request.limit.unwrap_or(50);
    let dialog_dir = get_dialog_history_dir();

    if !dialog_dir.exists() {
        return Ok(SearchMessagesResponse { results: vec![], total: 0 });
    }

    let mut all_results = Vec::new();
    let keyword_lower = keyword.to_lowercase();

    for entry in fs::read_dir(&dialog_dir).map_err(|e| format!("Failed to read dialog history dir: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let session_dir = entry.path();

        if !session_dir.is_dir() {
            continue;
        }

        let session_id = session_dir.file_name().unwrap_or_default().to_string_lossy().to_string();

        let config = read_session_config(&session_dir)?;
        let session_title = config.get("title").and_then(|v| v.as_str()).unwrap_or(&session_id).to_string();

        let messages = read_session_chat(&session_dir)?;

        for msg in messages {
            let content = msg.get("content").and_then(|v| v.as_str()).unwrap_or("").to_string();

            if content.is_empty() {
                continue;
            }

            let content_lower = content.to_lowercase();
            if content_lower.contains(&keyword_lower) {
                let display_content = get_message_preview(&content, 150);
                let highlight = generate_highlight(&display_content, keyword);

                let message_id = msg.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                let message_role = msg.get("role").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
                let timestamp = msg.get("timestamp").and_then(|v| v.as_str()).unwrap_or("").to_string();

                all_results.push(MessageSearchResult {
                    session_id: session_id.clone(),
                    session_title: session_title.clone(),
                    message_id,
                    message_content: display_content,
                    message_role,
                    timestamp,
                    highlight,
                });
            }
        }
    }

    all_results.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

    let total = all_results.len();
    let results = if all_results.len() > limit {
        all_results.truncate(limit);
        all_results
    } else {
        all_results
    };

    Ok(SearchMessagesResponse { results, total })
}

#[command]
pub async fn cmd_search_messages_formatted(request: SearchMessagesRequest) -> Result<Vec<SearchResult>, String> {
    let response = cmd_search_messages(request).await?;
    let mut formatted = Vec::new();

    for result in response.results {
        formatted.push(SearchResult {
            category: "message".to_string(),
            id: result.message_id,
            title: result.session_title,
            description: result.highlight.clone(),
            path: result.session_id.clone(),
            timestamp: Some(result.timestamp),
            highlight: Some(result.highlight),
        });
    }

    Ok(formatted)
}

#[command]
pub async fn cmd_search_content(request: SearchRequest) -> Result<Vec<SearchResult>, String> {
    let skills_dir = get_skills_market_dir();
    let sessions_dir = get_sessions_dir();
    let logs_dir = get_logs_dir();
    let engine = SearchEngine::new(skills_dir, sessions_dir, logs_dir);
    let results = engine.search_all(&request.keyword, request.limit.unwrap_or(30)).await;
    Ok(results)
}

#[command]
pub async fn cmd_search_all(request: SearchRequest) -> Result<Vec<SearchResult>, String> {
    let keyword = request.keyword.trim();
    if keyword.is_empty() {
        return Ok(vec![]);
    }

    let limit = request.limit.unwrap_or(30);

    let (existing_results, message_results) = tokio::join!(
        async {
            let skills_dir = get_skills_market_dir();
            let sessions_dir = get_sessions_dir();
            let logs_dir = get_logs_dir();
            let engine = SearchEngine::new(skills_dir, sessions_dir, logs_dir);
            engine.search_all(keyword, limit).await
        },
        async {
            let msg_request = SearchMessagesRequest { keyword: keyword.to_string(), limit: Some(limit) };
            cmd_search_messages_formatted(msg_request).await.unwrap_or_else(|_| vec![])
        }
    );

    let mut all_results = Vec::new();
    all_results.extend(message_results);
    all_results.extend(existing_results);
    all_results.truncate(limit);

    Ok(all_results)
}
