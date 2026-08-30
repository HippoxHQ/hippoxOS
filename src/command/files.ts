import { invoke } from "@tauri-apps/api/core";
/**
 * File information structure returned from Rust backend
 */
export interface FileInfo {
    name: string;
    path: string;
    is_directory: boolean;
    size?: number;
    modified?: string;
}
/**
 * Detailed file information with MIME type
 */
export interface FileInfoDetail {
    name: string;
    path: string;
    size: number;
    mime_type: string;
    modified?: string;
}
/**
 * Result from save file dialog
 */
export interface SaveFileDialogResult {
    file_path: string | null;
    canceled: boolean;
}
/**
 * File system commands for interacting with the Rust backend
 */
export const filesCommands = {
    /**
     * Save content to a file with a save dialog (legacy, uses CSV filter)
     * @param content - The content to save
     * @param defaultName - Default file name
     */
    async saveFile(content: string, defaultName: string): Promise<void> {
        return await invoke("cmd_save_csv_file", { content, defaultName });
    },
    /**
     * Open a path in the system file explorer
     * @param path - The path to open
     */
    async openPath(path: string): Promise<void> {
        return await invoke("cmd_open_path", { path });
    },
    /**
     * Select a directory using system dialog
     * @returns Selected directory path or null
     */
    async selectDirectory(): Promise<string | null> {
        return await invoke("cmd_select_directory");
    },
    /**
     * Select a file using system dialog
     * @param options - Dialog options
     * @returns Selected file path(s) or null
     */
    async selectFile(options?: {
        multiple?: boolean;
        filters?: { name: string; extensions: string[] }[];
    }): Promise<string | string[] | null> {
        return await invoke("cmd_select_file", { options });
    },
    /**
     * Open save file dialog with custom options
     * @param options - Save dialog options
     * @returns Result with file path and cancel status
     */
    async saveFileDialog(options: {
        title?: string;
        fileName?: string;
        extension?: string;
        filters?: { name: string; extensions: string[] }[];
    }): Promise<SaveFileDialogResult> {
        return await invoke("cmd_save_file_dialog", { options });
    },
    /**
     * Write text content to a file
     * @param path - File path to write to
     * @param content - Text content to write
     */
    async writeTextFile(path: string, content: string): Promise<void> {
        return await invoke("cmd_write_text_file", { path, content });
    },
    /**
     * Write binary content to a file
     * @param path - File path to write to
     * @param data - Binary data as Uint8Array
     */
    async writeBinaryFile(path: string, data: Uint8Array): Promise<void> {
        return await invoke("cmd_write_binary_file", { path, data: Array.from(data) });
    },
    /**
     * Read directory contents
     * @param path - Directory path to read
     * @returns List of file/folder info
     */
    async readDirectory(path: string): Promise<FileInfo[]> {
        return await invoke("cmd_read_directory", { path });
    },
    /**
     * Check if a path exists
     * @param path - Path to check
     * @returns True if path exists
     */
    async pathExists(path: string): Promise<boolean> {
        return await invoke("cmd_path_exists", { path });
    },
    /**
     * Read a text file
     * @param path - File path to read
     * @returns File content as string
     */
    async readTextFile(path: string): Promise<string> {
        return await invoke("cmd_read_text_file", { path });
    },
    /**
     * Read an image file as base64 data URL
     * @param path - Image file path
     * @returns Base64 data URL
     */
    async readImageBase64(path: string): Promise<string> {
        return await invoke("cmd_read_image_base64", { path });
    },
    /**
     * Read a file as base64 string
     * @param path - File path
     * @returns Base64 encoded string
     */
    async readFileBase64(path: string): Promise<string> {
        return await invoke("cmd_read_file_base64", { path });
    },
    /**
     * Get detailed file information
     * @param path - File path
     * @returns File info detail
     */
    async getFileInfo(path: string): Promise<FileInfoDetail> {
        return await invoke("cmd_get_file_info", { path });
    },
    /**
     * Read a file as base64 and get its size
     * @param path - File path
     * @returns Base64 string and file size
     */
    async readFileBase64AndSize(path: string): Promise<{ base64: string; size: number }> {
        const [base64, info] = await Promise.all([
            this.readImageBase64(path),
            this.getFileInfo(path).catch(() => null)
        ]);
        return {
            base64,
            size: info?.size ?? Math.ceil(base64.length * 0.75)
        };
    },
};