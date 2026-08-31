use crate::{
    commands::{HIPPOXOS_GITHUB_API_URL, HIPPOXOS_GITHUB_MIRROR_API_URL, HIPPOXOS_GITHUB_MIRROR_RELEASES_URL, HIPPOXOS_GITHUB_RELEASES_URL},
    commons::HttpClient,
};
use serde::{Deserialize, Serialize};
use tauri::command;
/// Base filename prefix (without platform and arch)
const FILE_BASE_PREFIX: &str = "hippoxOS";
/// Platform names
const PLATFORM_NAME_WINDOWS: &str = "windows";
const PLATFORM_NAME_MACOS: &str = "macos";
const PLATFORM_NAME_LINUX: &str = "linux";
/// Architecture names
const ARCH_X86_64: &str = "x86_64";
const ARCH_AARCH64: &str = "aarch64";
const ARCH_ARM64: &str = "arm64";
const ARCH_X86: &str = "x86";
/// Platform-specific file extensions
const PLATFORM_WINDOWS_EXT: &str = ".msi";
const PLATFORM_MACOS_EXT: &str = ".dmg";
const PLATFORM_LINUX_EXT: &str = ".deb";
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VersionInfo {
    pub current_version: String,
    pub latest_version: String,
    pub has_update: bool,
    pub platform: String,
    pub arch: String,
    pub download_url: Option<String>,
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
/// Get current architecture using cfg macros
pub fn get_current_arch() -> String {
    if cfg!(target_arch = "x86_64") {
        ARCH_X86_64.to_string()
    } else if cfg!(target_arch = "aarch64") {
        ARCH_AARCH64.to_string()
    } else if cfg!(target_arch = "arm") {
        ARCH_ARM64.to_string()
    } else if cfg!(target_arch = "x86") {
        ARCH_X86.to_string()
    } else {
        "unknown".to_string()
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
/// Fetch latest release from GitHub with fallback to mirror
async fn fetch_latest_release() -> Result<GitHubRelease, String> {
    let http_client = HttpClient::new();
    // Try primary GitHub API first
    match fetch_release_from_url(&http_client, HIPPOXOS_GITHUB_API_URL).await {
        Ok(release) => {
            log::info!("Successfully fetched release from GitHub API");
            return Ok(release);
        }
        Err(e) => {
            log::warn!("GitHub API failed: {}, trying mirror...", e);
        }
    }
    // Fallback to mirror
    match fetch_release_from_url(&http_client, HIPPOXOS_GITHUB_MIRROR_API_URL).await {
        Ok(release) => {
            log::info!("Successfully fetched release from mirror (git.bdnb.cn)");
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
/// Extract version and download URL from assets with platform and architecture support
///
/// Returns: Option<(version_string, download_url)>
/// - version_string: The extracted version number
/// - download_url: The URL to download the matching asset (None if not found)
fn extract_platform_asset(release: &GitHubRelease, platform: &str, arch: &str) -> Option<(String, Option<String>)> {
    // Get the appropriate file extension for this platform
    let ext = match platform {
        PLATFORM_NAME_WINDOWS => PLATFORM_WINDOWS_EXT,
        PLATFORM_NAME_MACOS => PLATFORM_MACOS_EXT,
        PLATFORM_NAME_LINUX => PLATFORM_LINUX_EXT,
        _ => return None,
    };
    // Build the expected filename pattern: hippoxOS_{platform}_{arch}_v
    let exact_pattern = format!("{}_{}_{}_v", FILE_BASE_PREFIX, platform, arch);
    // Search through all assets in the release
    for asset in &release.assets {
        let asset_name = asset.name.to_lowercase();
        // Check if this asset matches our platform and architecture pattern
        if asset_name.starts_with(&exact_pattern) && asset_name.ends_with(ext) {
            // Extract the version from the filename
            // Example: hippoxOS_windows_x86_64_v1.0.0.msi -> 1.0.0
            let version = asset_name[exact_pattern.len()..].trim_end_matches(ext);
            if !version.is_empty() {
                return Some((version.to_string(), Some(asset.browser_download_url.clone())));
            }
        }
        // Backward compatibility: Try legacy format hippoxOS_{platform}_v{version}.{ext}
        // Only for x86_64 architecture
        if arch == ARCH_X86_64 {
            let legacy_pattern = format!("{}_{}_v", FILE_BASE_PREFIX, platform);
            if asset_name.starts_with(&legacy_pattern) && asset_name.ends_with(ext) {
                let version = asset_name[legacy_pattern.len()..].trim_end_matches(ext);
                if !version.is_empty() {
                    return Some((version.to_string(), Some(asset.browser_download_url.clone())));
                }
            }
        }
    }
    // No matching asset found
    None
}
/// Extract version from tag_name (fallback method)
/// Format: hippoxOS_vx.x.x -> x.x.x
fn extract_version_from_tag(tag: &str) -> Option<String> {
    // Try to find version in tag
    if let Some(version) = tag.strip_prefix("hippoxOS_v") {
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
/// Compare two version strings (supports semantic versioning)
/// Returns true if latest > current
fn compare_versions(current: &str, latest: &str) -> bool {
    // Parse version string into vector of numbers
    let parse_version = |v: &str| -> Vec<u32> {
        v.trim().split(|c: char| !c.is_ascii_digit()).filter(|s| !s.is_empty()).filter_map(|s| s.parse::<u32>().ok()).collect()
    };
    let current_parts = parse_version(current);
    let latest_parts = parse_version(latest);
    // Compare each part
    for (c, l) in current_parts.iter().zip(latest_parts.iter()) {
        if l > c {
            return true;
        } else if c > l {
            return false;
        }
    }
    // If all parts are equal, the one with more parts is considered newer
    latest_parts.len() > current_parts.len()
}
/// Check for version updates with architecture support
#[command]
pub async fn cmd_check_version_update() -> Result<VersionInfo, String> {
    let current_version = get_current_version();
    let platform = get_current_platform();
    let arch = get_current_arch();
    // Fetch the latest release from GitHub (with mirror fallback)
    let release = match fetch_latest_release().await {
        Ok(r) => r,
        Err(e) => {
            log::error!("Failed to fetch release from all sources: {}", e);
            // Return no update on complete failure
            return Ok(VersionInfo {
                current_version: current_version.clone(),
                latest_version: current_version.clone(),
                has_update: false,
                platform,
                arch: arch.clone(),
                download_url: None,
            });
        }
    };
    // Try to find matching asset for this platform and architecture
    let (latest_version, download_url) = extract_platform_asset(&release, &platform, &arch).unwrap_or_else(|| (current_version.clone(), None));
    // Compare versions to determine if update is available
    let has_update = compare_versions(&current_version, &latest_version);
    Ok(VersionInfo { current_version, latest_version, has_update, platform, arch, download_url })
}
/// Get current app version only
#[command]
pub fn cmd_get_app_version() -> Result<String, String> {
    Ok(get_current_version())
}
/// Get the appropriate download URL based on where the release was fetched from
/// This helps users download from the correct source
pub fn get_release_url(use_mirror: bool) -> &'static str {
    if use_mirror {
        HIPPOXOS_GITHUB_MIRROR_RELEASES_URL
    } else {
        HIPPOXOS_GITHUB_RELEASES_URL
    }
}
