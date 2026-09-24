import { codeEditorCommands } from "../../../command/CodeEditor";
import { filesCommands } from "../../../command/files";
import { githubCommands } from "../../../command/github";
import { SYSTEM_CO_AUTHOR_NAME, SYSTEM_CO_AUTHOR_EMAIL } from "../constants";
import { registerFunction } from "./FunctionExecutor";
/**
 * Strictly validate that all required parameters are present and non-empty.
 */
function validateRequiredParams(params: Record<string, any>, requiredFields: string[], functionName: string): void {
    const missing: string[] = [];
    for (const field of requiredFields) {
        const value = params[field];
        if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
            missing.push(field);
        }
    }
    if (missing.length > 0) {
        throw new Error(`Missing required parameter(s) for ${functionName}: ${missing.join(", ")}. All parameters MUST be provided. If you cannot determine a value, do NOT execute this command.`);
    }
}
// Holds the workspace path for the current session.
let activeWorkspacePath: string | null = null;
/** Set by the chat panel before executing commands. */
export function setWorkspacePath(path: string | null): void {
    activeWorkspacePath = path;
}
/** Read the current workspace path. */
export function getActiveWorkspacePath(): string | null {
    return activeWorkspacePath;
}
/**
 * Return the project root directory that is currently open.
 */
registerFunction({
    name: "getWorkspacePath",
    handler: async () => {
        const path = getActiveWorkspacePath();
        if (!path) {
            throw new Error("No workspace is currently open. Ask the user to open a folder first.");
        }
        return { workspace_path: path };
    },
    description: "Return the absolute path of the currently opened project root directory.",
});
registerFunction({
    name: "createFile",
    handler: async (params) => {
        validateRequiredParams(params, ["base_path", "file_name"], "createFile");
        const { base_path, file_name } = params;
        return await codeEditorCommands.createFile(base_path, file_name);
    },
    description: "Create a new empty file inside the project. `base_path` MUST be the workspace root (or a subdirectory of it) and `file_name` is the new file name.",
});
registerFunction({
    name: "createFolder",
    handler: async (params) => {
        validateRequiredParams(params, ["base_path", "folder_name"], "createFolder");
        const { base_path, folder_name } = params;
        return await codeEditorCommands.createFolder(base_path, folder_name);
    },
    description: "Create a new folder inside the project. `base_path` MUST be the workspace root (or a subdirectory of it).",
});
registerFunction({
    name: "renamePath",
    handler: async (params) => {
        validateRequiredParams(params, ["old_path", "new_name"], "renamePath");
        const { old_path, new_name } = params;
        return await codeEditorCommands.rename(old_path, new_name);
    },
    description: "Rename a file or folder. `old_path` is the absolute path of the target; `new_name` is the new base name (NOT a full path).",
});
registerFunction({
    name: "deletePath",
    handler: async (params) => {
        validateRequiredParams(params, ["path"], "deletePath");
        const { path } = params;
        return await codeEditorCommands.delete(path);
    },
    description: "Delete a file or folder from the project. `path` is the absolute path of the target.",
});
registerFunction({
    name: "copyPath",
    handler: async (params) => {
        validateRequiredParams(params, ["source_path", "target_path"], "copyPath");
        const { source_path, target_path } = params;
        return await codeEditorCommands.copy(source_path, target_path);
    },
    description: "Copy a file or folder. `source_path` and `target_path` are absolute paths.",
});
registerFunction({
    name: "writeFile",
    handler: async (params) => {
        validateRequiredParams(params, ["path", "content"], "writeFile");
        const { path, content } = params;
        return await codeEditorCommands.writeFile(path, content);
    },
    description: "Overwrite a text file with the given content. `path` is the absolute path.",
});
registerFunction({
    name: "readFile",
    handler: async (params) => {
        validateRequiredParams(params, ["path"], "readFile");
        const { path } = params;
        const content = await filesCommands.readTextFile(path);
        return { path, content };
    },
    description: "Read a text file from disk and return its content. `path` is the absolute path.",
});
registerFunction({
    name: "readDirectory",
    handler: async (params) => {
        validateRequiredParams(params, ["path"], "readDirectory");
        const { path } = params;
        const entries = await filesCommands.readDirectory(path);
        return { path, entries };
    },
    description: "List the contents of a directory. `path` is the absolute path.",
});
registerFunction({
    name: "pathExists",
    handler: async (params) => {
        validateRequiredParams(params, ["path"], "pathExists");
        const { path } = params;
        const exists = await filesCommands.pathExists(path);
        return { path, exists };
    },
    description: "Check whether a path exists on disk. `path` is the absolute path.",
});
registerFunction({
    name: "searchInFiles",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "query"], "searchInFiles");
        const { workspace_path, query } = params;
        return await codeEditorCommands.searchInFiles(workspace_path, query);
    },
    description: "Search for a literal text query inside the project. Returns matched files, lines, and context. `workspace_path` MUST be the project root.",
});
registerFunction({
    name: "openInTerminal",
    handler: async (params) => {
        validateRequiredParams(params, ["path"], "openInTerminal");
        const { path } = params;
        return await codeEditorCommands.openInTerminal(path);
    },
    description: "Open the given path in the system terminal.",
});
registerFunction({
    name: "gitIsRepo",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path"], "gitIsRepo");
        const { workspace_path } = params;
        const isRepo = await githubCommands.isGitRepo(workspace_path);
        return { workspace_path, is_repo: isRepo };
    },
    description: "Check whether the project root is a Git repository.",
});
registerFunction({
    name: "gitStatus",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path"], "gitStatus");
        const { workspace_path } = params;
        return await githubCommands.getGitStatusSplit(workspace_path);
    },
    description: "Return the current Git status split into `staged` and `unstaged` lists.",
});
registerFunction({
    name: "gitCurrentBranch",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path"], "gitCurrentBranch");
        const { workspace_path } = params;
        const branch = await githubCommands.getCurrentBranch(workspace_path);
        return { branch };
    },
    description: "Return the current Git branch name (empty string when HEAD is detached).",
});
registerFunction({
    name: "gitLocalBranches",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path"], "gitLocalBranches");
        const { workspace_path } = params;
        const branches = await githubCommands.getLocalBranches(workspace_path);
        return { branches };
    },
    description: "List all local Git branches.",
});
registerFunction({
    name: "gitRemoteUrl",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path"], "gitRemoteUrl");
        const { workspace_path } = params;
        const url = await githubCommands.getRemoteUrl(workspace_path).catch(() => "");
        return { remote_url: url };
    },
    description: "Return the configured `origin` remote URL (empty string when none).",
});
registerFunction({
    name: "gitFileDiff",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "file"], "gitFileDiff");
        const { workspace_path, file } = params;
        return await githubCommands.getFileDiff(workspace_path, file);
    },
    description: "Return the working-tree diff for a single file. `file` is a repo-relative path.",
});
registerFunction({
    name: "gitStageFile",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "file"], "gitStageFile");
        const { workspace_path, file } = params;
        const ok = await githubCommands.stageFile(workspace_path, file);
        return { file, staged: ok };
    },
    description: "Stage a single file (git add -- <file>). `file` is a repo-relative path.",
});
registerFunction({
    name: "gitUnstageFile",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "file"], "gitUnstageFile");
        const { workspace_path, file } = params;
        const ok = await githubCommands.unstageFile(workspace_path, file);
        return { file, unstaged: ok };
    },
    description: "Unstage a single file (git reset HEAD -- <file>).",
});
registerFunction({
    name: "gitStageAll",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path"], "gitStageAll");
        const { workspace_path } = params;
        const ok = await githubCommands.stageAll(workspace_path);
        return { staged_all: ok };
    },
    description: "Stage every changed file (git add -A).",
});
registerFunction({
    name: "gitUnstageAll",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path"], "gitUnstageAll");
        const { workspace_path } = params;
        const ok = await githubCommands.unstageAll(workspace_path);
        return { unstaged_all: ok };
    },
    description: "Unstage every staged file (git reset HEAD -- .).",
});
registerFunction({
    name: "gitRestoreFile",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "file"], "gitRestoreFile");
        const { workspace_path, file, is_staged } = params;
        const staged = is_staged === true;
        const ok = await githubCommands.restoreFile(workspace_path, file, staged);
        return { file, is_staged: staged, restored: ok };
    },
    description: "Restore a file's changes. When `is_staged` is true, unstage it; otherwise discard working-tree changes.",
});
registerFunction({
    name: "gitStopTracking",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "file"], "gitStopTracking");
        const { workspace_path, file } = params;
        const ok = await githubCommands.stopTracking(workspace_path, file);
        return { file, stopped_tracking: ok };
    },
    description: "Stop tracking a file while keeping it on disk (git rm --cached -- <file>).",
});
registerFunction({
    name: "gitDeleteFile",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "file"], "gitDeleteFile");
        const { workspace_path, file } = params;
        const ok = await githubCommands.deleteFile(workspace_path, file);
        return { file, deleted: ok };
    },
    description: "Delete a file from the working tree. Tracked files use git rm -f, untracked files are removed from disk.",
});
registerFunction({
    name: "gitCommit",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "message"], "gitCommit");
        const { workspace_path, message } = params;
        const coAuthorName = (params.co_author_name ?? SYSTEM_CO_AUTHOR_NAME).toString().trim() || SYSTEM_CO_AUTHOR_NAME;
        const coAuthorEmail = (params.co_author_email ?? SYSTEM_CO_AUTHOR_EMAIL).toString().trim() || SYSTEM_CO_AUTHOR_EMAIL;
        const trailer = `Co-authored-by: ${coAuthorName} <${coAuthorEmail}>`;
        const alreadyHasTrailer = String(message).includes("Co-authored-by:");
        const finalMessage = alreadyHasTrailer ? String(message) : `${message}\n\n${trailer}`;
        const result = await githubCommands.commit(workspace_path, finalMessage);
        return {
            result,
            co_author: { name: coAuthorName, email: coAuthorEmail },
        };
    },
    description: "Commit currently staged changes. The HippoxOS co-author identity is appended automatically as a Co-authored-by trailer unless the caller supplies co_author_name / co_author_email.",
});
registerFunction({
    name: "gitCreateBranch",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "branch"], "gitCreateBranch");
        const { workspace_path, branch } = params;
        const result = await githubCommands.createBranch(workspace_path, branch);
        return { branch, result };
    },
    description: "Create a new branch and switch to it (git checkout -b <branch>).",
});
registerFunction({
    name: "gitDeleteBranch",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "branch"], "gitDeleteBranch");
        const { workspace_path, branch } = params;
        const result = await githubCommands.deleteBranch(workspace_path, branch);
        return { branch, result };
    },
    description: "Delete a local branch (git branch -D <branch>).",
});
registerFunction({
    name: "gitCheckoutBranch",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "branch"], "gitCheckoutBranch");
        const { workspace_path, branch } = params;
        const result = await githubCommands.checkoutBranch(workspace_path, branch);
        return { branch, result };
    },
    description: "Switch to an existing local branch (git checkout <branch>).",
});
registerFunction({
    name: "gitPull",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "branch"], "gitPull");
        const { workspace_path, branch } = params;
        const result = await githubCommands.gitPull(workspace_path, branch);
        return { branch, result };
    },
    description: "Pull the given branch from origin (git pull origin <branch>).",
});
registerFunction({
    name: "gitPush",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "branch"], "gitPush");
        const { workspace_path, branch } = params;
        const coAuthorName = (params.co_author_name ?? SYSTEM_CO_AUTHOR_NAME).toString().trim() || SYSTEM_CO_AUTHOR_NAME;
        const coAuthorEmail = (params.co_author_email ?? SYSTEM_CO_AUTHOR_EMAIL).toString().trim() || SYSTEM_CO_AUTHOR_EMAIL;
        const result = await githubCommands.gitPush(workspace_path, branch);
        return {
            branch,
            result,
            co_author: { name: coAuthorName, email: coAuthorEmail },
        };
    },
    description: "Push the given branch to origin. The HippoxOS co-author identity is recorded on the response unless the caller supplies co_author_name / co_author_email.",
});
registerFunction({
    name: "gitListTags",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path"], "gitListTags");
        const { workspace_path } = params;
        const tags = await githubCommands.listTags(workspace_path);
        return { tags };
    },
    description: "List all local Git tags.",
});
registerFunction({
    name: "gitCreateTag",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "tag"], "gitCreateTag");
        const { workspace_path, tag, message } = params;
        const result = await githubCommands.createTag(workspace_path, tag, message);
        return { tag, result };
    },
    description: "Create a tag. When `message` is provided, an annotated tag is created.",
});
registerFunction({
    name: "gitDeleteTag",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "tag"], "gitDeleteTag");
        const { workspace_path, tag } = params;
        const result = await githubCommands.deleteTag(workspace_path, tag);
        return { tag, result };
    },
    description: "Delete a local tag (git tag -d <tag>).",
});
registerFunction({
    name: "gitLog",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path"], "gitLog");
        const { workspace_path } = params;
        const result = await githubCommands.getGraph(workspace_path);
        return result;
    },
    description: "Return the commit graph (hash, message, author, parents, branches, tags).",
});
registerFunction({
    name: "gitCommitFiles",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "hash"], "gitCommitFiles");
        const { workspace_path, hash } = params;
        return await githubCommands.getCommitFiles(workspace_path, hash);
    },
    description: "List files changed by a specific commit.",
});
registerFunction({
    name: "gitCommitFileDiff",
    handler: async (params) => {
        validateRequiredParams(params, ["workspace_path", "hash", "file"], "gitCommitFileDiff");
        const { workspace_path, hash, file } = params;
        return await githubCommands.getCommitFileDiff(workspace_path, hash, file);
    },
    description: "Return the diff of a single file in a specific commit.",
});