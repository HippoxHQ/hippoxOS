use crate::commons::FileUtils;
use serde::Deserialize;
use std::env;
use sysinfo::System;
use tauri::{AppHandle, Manager, Window};
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
/// Get current memory usage percentage
#[tauri::command]
pub fn cmd_get_memory_usage() -> Result<f32, String> {
    let mut system = System::new_all();
    system.refresh_memory();
    let total_memory = system.total_memory();
    let used_memory = system.used_memory();
    if total_memory == 0 {
        return Ok(0.0);
    }
    let usage_percent = (used_memory as f64 / total_memory as f64) * 100.0;
    Ok(usage_percent as f32)
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
        // Try to get GPU usage via PDH performance counters first (cross-vendor: NVIDIA/AMD/Intel)
        match get_windows_gpu_usage_pdh() {
            Ok(usage) if usage > 0.0 => return Ok(usage),
            _ => {}
        }
        // Fallback: nvidia-smi for NVIDIA-only systems where PDH might fail
        match get_windows_gpu_usage_nvidia_smi() {
            Ok(usage) => return Ok(usage),
            Err(_) => return Ok(0.0),
        }
    }
    #[cfg(target_os = "macos")]
    {
        // macOS GPU detection via powermetrics requires root; return 0.0 for non-root context
        match get_macos_gpu_usage() {
            Ok(usage) => Ok(usage),
            Err(_) => Ok(0.0),
        }
    }
    #[cfg(target_os = "linux")]
    {
        // Linux GPU detection via sysfs (AMD/Intel) or nvidia-smi (NVIDIA)
        match get_linux_gpu_usage() {
            Ok(usage) => Ok(usage),
            Err(_) => Ok(0.0),
        }
    }
}
/// Get GPU usage on Windows via PDH performance counters.
#[cfg(target_os = "windows")]
fn get_windows_gpu_usage_pdh() -> Result<f32, String> {
    use windows::core::*;
    use windows::Win32::System::Performance::*;
    unsafe {
        // Open a query handle
        let mut query: PDH_HQUERY = std::mem::zeroed();
        let status = PdhOpenQueryW(PCWSTR::null(), 0, &mut query);
        if status != 0 {
            return Err("Failed to open PDH query".to_string());
        }
        // Add counter for all GPU Engine instances
        let counter_path = w!("\\GPU Engine(*)\\Utilization Percentage");
        let mut counter: PDH_HCOUNTER = std::mem::zeroed();
        let status = PdhAddCounterW(query, counter_path, 0, &mut counter);
        if status != 0 {
            // Counter not available (no GPU or old driver)
            let _ = PdhCloseQuery(query);
            return Ok(0.0);
        }
        // First collection initializes the counter
        let status = PdhCollectQueryData(query);
        if status != 0 {
            let _ = PdhCloseQuery(query);
            return Ok(0.0);
        }
        // Small delay to get a meaningful sample
        std::thread::sleep(std::time::Duration::from_millis(100));
        // Second collection computes the rate
        let status = PdhCollectQueryData(query);
        if status != 0 {
            let _ = PdhCloseQuery(query);
            return Ok(0.0);
        }
        // Get formatted counter array for all instances
        let mut buffer_size: u32 = 0;
        let mut item_count: u32 = 0;
        let _ = PdhGetFormattedCounterArrayW(counter, PDH_FMT_DOUBLE, &mut buffer_size, &mut item_count, None);
        if buffer_size == 0 {
            let _ = PdhCloseQuery(query);
            return Ok(0.0);
        }
        // Allocate buffer for counter array
        let mut buffer: Vec<u8> = vec![0u8; buffer_size as usize];
        let status = PdhGetFormattedCounterArrayW(
            counter,
            PDH_FMT_DOUBLE,
            &mut buffer_size,
            &mut item_count,
            Some(buffer.as_mut_ptr() as *mut PDH_FMT_COUNTERVALUE_ITEM_W),
        );
        if status != 0 {
            let _ = PdhCloseQuery(query);
            return Ok(0.0);
        }
        // Sum utilization across all instances (engine types for all adapters)
        let items = buffer.as_ptr() as *const PDH_FMT_COUNTERVALUE_ITEM_W;
        let mut total_utilization: f64 = 0.0;
        for i in 0..item_count as usize {
            let item = &*items.add(i);
            if item.FmtValue.CStatus == 0 {
                total_utilization += item.FmtValue.Anonymous.doubleValue;
            }
        }
        let _ = PdhCloseQuery(query);
        // Cap at 100.0 (summing all engines can exceed 100% in edge cases)
        Ok(total_utilization.min(100.0) as f32)
    }
}
/// Fallback: Get GPU usage on Windows via nvidia-smi (NVIDIA only).
#[cfg(target_os = "windows")]
fn get_windows_gpu_usage_nvidia_smi() -> Result<f32, String> {
    use std::process::Command;
    if let Ok(output) = crate::commons::hidden_cmd("nvidia-smi").arg("--query-gpu=utilization.gpu").arg("--format=csv,noheader,nounits").output() {
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
    Ok(0.0)
}
/// Get GPU usage on macOS.
/// Uses powermetrics if available (requires root); otherwise returns 0.0.
#[cfg(target_os = "macos")]
fn get_macos_gpu_usage() -> Result<f32, String> {
    use std::process::Command;
    // Try powermetrics (requires root privileges)
    if let Ok(output) = Command::new("powermetrics").args(["--samplers", "gpu_power", "-n", "1", "-i", "100"]).output() {
        if output.status.success() {
            if let Ok(output_str) = String::from_utf8(output.stdout) {
                // Parse "GPU busy: XX%" or similar from powermetrics output
                for line in output_str.lines() {
                    if line.contains("GPU") && line.contains("busy") {
                        if let Some(percent_str) = line.split(':').nth(1) {
                            let cleaned = percent_str.trim().trim_end_matches('%');
                            if let Ok(usage) = cleaned.parse::<f32>() {
                                return Ok(usage);
                            }
                        }
                    }
                }
            }
        }
    }
    // Fallback: ioreg for Intel Macs with discrete GPU
    if let Ok(output) = Command::new("ioreg").args(["-r", "-d", "1", "-w", "0", "-c", "IOAccelerator"]).output() {
        if output.status.success() {
            if let Ok(output_str) = String::from_utf8(output.stdout) {
                // Look for "Device Utilization %" or "GPU Activity(%)"
                for line in output_str.lines() {
                    if line.contains("Device Utilization %") || line.contains("GPU Activity(%)") {
                        if let Some(eq_pos) = line.find('=') {
                            let value_part = &line[eq_pos + 1..];
                            let cleaned: String = value_part.chars().filter(|c| c.is_ascii_digit()).collect();
                            if let Ok(usage) = cleaned.parse::<f32>() {
                                return Ok(usage);
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(0.0)
}
/// Get GPU usage on Linux systems.
/// Tries AMD sysfs (`gpu_busy_percent`), Intel sysfs, then NVIDIA `nvidia-smi`.
#[cfg(target_os = "linux")]
fn get_linux_gpu_usage() -> Result<f32, String> {
    use std::path::Path;
    // AMD GPU via sysfs (amdgpu driver) 
    // The file /sys/class/drm/card0/device/gpu_busy_percent returns 0-100 integer.
    let amd_path = Path::new("/sys/class/drm/card0/device/gpu_busy_percent");
    if FileUtils::path_exists(amd_path) {
        if let Ok(content) = FileUtils::read_file_to_string(amd_path) {
            if let Ok(usage) = content.trim().parse::<f32>() {
                return Ok(usage);
            }
        }
    }
    // Intel GPU via sysfs (i915/xe driver) 
    // Intel i915 exposes gt frequency and idle state under /sys/class/drm/card0/gt/gt0/.
    // Utilization percentage is not directly available; derive from active frequency ratio.
    let intel_act_freq_path = Path::new("/sys/class/drm/card0/gt/gt0/rps/act_freq");
    let intel_max_freq_path = Path::new("/sys/class/drm/card0/gt/gt0/rps/max_freq");
    if FileUtils::path_exists(intel_act_freq_path) && FileUtils::path_exists(intel_max_freq_path) {
        if let (Ok(act_str), Ok(max_str)) = (FileUtils::read_file_to_string(intel_act_freq_path), FileUtils::read_file_to_string(intel_max_freq_path))
        {
            if let (Ok(act), Ok(max)) = (act_str.trim().parse::<f32>(), max_str.trim().parse::<f32>()) {
                if max > 0.0 {
                    // Active frequency ratio as a proxy for utilization (0-100)
                    return Ok((act / max * 100.0).min(100.0));
                }
            }
        }
    }
    // NVIDIA GPU via nvidia-smi
    if let Ok(output) = crate::commons::hidden_cmd("nvidia-smi").arg("--query-gpu=utilization.gpu").arg("--format=csv,noheader,nounits").output() {
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
