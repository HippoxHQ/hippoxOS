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
   * Get current memory usage percentage
   * @returns Memory usage percentage (0-100)
   */
  async getMemoryUsage(): Promise<number> {
    try {
      const value = await invoke<number>("cmd_get_memory_usage");
      return typeof value === "number" ? value : 0;
    } catch (error) {
      console.error("[Memory] Failed to get memory usage:", error);
      return 0;
    }
  },
  /**
   * Get current CPU usage percentage
   * @returns CPU usage percentage (0-100)
   */
  async getCpuUsage(): Promise<number> {
    try {
      const value = await invoke<number>("cmd_get_cpu_usage");
      return typeof value === "number" ? value : 0;
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
      const value = await invoke<number>("cmd_get_gpu_usage");
      return typeof value === "number" ? value : 0;
    } catch (error) {
      console.error("[GPU] Failed to get GPU usage:", error);
      return 0;
    }
  },
  /**
   * Get CPU, GPU and memory usage simultaneously
   * @returns Object containing cpu, gpu and memory usage percentages
   */
  async getSystemUsage(): Promise<{ cpu: number; gpu: number; memory: number }> {
    try {
      const [cpu, gpu, memory] = await Promise.all([
        this.getCpuUsage(),
        this.getGpuUsage(),
        this.getMemoryUsage(),
      ]);
      return { cpu, gpu, memory };
    } catch (error) {
      console.error("[System] Failed to get system usage:", error);
      return { cpu: 0, gpu: 0, memory: 0 };
    }
  },
  /**
   * Get the current operating system identifier.
   * Returns one of: "macos", "windows", "linux", "android", "ios", "freebsd", "dragonfly", "openbsd", "netbsd", "unknown".
   * This value is determined at compile time and cannot be spoofed by frontend scripts.
   */
  async getOs(): Promise<string> {
    try {
      const value = await invoke<string>("cmd_get_os");
      return typeof value === "string" ? value : "unknown";
    } catch (error) {
      console.error("[OS] Failed to get OS:", error);
      return "unknown";
    }
  },
};