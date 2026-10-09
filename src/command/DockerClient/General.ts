import { invoke } from "@tauri-apps/api/core";
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
};