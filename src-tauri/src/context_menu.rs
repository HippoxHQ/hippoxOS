// Cross-platform context menu registration for "Open With HippoxOS".
use std::path::PathBuf;
/// Append a line to a temp log file so it is visible even under windows_subsystem.
#[allow(dead_code)]
fn trace_log(msg: &str) {
    if let Ok(dir) = std::env::var("TEMP") {
        let path = PathBuf::from(dir).join("hippoxos_context_menu.log");
        if let Ok(mut f) = std::fs::OpenOptions::new().create(true).append(true).open(&path) {
            use std::io::Write;
            let _ = writeln!(f, "{}", msg);
        }
    }
}
/// Returns the current executable path.
#[allow(dead_code)]
fn current_exe() -> Option<PathBuf> {
    std::env::current_exe().ok()
}
/// Extract the first existing file path argument from process argv.
pub fn extract_file_arg_from_argv() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    trace_log(&format!("extract_file_arg_from_argv - args={:?}", args));
    for arg in args.iter().skip(1) {
        if arg.starts_with('-') {
            continue;
        }
        let path = std::path::Path::new(arg);
        if path.exists() && path.is_file() {
            return Some(arg.clone());
        }
    }
    None
}
// ==================== Windows ====================
#[cfg(target_os = "windows")]
pub fn register_context_menu() -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;
    trace_log("windows register start");
    let exe = match current_exe() {
        Some(p) => p,
        None => {
            trace_log("windows register: cannot get exe path");
            return Err("Cannot get current exe path".to_string());
        }
    };
    let exe_str = exe.to_string_lossy().to_string();
    trace_log(&format!("windows register: exe={}", exe_str));
    let command = format!("\"{}\" \"%1\"", exe_str);
    trace_log(&format!("windows register: command={}", command));
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let base = "Software\\Classes\\*\\shell\\HippoxOS";
    trace_log(&format!("windows register: creating key {}", base));
    let (shell_key, _) = match hkcu.create_subkey(base) {
        Ok(v) => v,
        Err(e) => {
            trace_log(&format!("windows register: create_subkey failed: {}", e));
            return Err(format!("Failed to create shell key: {}", e));
        }
    };
    trace_log("windows register: shell key created");
    if let Err(e) = shell_key.set_value("", &"Open With HippoxOS") {
        trace_log(&format!("windows register: set menu name failed: {}", e));
        return Err(format!("Failed to set menu name: {}", e));
    }
    trace_log("windows register: menu name set");
    if let Err(e) = shell_key.set_value("Icon", &exe_str) {
        trace_log(&format!("windows register: set icon failed: {}", e));
    }
    let (cmd_key, _) = match shell_key.create_subkey("command") {
        Ok(v) => v,
        Err(e) => {
            trace_log(&format!("windows register: create command key failed: {}", e));
            return Err(format!("Failed to create command key: {}", e));
        }
    };
    trace_log("windows register: command key created");
    if let Err(e) = cmd_key.set_value("", &command) {
        trace_log(&format!("windows register: set command failed: {}", e));
        return Err(format!("Failed to set command: {}", e));
    }
    trace_log("windows register: command set OK");
    Ok(())
}
#[cfg(target_os = "windows")]
pub fn unregister_context_menu() -> Result<(), String> {
    use winreg::enums::*;
    use winreg::RegKey;
    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let base = "Software\\Classes\\*\\shell\\HippoxOS";
    hkcu.delete_subkey_all(base).map_err(|e| format!("Failed to delete shell key: {}", e))?;
    trace_log("windows unregister done");
    Ok(())
}
// ==================== Linux ====================
// Not supported. Intentionally a no-op so callers do not need to guard the
// call site with `#[cfg]`.
#[cfg(target_os = "linux")]
pub fn register_context_menu() -> Result<(), String> {
    trace_log("linux register_context_menu: not supported, skipping");
    Ok(())
}
#[cfg(target_os = "linux")]
pub fn unregister_context_menu() -> Result<(), String> {
    trace_log("linux unregister_context_menu: not supported, skipping");
    Ok(())
}
// ==================== macOS ====================
// Not supported. Intentionally a no-op so callers do not need to guard the
// call site with `#[cfg]`.
#[cfg(target_os = "macos")]
pub fn register_context_menu() -> Result<(), String> {
    trace_log("macos register_context_menu: not supported, skipping");
    Ok(())
}
#[cfg(target_os = "macos")]
pub fn unregister_context_menu() -> Result<(), String> {
    trace_log("macos unregister_context_menu: not supported, skipping");
    Ok(())
}
// ==================== Fallback (other OSes) ====================
// Keep the same public surface so `lib.rs` compiles unconditionally.
#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
pub fn register_context_menu() -> Result<(), String> {
    Ok(())
}
#[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
pub fn unregister_context_menu() -> Result<(), String> {
    Ok(())
}
