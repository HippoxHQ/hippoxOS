import { invoke } from "@tauri-apps/api/core";
 export interface FileOperationResult {
    success: boolean;
    message: string;
    path?: string;
}
 export const generalCommands = {
    openInExplorer: async (path: string): Promise<FileOperationResult> => {
        return await invoke("cmd_open_in_explorer", { path });
    },
};