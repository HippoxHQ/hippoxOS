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

    isGitRepo: async (path: string): Promise<boolean> => {
        return await invoke("cmd_is_git_repo", { path });
    },

    getCurrentBranch: async (path: string): Promise<string> => {
        return await invoke("cmd_get_current_branch", { path });
    },

    getLocalBranches: async (path: string): Promise<string[]> => {
        return await invoke("cmd_get_local_branches", { path });
    },

    getCommitHistory: async (path: string): Promise<{
        commits: Array<{
            hash: string;
            shortHash: string;
            message: string;
            author: string;
            date: string;
            branch: string | null;
            isHead: boolean;
            parents: string[];
        }>;
    }> => {
        return await invoke("cmd_get_commit_history", { path });
    },

    getGitStatus: async (path: string): Promise<{
        hasChanges: boolean;
        changes: Array<{
            file: string;
            status: string;
            statusDesc: string;
        }>;
    }> => {
        return await invoke("cmd_get_git_status", { path });
    },

    getRemoteUrl: async (path: string): Promise<string> => {
        return await invoke("cmd_get_remote_url", { path });
    },

    getRemoteStatus: async (path: string, branch: string): Promise<{
        ahead: number;
        behind: number;
        isSynced: boolean;
        isAhead: boolean;
        isBehind: boolean;
        isDiverged: boolean;
    }> => {
        return await invoke("cmd_get_remote_status", { path, branch });
    },

    getRemoteBranches: async (path: string): Promise<string[]> => {
        return await invoke("cmd_get_remote_branches", { path });
    },

    gitPull: async (path: string, branch: string): Promise<string> => {
        return await invoke("cmd_git_pull", { path, branch });
    },

    gitPush: async (path: string, branch: string): Promise<string> => {
        return await invoke("cmd_git_push", { path, branch });
    },

    getFileDiff: async (path: string, file: string): Promise<{
        type: 'diff' | 'new_file' | 'no_diff';
        diff: string;
        content?: string;
        additions?: number;
        deletions?: number;
    }> => {
        return await invoke("cmd_get_file_diff", { path, file });
    },
};