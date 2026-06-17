import { invoke } from "@tauri-apps/api/core";

export const basisCommands = {
    getCrateVersion: async (crateName: string): Promise<string> => {
        return await invoke("cmd_get_crate_version", { crateName });
    },

    getHippoxVersions: async (): Promise<Record<string, string>> => {
        return await invoke("cmd_get_hippox_versions");
    },
};