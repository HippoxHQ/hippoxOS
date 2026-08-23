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
  /**
   * Get current CPU usage percentage
   * @returns CPU usage percentage (0-100)
   */
  async getCpuUsage(): Promise<number> {
    try {
      return await invoke<number>("cmd_get_cpu_usage");
    } catch (error) {
      console.error("[CPU] Failed to get CPU usage:", error);
      return 0;
    }
  },
  /**
   * Get current GPU usage percentage
   * @returns GPU usage percentage (0-100), returns 0 if GPU not available
   */
  async getGpuUsage(): Promise<number> {
    try {
      return await invoke<number>("cmd_get_gpu_usage");
    } catch (error) {
      console.error("[GPU] Failed to get GPU usage:", error);
      return 0;
    }
  },
  /**
   * Get both CPU and GPU usage simultaneously
   * @returns Object containing cpu and gpu usage percentages
   */
  async getSystemUsage(): Promise<{ cpu: number; gpu: number }> {
    try {
      const [cpu, gpu] = await Promise.all([
        this.getCpuUsage(),
        this.getGpuUsage(),
      ]);
      return { cpu, gpu };
    } catch (error) {
      console.error("[System] Failed to get system usage:", error);
      return { cpu: 0, gpu: 0 };
    }
  },
};