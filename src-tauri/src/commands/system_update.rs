use serde::{Deserialize, Serialize};
use tauri::command;
/// GitHub API endpoint for latest release
const GITHUB_API_URL: &str = "https://api.github.com/repos/HippoxHQ/hippoxOS/releases/latest";
/// GitHub releases page URL
const GITHUB_RELEASES_URL: &str = "https://github.com/HippoxHQ/hippoxOS/releases/latest";
/// Release tag prefix format: hippoxOS_vx.x.x
const RELEASE_TAG_PREFIX: &str = "hippoxOS_v";
/// Platform-specific file patterns (full filename prefix)
const PLATFORM_WINDOWS_PATTERN: &str = "hippoxOS_windows_v";
const PLATFORM_MACOS_PATTERN: &str = "hippoxOS_macos_v";
const PLATFORM_LINUX_PATTERN: &str = "hippoxOS_linux_v";
/// Platform-specific file extensions
const PLATFORM_WINDOWS_EXT: &str = ".msi";
const PLATFORM_MACOS_EXT: &str = ".dmg";
const PLATFORM_LINUX_EXT: &str = ".deb";
/// Platform names for display
const PLATFORM_NAME_WINDOWS: &str = "windows";
const PLATFORM_NAME_MACOS: &str = "macos";
const PLATFORM_NAME_LINUX: &str = "linux";
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionInfo {
    pub current_version: String,
    pub latest_version: String,
    pub has_update: bool,
    pub platform: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitHubRelease {
    pub tag_name: String,
    pub body: String,
    pub assets: Vec<ReleaseAsset>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReleaseAsset {
    pub name: String,
    pub browser_download_url: String,
}
/// Get current app version from Cargo environment variable
pub fn get_current_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}
/// Get current platform using cfg macros
pub fn get_current_platform() -> String {
    if cfg!(target_os = "windows") {
        PLATFORM_NAME_WINDOWS.to_string()
    } else if cfg!(target_os = "macos") {
        PLATFORM_NAME_MACOS.to_string()
    } else if cfg!(target_os = "linux") {
        PLATFORM_NAME_LINUX.to_string()
    } else {
        "unknown".to_string()
    }
}
/// Get platform file pattern for current platform
pub fn get_platform_pattern() -> String {
    let platform = get_current_platform();
    match platform.as_str() {
        PLATFORM_NAME_WINDOWS => PLATFORM_WINDOWS_PATTERN.to_string(),
        PLATFORM_NAME_MACOS => PLATFORM_MACOS_PATTERN.to_string(),
        PLATFORM_NAME_LINUX => PLATFORM_LINUX_PATTERN.to_string(),
        _ => format!("hippoxOS_{}_v", platform),
    }
}
/// Get platform file extension for current platform
pub fn get_platform_extension() -> String {
    let platform = get_current_platform();
    match platform.as_str() {
        PLATFORM_NAME_WINDOWS => PLATFORM_WINDOWS_EXT.to_string(),
        PLATFORM_NAME_MACOS => PLATFORM_MACOS_EXT.to_string(),
        PLATFORM_NAME_LINUX => PLATFORM_LINUX_EXT.to_string(),
        _ => String::new(),
    }
}
/// Fetch latest release from GitHub
async fn fetch_latest_release() -> Result<GitHubRelease, String> {
    let client = reqwest::Client::new();
    let response = client
        .get(GITHUB_API_URL)
        .header("User-Agent", "HippoxOS-App")
        .header("Accept", "application/vnd.github.v3+json")
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Failed to fetch release info: {}", e))?;
    // Handle 404 gracefully - no release yet
    if response.status() == 404 {
        return Err("No release found".to_string());
    }
    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        return Err(format!("GitHub API error: {} - {}", status, text));
    }
    let release: GitHubRelease = response.json().await.map_err(|e| format!("Failed to parse response: {}", e))?;
    Ok(release)
}
/// Extract version from tag_name
/// Format: hippoxOS_vx.x.x -> x.x.x
fn extract_version_from_tag(tag: &str) -> Option<String> {
    if let Some(version) = tag.strip_prefix(RELEASE_TAG_PREFIX) {
        if !version.is_empty() {
            return Some(version.to_string());
        }
    }
    // Fallback: remove 'v' prefix if present
    let tag = tag.trim_start_matches('v');
    if !tag.is_empty() && tag.contains('.') {
        return Some(tag.to_string());
    }
    None
}
/// Extract platform-specific version from assets
/// Format: hippoxOS_windows_vx.x.x.msi, hippoxOS_macos_vx.x.x.dmg, hippoxOS_linux_vx.x.x.deb
fn extract_platform_version_from_assets(release: &GitHubRelease, platform: &str) -> Option<String> {
    let platform_pattern = match platform {
        PLATFORM_NAME_WINDOWS => PLATFORM_WINDOWS_PATTERN,
        PLATFORM_NAME_MACOS => PLATFORM_MACOS_PATTERN,
        PLATFORM_NAME_LINUX => PLATFORM_LINUX_PATTERN,
        _ => return None,
    };
    let platform_ext = match platform {
        PLATFORM_NAME_WINDOWS => PLATFORM_WINDOWS_EXT,
        PLATFORM_NAME_MACOS => PLATFORM_MACOS_EXT,
        PLATFORM_NAME_LINUX => PLATFORM_LINUX_EXT,
        _ => return None,
    };
    for asset in &release.assets {
        let asset_name = asset.name.to_lowercase();
        // Check if asset matches platform pattern and extension
        if asset_name.contains(platform_pattern) && asset_name.ends_with(platform_ext) {
            // Extract version: hippoxOS_windows_v1.0.0.msi -> 1.0.0
            if let Some(start) = asset_name.find(platform_pattern) {
                let rest = &asset_name[start + platform_pattern.len()..];
                // Remove extension
                let version_part = rest.trim_end_matches(platform_ext);
                if !version_part.is_empty() {
                    return Some(version_part.to_string());
                }
            }
        }
    }
    None
}
/// Extract platform-specific version from release body
fn extract_platform_version_from_body(release: &GitHubRelease, platform: &str) -> Option<String> {
    let platform_pattern = match platform {
        PLATFORM_NAME_WINDOWS => PLATFORM_WINDOWS_PATTERN,
        PLATFORM_NAME_MACOS => PLATFORM_MACOS_PATTERN,
        PLATFORM_NAME_LINUX => PLATFORM_LINUX_PATTERN,
        _ => return None,
    };
    let body = release.body.to_lowercase();
    for line in body.lines() {
        let line_lower = line.to_lowercase();
        if line_lower.contains(platform_pattern) {
            if let Some(start) = line_lower.find(platform_pattern) {
                let rest = &line_lower[start + platform_pattern.len()..];
                if let Some(end) = rest.find(|c: char| !c.is_ascii_digit() && c != '.') {
                    let version = &rest[..end];
                    if !version.is_empty() {
                        return Some(version.to_string());
                    }
                }
            }
        }
    }
    None
}
/// Extract platform-specific version from release body or assets
fn extract_platform_version(release: &GitHubRelease, platform: &str) -> Option<String> {
    // Priority 1: Try to find from assets
    if let Some(version) = extract_platform_version_from_assets(release, platform) {
        return Some(version);
    }
    // Priority 2: Try to find from body
    if let Some(version) = extract_platform_version_from_body(release, platform) {
        return Some(version);
    }
    // Priority 3: Fallback to tag version
    extract_version_from_tag(&release.tag_name)
}
/// Compare two version strings (supports semantic versioning)
fn compare_versions(current: &str, latest: &str) -> bool {
    let parse_version = |v: &str| -> Vec<u32> {
        v.trim().split(|c: char| !c.is_ascii_digit()).filter(|s| !s.is_empty()).filter_map(|s| s.parse::<u32>().ok()).collect()
    };
    let current_parts = parse_version(current);
    let latest_parts = parse_version(latest);
    for (c, l) in current_parts.iter().zip(latest_parts.iter()) {
        if l > c {
            return true;
        } else if c > l {
            return false;
        }
    }
    latest_parts.len() > current_parts.len()
}
/// Check for version updates
#[command]
pub async fn cmd_check_version_update() -> Result<VersionInfo, String> {
    let current_version = get_current_version();
    let platform = get_current_platform();
    // Fetch latest release
    let release = match fetch_latest_release().await {
        Ok(r) => r,
        Err(_) => {
            // If no release found, return no update
            return Ok(VersionInfo {
                current_version: current_version.clone(),
                latest_version: current_version.clone(),
                has_update: false,
                platform,
            });
        }
    };
    // Get platform-specific latest version
    let latest_version = extract_platform_version(&release, &platform).unwrap_or_else(|| current_version.clone());
    let has_update = compare_versions(&current_version, &latest_version);
    Ok(VersionInfo { current_version, latest_version, has_update, platform })
}
/// Get current app version only
#[command]
pub fn cmd_get_app_version() -> Result<String, String> {
    Ok(get_current_version())
}
