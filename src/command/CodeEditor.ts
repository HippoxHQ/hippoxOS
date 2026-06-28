import { invoke } from "@tauri-apps/api/core";

export interface FileOperationResult {
    success: boolean;
    message: string;
    path?: string;
}

export interface FileMoveResult {
    success: boolean;
    message: string;
    old_path?: string;
    new_path?: string;
}

export interface SearchMatch {
    line: string;
    line_number: number;
    start_index: number;
    end_index: number;
    context_before: string;
    context_after: string;
    matched_text: string;
}

export interface FileSearchResult {
    file_path: string;
    relative_path: string;
    match_count: number;
    matches: SearchMatch[];
}

export interface SearchInFilesResult {
    success: boolean;
    message: string;
    total_files: number;
    total_matches: number;
    results: FileSearchResult[];
}

export const codeEditorCommands = {
    openInExplorer: async (path: string): Promise<FileOperationResult> => {
        return await invoke("cmd_open_in_explorer", { path });
    },

    openInTerminal: async (path: string): Promise<FileOperationResult> => {
        return await invoke("cmd_open_in_terminal", { path });
    },

    createFile: async (basePath: string, fileName: string): Promise<FileOperationResult> => {
        return await invoke("cmd_create_file", { basePath, fileName });
    },

    createFolder: async (basePath: string, folderName: string): Promise<FileOperationResult> => {
        return await invoke("cmd_create_folder", { basePath, folderName });
    },

    rename: async (oldPath: string, newName: string): Promise<FileMoveResult> => {
        return await invoke("cmd_rename", { oldPath, newName });
    },

    delete: async (path: string): Promise<FileOperationResult> => {
        return await invoke("cmd_delete", { path });
    },

    copy: async (sourcePath: string, targetPath: string): Promise<FileOperationResult> => {
        return await invoke("cmd_copy", { sourcePath, targetPath });
    },

    searchInFiles: async (workspacePath: string, query: string): Promise<SearchInFilesResult> => {
        return await invoke("cmd_search_in_files", { workspacePath, query });
    },

    writeFile: async (path: string, content: string): Promise<FileOperationResult> => {
        return await invoke("cmd_write_file", { path, content });
    },

    ensureStatusDir: async (workspacePath: string): Promise<FileOperationResult> => {
        return await invoke("cmd_ensure_status_dir", { workspacePath });
    },

    getStatusFilePath: async (workspacePath: string, filePath: string): Promise<string> => {
        return await invoke("cmd_get_status_file_path", { workspacePath, filePath });
    },

    checkStatusExists: async (workspacePath: string, filePath: string): Promise<boolean> => {
        return await invoke("cmd_check_status_exists", { workspacePath, filePath });
    },

    readFromStatus: async (workspacePath: string, filePath: string): Promise<string | null> => {
        return await invoke("cmd_read_from_status", { workspacePath, filePath });
    },

    writeToStatus: async (workspacePath: string, filePath: string, content: string): Promise<FileOperationResult> => {
        return await invoke("cmd_write_to_status", { workspacePath, filePath, content });
    },

    deleteFromStatus: async (workspacePath: string, filePath: string): Promise<FileOperationResult> => {
        return await invoke("cmd_delete_from_status", { workspacePath, filePath });
    },

    copyFileToStatus: async (workspacePath: string, filePath: string): Promise<FileOperationResult> => {
        return await invoke("cmd_copy_file_to_status", { workspacePath, filePath });
    },

    compareStatusWithOriginal: async (workspacePath: string, filePath: string): Promise<boolean> => {
        return await invoke("cmd_compare_status_with_original", { workspacePath, filePath });
    },

    clearAllStatus: async (workspacePath: string): Promise<FileOperationResult> => {
        return await invoke("cmd_clear_all_status", { workspacePath });
    },
};