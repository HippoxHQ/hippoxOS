use crate::{
    commands::{HIPPOX_GITHUB_API_URL, HIPPOX_GITHUB_MIRROR_API_URL},
    commons::HttpClient,
};
use serde_json::json;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::command;
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct GitHubRelease {
    pub tag_name: String,
    pub assets: Vec<ReleaseAsset>,
}
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ReleaseAsset {
    pub name: String,
    pub browser_download_url: String,
}
/// Fetch latest release from GitHub with fallback to mirror
async fn fetch_latest_release() -> Result<GitHubRelease, String> {
    let http_client = HttpClient::new();
    // Try primary GitHub API first
    match fetch_release_from_url(&http_client, HIPPOX_GITHUB_API_URL).await {
        Ok(release) => {
            log::info!("Successfully fetched hippox release from GitHub API");
            return Ok(release);
        }
        Err(e) => {
            log::warn!("GitHub API failed: {}, trying mirror...", e);
        }
    }
    // Fallback to mirror
    match fetch_release_from_url(&http_client, HIPPOX_GITHUB_MIRROR_API_URL).await {
        Ok(release) => {
            log::info!("Successfully fetched hippox release from mirror (git.bdnb.cn)");
            Ok(release)
        }
        Err(e) => {
            log::error!("Both GitHub API and mirror failed: {}", e);
            Err(format!("Failed to fetch release info from all sources: {}", e))
        }
    }
}
/// Fetch release from a specific URL using HttpClient
async fn fetch_release_from_url(http_client: &HttpClient, url: &str) -> Result<GitHubRelease, String> {
    let json_value = http_client.fetch_json(url, None).await.map_err(|e| format!("HTTP request failed: {}", e))?;
    let release: GitHubRelease = serde_json::from_value(json_value).map_err(|e| format!("Failed to parse release data: {}", e))?;
    Ok(release)
}
/// Extract version from tag_name (vx.x.x -> x.x.x)
fn extract_version_from_tag(tag: &str) -> String {
    tag.trim_start_matches('v').to_string()
}
/// Get hippox crate versions from GitHub releases
#[command]
pub async fn cmd_get_hippox_versions() -> Result<serde_json::Value, String> {
    let crates = vec!["hippox", "hippox-atomic-skills"];
    let mut results = serde_json::Map::new();
    // Fetch once, use same version for both
    let version = match fetch_latest_release().await {
        Ok(release) => extract_version_from_tag(&release.tag_name),
        Err(_) => "unknown".to_string(),
    };
    for name in crates {
        results.insert(name.to_string(), serde_json::Value::String(version.clone()));
    }
    Ok(serde_json::Value::Object(results))
}
/// Fetch About markdown content from GitHub
///
/// # Arguments
/// * `language` - Language code: "zh" or "en"
///
/// # Returns
/// * Markdown content as String
#[command]
pub async fn cmd_fetch_about_markdown(language: String) -> Result<String, String> {
    let http_client = HttpClient::new();
    // Determine which file to fetch based on language
    let file_name = if language == "zh" { "About_CN.md" } else { "About_EN.md" };
    // Generate timestamp to bust cache
    let timestamp = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis();
    // Use raw GitHub URL with cache-busting timestamp
    let url = format!("https://raw.githubusercontent.com/HippoxHQ/About/main/{}?t={}", file_name, timestamp);
    log::info!("Fetching about markdown from: {}", url);
    // Fetch the markdown content using HttpClient
    match http_client.fetch_text(&url, None).await {
        Ok(content) => {
            if content.trim().is_empty() {
                log::warn!("Fetched about content is empty for language: {}", language);
                return Err("Fetched content is empty".to_string());
            }
            log::info!("Successfully fetched about markdown for language: {}, size: {} bytes", language, content.len());
            Ok(content)
        }
        Err(e) => {
            log::error!("Failed to fetch about markdown for language {}: {}", language, e);
            Err(format!("Failed to fetch about markdown: {}", e))
        }
    }
}
