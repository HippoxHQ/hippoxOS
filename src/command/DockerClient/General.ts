import { invoke } from "@tauri-apps/api/core";
export interface DockerDiskUsage {
  images: number;
  containers: number;
  volumes: number;
  buildCache: number;
  total: number;
}
export interface DockerCounts {
  containers: number;
  running: number;
  paused: number;
  stopped: number;
  images: number;
  volumes: number;
}
export interface DockerEnvironment {
  available: boolean;
  engineType: string;
  engineVersion: string;
  apiVersion: string;
  os: string;
  arch: string;
  kernelVersion: string;
  storageDriver: string;
  loggingDriver: string;
  cgroupVersion: string;
  dockerRootDir: string;
  socketPath: string;
  buildkitEnabled: boolean;
  composeEnabled: boolean;
  ncpu: number;
  memTotal: number;
  memUsed: number;
  diskUsage: DockerDiskUsage;
  counts: DockerCounts;
  goVersion?: string;
  gitCommit?: string;
  buildTime?: string;
  defaultRuntime?: string;
  runtimes?: string[];
  securityOptions?: string[];
}
export interface DockerContainer {
  id: string;
  name: string;
  containerId: string;
  image: string;
  port: string;
  cpu: string;
  lastStarted: string;
  state: string;
  status: string;
  statusColor?: string;
}
export interface DockerImage {
  id: string;
  name: string;
  containerId: string;
  image: string;
  port: string;
  cpu: string;
  lastStarted: string;
  statusColor?: string;
}
export interface DockerVolume {
  id: string;
  name: string;
  containerId: string;
  image: string;
  port: string;
  cpu: string;
  lastStarted: string;
  statusColor?: string;
}
/**
 * Tauri command bindings for the Docker Client subsystem.
 */
export const dockerClientCommands = {
  /**
   * Get the on-disk directory path of a Docker Client session (project).
   */
  async getDockerSessionDir(sessionId: string): Promise<string> {
    return await invoke<string>("cmd_get_docker_session_dir", { sessionId });
  },
  /**
   * Detect the current Docker environment on the host.
   */
  async detectEnvironment(): Promise<DockerEnvironment> {
    return await invoke<DockerEnvironment>("cmd_docker_detect_environment");
  },
  /**
   * List all containers. `all = true` includes stopped containers.
   */
  async listContainers(socket: string, all: boolean = true): Promise<DockerContainer[]> {
    return await invoke<DockerContainer[]>("cmd_docker_list_containers", {
      socket,
      all,
    });
  },
  /**
   * List all images.
   */
  async listImages(socket: string): Promise<DockerImage[]> {
    return await invoke<DockerImage[]>("cmd_docker_list_images", { socket });
  },
  /**
   * List all volumes.
   */
  async listVolumes(socket: string): Promise<DockerVolume[]> {
    return await invoke<DockerVolume[]>("cmd_docker_list_volumes", { socket });
  },
  /**
   * Start one or more containers by id.
   */
  async startContainers(socket: string, ids: string[]): Promise<void> {
    return await invoke<void>("cmd_docker_start_containers", { socket, ids });
  },
  /**
   * Stop one or more containers by id.
   */
  async stopContainers(socket: string, ids: string[]): Promise<void> {
    return await invoke<void>("cmd_docker_stop_containers", { socket, ids });
  },
  /**
   * Pause one or more containers by id.
   */
  async pauseContainers(socket: string, ids: string[]): Promise<void> {
    return await invoke<void>("cmd_docker_pause_containers", { socket, ids });
  },
  /**
   * Restart one or more containers by id.
   */
  async restartContainers(socket: string, ids: string[]): Promise<void> {
    return await invoke<void>("cmd_docker_restart_containers", { socket, ids });
  },
  /**
   * Remove one or more containers by id. `force` maps to `docker rm -f`.
   */
  async removeContainers(socket: string, ids: string[], force: boolean = true): Promise<void> {
    return await invoke<void>("cmd_docker_remove_containers", {
      socket,
      ids,
      force,
    });
  },
  /**
   * Remove one or more images by id. `force` maps to `docker rmi -f`.
   */
  async removeImages(socket: string, ids: string[], force: boolean = true): Promise<void> {
    return await invoke<void>("cmd_docker_remove_images", {
      socket,
      ids,
      force,
    });
  },
  /**
   * Pull one or more images by name.
   */
  async pullImages(socket: string, names: string[]): Promise<void> {
    return await invoke<void>("cmd_docker_pull_images", { socket, names });
  },
  /**
   * Remove one or more volumes by id. `force` maps to `docker volume rm -f`.
   */
  async removeVolumes(socket: string, ids: string[], force: boolean = true): Promise<void> {
    return await invoke<void>("cmd_docker_remove_volumes", {
      socket,
      ids,
      force,
    });
  },
  /**
   * Inspect a single container and return the raw `docker inspect` JSON.
   */
  async inspectContainer(socket: string, id: string): Promise<any> {
    return await invoke<any>("cmd_docker_inspect_container", { socket, id });
  },
  /**
   * Fetch the logs of a single container.
   */
  async containerLogs(socket: string, id: string, tail: number = 200, timestamps: boolean = true): Promise<string> {
    return await invoke<string>("cmd_docker_container_logs", {
      socket,
      id,
      tail,
      timestamps,
    });
  },
  /**
   * Fetch live resource usage for a single container.
   */
  async containerStats(socket: string, id: string): Promise<[string, number, number]> {
    return await invoke<[string, number, number]>("cmd_docker_container_stats", { socket, id });
  },
};
export default dockerClientCommands;