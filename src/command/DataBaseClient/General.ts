import { invoke } from "@tauri-apps/api/core";
/**
 * Tauri command bindings for the DataBase Client subsystem.
 */
export const databaseClientCommands = {
  /**
   * Get the on-disk directory path of a DataBase Client session (project).
   */
  async getDatabaseSessionDir(sessionId: string): Promise<string> {
    return await invoke<string>("cmd_get_database_session_dir", { sessionId });
  },
};