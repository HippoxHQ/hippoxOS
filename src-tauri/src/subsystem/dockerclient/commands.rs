//! Tauri command bindings for the Docker Client subsystem.
use crate::commons::hidden_cmd;
use serde::{Deserialize, Serialize};
use std::process::Output;
use tauri::command;
/// Run a `hidden_cmd` with the given args and return its raw `Output`.
fn run_hidden(program: &str, args: &[&str]) -> Result<Output, String> {
    hidden_cmd(program).args(args).output().map_err(|e| format!("failed to run `{} {:?}`: {}", program, args, e))
}
/// Run a `hidden_cmd` and return stdout as a UTF-8 `String`.
fn run_hidden_string(program: &str, args: &[&str]) -> Result<String, String> {
    let output = run_hidden(program, args)?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return Err(if !stderr.is_empty() { stderr } else { stdout });
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
/// Same as `run_hidden_string` but returns `Err` with the given message when the process fails, instead of surfacing stderr verbatim.
fn run_hidden_string_ctx(program: &str, args: &[&str], context: &str) -> Result<String, String> {
    run_hidden_string(program, args).map_err(|e| format!("{}: {}", context, e))
}
/// Detected Docker-compatible engine.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerEnvironment {
    /// Whether a usable Docker-compatible engine was found.
    pub available: bool,
    /// Engine type label, e.g. "Docker Engine", "Colima", "Podman".
    pub engine_type: String,
    /// Engine version string, e.g. "29.1.0".
    pub engine_version: String,
    /// REST API version, e.g. "1.42".
    pub api_version: String,
    /// Operating system reported by the engine, e.g. "linux".
    pub os: String,
    /// Architecture reported by the engine, e.g. "arm64".
    pub arch: String,
    /// Kernel version reported by the engine.
    pub kernel_version: String,
    /// Storage driver, e.g. "overlay2".
    pub storage_driver: String,
    /// Logging driver, e.g. "json-file".
    pub logging_driver: String,
    /// Cgroup version, e.g. "v2".
    pub cgroup_version: String,
    /// Docker root dir path.
    pub docker_root_dir: String,
    /// Socket endpoint actually used to reach the engine.
    pub socket_path: String,
    /// Whether BuildKit is available.
    pub buildkit_enabled: bool,
    /// Whether Compose is available.
    pub compose_enabled: bool,
    /// Number of CPUs visible to the engine.
    pub ncpu: i64,
    /// Total memory (bytes) visible to the engine.
    pub mem_total: i64,
    /// Currently used memory (bytes), approximate.
    pub mem_used: i64,
    /// Disk usage breakdown in bytes.
    pub disk_usage: DockerDiskUsage,
    /// Resource counts.
    pub counts: DockerCounts,
    /// Optional: Go version used to build the engine.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub go_version: Option<String>,
    /// Optional: engine git commit hash.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub git_commit: Option<String>,
    /// Optional: build time of the engine binary.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub build_time: Option<String>,
    /// Optional: default runtime, e.g. "runc".
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default_runtime: Option<String>,
    /// Optional: available runtimes.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub runtimes: Vec<String>,
    /// Optional: security options.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub security_options: Vec<String>,
}
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DockerDiskUsage {
    pub images: i64,
    pub containers: i64,
    pub volumes: i64,
    pub build_cache: i64,
    pub total: i64,
}
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DockerCounts {
    pub containers: i64,
    pub running: i64,
    pub paused: i64,
    pub stopped: i64,
    pub images: i64,
    pub volumes: i64,
}
/// A single container row.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerContainer {
    pub id: String,
    pub name: String,
    pub container_id: String,
    pub image: String,
    pub port: String,
    pub cpu: String,
    pub last_started: String,
    pub state: String,
    pub status: String,
    pub status_color: Option<String>,
}
/// A single image row.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerImage {
    pub id: String,
    pub name: String,
    pub container_id: String,
    pub image: String,
    pub port: String,
    pub cpu: String,
    pub last_started: String,
    pub status_color: Option<String>,
}
/// A single volume row.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DockerVolume {
    pub id: String,
    pub name: String,
    pub container_id: String,
    pub image: String,
    pub port: String,
    pub cpu: String,
    pub last_started: String,
    pub status_color: Option<String>,
}
/// Return the ordered list of socket candidates per platform.
fn docker_socket_candidates() -> Vec<String> {
    #[cfg(target_os = "macos")]
    {
        return vec![
            // Colima (most common for headless macOS setups).
            "unix:///Users/{user}/.colima/default/docker.sock".to_string(),
            // Docker Desktop.
            "unix:///var/run/docker.sock".to_string(),
            "unix:///Users/{user}/.docker/run/docker.sock".to_string(),
            // OrbStack.
            "unix:///Users/{user}/.orbstack/run/docker.sock".to_string(),
            // Podman machine.
            "unix:///Users/{user}/.local/share/containers/podman/machine/qemu/podman.sock".to_string(),
        ];
    }
    #[cfg(target_os = "linux")]
    {
        return vec![
            "unix:///var/run/docker.sock".to_string(),
            "unix:///run/user/{uid}/docker.sock".to_string(),
            "unix:///run/user/{uid}/podman/podman.sock".to_string(),
            "unix:///var/run/podman/podman.sock".to_string(),
        ];
    }
    #[cfg(target_os = "windows")]
    {
        return vec!["npipe:////./pipe/docker_engine".to_string(), "npipe:////./pipe/podman-machine-default".to_string()];
    }
    #[cfg(not(any(target_os = "macos", target_os = "linux", target_os = "windows")))]
    {
        return vec![];
    }
}
/// Expand `{user}` / `{uid}` placeholders in the socket candidate paths.
fn expand_socket_candidates(candidates: &[String]) -> Vec<String> {
    let user = std::env::var("USER").or_else(|_| std::env::var("USERNAME")).unwrap_or_default();
    let uid = run_hidden("id", &["-u"])
        .ok()
        .and_then(|o| if o.status.success() { Some(String::from_utf8_lossy(&o.stdout).trim().to_string()) } else { None })
        .unwrap_or_default();
    candidates.iter().map(|c| c.replace("{user}", &user).replace("{uid}", &uid)).collect()
}
/// Try `docker version --format ...` against the given `DOCKER_HOST`.
fn probe_docker_version(socket: &str) -> Result<String, String> {
    let output = hidden_cmd("docker")
        .env("DOCKER_HOST", socket)
        .args(["version", "--format", "{{.Server.Version}}"])
        .output()
        .map_err(|e| format!("failed to spawn docker: {}", e))?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        return Err(if !stderr.is_empty() { stderr } else { "docker version failed".to_string() });
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
/// Detect the current Docker environment on the host.
#[command]
pub async fn cmd_docker_detect_environment() -> Result<DockerEnvironment, String> {
    // First, honor an explicit DOCKER_HOST if it's set in the environment.
    let mut candidates: Vec<String> = Vec::new();
    if let Ok(host) = std::env::var("DOCKER_HOST") {
        if !host.trim().is_empty() {
            candidates.push(host);
        }
    }
    candidates.extend(expand_socket_candidates(&docker_socket_candidates()));
    // Probe each candidate until one responds.
    let mut resolved_socket: Option<String> = None;
    for socket in candidates {
        if probe_docker_version(&socket).is_ok() {
            resolved_socket = Some(socket);
            break;
        }
    }
    let socket = match resolved_socket {
        Some(s) => s,
        None => {
            return Ok(DockerEnvironment {
                available: false,
                engine_type: String::new(),
                engine_version: String::new(),
                api_version: String::new(),
                os: String::new(),
                arch: String::new(),
                kernel_version: String::new(),
                storage_driver: String::new(),
                logging_driver: String::new(),
                cgroup_version: String::new(),
                docker_root_dir: String::new(),
                socket_path: String::new(),
                buildkit_enabled: false,
                compose_enabled: false,
                ncpu: 0,
                mem_total: 0,
                mem_used: 0,
                disk_usage: DockerDiskUsage::default(),
                counts: DockerCounts::default(),
                go_version: None,
                git_commit: None,
                build_time: None,
                default_runtime: None,
                runtimes: Vec::new(),
                security_options: Vec::new(),
            });
        }
    };
    let version_json = run_hidden_string_ctx("docker", &["version", "--format", "{{json .}}"], "docker version failed")?;
    let version_json = {
        let output = hidden_cmd("docker")
            .env("DOCKER_HOST", &socket)
            .args(["version", "--format", "{{json .}}"])
            .output()
            .map_err(|e| format!("failed to run docker version: {}", e))?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        String::from_utf8_lossy(&output.stdout).to_string()
    };
    let info_json = {
        let output = hidden_cmd("docker")
            .env("DOCKER_HOST", &socket)
            .args(["info", "--format", "{{json .}}"])
            .output()
            .map_err(|e| format!("failed to run docker info: {}", e))?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        String::from_utf8_lossy(&output.stdout).to_string()
    };
    let system_df_json = {
        let output = hidden_cmd("docker")
            .env("DOCKER_HOST", &socket)
            .args(["system", "df", "--format", "{{json .}}"])
            .output()
            .map_err(|e| format!("failed to run docker system df: {}", e))?;
        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }
        String::from_utf8_lossy(&output.stdout).to_string()
    };
    let version: serde_json::Value = serde_json::from_str(version_json.trim()).map_err(|e| format!("failed to parse docker version: {}", e))?;
    let info: serde_json::Value = serde_json::from_str(info_json.trim()).map_err(|e| format!("failed to parse docker info: {}", e))?;
    let mut disk_usage = DockerDiskUsage::default();
    for line in system_df_json.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Ok(v) = serde_json::from_str::<serde_json::Value>(line) {
            let ty = v.get("Type").and_then(|x| x.as_str()).unwrap_or("");
            let size = v.get("Size").and_then(|x| x.as_str()).map(parse_docker_size).unwrap_or(0);
            match ty {
                "Images" => disk_usage.images = size,
                "Containers" => disk_usage.containers = size,
                "Local Volumes" | "Volumes" => disk_usage.volumes = size,
                "Build Cache" => disk_usage.build_cache = size,
                _ => {}
            }
        }
    }
    disk_usage.total = disk_usage.images + disk_usage.containers + disk_usage.volumes + disk_usage.build_cache;
    let server = version.get("Server").cloned().unwrap_or(serde_json::Value::Null);
    let client = version.get("Client").cloned().unwrap_or(serde_json::Value::Null);
    let engine_version = server.get("Version").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let api_version = server
        .get("ApiVersion")
        .and_then(|v| v.as_str())
        .unwrap_or_else(|| client.get("ApiVersion").and_then(|v| v.as_str()).unwrap_or(""))
        .to_string();
    let os =
        info.get("OperatingSystem").and_then(|v| v.as_str()).unwrap_or_else(|| server.get("Os").and_then(|v| v.as_str()).unwrap_or("")).to_string();
    let arch =
        info.get("Architecture").and_then(|v| v.as_str()).unwrap_or_else(|| server.get("Arch").and_then(|v| v.as_str()).unwrap_or("")).to_string();
    let kernel_version = info.get("KernelVersion").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let storage_driver = info.get("Driver").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let logging_driver = info.get("LoggingDriver").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let cgroup_version = info.get("CgroupVersion").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let docker_root_dir = info.get("DockerRootDir").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let ncpu = info.get("NCPU").and_then(|v| v.as_i64()).unwrap_or(0);
    let mem_total = info.get("MemTotal").and_then(|v| v.as_i64()).unwrap_or(0);
    let buildkit_enabled = info
        .get("ClientInfo")
        .and_then(|v| v.get("Plugins"))
        .and_then(|v| v.as_array())
        .map(|plugins| plugins.iter().any(|p| p.get("Name").and_then(|n| n.as_str()) == Some("buildx")))
        .unwrap_or(false)
        || server.get("Buildkit").is_some();
    let compose_enabled = run_hidden("docker", &["compose", "version"]).ok().map(|o| o.status.success()).unwrap_or(false);
    // Optional extended fields.
    let go_version = server.get("GoVersion").and_then(|v| v.as_str()).map(String::from);
    let git_commit = server.get("GitCommit").and_then(|v| v.as_str()).map(String::from);
    let build_time = server.get("BuildTime").and_then(|v| v.as_str()).map(String::from);
    let default_runtime = info.get("DefaultRuntime").and_then(|v| v.as_str()).map(String::from);
    let runtimes = info.get("Runtimes").and_then(|v| v.as_object()).map(|m| m.keys().cloned().collect::<Vec<_>>()).unwrap_or_default();
    let security_options = info
        .get("SecurityOptions")
        .and_then(|v| v.as_array())
        .map(|a| a.iter().filter_map(|x| x.as_str().map(String::from)).collect::<Vec<_>>())
        .unwrap_or_default();
    let counts = DockerCounts {
        containers: info.get("Containers").and_then(|v| v.as_i64()).unwrap_or(0),
        running: info.get("ContainersRunning").and_then(|v| v.as_i64()).unwrap_or(0),
        paused: info.get("ContainersPaused").and_then(|v| v.as_i64()).unwrap_or(0),
        stopped: info.get("ContainersStopped").and_then(|v| v.as_i64()).unwrap_or(0),
        images: info.get("Images").and_then(|v| v.as_i64()).unwrap_or(0),
        volumes: count_docker_volumes(&socket).unwrap_or(0),
    };
    let engine_type = "Docker Engine".to_string();
    Ok(DockerEnvironment {
        available: true,
        engine_type,
        engine_version,
        api_version,
        os,
        arch,
        kernel_version,
        storage_driver,
        logging_driver,
        cgroup_version,
        docker_root_dir,
        socket_path: socket,
        buildkit_enabled,
        compose_enabled,
        ncpu,
        mem_total,
        mem_used: 0,
        disk_usage,
        counts,
        go_version,
        git_commit,
        build_time,
        default_runtime,
        runtimes,
        security_options,
    })
}
fn count_docker_volumes(socket: &str) -> Result<i64, String> {
    let output = hidden_cmd("docker")
        .env("DOCKER_HOST", socket)
        .args(["volume", "ls", "-q"])
        .output()
        .map_err(|e| format!("failed to run docker volume ls: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let count = stdout.lines().filter(|l| !l.trim().is_empty()).count() as i64;
    Ok(count)
}
fn parse_docker_size(s: &str) -> i64 {
    let s = s.trim();
    if s.is_empty() {
        return 0;
    }
    let mut num_end = 0;
    for (i, c) in s.char_indices() {
        if c.is_ascii_digit() || c == '.' {
            num_end = i + c.len_utf8();
        } else {
            break;
        }
    }
    let (num_str, unit) = s.split_at(num_end);
    let num: f64 = num_str.parse().unwrap_or(0.0);
    let unit = unit.trim().to_uppercase();
    let multiplier = match unit.as_str() {
        "B" => 1.0,
        "KB" | "K" => 1_000.0,
        "MB" | "M" => 1_000_000.0,
        "GB" | "G" => 1_000_000_000.0,
        "TB" | "T" => 1_000_000_000_000.0,
        "KIB" => 1024.0,
        "MIB" => 1024.0 * 1024.0,
        "GIB" => 1024.0 * 1024.0 * 1024.0,
        "TIB" => 1024.0 * 1024.0 * 1024.0 * 1024.0,
        _ => 1.0,
    };
    (num * multiplier) as i64
}
/// List all containers. Optionally filter by state.
#[command]
pub async fn cmd_docker_list_containers(socket: String, all: Option<bool>) -> Result<Vec<DockerContainer>, String> {
    let mut args: Vec<&str> = vec!["ps", "--format", "{{json .}}"];
    if all.unwrap_or(true) {
        args.push("-a");
    }
    let output = hidden_cmd("docker").env("DOCKER_HOST", &socket).args(&args).output().map_err(|e| format!("failed to run docker ps: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut rows = Vec::new();
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let v: serde_json::Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let id = v.get("ID").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let names = v.get("Names").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let image = v.get("Image").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let ports = v.get("Ports").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let state = v.get("State").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let status = v.get("Status").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let created = v.get("CreatedAt").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let short_id = if id.len() >= 12 { id[..12].to_string() } else { id.clone() };
        let status_color = if state.eq_ignore_ascii_case("running") {
            Some("#22c55e".to_string())
        } else if state.eq_ignore_ascii_case("paused") {
            Some("#f59e0b".to_string())
        } else {
            Some("#ef4444".to_string())
        };
        rows.push(DockerContainer {
            id: short_id.clone(),
            name: names,
            container_id: short_id,
            image,
            port: ports,
            cpu: String::new(),
            last_started: if status.is_empty() { created } else { status.clone() },
            state,
            status,
            status_color,
        });
    }
    Ok(rows)
}
/// List all images.
#[command]
pub async fn cmd_docker_list_images(socket: String) -> Result<Vec<DockerImage>, String> {
    let output = hidden_cmd("docker")
        .env("DOCKER_HOST", &socket)
        .args(["images", "--format", "{{json .}}"])
        .output()
        .map_err(|e| format!("failed to run docker images: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut rows = Vec::new();
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let v: serde_json::Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let id = v.get("ID").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let repo = v.get("Repository").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let tag = v.get("Tag").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let size = v.get("Size").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let created = v.get("CreatedAt").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let name = if tag.is_empty() || tag == "<none>" { repo.clone() } else { format!("{}:{}", repo, tag) };
        rows.push(DockerImage {
            id: id.clone(),
            name,
            container_id: id,
            image: repo,
            port: "-".to_string(),
            cpu: size,
            last_started: created,
            status_color: Some("#58a6ff".to_string()),
        });
    }
    Ok(rows)
}
/// List all volumes.
#[command]
pub async fn cmd_docker_list_volumes(socket: String) -> Result<Vec<DockerVolume>, String> {
    let output = hidden_cmd("docker")
        .env("DOCKER_HOST", &socket)
        .args(["volume", "ls", "--format", "{{json .}}"])
        .output()
        .map_err(|e| format!("failed to run docker volume ls: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut rows = Vec::new();
    for line in stdout.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let v: serde_json::Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };
        let name = v.get("Name").and_then(|x| x.as_str()).unwrap_or("").to_string();
        let driver = v.get("Driver").and_then(|x| x.as_str()).unwrap_or("").to_string();
        rows.push(DockerVolume {
            id: name.clone(),
            name,
            container_id: driver,
            image: "-".to_string(),
            port: "-".to_string(),
            cpu: "-".to_string(),
            last_started: "-".to_string(),
            status_color: Some("#58a6ff".to_string()),
        });
    }
    Ok(rows)
}
/// Start one or more containers.
#[command]
pub async fn cmd_docker_start_containers(socket: String, ids: Vec<String>) -> Result<(), String> {
    for id in ids {
        let output = hidden_cmd("docker")
            .env("DOCKER_HOST", &socket)
            .args(["start", &id])
            .output()
            .map_err(|e| format!("failed to start container {}: {}", id, e))?;
        if !output.status.success() {
            return Err(format!("failed to start container {}: {}", id, String::from_utf8_lossy(&output.stderr).trim()));
        }
    }
    Ok(())
}
/// Stop one or more containers.
#[command]
pub async fn cmd_docker_stop_containers(socket: String, ids: Vec<String>) -> Result<(), String> {
    for id in ids {
        let output = hidden_cmd("docker")
            .env("DOCKER_HOST", &socket)
            .args(["stop", &id])
            .output()
            .map_err(|e| format!("failed to stop container {}: {}", id, e))?;
        if !output.status.success() {
            return Err(format!("failed to stop container {}: {}", id, String::from_utf8_lossy(&output.stderr).trim()));
        }
    }
    Ok(())
}
/// Pause one or more containers.
#[command]
pub async fn cmd_docker_pause_containers(socket: String, ids: Vec<String>) -> Result<(), String> {
    for id in ids {
        let output = hidden_cmd("docker")
            .env("DOCKER_HOST", &socket)
            .args(["pause", &id])
            .output()
            .map_err(|e| format!("failed to pause container {}: {}", id, e))?;
        if !output.status.success() {
            return Err(format!("failed to pause container {}: {}", id, String::from_utf8_lossy(&output.stderr).trim()));
        }
    }
    Ok(())
}
/// Restart one or more containers.
#[command]
pub async fn cmd_docker_restart_containers(socket: String, ids: Vec<String>) -> Result<(), String> {
    for id in ids {
        let output = hidden_cmd("docker")
            .env("DOCKER_HOST", &socket)
            .args(["restart", &id])
            .output()
            .map_err(|e| format!("failed to restart container {}: {}", id, e))?;
        if !output.status.success() {
            return Err(format!("failed to restart container {}: {}", id, String::from_utf8_lossy(&output.stderr).trim()));
        }
    }
    Ok(())
}
/// Remove one or more containers. Force removal is optional.
#[command]
pub async fn cmd_docker_remove_containers(socket: String, ids: Vec<String>, force: Option<bool>) -> Result<(), String> {
    for id in ids {
        let mut args: Vec<&str> = vec!["rm"];
        if force.unwrap_or(true) {
            args.push("-f");
        }
        args.push(&id);
        let output =
            hidden_cmd("docker").env("DOCKER_HOST", &socket).args(&args).output().map_err(|e| format!("failed to remove container {}: {}", id, e))?;
        if !output.status.success() {
            return Err(format!("failed to remove container {}: {}", id, String::from_utf8_lossy(&output.stderr).trim()));
        }
    }
    Ok(())
}
/// Remove one or more images.
#[command]
pub async fn cmd_docker_remove_images(socket: String, ids: Vec<String>, force: Option<bool>) -> Result<(), String> {
    for id in ids {
        let mut args: Vec<&str> = vec!["rmi"];
        if force.unwrap_or(true) {
            args.push("-f");
        }
        args.push(&id);
        let output =
            hidden_cmd("docker").env("DOCKER_HOST", &socket).args(&args).output().map_err(|e| format!("failed to remove image {}: {}", id, e))?;
        if !output.status.success() {
            return Err(format!("failed to remove image {}: {}", id, String::from_utf8_lossy(&output.stderr).trim()));
        }
    }
    Ok(())
}
/// Pull one or more images.
#[command]
pub async fn cmd_docker_pull_images(socket: String, names: Vec<String>) -> Result<(), String> {
    for name in names {
        let output = hidden_cmd("docker")
            .env("DOCKER_HOST", &socket)
            .args(["pull", &name])
            .output()
            .map_err(|e| format!("failed to pull image {}: {}", name, e))?;
        if !output.status.success() {
            return Err(format!("failed to pull image {}: {}", name, String::from_utf8_lossy(&output.stderr).trim()));
        }
    }
    Ok(())
}
/// Remove one or more volumes.
#[command]
pub async fn cmd_docker_remove_volumes(socket: String, ids: Vec<String>, force: Option<bool>) -> Result<(), String> {
    for id in ids {
        let mut args: Vec<&str> = vec!["volume", "rm"];
        if force.unwrap_or(true) {
            args.push("-f");
        }
        args.push(&id);
        let output =
            hidden_cmd("docker").env("DOCKER_HOST", &socket).args(&args).output().map_err(|e| format!("failed to remove volume {}: {}", id, e))?;
        if !output.status.success() {
            return Err(format!("failed to remove volume {}: {}", id, String::from_utf8_lossy(&output.stderr).trim()));
        }
    }
    Ok(())
}
/// Inspect a single container and return the raw `docker inspect` JSON.
#[command]
pub async fn cmd_docker_inspect_container(socket: String, id: String) -> Result<serde_json::Value, String> {
    let output = hidden_cmd("docker")
        .env("DOCKER_HOST", &socket)
        .args(["inspect", &id])
        .output()
        .map_err(|e| format!("failed to run docker inspect: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    // `docker inspect` returns a JSON array with a single element.
    let parsed: serde_json::Value = serde_json::from_str(stdout.trim()).map_err(|e| format!("failed to parse docker inspect: {}", e))?;
    if let Some(arr) = parsed.as_array() {
        if let Some(first) = arr.first() {
            return Ok(first.clone());
        }
    }
    Ok(parsed)
}
/// Get the logs of a single container.
#[command]
pub async fn cmd_docker_container_logs(socket: String, id: String, tail: Option<i64>, timestamps: Option<bool>) -> Result<String, String> {
    let tail_str = tail.unwrap_or(200).to_string();
    let mut args: Vec<&str> = vec!["logs", "--tail", &tail_str];
    if timestamps.unwrap_or(true) {
        args.push("-t");
    }
    args.push(&id);
    let output = hidden_cmd("docker").env("DOCKER_HOST", &socket).args(&args).output().map_err(|e| format!("failed to run docker logs: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let mut merged = String::new();
    if !stdout.is_empty() {
        merged.push_str(&stdout);
    }
    if !stderr.is_empty() {
        if !merged.is_empty() && !merged.ends_with('\n') {
            merged.push('\n');
        }
        merged.push_str(&stderr);
    }
    Ok(merged)
}
/// Fetch live resource usage for a single container via `docker stats --no-stream`.
#[command]
pub async fn cmd_docker_container_stats(socket: String, id: String) -> Result<(String, i64, i64), String> {
    let output = hidden_cmd("docker")
        .env("DOCKER_HOST", &socket)
        .args(["stats", "--no-stream", "--format", "{{json .}}", &id])
        .output()
        .map_err(|e| format!("failed to run docker stats: {}", e))?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let line = stdout.lines().find(|l| !l.trim().is_empty()).unwrap_or("").trim();
    if line.is_empty() {
        return Ok(("0.00%".to_string(), 0, 0));
    }
    let v: serde_json::Value = serde_json::from_str(line).map_err(|e| format!("failed to parse docker stats: {}", e))?;
    let cpu = v.get("CPUPerc").and_then(|x| x.as_str()).unwrap_or("0.00%").to_string();
    let mem_used = v.get("MemUsage").and_then(|x| x.as_str()).map(parse_mem_usage).unwrap_or(0);
    Ok((cpu, mem_used, 0))
}
/// Parse the "used / limit" string from `docker stats` and return the used bytes.
fn parse_mem_usage(s: &str) -> i64 {
    s.split('/').next().map(|part| parse_docker_size(part)).unwrap_or(0)
}
