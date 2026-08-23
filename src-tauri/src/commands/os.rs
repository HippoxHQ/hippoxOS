// System operations including CPU/GPU monitoring, browser opening, and system info
use serde::Deserialize;
use std::env;
use sysinfo::System;
use tauri::{AppHandle, Manager, Window};
/// Exit the application
#[tauri::command]
pub async fn cmd_exit_app() -> Result<(), String> {
    std::process::exit(0);
}
/// Get the current system username
#[tauri::command]
pub fn cmd_get_system_username() -> Result<String, String> {
    match env::var("USERNAME").or_else(|_| env::var("USER")) {
        Ok(username) => Ok(username),
        Err(_) => {
            #[cfg(target_os = "windows")]
            {
                Ok("User".to_string())
            }
            #[cfg(not(target_os = "windows"))]
            {
                Ok("User".to_string())
            }
        }
    }
}
/// Open a URL in the system default browser
#[tauri::command]
pub async fn cmd_open_browser(url: String) -> Result<(), String> {
    if url.is_empty() {
        return Err("URL cannot be empty".to_string());
    }
    // Validate URL format
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err("Invalid URL format. Must start with http:// or https://".to_string());
    }
    match webbrowser::open(&url) {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Failed to open browser: {}", e)),
    }
}
/// Get current CPU usage percentage
#[tauri::command]
pub fn cmd_get_cpu_usage() -> Result<f32, String> {
    let mut system = System::new_all();
    // Refresh CPU data
    system.refresh_cpu_all();
    // Small delay to get accurate usage
    std::thread::sleep(std::time::Duration::from_millis(100));
    system.refresh_cpu_all();
    let cpu_usage = system.global_cpu_usage();
    Ok(cpu_usage)
}
/// Get current GPU usage percentage (returns 0.0 if not available)
#[tauri::command]
pub fn cmd_get_gpu_usage() -> Result<f32, String> {
    #[cfg(target_os = "windows")]
    {
        // Try to get GPU usage via nvidia-smi or WMI on Windows
        match get_windows_gpu_usage() {
            Ok(usage) => return Ok(usage),
            Err(_) => return Ok(0.0),
        }
    }
    #[cfg(target_os = "macos")]
    {
        // macOS GPU detection is limited, return 0.0
        Ok(0.0)
    }
    #[cfg(target_os = "linux")]
    {
        // Linux GPU detection via NVIDIA or AMD
        match get_linux_gpu_usage() {
            Ok(usage) => Ok(usage),
            Err(_) => Ok(0.0),
        }
    }
}
/// Get GPU usage on Windows systems
/// Uses nvidia-smi first (with hidden window), falls back to WMI
#[cfg(target_os = "windows")]
fn get_windows_gpu_usage() -> Result<f32, String> {
    use crate::commons::hidden_cmd;
    use wmi::*;
    // Try nvidia-smi with hidden window (no black flash)
    if let Ok(output) = hidden_cmd("nvidia-smi").arg("--query-gpu=utilization.gpu").arg("--format=csv,noheader,nounits").output() {
        if output.status.success() {
            if let Ok(output_str) = String::from_utf8(output.stdout) {
                if let Some(first_line) = output_str.lines().next() {
                    if let Ok(usage) = first_line.trim().parse::<f32>() {
                        return Ok(usage);
                    }
                }
            }
        }
    }
    // Fallback: WMI query if nvidia-smi fails
    let wmi_con = WMIConnection::new().map_err(|e| e.to_string())?;
    let query = "SELECT * FROM Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapter";
    let results: Vec<Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapter> = wmi_con.query().map_err(|e| e.to_string())?;
    if let Some(gpu) = results.first() {
        let usage = gpu.PercentageGPUUtilization as f32;
        return Ok(usage);
    }
    Ok(0.0)
}
/// WMI data structure for GPU performance counters on Windows
#[cfg(target_os = "windows")]
#[derive(Deserialize, Debug)]
struct Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapter {
    PercentageGPUUtilization: u64,
}
/// Get GPU usage on Linux systems
/// Tries sysfs first, then nvidia-smi command
#[cfg(target_os = "linux")]
fn get_linux_gpu_usage() -> Result<f32, String> {
    use std::fs;
    use std::io::Read;
    // Try NVIDIA GPU via sysfs
    if let Ok(mut file) = fs::File::open("/sys/class/drm/card0/device/gpu_busy_percent") {
        let mut content = String::new();
        if file.read_to_string(&mut content).is_ok() {
            if let Ok(usage) = content.trim().parse::<f32>() {
                return Ok(usage);
            }
        }
    }
    // Try AMD GPU via sysfs (simplified approach)
    if let Ok(mut file) = fs::File::open("/sys/class/drm/card0/device/gpu_metrics") {
        let mut content = String::new();
        if file.read_to_string(&mut content).is_ok() {
            // Parse GPU usage from metrics (simplified)
            // In reality, you'd need proper parsing for AMD GPUs
        }
    }
    // Try using nvidia-smi command
    if let Ok(output) = hidden_cmd("nvidia-smi").arg("--query-gpu=utilization.gpu").arg("--format=csv,noheader,nounits").output() {
        if let Ok(output_str) = String::from_utf8(output.stdout) {
            if let Some(first_line) = output_str.lines().next() {
                if let Ok(usage) = first_line.trim().parse::<f32>() {
                    return Ok(usage);
                }
            }
        }
    }
    Ok(0.0)
}
/// Fallback GPU usage function for unsupported platforms
#[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
fn get_gpu_usage_fallback() -> f32 {
    0.0
}
