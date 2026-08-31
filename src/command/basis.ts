import { invoke } from "@tauri-apps/api/core";
export const basisCommands = {
    getHippoxVersions: async (): Promise<Record<string, string>> => {
        return await invoke("cmd_get_hippox_versions");
    },
};