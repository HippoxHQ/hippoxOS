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

export interface WorkspaceMetadata {
    version: string;
    workspace: {
        path: string;
        name: string;
        created_at: string;
        last_opened: string;
    };
    tabs: {
        files: TabFileMetadata[];
    };
}

export interface TabFileMetadata {
    id: string;
    source_path: string;
    is_dirty: boolean;
    last_modified: string;
    tmp_path: string;
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


    ensureTmpDir: async (workspacePath: string): Promise<FileOperationResult> => {
        return await invoke("cmd_ensure_tmp_dir", { workspacePath });
    },


    loadMetadata: async (workspacePath: string): Promise<WorkspaceMetadata | null> => {
        return await invoke("cmd_load_metadata", { workspacePath });
    },

    saveMetadata: async (workspacePath: string, metadata: WorkspaceMetadata): Promise<FileOperationResult> => {
        return await invoke("cmd_save_metadata", { workspacePath, metadata });
    },


    getTmpFilePath: async (workspacePath: string, tmpName: string): Promise<string> => {
        return await invoke("cmd_get_tmp_file_path", { workspacePath, tmpName });
    },

    checkTmpExists: async (workspacePath: string, tmpName: string): Promise<boolean> => {
        return await invoke("cmd_check_tmp_exists", { workspacePath, tmpName });
    },

    readFromTmp: async (workspacePath: string, tmpName: string): Promise<string | null> => {
        return await invoke("cmd_read_from_tmp", { workspacePath, tmpName });
    },

    writeToTmp: async (workspacePath: string, tmpName: string, content: string): Promise<FileOperationResult> => {
        return await invoke("cmd_write_to_tmp", { workspacePath, tmpName, content });
    },

    deleteFromTmp: async (workspacePath: string, tmpName: string): Promise<FileOperationResult> => {
        return await invoke("cmd_delete_from_tmp", { workspacePath, tmpName });
    },

    copyToTmp: async (workspacePath: string, sourcePath: string, tmpName: string): Promise<FileOperationResult> => {
        return await invoke("cmd_copy_to_tmp", { workspacePath, sourcePath, tmpName });
    },

    compareTmpWithSource: async (workspacePath: string, sourcePath: string, tmpName: string): Promise<boolean> => {
        return await invoke("cmd_compare_tmp_with_source", { workspacePath, sourcePath, tmpName });
    },

    syncMetadataOnRename: async (workspacePath: string, oldPath: string, newPath: string): Promise<FileOperationResult> => {
        return await invoke("cmd_sync_metadata_on_rename", { workspacePath, oldPath, newPath });
    },

    syncMetadataOnDelete: async (workspacePath: string, path: string): Promise<FileOperationResult> => {
        return await invoke("cmd_sync_metadata_on_delete", { workspacePath, path });
    },

    clearAllTmp: async (workspacePath: string): Promise<FileOperationResult> => {
        return await invoke("cmd_clear_all_tmp", { workspacePath });
    },

    cleanupOrphanedTmp: async (workspacePath: string): Promise<FileOperationResult> => {
        return await invoke("cmd_cleanup_orphaned_tmp", { workspacePath });
    },

    generateTmpName: async (sourcePath: string): Promise<string> => {
        return await invoke("cmd_generate_tmp_name", { sourcePath });
    },
};