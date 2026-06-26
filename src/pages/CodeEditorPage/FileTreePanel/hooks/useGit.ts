import { useState, useEffect } from "react";
import { GitInfo, GitCommit, FileChange } from "../types";
import { githubCommands } from "../../../../command/net/github";

export const useGit = (workspacePath: string | null | undefined) => {
  const [gitInfo, setGitInfo] = useState<GitInfo | null>(null);
  const [loadingGit, setLoadingGit] = useState(false);
  const [fileChanges, setFileChanges] = useState<FileChange[]>([]);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  const buildCommitTree = (commits: any[]): GitCommit[] => {
    const commitMap = new Map<string, GitCommit>();
    const result: GitCommit[] = [];
    commits.forEach((c) => {
      const commit: GitCommit = {
        hash: c.hash,
        shortHash: c.shortHash,
        message: c.message,
        author: c.author,
        date: c.date,
        branch: c.branch,
        isHead: c.isHead,
        parents: c.parents || [],
        children: [],
      };
      commitMap.set(c.hash, commit);
      result.push(commit);
    });
    result.forEach((commit) => {
      commit.parents.forEach((parentHash) => {
        const parent = commitMap.get(parentHash);
        if (parent && !parent.children.includes(commit.hash)) {
          parent.children.push(commit.hash);
        }
      });
    });
    return result.sort((a, b) => {
      return b.date.localeCompare(a.date);
    });
  };

  const loadFileChanges = async (path: string) => {
    if (!path) return;
    setLoadingChanges(true);
    try {
      const status = await githubCommands.getGitStatus(path);
      const changes = status.changes.map((c) => ({
        file: c.file,
        status: c.status,
        statusDesc: c.statusDesc,
        additions: Math.floor(Math.random() * 20) + 1,
        deletions: Math.floor(Math.random() * 10) + 1,
      }));
      setFileChanges(changes);
    } catch (error) {
      console.error("Failed to load file changes:", error);
      setFileChanges([]);
    } finally {
      setLoadingChanges(false);
    }
  };

  const checkGitRepo = async (path: string) => {
    if (!path) return;
    setLoadingGit(true);
    try {
      const isRepo = await githubCommands.isGitRepo(path);
      if (isRepo) {
        const branch = await githubCommands.getCurrentBranch(path);
        const history = await githubCommands.getCommitHistory(path);
        const status = await githubCommands.getGitStatus(path);
        let remoteUrl: string | null = null;
        let remoteStatus = null;
        let localBranches: string[] = [];
        let remoteBranches: string[] = [];
        try {
          remoteUrl = await githubCommands.getRemoteUrl(path);
        } catch {
          remoteUrl = null;
        }
        try {
          localBranches = await githubCommands.getLocalBranches(path);
        } catch {
          localBranches = [];
        }
        try {
          remoteBranches = await githubCommands.getRemoteBranches(path);
        } catch {
          remoteBranches = [];
        }

        if (remoteUrl) {
          try {
            remoteStatus = await githubCommands.getRemoteStatus(path, branch);
          } catch {
            remoteStatus = null;
          }
        }

        const commits = buildCommitTree(history.commits);

        setGitInfo({
          branch: branch,
          hasChanges: status.hasChanges,
          commits: commits,
          remoteUrl: remoteUrl,
          remoteStatus: remoteStatus,
          localBranches: localBranches,
          remoteBranches: remoteBranches,
        });

        await loadFileChanges(path);
      } else {
        setGitInfo(null);
        setFileChanges([]);
      }
    } catch (error) {
      console.error("Failed to check Git repo:", error);
      setGitInfo(null);
      setFileChanges([]);
    } finally {
      setLoadingGit(false);
    }
  };

  const handlePull = async () => {
    if (!workspacePath || !gitInfo) return;
    setIsPulling(true);
    try {
      await githubCommands.gitPull(workspacePath, gitInfo.branch);
      await checkGitRepo(workspacePath);
    } catch (error) {
      console.error("Pull failed:", error);
    } finally {
      setIsPulling(false);
    }
  };

  const handlePush = async () => {
    if (!workspacePath || !gitInfo) return;
    setIsPushing(true);
    try {
      await githubCommands.gitPush(workspacePath, gitInfo.branch);
      await checkGitRepo(workspacePath);
    } catch (error) {
      console.error("Push failed:", error);
    } finally {
      setIsPushing(false);
    }
  };

  const getRemoteStatusText = () => {
    if (!gitInfo?.remoteStatus) return null;
    const { ahead, behind, isSynced, isAhead, isBehind, isDiverged } =
      gitInfo.remoteStatus;

    if (isSynced) {
      return { text: "✅ 已同步", color: "#4caf50" };
    }
    if (isDiverged) {
      return { text: `⬆ ${ahead} · ⬇ ${behind} (已分叉)`, color: "#ff6b6b" };
    }
    if (isAhead) {
      return { text: `⬆ ${ahead} 个提交待推送`, color: "#ffa500" };
    }
    if (isBehind) {
      return { text: `⬇ ${behind} 个提交待拉取`, color: "#00aaff" };
    }
    return null;
  };

  useEffect(() => {
    if (workspacePath) {
      checkGitRepo(workspacePath);
    }
  }, [workspacePath]);

  return {
    gitInfo,
    loadingGit,
    fileChanges,
    loadingChanges,
    isPulling,
    isPushing,
    handlePull,
    handlePush,
    getRemoteStatusText,
    checkGitRepo,
  };
};