use crate::{
    commands::{
        get_system_update_download_dir, HIPPOXOS_GITHUB_API_URL, HIPPOXOS_GITHUB_MIRROR_API_URL, HIPPOXOS_GITHUB_MIRROR_RELEASES_URL,
        HIPPOXOS_GITHUB_RELEASES_URL,
    },
    commons::{get_app_version, HttpClient},
};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{command, AppHandle, Emitter};
const FILE_BASE_PREFIX: &str = "hippoxos";
const PLATFORM_NAME_WINDOWS: &str = "windows";
const PLATFORM_NAME_MACOS: &str = "macos";
const PLATFORM_NAME_LINUX: &str = "linux";
const ARCH_X86_64: &str = "x86_64";
const ARCH_AARCH64: &str = "aarch64";
const ARCH_ARM64: &str = "arm64";
const ARCH_X86: &str = "x86";
const PLATFORM_WINDOWS_EXT: &str = ".msi";
const PLATFORM_MACOS_EXT: &str = ".dmg";
const PLATFORM_LINUX_EXT: &str = ".deb";
const UPDATE_PROGRESS_EVENT: &str = "update-download-progress";
static UPDATE_CANCEL_FLAG: AtomicBool = AtomicBool::new(false);
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
    let expected_name = format!("{}_{}_{}{}", FILE_BASE_PREFIX, platform, arch, ext).to_lowercase();
    for asset in &release.assets {
        if asset.name.to_lowercase() == expected_name {
            let version = release.tag_name.trim_start_matches('v').to_string();
            if !version.is_empty() {
                return Some((version, Some(asset.browser_download_url.clone())));
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
    let release = fetch_latest_release().await.map_err(|e| {
        log::error!("Failed to fetch release: {}", e);
        format!("Failed to fetch release info: {}", e)
    })?;
    let (latest_version, download_url) = match extract_platform_asset(&release, &platform, &arch) {
        Some(pair) => pair,
        None => {
            let available: Vec<&str> = release.assets.iter().map(|a| a.name.as_str()).collect();
            log::error!(
                "No matching asset for platform={} arch={} in release {}. Available assets: {:?}",
                platform,
                arch,
                release.tag_name,
                available
            );
            return Err(format!("No matching asset found for {}/{} in release {}", platform, arch, release.tag_name));
        }
    };
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
/// Request cancellation of the in-flight update download.
#[command]
pub fn cmd_cancel_update_download() {
    UPDATE_CANCEL_FLAG.store(true, Ordering::SeqCst);
    log::info!("Update download cancellation requested");
}
/// Download and install update.
#[command]
pub async fn cmd_download_and_install_update(app_handle: AppHandle, download_url: String) -> Result<(), String> {
    log::info!("Starting download from: {}", download_url);
    UPDATE_CANCEL_FLAG.store(false, Ordering::SeqCst);
    let filename = download_url.split('/').last().unwrap_or("installer.msi").to_string();
    let download_dir = get_download_dir()?;
    let file_path = download_dir.join(&filename);
    let http_client = HttpClient::new();
    let app_for_progress = app_handle.clone();
    let bytes = http_client
        .fetch_bytes_streaming(&download_url, None, move |downloaded, total| {
            // Compute percentage (0-100). When total is unknown, fall back to 0
            // so the frontend can still show the shimmer bar.
            let percent: u8 = match total {
                Some(t) if t > 0 => {
                    let p = (downloaded as f64 / t as f64) * 100.0;
                    p.clamp(0.0, 100.0) as u8
                }
                _ => 0,
            };
            let _ = app_for_progress.emit(UPDATE_PROGRESS_EVENT, percent);
        })
        .await
        .map_err(|e| format!("Download failed: {}", e))?;
    if UPDATE_CANCEL_FLAG.load(Ordering::SeqCst) {
        log::info!("Update download cancelled by user; discarding bytes");
        let _ = std::fs::remove_file(&file_path);
        return Err("cancelled".to_string());
    }
    // Write to file
    let mut file = File::create(&file_path).map_err(|e| format!("Failed to create file: {}", e))?;
    file.write_all(&bytes).map_err(|e| format!("Failed to write file: {}", e))?;
    file.flush().map_err(|e| format!("Failed to flush file: {}", e))?;
    log::info!("Download completed: {:?}", file_path);
    if UPDATE_CANCEL_FLAG.load(Ordering::SeqCst) {
        log::info!("Update cancelled before installer launch; removing file");
        let _ = std::fs::remove_file(&file_path);
        return Err("cancelled".to_string());
    }
    // Verify the installer file exists before launching
    if !file_path.exists() {
        return Err(format!("Installer file does not exist: {:?}", file_path));
    }
    let file_size = std::fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0);
    // Launch the installer.
    #[cfg(target_os = "windows")]
    {
        use crate::commons::hidden_cmd;
        let path_str = file_path.to_string_lossy();
        // The command we are going to run:
        //   cmd /c start "" msiexec /i "<absolute path to installer>"
        hidden_cmd("cmd")
            .arg("/c")
            .arg("start")
            .arg("")
            .arg("msiexec")
            .arg("/i")
            .arg(path_str.as_ref())
            .spawn()
            .map_err(|e| format!("Failed to launch installer: {}", e))?;
    }
    #[cfg(not(target_os = "windows"))]
    {
        open::that(&file_path).map_err(|e| format!("Failed to open installer: {}", e))?;
    }
    log::info!("Installer started successfully");
    // Give the OS a moment to hand off the installer process, then exit.
    tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
    std::process::exit(0);
    #[allow(unreachable_code)]
    Ok(())
}
/// Fetch the markdown body of the latest GitHub release for hippoxOS.
#[command]
pub async fn cmd_fetch_release_markdown() -> Result<String, String> {
    let http_client = HttpClient::new();
    if let Ok(release) = fetch_latest_release().await {
        if !release.body.trim().is_empty() {
            return Ok(release.body);
        }
    }
    let readme_url = HIPPOXOS_GITHUB_RELEASES_URL.replace("/releases/latest", "/raw/main/README.md");
    http_client.fetch_text(&readme_url, None).await.map_err(|e| format!("Failed to fetch README: {}", e))
}
