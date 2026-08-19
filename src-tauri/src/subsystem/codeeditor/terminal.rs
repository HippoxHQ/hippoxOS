#[cfg(target_os = "windows")]
use encoding_rs::GBK;
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;
use tauri::command;
use tauri::Emitter;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::process::Child;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio::time::{timeout, Duration};
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalSession {
    pub id: String,
    pub pid: u32,
    pub cwd: String,
    pub cols: u16,
    pub rows: u16,
    pub created_at: String,
    pub is_alive: bool,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalCreateRequest {
    pub cols: u16,
    pub rows: u16,
    pub cwd: Option<String>,
    pub shell: Option<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalInputRequest {
    pub session_id: String,
    pub data: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalOutputEvent {
    pub session_id: String,
    pub data: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TerminalExitEvent {
    pub session_id: String,
    pub code: Option<i32>,
}
struct TerminalProcess {
    child: Child,
    stdin: tokio::process::ChildStdin,
    stdout: tokio::process::ChildStdout,
    stderr: tokio::process::ChildStderr,
    pid: u32,
    is_alive: bool,
}
impl TerminalProcess {
    async fn new(shell: &str, cwd: &str, cols: u16, rows: u16) -> Result<Self, String> {
        #[cfg(target_os = "windows")]
        let mut cmd = {
            let mut std_cmd = std::process::Command::new(shell);
            std_cmd.creation_flags(CREATE_NO_WINDOW);
            tokio::process::Command::from(std_cmd)
        };
        #[cfg(not(target_os = "windows"))]
        let mut cmd = tokio::process::Command::new(shell);
        cmd.current_dir(cwd)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .env("TERM", "xterm-256color")
            .env("COLUMNS", cols.to_string())
            .env("LINES", rows.to_string());
        if cfg!(target_os = "windows") {
            cmd.arg("-NoExit");
            cmd.arg("-NoProfile");
            cmd.arg("-Command");
            cmd.arg("$null");
        } else {
            cmd.arg("-i");
        }
        let mut child = cmd.spawn().map_err(|e| format!("Failed to spawn shell: {}", e))?;
        let pid = child.id().ok_or("Failed to get process ID")?;
        let stdin = child.stdin.take().ok_or("Failed to get stdin")?;
        let stdout = child.stdout.take().ok_or("Failed to get stdout")?;
        let stderr = child.stderr.take().ok_or("Failed to get stderr")?;
        Ok(TerminalProcess { child, stdin, stdout, stderr, pid, is_alive: true })
    }
    async fn write(&mut self, data: &str) -> Result<(), String> {
        if !self.is_alive {
            return Err("Terminal is already closed".to_string());
        }
        self.stdin.write_all(data.as_bytes()).await.map_err(|e| format!("Failed to write: {}", e))?;
        self.stdin.flush().await.map_err(|e| format!("Failed to flush: {}", e))?;
        Ok(())
    }
    async fn read_stdout(&mut self) -> Option<Vec<u8>> {
        let mut buf = vec![0u8; 4096];
        match timeout(Duration::from_millis(10), self.stdout.read(&mut buf)).await {
            Ok(Ok(0)) => None,
            Ok(Ok(n)) => {
                let raw = &buf[..n];
                #[cfg(target_os = "windows")]
                {
                    let (decoded, _, _) = GBK.decode(raw);
                    let utf8_bytes = decoded.to_string().into_bytes();
                    Some(utf8_bytes)
                }
                #[cfg(not(target_os = "windows"))]
                {
                    Some(raw.to_vec())
                }
            }
            _ => None,
        }
    }
    async fn read_stderr(&mut self) -> Option<Vec<u8>> {
        let mut buf = vec![0u8; 4096];
        match timeout(Duration::from_millis(10), self.stderr.read(&mut buf)).await {
            Ok(Ok(0)) => None,
            Ok(Ok(n)) => Some(buf[..n].to_vec()),
            _ => None,
        }
    }
    async fn kill(&mut self) -> Result<(), String> {
        if !self.is_alive {
            return Ok(());
        }
        let _ = self.child.kill().await;
        self.is_alive = false;
        Ok(())
    }
    async fn wait(&mut self) -> Option<i32> {
        match self.child.wait().await {
            Ok(status) => {
                self.is_alive = false;
                status.code()
            }
            Err(_) => None,
        }
    }
}
type TerminalMap = Arc<Mutex<HashMap<String, Arc<Mutex<TerminalProcess>>>>>;
static TERMINAL_POOL: Lazy<TerminalMap> = Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));
type TaskHandleMap = Arc<Mutex<HashMap<String, JoinHandle<()>>>>;
static TASK_HANDLES: Lazy<TaskHandleMap> = Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));
fn get_default_shell() -> String {
    #[cfg(target_os = "windows")]
    {
        "powershell.exe".to_string()
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    }
}
fn get_home_dir() -> String {
    dirs::home_dir().map(|p| p.to_string_lossy().to_string()).unwrap_or_else(|| ".".to_string())
}
#[command]
pub async fn cmd_terminal_kill(session_id: String) -> Result<bool, String> {
    {
        let mut handles = TASK_HANDLES.lock().await;
        if let Some(handle) = handles.remove(&session_id) {
            handle.abort();
        }
    }
    {
        let mut pool = TERMINAL_POOL.lock().await;
        if let Some(process_arc) = pool.remove(&session_id) {
            let mut process = process_arc.lock().await;
            let _ = process.kill().await;
        }
    }
    Ok(true)
}
#[command]
pub async fn cmd_terminal_create(request: TerminalCreateRequest, app_handle: tauri::AppHandle) -> Result<TerminalSession, String> {
    let session_id = format!("term_{}", chrono::Local::now().timestamp_millis());
    let shell = request.shell.unwrap_or_else(get_default_shell);
    let cwd = request.cwd.unwrap_or_else(get_home_dir);
    let cols = request.cols.max(10);
    let rows = request.rows.max(3);
    let cwd_path = PathBuf::from(&cwd);
    if !cwd_path.exists() || !cwd_path.is_dir() {
        return Err(format!("Working directory does not exist: {}", cwd));
    }
    let process = TerminalProcess::new(&shell, &cwd, cols, rows).await?;
    let pid = process.pid;
    let process_arc = Arc::new(Mutex::new(process));
    {
        let mut pool = TERMINAL_POOL.lock().await;
        pool.insert(session_id.clone(), process_arc.clone());
    }
    let pool = TERMINAL_POOL.clone();
    let app_handle_clone = app_handle.clone();
    let session_id_clone = session_id.clone();
    let handle = tokio::spawn(async move {
        loop {
            let proc = {
                let pool = pool.lock().await;
                pool.get(&session_id_clone).cloned()
            };
            if let Some(proc_arc) = proc {
                let mut process = proc_arc.lock().await;
                let mut output_buffer = Vec::new();
                while let Some(data) = process.read_stdout().await {
                    output_buffer.extend_from_slice(&data);
                }
                while let Some(data) = process.read_stderr().await {
                    output_buffer.extend_from_slice(&data);
                }
                if !output_buffer.is_empty() {
                    match String::from_utf8(output_buffer) {
                        Ok(data) => {
                            let _ = app_handle_clone.emit("terminal-output", TerminalOutputEvent { session_id: session_id_clone.clone(), data });
                        }
                        Err(e) => {
                            let data = String::from_utf8_lossy(e.as_bytes()).to_string();
                            let _ = app_handle_clone.emit("terminal-output", TerminalOutputEvent { session_id: session_id_clone.clone(), data });
                        }
                    }
                }
                if !process.is_alive {
                    let code = process.wait().await;
                    {
                        let mut pool = pool.lock().await;
                        pool.remove(&session_id_clone);
                    }
                    {
                        let mut handles = TASK_HANDLES.lock().await;
                        handles.remove(&session_id_clone);
                    }
                    let _ = app_handle_clone.emit("terminal-exit", TerminalExitEvent { session_id: session_id_clone.clone(), code });
                    break;
                }
            } else {
                break;
            }
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
        }
    });
    {
        let mut handles = TASK_HANDLES.lock().await;
        handles.insert(session_id.clone(), handle);
    }
    Ok(TerminalSession { id: session_id, pid, cwd, cols, rows, created_at: chrono::Local::now().to_rfc3339(), is_alive: true })
}
#[command]
pub async fn cmd_terminal_input(request: TerminalInputRequest) -> Result<bool, String> {
    let pool = TERMINAL_POOL.lock().await;
    let process_arc = pool.get(&request.session_id).ok_or_else(|| format!("Session not found: {}", request.session_id))?;
    let mut process = process_arc.lock().await;
    if !process.is_alive {
        return Err("Terminal is already closed".to_string());
    }
    process.write(&request.data).await?;
    Ok(true)
}
#[command]
pub async fn cmd_terminal_list() -> Result<Vec<TerminalSession>, String> {
    let pool = TERMINAL_POOL.lock().await;
    let mut result = Vec::new();
    for (id, process_arc) in pool.iter() {
        let process = process_arc.lock().await;
        result.push(TerminalSession {
            id: id.clone(),
            pid: process.pid,
            cwd: "".to_string(),
            cols: 0,
            rows: 0,
            created_at: "".to_string(),
            is_alive: process.is_alive,
        });
    }
    Ok(result)
}
#[command]
pub async fn cmd_terminal_is_alive(session_id: String) -> Result<bool, String> {
    let pool = TERMINAL_POOL.lock().await;
    if let Some(process_arc) = pool.get(&session_id) {
        let process = process_arc.lock().await;
        Ok(process.is_alive)
    } else {
        Ok(false)
    }
}
