use crate::{
    commands::{
        get_system_update_download_dir, HIPPOXOS_GITHUB_API_URL, HIPPOXOS_GITHUB_MIRROR_API_URL, HIPPOXOS_GITHUB_MIRROR_RELEASES_URL,
        HIPPOXOS_GITHUB_RELEASES_URL,
    },
    commons::{cmd_cmd, get_app_version, HttpClient},
};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tauri::command;
/// Base filename prefix
const FILE_BASE_PREFIX: &str = "hippoxos";
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
/// Get current platform
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
/// Get current architecture
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
/// Fetch latest release from GitHub with fallback to mirror
async fn fetch_latest_release() -> Result<GitHubRelease, String> {
    let http_client = HttpClient::new();
    match fetch_release_from_url(&http_client, HIPPOXOS_GITHUB_API_URL).await {
        Ok(release) => {
            log::info!("Successfully fetched release from GitHub API");
            return Ok(release);
        }
        Err(e) => {
            log::warn!("GitHub API failed: {}, trying mirror...", e);
        }
    }
    match fetch_release_from_url(&http_client, HIPPOXOS_GITHUB_MIRROR_API_URL).await {
        Ok(release) => {
            log::info!("Successfully fetched release from mirror");
            Ok(release)
        }
        Err(e) => {
            log::error!("Both GitHub API and mirror failed: {}", e);
            Err(format!("Failed to fetch release info: {}", e))
        }
    }
}
/// Fetch release from a specific URL
async fn fetch_release_from_url(http_client: &HttpClient, url: &str) -> Result<GitHubRelease, String> {
    let json_value = http_client.fetch_json(url, None).await.map_err(|e| format!("HTTP request failed: {}", e))?;
    let release: GitHubRelease = serde_json::from_value(json_value).map_err(|e| format!("Failed to parse release data: {}", e))?;
    Ok(release)
}
/// Extract version and download URL from assets
fn extract_platform_asset(release: &GitHubRelease, platform: &str, arch: &str) -> Option<(String, Option<String>)> {
    let ext = match platform {
        PLATFORM_NAME_WINDOWS => PLATFORM_WINDOWS_EXT,
        PLATFORM_NAME_MACOS => PLATFORM_MACOS_EXT,
        PLATFORM_NAME_LINUX => PLATFORM_LINUX_EXT,
        _ => return None,
    };
    let exact_pattern = format!("{}_{}_{}_v", FILE_BASE_PREFIX, platform, arch);
    for asset in &release.assets {
        let asset_name = asset.name.to_lowercase();
        if asset_name.starts_with(&exact_pattern) && asset_name.ends_with(ext) {
            let version = asset_name[exact_pattern.len()..].trim_end_matches(ext);
            if !version.is_empty() {
                return Some((version.to_string(), Some(asset.browser_download_url.clone())));
            }
        }
    }
    None
}
/// Compare two version strings
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
    let current_version = get_app_version();
    let platform = get_current_platform();
    let arch = get_current_arch();
    let release = match fetch_latest_release().await {
        Ok(r) => r,
        Err(e) => {
            log::error!("Failed to fetch release: {}", e);
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
    let (latest_version, download_url) = extract_platform_asset(&release, &platform, &arch).unwrap_or_else(|| (current_version.clone(), None));
    let has_update = compare_versions(&current_version, &latest_version);
    Ok(VersionInfo { current_version, latest_version, has_update, platform, arch, download_url })
}
/// Get current app version only
#[command]
pub fn cmd_get_app_version() -> Result<String, String> {
    Ok(get_app_version())
}
/// Get download directory path
fn get_download_dir() -> Result<PathBuf, String> {
    get_system_update_download_dir()
}
/// Download and install update
#[command]
pub async fn cmd_download_and_install_update(download_url: String) -> Result<(), String> {
    log::info!("Starting download from: {}", download_url);
    // Get filename from URL
    let filename = download_url.split('/').last().unwrap_or("installer.msi").to_string();
    // Get download directory
    let download_dir = get_download_dir()?;
    let file_path = download_dir.join(&filename);
    // Download using HttpClient
    let http_client = HttpClient::new();
    let bytes = http_client.fetch_bytes(&download_url, None).await.map_err(|e| format!("Download failed: {}", e))?;
    // Write to file
    let mut file = File::create(&file_path).map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(&bytes).map_err(|e| format!("Failed to write file: {}", e))?;
    file.flush().map_err(|e| format!("Failed to flush file: {}", e))?;
    log::info!("Download completed: {:?}", file_path);
    // Run installer
    let path_str = file_path.to_str().ok_or_else(|| "Invalid installer path".to_string())?;
    if cfg!(target_os = "windows") {
        let mut cmd = cmd_cmd();
        let output =
            cmd.args(&["/c", "msiexec", "/i", path_str, "/quiet", "/norestart"]).output().map_err(|e| format!("Failed to run installer: {}", e))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Installer failed: {}", stderr));
        }
    } else {
        #[cfg(not(target_os = "windows"))]
        {
            open::that(&file_path).map_err(|e| format!("Failed to open installer: {}", e))?;
        }
    }
    log::info!("Installer started successfully");
    // Wait and exit
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
    std::process::exit(0);
    #[allow(unreachable_code)]
    Ok(())
}
