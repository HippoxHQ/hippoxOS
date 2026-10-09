import { invoke } from "@tauri-apps/api/core";
/**
 * Tauri command bindings for the Api Client subsystem.
 */
export const apiClientCommands = {
  /**
   * Get the on-disk directory path of an Api Client session (project).
   */
  async getApiSessionDir(sessionId: string): Promise<string> {
    return await invoke<string>("cmd_get_api_session_dir", { sessionId });
  },
};