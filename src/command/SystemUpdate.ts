import { invoke } from "@tauri-apps/api/core";
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
     * Download and install the update
     * Downloads the installer from the given URL and runs it
     * @param downloadUrl - The URL to download the installer from
     * @param onProgress - Progress callback (0-100)
     * @returns Promise that resolves when the installer starts
     */
    downloadAndInstallUpdate: (
        downloadUrl: string,
        onProgress?: (progress: number) => void
    ): Promise<void> => {
        return invoke<void>("cmd_download_and_install_update", { downloadUrl });
    },
};
export default systemUpdateCommands;