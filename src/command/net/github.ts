import { invoke } from "@tauri-apps/api/core";

export const githubCommands = {
    getCrateVersion: async (crateName: string): Promise<string> => {
        return await invoke("cmd_get_crate_version", { crateName });
    },

    getHippoxVersions: async (): Promise<Record<string, string>> => {
        return await invoke("cmd_get_hippox_versions");
    },

    verifyGithubRepo: async (repoUrl: string): Promise<{
        valid: boolean;
        owner?: string;
        name?: string;
        description?: string;
        stars?: number;
        forks?: number;
        private?: boolean;
        default_branch?: string;
        error?: string;
    }> => {
        return await invoke("cmd_verify_github_repo", { repoUrl });
    },

    getGithubBranches: async (repoUrl: string): Promise<{
        branches: string[];
        error?: string;
    }> => {
        return await invoke("cmd_get_github_branches", { repoUrl });
    },

    cloneRepository: async (repoUrl: string, targetPath: string, branch?: string): Promise<void> => {
        return await invoke("cmd_clone_github_repo", { repoUrl, targetPath, branch });
    },
};