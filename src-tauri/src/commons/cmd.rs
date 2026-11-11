use std::process::Command;
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;
#[cfg(target_os = "windows")]
const BELOW_NORMAL_PRIORITY_CLASS: u32 = 0x00004000;
#[cfg(target_os = "windows")]
const NORMAL_PRIORITY_CLASS: u32 = 0x00000020;
#[cfg(target_os = "windows")]
const ABOVE_NORMAL_PRIORITY_CLASS: u32 = 0x00008000;
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
/// Hidden command with the given CPU priority.
pub fn priority_cmd(program: &str, priority: FileUtilsProcessPriority) -> Command {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        let priority_flag = match priority {
            FileUtilsProcessPriority::Low => BELOW_NORMAL_PRIORITY_CLASS,
            FileUtilsProcessPriority::Normal => NORMAL_PRIORITY_CLASS,
            FileUtilsProcessPriority::High => ABOVE_NORMAL_PRIORITY_CLASS,
        };
        let mut cmd = Command::new(program);
        cmd.creation_flags(CREATE_NO_WINDOW | priority_flag);
        cmd
    }
    #[cfg(not(target_os = "windows"))]
    {
        match priority {
            FileUtilsProcessPriority::High => {
                let mut cmd = Command::new("nice");
                cmd.arg("-n").arg("-10").arg(program);
                cmd
            }
            FileUtilsProcessPriority::Normal => Command::new(program),
            FileUtilsProcessPriority::Low => {
                let mut cmd = Command::new("nice");
                cmd.arg("-n").arg("10").arg(program);
                cmd
            }
        }
    }
}
/// Create a hidden command with low CPU priority (legacy alias).
pub fn low_priority_cmd(program: &str) -> Command {
    priority_cmd(program, FileUtilsProcessPriority::Low)
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
/// Creates a hidden ffmpeg command with the given CPU priority.
pub fn cmd_ffmpeg_priority(priority: FileUtilsProcessPriority) -> Command {
    priority_cmd("ffmpeg", priority)
}
/// Creates a hidden ffprobe command with the given CPU priority.
pub fn cmd_ffprobe_priority(priority: FileUtilsProcessPriority) -> Command {
    priority_cmd("ffprobe", priority)
}
/// Creates a hidden PowerShell command with the given CPU priority.
pub fn cmd_powershell_priority(priority: FileUtilsProcessPriority) -> Command {
    priority_cmd("powershell", priority)
}
/// Creates a hidden cmd.exe command with the given CPU priority.
pub fn cmd_cmd_priority(priority: FileUtilsProcessPriority) -> Command {
    priority_cmd("cmd", priority)
}
/// Creates a hidden git command with the given CPU priority.
pub fn cmd_git_priority(priority: FileUtilsProcessPriority) -> Command {
    priority_cmd("git", priority)
}
/// Creates a hidden command for any program path with the given CPU priority.
///
/// # Arguments
/// * `program` - Program path or name
/// * `priority` - CPU priority for the child process
pub fn cmd_program_priority(program: &str, priority: FileUtilsProcessPriority) -> Command {
    priority_cmd(program, priority)
}
/// Creates a command that opens a visible terminal window (user-initiated)
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
/// # Arguments
/// * `program` - Program path or name (e.g., "cmd", "powershell")
#[cfg(not(target_os = "windows"))]
pub fn cmd_visible_terminal(program: &str) -> Command {
    Command::new(program)
}
/// Creates a visible terminal window with the given CPU priority (user-initiated).
#[cfg(target_os = "windows")]
pub fn cmd_visible_terminal_priority(program: &str, priority: FileUtilsProcessPriority) -> Command {
    let _ = priority;
    Command::new(program)
}
/// Creates a visible terminal window with the given CPU priority (user-initiated).
#[cfg(not(target_os = "windows"))]
pub fn cmd_visible_terminal_priority(program: &str, priority: FileUtilsProcessPriority) -> Command {
    match priority {
        FileUtilsProcessPriority::High => {
            let mut cmd = Command::new("nice");
            cmd.arg("-n").arg("-10").arg(program);
            cmd
        }
        FileUtilsProcessPriority::Normal => Command::new(program),
        FileUtilsProcessPriority::Low => {
            let mut cmd = Command::new("nice");
            cmd.arg("-n").arg("10").arg(program);
            cmd
        }
    }
}
/// CPU priority applied to child processes spawned by helper commands.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FileUtilsProcessPriority {
    /// Lowest priority. Filesystem fallbacks (rm / cmd / powershell / taskkill / fuser / chflags) all use this.
    Low,
    /// Default OS priority. Use for user-initiated one-off commands.
    Normal,
    /// Above normal. Use for interactive tools the user is actively waiting on (e.g. an export the user just triggered).
    High,
}
