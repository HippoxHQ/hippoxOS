use std::process::Command;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;
/// Creates a Command that runs with hidden console window on Windows
/// - Windows: automatically adds CREATE_NO_WINDOW flag
/// - Other platforms: returns normal Command
pub fn hidden_cmd(program: &str) -> Command {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = Command::new(program);
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd
    }
    #[cfg(not(target_os = "windows"))]
    {
        Command::new(program)
    }
}
/// Creates a hidden ffmpeg command
pub fn cmd_ffmpeg() -> Command {
    hidden_cmd("ffmpeg")
}
/// Creates a hidden ffprobe command
pub fn cmd_ffprobe() -> Command {
    hidden_cmd("ffprobe")
}
/// Creates a hidden PowerShell command for Windows background tasks
pub fn cmd_powershell() -> Command {
    hidden_cmd("powershell")
}
/// Creates a hidden cmd.exe command for Windows background tasks
///
/// Note: If you want to open a terminal window for the user (e.g., with /k flag),
/// use `cmd_terminal()` instead of this function.
pub fn cmd_cmd() -> Command {
    hidden_cmd("cmd")
}
/// Creates a hidden git command for background operations
pub fn cmd_git() -> Command {
    hidden_cmd("git")
}
/// Creates a hidden command for any program path
///
/// # Arguments
/// * `program` - Program path or name
pub fn cmd_program(program: &str) -> Command {
    hidden_cmd(program)
}
/// Creates a command that opens a visible terminal window (user-initiated)
///
/// This is for commands that the user explicitly wants to see,
/// such as opening a terminal in a specific directory.
///
/// # Arguments
/// * `program` - Program path or name (e.g., "cmd", "powershell")
#[cfg(target_os = "windows")]
pub fn cmd_visible_terminal(program: &str) -> Command {
    // Use raw Command without hidden flags
    Command::new(program)
}
/// Creates a command that opens a visible terminal window (user-initiated)
///
/// This is for commands that the user explicitly wants to see,
/// such as opening a terminal in a specific directory.
///
/// # Arguments
/// * `program` - Program path or name (e.g., "cmd", "powershell")
#[cfg(not(target_os = "windows"))]
pub fn cmd_visible_terminal(program: &str) -> Command {
    Command::new(program)
}
