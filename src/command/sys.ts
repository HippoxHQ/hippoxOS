import { invoke } from "@tauri-apps/api/core";
export const sysCommands = {
  async getSystemUsername(): Promise<string> {
    return await invoke("cmd_get_system_username");
  },
};