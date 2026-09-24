import { invoke } from "@tauri-apps/api/core";
export interface CommitAuthorOverride {
    authorName: string;
    authorEmail: string;
    committerName: string;
    committerEmail: string;
}
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
            authorEmail: string;
            date: string;
            committer: string;
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
    getGitStatusSplit: async (path: string): Promise<{
        staged: Array<{ file: string; status: string; statusDesc: string }>;
        unstaged: Array<{ file: string; status: string; statusDesc: string }>;
        hasChanges: boolean;
    }> => {
        return await invoke("cmd_git_status_split", { path });
    },
    stageFile: async (path: string, file: string): Promise<boolean> => {
        return await invoke("cmd_git_add_file", { path, file });
    },
    unstageFile: async (path: string, file: string): Promise<boolean> => {
        return await invoke("cmd_git_unstage_file", { path, file });
    },
    stageAll: async (path: string): Promise<boolean> => {
        return await invoke("cmd_git_stage_all", { path });
    },
    unstageAll: async (path: string): Promise<boolean> => {
        return await invoke("cmd_git_unstage_all", { path });
    },
    commit: async (path: string, message: string, author?: CommitAuthorOverride): Promise<string> => {
        return await invoke("cmd_git_commit", { path, message, author });
    },
    getStagedFileDiff: async (path: string, file: string): Promise<{
        type: 'diff' | 'new_file' | 'no_diff';
        diff: string;
        content?: string;
        additions?: number;
        deletions?: number;
    }> => {
        return await invoke("cmd_git_staged_file_diff", { path, file });
    },
    getGitUserConfig: async (path: string): Promise<{
        name: string;
        email: string;
    }> => {
        return await invoke("cmd_git_user_config", { path });
    },
    createBranch: async (path: string, branch: string): Promise<string> => {
        return await invoke("cmd_git_create_branch", { path, branch });
    },
    deleteBranch: async (path: string, branch: string): Promise<string> => {
        return await invoke("cmd_git_delete_branch", { path, branch });
    },
    checkoutBranch: async (path: string, branch: string): Promise<string> => {
        return await invoke("cmd_git_checkout_branch", { path, branch });
    },
    getAheadCount: async (path: string): Promise<number> => {
        return await invoke("cmd_git_ahead_count", { path });
    },
    getCommitFiles: async (path: string, hash: string): Promise<{
        files: Array<{ file: string; status: string; statusDesc: string }>;
    }> => {
        return await invoke("cmd_git_commit_files", { path, hash });
    },
    getCommitFileDiff: async (path: string, hash: string, file: string): Promise<{
        type: 'diff' | 'new_file' | 'no_diff';
        diff: string;
        content?: string;
        additions?: number;
        deletions?: number;
    }> => {
        return await invoke("cmd_git_commit_file_diff", { path, hash, file });
    },
    remoteBranchExists: async (path: string, branch: string): Promise<boolean> => {
        return await invoke("cmd_git_remote_branch_exists", { path, branch });
    },
    listTags: async (path: string): Promise<string[]> => {
        return await invoke("cmd_git_list_tags", { path });
    },
    createTag: async (path: string, tag: string, message?: string): Promise<string> => {
        return await invoke("cmd_git_create_tag", { path, tag, message });
    },
    deleteTag: async (path: string, tag: string): Promise<string> => {
        return await invoke("cmd_git_delete_tag", { path, tag });
    },
    tagExists: async (path: string, tag: string): Promise<boolean> => {
        return await invoke("cmd_git_tag_exists", { path, tag });
    },
    getRemoteTags: async (path: string): Promise<string[]> => {
        return await invoke("cmd_git_remote_tags", { path });
    },
    getAllRemoteBranches: async (path: string): Promise<string[]> => {
        return await invoke("cmd_git_all_remote_branches", { path });
    },
    getUnpushedCommits: async (path: string): Promise<{
        commits: Array<{
            hash: string;
            shortHash: string;
            subject: string;
            author: string;
        }>;
    }> => {
        return await invoke("cmd_git_unpushed_commits", { path });
    },
    pushSelected: async (path: string, branches: string[], tags: string[]): Promise<string> => {
        return await invoke("cmd_git_push_selected", { path, branches, tags });
    },
    getUnpushedBranchCount: async (path: string): Promise<number> => {
        return await invoke("cmd_git_unpushed_branch_count", { path });
    },
    getUnpushedTagCount: async (path: string): Promise<number> => {
        return await invoke("cmd_git_unpushed_tag_count", { path });
    },
    checkoutCommit: async (path: string, hash: string): Promise<string> => {
        return await invoke("cmd_git_checkout_commit", { path, hash });
    },
    mergeCommit: async (path: string, hash: string): Promise<string> => {
        return await invoke("cmd_git_merge_commit", { path, hash });
    },
    rebaseOnto: async (path: string, hash: string): Promise<string> => {
        return await invoke("cmd_git_rebase_onto", { path, hash });
    },
    resetToCommit: async (path: string, hash: string): Promise<string> => {
        return await invoke("cmd_git_reset_to_commit", { path, hash });
    },
    revertCommit: async (path: string, hash: string): Promise<string> => {
        return await invoke("cmd_git_revert_commit", { path, hash });
    },
    getGraph: async (path: string): Promise<{
        commits: Array<{
            hash: string;
            shortHash: string;
            message: string;
            author: string;
            authorEmail: string;
            date: string;
            committer: string;
            parents: string[];
            branches: string[];
            tags: string[];
            isHead: boolean;
        }>;
    }> => {
        return await invoke("cmd_git_graph", { path });
    },
};