import { invoke } from "@tauri-apps/api/core";
export const basisCommands = {
    getHippoxVersions: async (): Promise<Record<string, string>> => {
        return await invoke("cmd_get_hippox_versions");
    },
    /**
   * Fetch About markdown content from GitHub
   * @param language - Language code: "zh" or "en"
   * @returns Markdown content as string
   */
    fetchAboutMarkdown: async (language: "zh" | "en"): Promise<string> => {
        return await invoke("cmd_fetch_about_markdown", { language });
    },
};