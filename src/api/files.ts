import { invoke } from "@tauri-apps/api/core";

export interface FileInfo {
    name: string;
    path: string;
    is_directory: boolean;
    size?: number;
    modified?: string;
}

export interface FileInfoDetail {
    name: string;
    path: string;
    size: number;
    mime_type: string;
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

    async readTextFile(path: string): Promise<string> {
        return await invoke("cmd_read_text_file", { path });
    },

    async readImageBase64(path: string): Promise<string> {
        return await invoke("cmd_read_image_base64", { path });
    },

    async readFileBase64(path: string): Promise<string> {
        return await invoke("cmd_read_file_base64", { path });
    },

    async getFileInfo(path: string): Promise<FileInfoDetail> {
        return await invoke("cmd_get_file_info", { path });
    },
};