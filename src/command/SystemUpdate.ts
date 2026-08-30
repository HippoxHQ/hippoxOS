import { invoke } from "@tauri-apps/api/core";
export interface VersionInfo {
    current_version: string;
    latest_version: string;
    has_update: boolean;
}
/**
 * System update commands for checking version updates
 */
export const systemUpdateCommands = {
    /**
     * Check for version updates from GitHub
     * @returns VersionInfo containing current version, latest version, and update status
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
};
export default systemUpdateCommands;