import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
/**
 * Version information returned from the backend
 */
export interface VersionInfo {
    current_version: string;
    latest_version: string;
    has_update: boolean;
    platform: string;
    arch: string;
    download_url: string | null;
}
/**
 * Event name used by the backend to stream download progress (0-100).
 */
export const UPDATE_DOWNLOAD_PROGRESS_EVENT = "update-download-progress";
/**
 * System update commands for checking and installing version updates
 */
export const systemUpdateCommands = {
    /**
     * Check for version updates from GitHub
     * @returns VersionInfo containing current version, latest version, update status, platform, arch, and download URL
     */
    checkVersionUpdate: (): Promise<VersionInfo> => {
        return invoke<VersionInfo>("cmd_check_version_update");
    },
    /**
     * Get current app version only
     * @returns Current version string
     */
    getAppVersion: (): Promise<string> => {
        return invoke<string>("cmd_get_app_version");
    },
    /**
     * Subscribe to backend download progress events.
     */
    onDownloadProgress: async (callback: (progress: number) => void): Promise<UnlistenFn> => {
        return listen<number>(UPDATE_DOWNLOAD_PROGRESS_EVENT, (event) => {
            const value = typeof event.payload === "number" ? event.payload : 0;
            callback(Math.max(0, Math.min(100, value)));
        });
    },
    /**
     * Download and install the update.
     *
     * @param downloadUrl - The URL to download the installer from
     * @param onProgress - Optional progress callback (0-100)
     * @returns Promise that resolves when the installer starts, or rejects
     *          with "cancelled" when the user cancels the download.
     */
    downloadAndInstallUpdate: async (
        downloadUrl: string,
        onProgress?: (progress: number) => void
    ): Promise<void> => {
        let unlisten: UnlistenFn | null = null;
        if (onProgress) {
            unlisten = await systemUpdateCommands.onDownloadProgress(onProgress);
        }
        try {
            await invoke<void>("cmd_download_and_install_update", { downloadUrl });
        } finally {
            if (unlisten) {
                unlisten();
            }
        }
    },
    /**
     * Request cancellation of the in-flight update download.
     */
    cancelUpdataDownload: (): Promise<void> => {
        return invoke<void>("cmd_cancel_update_download");
    },
    /**
     * Fetch the markdown body of the latest GitHub release for hippoxOS.
     */
    fetchReleaseMarkdown: (): Promise<string> => {
        return invoke<string>("cmd_fetch_release_markdown");
    },
};
export default systemUpdateCommands;