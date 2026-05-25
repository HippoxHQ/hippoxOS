import { invoke } from "@tauri-apps/api/core";

export interface FileInfo {
    name: string;
    path: string;
    is_directory: boolean;
    size?: number;
    modified?: string;
}

export const filesCommands = {
    async openPath(path: string): Promise<void> {
        return await invoke("cmd_open_path", { path });
    },

    async selectDirectory(): Promise<string | null> {
        return await invoke("cmd_select_directory");
    },

    async selectFile(options?: {
        multiple?: boolean;
        filters?: { name: string; extensions: string[] }[];
    }): Promise<string | string[] | null> {
        return await invoke("cmd_select_file", { options });
    },

    async readDirectory(path: string): Promise<FileInfo[]> {
        return await invoke("cmd_read_directory", { path });
    },

    async pathExists(path: string): Promise<boolean> {
        return await invoke("cmd_path_exists", { path });
    },
};