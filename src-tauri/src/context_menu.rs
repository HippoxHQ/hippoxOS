// Cross-platform context menu registration for "Open With HippoxOS".
use std::path::PathBuf;
/// Append a line to a temp log file so it is visible even under windows_subsystem.
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
#[cfg(target_os = "linux")]
fn home_dir() -> PathBuf {
    std::env::var("HOME").map(PathBuf::from).unwrap_or_else(|_| PathBuf::from("/tmp"))
}
#[cfg(target_os = "linux")]
fn write_nemo_action(exe: &str) -> Result<(), String> {
    let dir = home_dir().join(".local/share/nemo/actions");
    std::fs::create_dir_all(&dir).map_err(|e| format!("create nemo actions dir: {}", e))?;
    let path = dir.join("hippoxos.nemo_action");
    let content = format!(
        "[Nemo Action]\nName=Open With HippoxOS\nComment=Open this file in HippoxOS\nExec=\"{}\" %F\nIcon=hippoxos\nSelection=none\nExtensions=any;\n",
        exe
    );
    std::fs::write(&path, content).map_err(|e| format!("write nemo action: {}", e))?;
    trace_log(&format!("nemo action written: {:?}", path));
    Ok(())
}
#[cfg(target_os = "linux")]
fn write_pcmanfm_action(exe: &str) -> Result<(), String> {
    let dir = home_dir().join(".local/share/file-manager/actions");
    std::fs::create_dir_all(&dir).map_err(|e| format!("create pcmanfm actions dir: {}", e))?;
    let path = dir.join("hippoxos.desktop");
    let content = format!(
        "[Desktop Entry]\nType=Action\nName=Open With HippoxOS\nIcon=hippoxos\nProfiles=profile-zero;\n\n[X-Action-Profile profile-zero]\nName=Default profile\nExec=\"{}\" %f\nMimeTypes=all/allfiles;\n",
        exe
    );
    std::fs::write(&path, content).map_err(|e| format!("write pcmanfm action: {}", e))?;
    trace_log(&format!("pcmanfm action written: {:?}", path));
    Ok(())
}
#[cfg(target_os = "linux")]
fn write_thunar_action(exe: &str) -> Result<(), String> {
    let dir = home_dir().join(".config/Thunar");
    std::fs::create_dir_all(&dir).map_err(|e| format!("create thunar config dir: {}", e))?;
    let path = dir.join("uca.xml");
    let existing = if path.exists() {
        std::fs::read_to_string(&path).unwrap_or_default()
    } else {
        String::from("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<actions>\n</actions>\n")
    };
    if existing.contains("hippoxos-thunar-action") {
        trace_log("thunar action already present");
        return Ok(());
    }
    let new_action = format!(
        "  <action>\n    <icon>hippoxos</icon>\n    <name>Open With HippoxOS</name>\n    <unique-id>hippoxos-thunar-action</unique-id>\n    <command>\"{}\" %f</command>\n    <description>Open this file in HippoxOS</description>\n    <patterns>*</patterns>\n    <directories/>\n  </action>\n",
        exe
    );
    let updated = if let Some(pos) = existing.rfind("</actions>") {
        format!("{}{}{}", &existing[..pos], new_action, &existing[pos..])
    } else {
        format!("{}\n{}\n", existing, new_action)
    };
    std::fs::write(&path, updated).map_err(|e| format!("write thunar uca.xml: {}", e))?;
    trace_log(&format!("thunar action written: {:?}", path));
    Ok(())
}
#[cfg(target_os = "linux")]
pub fn register_context_menu() -> Result<(), String> {
    let exe = current_exe().ok_or("Cannot get current exe path")?;
    let exe_str = exe.to_string_lossy().to_string();
    if let Err(e) = write_nemo_action(&exe_str) {
        trace_log(&format!("nemo action failed: {}", e));
    }
    if let Err(e) = write_pcmanfm_action(&exe_str) {
        trace_log(&format!("pcmanfm action failed: {}", e));
    }
    if let Err(e) = write_thunar_action(&exe_str) {
        trace_log(&format!("thunar action failed: {}", e));
    }
    trace_log(&format!("linux register done for exe={}", exe_str));
    Ok(())
}
#[cfg(target_os = "linux")]
pub fn unregister_context_menu() -> Result<(), String> {
    let home = home_dir();
    let _ = std::fs::remove_file(home.join(".local/share/nemo/actions/hippoxos.nemo_action"));
    let _ = std::fs::remove_file(home.join(".local/share/file-manager/actions/hippoxos.desktop"));
    let thunar_path = home.join(".config/Thunar/uca.xml");
    if thunar_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&thunar_path) {
            let mut output = String::new();
            let mut skip = false;
            for line in content.lines() {
                if line.contains("<unique-id>hippoxos-thunar-action</unique-id>") {
                    skip = true;
                    if output.ends_with("<action>\n") || output.ends_with("<action>") {
                        if let Some(pos) = output.rfind("<action>") {
                            output.truncate(pos);
                        }
                    }
                    continue;
                }
                if skip {
                    if line.contains("</action>") {
                        skip = false;
                    }
                    continue;
                }
                output.push_str(line);
                output.push('\n');
            }
            let _ = std::fs::write(&thunar_path, output);
        }
    }
    trace_log("linux unregister done");
    Ok(())
}
// ==================== macOS ====================
#[cfg(target_os = "macos")]
pub fn register_context_menu() -> Result<(), String> {
    todo!();
    Ok(())
}
#[cfg(target_os = "macos")]
pub fn unregister_context_menu() -> Result<(), String> {
    todo!();
    Ok(())
}
