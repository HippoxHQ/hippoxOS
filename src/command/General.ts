import { invoke } from "@tauri-apps/api/core";
export interface FileOperationResult {
    success: boolean;
    message: string;
    path?: string;
}
export const generalCommands = {
    openExplorer: async (path: string): Promise<FileOperationResult> => {
        return await invoke("cmd_open_explorer", { path });
    },
    openTerminal: async (path: string): Promise<FileOperationResult> => {
        return await invoke("cmd_open_terminal", { path });
    },
};