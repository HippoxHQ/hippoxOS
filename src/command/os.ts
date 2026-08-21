import { invoke } from "@tauri-apps/api/core";
export const osCommands = {
  /**
   * Get system username
   */
  async getSystemUsername(): Promise<string> {
    return await invoke("cmd_get_system_username");
  },
  /**
   * Open URL in system default browser
   * @param url - The URL to open
   */
  async openBrowser(url: string): Promise<void> {
    if (!url) {
      console.error("[Browser] URL is empty");
      return;
    }
    try {
      await invoke("cmd_open_browser", { url });
    } catch (error) {
      console.error("[Browser] Failed to open URL:", error);
      // Fallback: try using window.open
      window.open(url, "_blank");
    }
  },
};