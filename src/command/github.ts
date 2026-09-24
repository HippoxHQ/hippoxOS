import { invoke } from "@tauri-apps/api/core";
export const githubCommands = {
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
    /**
     * Split git status into staged and unstaged buckets.
     * Uses `git status --porcelain=v1` and inspects both status columns.
     */
    getGitStatusSplit: async (path: string): Promise<{
        staged: Array<{ file: string; status: string; statusDesc: string }>;
        unstaged: Array<{ file: string; status: string; statusDesc: string }>;
        hasChanges: boolean;
    }> => {
        return await invoke("cmd_git_status_split", { path });
    },
    /** Stage a single file (git add -- <file>). */
    stageFile: async (path: string, file: string): Promise<boolean> => {
        return await invoke("cmd_git_add_file", { path, file });
    },
    /** Unstage a single file (git reset HEAD -- <file>). */
    unstageFile: async (path: string, file: string): Promise<boolean> => {
        return await invoke("cmd_git_unstage_file", { path, file });
    },
    /** Stage every changed file (git add -A). */
    stageAll: async (path: string): Promise<boolean> => {
        return await invoke("cmd_git_stage_all", { path });
    },
    /** Unstage every staged file (git reset HEAD -- .). */
    unstageAll: async (path: string): Promise<boolean> => {
        return await invoke("cmd_git_unstage_all", { path });
    },
    /** Commit staged changes (git commit -m <message>). */
    commit: async (path: string, message: string): Promise<string> => {
        return await invoke("cmd_git_commit", { path, message });
    },
    /** Diff of a single staged file (git diff --cached -- <file>). */
    getStagedFileDiff: async (path: string, file: string): Promise<{
        type: 'diff' | 'new_file' | 'no_diff';
        diff: string;
        content?: string;
        additions?: number;
        deletions?: number;
    }> => {
        return await invoke("cmd_git_staged_file_diff", { path, file });
    },
};