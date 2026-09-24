import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { User } from "lucide-react";
import { STAGED_SPLIT_MIN, STAGED_SPLIT_MAX, STAGED_SPLIT_DEFAULT, LEFT_COL_MIN, LEFT_COL_MAX, LEFT_COL_DEFAULT, TOP_SPLIT_MIN, TOP_SPLIT_MAX, TOP_SPLIT_DEFAULT, COMMIT_AREA_MIN_PX, SYSTEM_CO_AUTHOR_EMAIL, SYSTEM_CO_AUTHOR_NAME, SYSTEM_AUTHOR_NAME, SYSTEM_AUTHOR_EMAIL } from "../../constants";
import { generalCommands } from "../../../../command/General";
import { githubCommands } from "../../../../command/github";
import { profileCommands } from "../../../../command/Profile";
import { showToast, ToastType } from "../../../../components/Toast";
import BranchDialog from "./BranchDialog";
import TagDialog from "./TagDialog";
import PushDialog from "./PushDialog";
import CommitContextMenu from "./CommitContextMenu";
import CommitArea from "./CommitArea";
import DiffViewer from "./DiffViewer";
import FileContextMenu from "./FileContextMenu";
import FileListSection from "./FileListSection";
import FileRow from "./FileRow";
import HistoryTimeline, { HistoryCommit } from "./HistoryTimeline";
import TopActionBar, { PanelTab } from "./TopActionBar";
import { buildGlobalEmailAvatarUrl, buildHashAvatarUrl } from "../../common";
import { GitFileEntry, DraggingKind, DiffLine } from "./types";
const HISTORY_TIMELINE_MIN_PX = 120;
const HISTORY_INFO_MIN_PX = 100;
const HISTORY_INFO_TEXT_STYLE: React.CSSProperties = {
  fontSize: "13px",
  fontFamily: "'JetBrains Mono', monospace",
  lineHeight: 1.2,
  color: "var(--text-primary)",
  wordBreak: "break-all",
};
const CommitAuthorAvatar: React.FC<{ email: string; hash: string; size?: number }> = ({ email, hash, size = 50 }) => {
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const emailUrl = useMemo(() => buildGlobalEmailAvatarUrl(email), [email]);
  const hashUrl = useMemo(() => buildHashAvatarUrl(hash), [hash]);
  const effectiveStage: 1 | 2 | 3 = stage === 1 && !emailUrl ? (hashUrl ? 2 : 3) : stage === 2 && !hashUrl ? 3 : stage;
  const handleError = () => {
    setStage((prev) => {
      if (prev === 1) return hashUrl ? 2 : 3;
      if (prev === 2) return 3;
      return 3;
    });
  };
  if (effectiveStage === 1 && emailUrl) {
    return <img src={emailUrl} alt="" onError={handleError} style={{ width: size, height: size, borderRadius: "5px", objectFit: "cover", flexShrink: 0 }} />;
  }
  if (effectiveStage === 2 && hashUrl) {
    return <img src={hashUrl} alt="" onError={handleError} style={{ width: size, height: size, borderRadius: "5px", objectFit: "cover", flexShrink: 0 }} />;
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "5px",
        background: "var(--bg-tertiary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <User size={size - 20} />
    </span>
  );
};
export interface GitPanelProps {
  t: (key: string, params?: any) => string;
  language?: "zh" | "en";
  workspacePath?: string | null;
  onFileSelect?: (path: string) => void;
}
export const GitPanel: React.FC<GitPanelProps> = ({ t, language = "en", workspacePath, onFileSelect }) => {
  const isZh = language === "zh";
  const [stagedFiles, setStagedFiles] = useState<GitFileEntry[]>([]);
  const [unstagedFiles, setUnstagedFiles] = useState<GitFileEntry[]>([]);
  const [branch, setBranch] = useState<string>("");
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [remoteUrl, setRemoteUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<GitFileEntry | null>(null);
  const [selectedIsStaged, setSelectedIsStaged] = useState<boolean>(false);
  const [diffContent, setDiffContent] = useState<string>("");
  const [diffType, setDiffType] = useState<"diff" | "new_file" | "no_diff">("no_diff");
  const [newFileContent, setNewFileContent] = useState<string>("");
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [isCommitting, setIsCommitting] = useState(false);
  const [pushAfterCommit, setPushAfterCommit] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [profileName, setProfileName] = useState<string>("");
  const [profileEmail, setProfileEmail] = useState<string>("");
  const [profileAvatar, setProfileAvatar] = useState<string>("");
  const [selectedStagedPaths, setSelectedStagedPaths] = useState<Set<string>>(new Set());
  const [selectedUnstagedPaths, setSelectedUnstagedPaths] = useState<Set<string>>(new Set());
  const [stagedSplit, setStagedSplit] = useState<number>(STAGED_SPLIT_DEFAULT);
  const [leftColSplit, setLeftColSplit] = useState<number>(LEFT_COL_DEFAULT);
  const [topSplit, setTopSplit] = useState<number>(TOP_SPLIT_DEFAULT);
  const [historySplit, setHistorySplit] = useState<number>(0.5);
  const [historyLeftSplit, setHistoryLeftSplit] = useState<number>(0.5);
  const containerRef = useRef<HTMLDivElement>(null);
  const topAreaRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const historyLeftColumnRef = useRef<HTMLDivElement>(null);
  const draggingKind = useRef<DraggingKind>(null);
  const dragStartPos = useRef<number>(0);
  const dragStartRatio = useRef<number>(0);
  const [hoverStaged, setHoverStaged] = useState(false);
  const [hoverLeftCol, setHoverLeftCol] = useState(false);
  const [hoverTop, setHoverTop] = useState(false);
  const [hoverHistory, setHoverHistory] = useState(false);
  const [hoverHistoryLeft, setHoverHistoryLeft] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: GitFileEntry; isStaged: boolean } | null>(null);
  // Commit (history) context menu state.
  const [commitContextMenu, setCommitContextMenu] = useState<{ x: number; y: number; commit: HistoryCommit } | null>(null);
  // Branch dialog state.
  const [branchDialog, setBranchDialog] = useState<{ mode: "manage" | "new" | "delete" } | null>(null);
  const [branchInput, setBranchInput] = useState<string>("");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  /** Set of branch names that also exist on the remote (origin). */
  const [remoteBranches, setRemoteBranches] = useState<Set<string>>(new Set());
  const [isBranchWorking, setIsBranchWorking] = useState(false);
  // Tag dialog state.
  const [tagDialog, setTagDialog] = useState<{ mode: "manage" | "new" | "delete" } | null>(null);
  const [tagInput, setTagInput] = useState<string>("");
  const [tagMessage, setTagMessage] = useState<string>("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  /** Set of tag names that also exist on the remote (origin). */
  const [availableRemoteTags, setAvailableRemoteTags] = useState<string[]>([]);
  const [isTagWorking, setIsTagWorking] = useState(false);
  // Push dialog state.
  const [pushDialog, setPushDialog] = useState<boolean>(false);
  const [pushRemoteBranches, setPushRemoteBranches] = useState<string[]>([]);
  const [pushLocalBranches, setPushLocalBranches] = useState<string[]>([]);
  const [pushTags, setPushTags] = useState<string[]>([]);
  const [pushRemoteTags, setPushRemoteTags] = useState<string[]>([]);
  const [pushUnpushedCommits, setPushUnpushedCommits] = useState<Array<{ hash: string; shortHash: string; subject: string; author: string }>>([]);
  const [loadingPushData, setLoadingPushData] = useState<boolean>(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>("commit");
  const [historyCommits, setHistoryCommits] = useState<HistoryCommit[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedCommit, setSelectedCommit] = useState<HistoryCommit | null>(null);
  const [commitFiles, setCommitFiles] = useState<GitFileEntry[]>([]);
  const [loadingCommitFiles, setLoadingCommitFiles] = useState(false);
  const [selectedCommitFile, setSelectedCommitFile] = useState<string | null>(null);
  const [commitDiff, setCommitDiff] = useState<string>("");
  const [commitDiffType, setCommitDiffType] = useState<"diff" | "new_file" | "no_diff">("no_diff");
  const [loadingCommitDiff, setLoadingCommitDiff] = useState(false);
  const [aheadCount, setAheadCount] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerHeight(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const commitAreaHeightPx = useMemo(() => {
    if (containerHeight <= 0) return COMMIT_AREA_MIN_PX;
    const raw = (1 - topSplit) * containerHeight;
    return Math.max(COMMIT_AREA_MIN_PX, Math.min(containerHeight - 80, raw));
  }, [topSplit, containerHeight]);
  const historyTimelineHeightPx = useMemo(() => {
    if (containerHeight <= 0) return HISTORY_TIMELINE_MIN_PX;
    const raw = historySplit * containerHeight;
    return Math.max(HISTORY_TIMELINE_MIN_PX, Math.min(containerHeight - 160, raw));
  }, [historySplit, containerHeight]);
  const loadCommitterIdentity = useCallback(async () => {
    let appAvatar = "";
    try {
      const profile = await profileCommands.getProfile();
      appAvatar = profile?.avatar || "";
    } catch {
      appAvatar = "";
    }
    setProfileAvatar(appAvatar);
    if (!workspacePath) {
      setProfileName("");
      setProfileEmail("");
      return;
    }
    try {
      const gitUser = await githubCommands.getGitUserConfig(workspacePath);
      setProfileName(gitUser.name || "");
      setProfileEmail(gitUser.email || "");
    } catch {
      setProfileName("");
      setProfileEmail("");
    }
  }, [workspacePath]);
  const loadAheadCount = useCallback(async () => {
    if (!workspacePath) {
      setAheadCount(0);
      return;
    }
    try {
      const [commitN, branchN, tagN] = await Promise.all([githubCommands.getAheadCount(workspacePath).catch(() => 0), githubCommands.getUnpushedBranchCount(workspacePath).catch(() => 0), githubCommands.getUnpushedTagCount(workspacePath).catch(() => 0)]);
      const total = (Number(commitN) || 0) + (Number(branchN) || 0) + (Number(tagN) || 0);
      setAheadCount(total);
    } catch {
      setAheadCount(0);
    }
  }, [workspacePath]);
  const loadRemoteBranches = useCallback(async () => {
    if (!workspacePath) {
      setRemoteBranches(new Set());
      return;
    }
    try {
      const branches = await githubCommands.getRemoteBranches(workspacePath);
      const cleaned = (branches || []).map((b) => (b.startsWith("origin/") ? b.slice("origin/".length) : b)).filter((b) => b && b !== "HEAD");
      setRemoteBranches(new Set(cleaned));
    } catch {
      setRemoteBranches(new Set());
    }
  }, [workspacePath]);
  const loadTags = useCallback(async () => {
    if (!workspacePath) {
      setAvailableTags([]);
      return;
    }
    try {
      const tags = await githubCommands.listTags(workspacePath);
      setAvailableTags(tags || []);
    } catch {
      setAvailableTags([]);
    }
  }, [workspacePath]);
  const loadRemoteTags = useCallback(async () => {
    if (!workspacePath) {
      setAvailableRemoteTags([]);
      return;
    }
    try {
      const remoteTags = await githubCommands.getRemoteTags(workspacePath);
      setAvailableRemoteTags(remoteTags || []);
    } catch {
      setAvailableRemoteTags([]);
    }
  }, [workspacePath]);
  const loadCommitFiles = useCallback(
    async (commit: HistoryCommit) => {
      if (!workspacePath) return;
      setSelectedCommit(commit);
      setSelectedCommitFile(null);
      setCommitDiff("");
      setCommitDiffType("no_diff");
      setLoadingCommitFiles(true);
      try {
        const result = await githubCommands.getCommitFiles(workspacePath, commit.hash);
        setCommitFiles(result.files || []);
      } catch (error) {
        console.error("Failed to load commit files:", error);
        setCommitFiles([]);
      } finally {
        setLoadingCommitFiles(false);
      }
    },
    [workspacePath],
  );
  const loadHistory = useCallback(async () => {
    if (!workspacePath) {
      setHistoryCommits([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const result = await githubCommands.getGraph(workspacePath);
      const commits: HistoryCommit[] = (result.commits || []).map((c) => ({
        hash: c.hash,
        shortHash: c.shortHash,
        message: c.message,
        author: c.author,
        authorEmail: c.authorEmail,
        date: c.date,
        committer: c.committer,
        branch: c.branches && c.branches.length > 0 ? c.branches[0] : null,
        isHead: c.isHead,
        parents: c.parents,
        branches: c.branches,
        tags: c.tags,
      }));
      setHistoryCommits(commits);
      if (commits.length > 0) {
        loadCommitFiles(commits[0]);
      } else {
        setSelectedCommit(null);
        setCommitFiles([]);
        setSelectedCommitFile(null);
        setCommitDiff("");
        setCommitDiffType("no_diff");
      }
    } catch (error) {
      console.error("Failed to load commit history:", error);
      setHistoryCommits([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [workspacePath, loadCommitFiles]);
  const loadCommitFileDiff = useCallback(
    async (commitHash: string, file: string) => {
      if (!workspacePath) return;
      setSelectedCommitFile(file);
      setLoadingCommitDiff(true);
      setCommitDiff("");
      setCommitDiffType("no_diff");
      try {
        const result = await githubCommands.getCommitFileDiff(workspacePath, commitHash, file);
        setCommitDiffType(result.type);
        setCommitDiff(result.diff || "");
      } catch (error) {
        console.error("Failed to load commit file diff:", error);
        setCommitDiffType("no_diff");
        setCommitDiff("");
      } finally {
        setLoadingCommitDiff(false);
      }
    },
    [workspacePath],
  );
  const loadStatus = useCallback(
    async (opts?: { keepBranchOnDetached?: boolean }) => {
      if (!workspacePath) {
        setStagedFiles([]);
        setUnstagedFiles([]);
        setBranch("");
        setRemoteUrl("");
        setAheadCount(0);
        return;
      }
      setLoadingStatus(true);
      try {
        const [split, currentBranch, url] = await Promise.all([githubCommands.getGitStatusSplit(workspacePath).catch(() => ({ staged: [], unstaged: [], hasChanges: false })), githubCommands.getCurrentBranch(workspacePath).catch(() => ""), githubCommands.getRemoteUrl(workspacePath).catch(() => "")]);
        setStagedFiles(split.staged || []);
        setUnstagedFiles(split.unstaged || []);
        if (currentBranch && currentBranch !== "HEAD") {
          setBranch(currentBranch);
        } else if (!opts?.keepBranchOnDetached) {
          setBranch("");
        }
        setRemoteUrl(url || "");
        await loadAheadCount();
      } catch (error) {
        console.error("Failed to load git status:", error);
        setStagedFiles([]);
        setUnstagedFiles([]);
      } finally {
        setLoadingStatus(false);
      }
    },
    [workspacePath, loadAheadCount],
  );
  useEffect(() => {
    loadStatus();
    loadCommitterIdentity();
    loadRemoteBranches();
    loadTags();
    loadRemoteTags();
    setSelectedFile(null);
    setSelectedIsStaged(false);
    setDiffContent("");
    setDiffType("no_diff");
    setNewFileContent("");
    setCommitMessage("");
    setSelectedStagedPaths(new Set());
    setSelectedUnstagedPaths(new Set());
    setCommitError(null);
    setActiveTab("commit");
    setHistoryCommits([]);
    setSelectedCommit(null);
    setCommitFiles([]);
    setSelectedCommitFile(null);
    setCommitDiff("");
    setCommitDiffType("no_diff");
  }, [loadStatus, loadCommitterIdentity, loadRemoteBranches, loadTags, loadRemoteTags]);
  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab, loadHistory]);
  const loadDiff = useCallback(
    async (entry: GitFileEntry, isStaged: boolean) => {
      if (!workspacePath) return;
      setSelectedFile(entry);
      setSelectedIsStaged(isStaged);
      setLoadingDiff(true);
      setDiffContent("");
      setNewFileContent("");
      setDiffType("no_diff");
      try {
        const result = isStaged ? await githubCommands.getStagedFileDiff(workspacePath, entry.file) : await githubCommands.getFileDiff(workspacePath, entry.file);
        setDiffType(result.type);
        setDiffContent(result.diff || "");
        setNewFileContent(result.content || "");
      } catch (error) {
        console.error("Failed to load diff:", error);
        setDiffType("no_diff");
        setDiffContent("");
      } finally {
        setLoadingDiff(false);
      }
    },
    [workspacePath],
  );
  const handleStageFile = useCallback(
    async (entry: GitFileEntry) => {
      if (!workspacePath) return;
      try {
        await githubCommands.stageFile(workspacePath, entry.file);
        await loadStatus();
        if (selectedFile?.file === entry.file && !selectedIsStaged) {
          await loadDiff(entry, true);
        }
      } catch (error) {
        console.error("Failed to stage file:", error);
        showToast(ToastType.ERROR, isZh ? "暂存失败" : "Failed to stage file");
      }
    },
    [workspacePath, loadStatus, selectedFile, selectedIsStaged, loadDiff, isZh],
  );
  const handleUnstageFile = useCallback(
    async (entry: GitFileEntry) => {
      if (!workspacePath) return;
      try {
        await githubCommands.unstageFile(workspacePath, entry.file);
        await loadStatus();
        if (selectedFile?.file === entry.file && selectedIsStaged) {
          await loadDiff(entry, false);
        }
      } catch (error) {
        console.error("Failed to unstage file:", error);
        showToast(ToastType.ERROR, isZh ? "取消暂存失败" : "Failed to unstage file");
      }
    },
    [workspacePath, loadStatus, selectedFile, selectedIsStaged, loadDiff, isZh],
  );
  const handleStageAll = useCallback(async () => {
    if (!workspacePath) return;
    try {
      await githubCommands.stageAll(workspacePath);
      await loadStatus();
      setSelectedUnstagedPaths(new Set());
    } catch (error) {
      console.error("Failed to stage all files:", error);
      showToast(ToastType.ERROR, isZh ? "全部暂存失败" : "Failed to stage all files");
    }
  }, [workspacePath, loadStatus, isZh]);
  const handleUnstageAll = useCallback(async () => {
    if (!workspacePath) return;
    try {
      await githubCommands.unstageAll(workspacePath);
      await loadStatus();
      setSelectedStagedPaths(new Set());
    } catch (error) {
      console.error("Failed to unstage all files:", error);
      showToast(ToastType.ERROR, isZh ? "全部取消暂存失败" : "Failed to unstage all files");
    }
  }, [workspacePath, loadStatus, isZh]);
  const handleStageSelected = useCallback(async () => {
    if (!workspacePath || selectedUnstagedPaths.size === 0) return;
    try {
      const paths = Array.from(selectedUnstagedPaths);
      for (const p of paths) {
        await githubCommands.stageFile(workspacePath, p);
      }
      setSelectedUnstagedPaths(new Set());
      await loadStatus();
    } catch (error) {
      console.error("Failed to stage selected files:", error);
      showToast(ToastType.ERROR, isZh ? "暂存所选失败" : "Failed to stage selected files");
    }
  }, [workspacePath, selectedUnstagedPaths, loadStatus, isZh]);
  const handleUnstageSelected = useCallback(async () => {
    if (!workspacePath || selectedStagedPaths.size === 0) return;
    try {
      const paths = Array.from(selectedStagedPaths);
      for (const p of paths) {
        await githubCommands.unstageFile(workspacePath, p);
      }
      setSelectedStagedPaths(new Set());
      await loadStatus();
    } catch (error) {
      console.error("Failed to unstage selected files:", error);
      showToast(ToastType.ERROR, isZh ? "取消所选暂存失败" : "Failed to unstage selected files");
    }
  }, [workspacePath, selectedStagedPaths, loadStatus, isZh]);
  const handleCommit = useCallback(
    async (fileOverride?: string) => {
      if (!workspacePath) return;
      const message = commitMessage.trim();
      if (!message) {
        showToast(ToastType.WARNING, isZh ? "请输入提交信息" : "Please enter a commit message");
        return;
      }
      if (fileOverride) {
        try {
          await githubCommands.stageFile(workspacePath, fileOverride);
          const split = await githubCommands.getGitStatusSplit(workspacePath).catch(() => ({ staged: [], unstaged: [], hasChanges: false }));
          setStagedFiles(split.staged || []);
          setUnstagedFiles(split.unstaged || []);
        } catch (error) {
          console.error("Failed to stage file before commit:", error);
          showToast(ToastType.ERROR, isZh ? "暂存失败" : "Failed to stage file");
          return;
        }
      }
      const effectiveStagedCount = fileOverride ? ((await githubCommands.getGitStatusSplit(workspacePath).catch(() => ({ staged: [] }))).staged?.length ?? 0) : stagedFiles.length;
      if (effectiveStagedCount === 0) {
        showToast(ToastType.WARNING, isZh ? "没有已暂存的文件" : "No staged files to commit");
        return;
      }
      setCommitError(null);
      setIsCommitting(true);
      try {
        let finalMessage = message;
        if (SYSTEM_CO_AUTHOR_EMAIL.trim()) {
          finalMessage = `${message}\n\nCo-authored-by: ${SYSTEM_CO_AUTHOR_NAME} <${SYSTEM_CO_AUTHOR_EMAIL.trim()}>`;
        }
        const authorOverride =
          SYSTEM_AUTHOR_NAME.trim() && SYSTEM_AUTHOR_EMAIL.trim()
            ? {
                authorName: SYSTEM_AUTHOR_NAME.trim(),
                authorEmail: SYSTEM_AUTHOR_EMAIL.trim(),
                committerName: SYSTEM_AUTHOR_NAME.trim(),
                committerEmail: SYSTEM_AUTHOR_EMAIL.trim(),
              }
            : undefined;
        await githubCommands.commit(workspacePath, finalMessage, authorOverride);
        if (pushAfterCommit && remoteUrl && branch) {
          setIsPushing(true);
          try {
            await githubCommands.gitPush(workspacePath, branch);
            showToast(ToastType.SUCCESS, isZh ? "提交并推送成功" : "Commit and push successful");
          } catch (pushError) {
            console.error("Push after commit failed:", pushError);
            const pushMsg = pushError instanceof Error ? pushError.message : String(pushError);
            setCommitError(isZh ? `提交成功，但推送失败：${pushMsg}` : `Committed, but push failed: ${pushMsg}`);
            showToast(ToastType.ERROR, isZh ? "提交成功，但推送失败" : "Committed, but push failed");
          } finally {
            setIsPushing(false);
          }
        } else {
          showToast(ToastType.SUCCESS, isZh ? "已提交到本地" : "Committed locally");
        }
        setCommitMessage("");
        setSelectedFile(null);
        setDiffContent("");
        setDiffType("no_diff");
        setNewFileContent("");
        setSelectedStagedPaths(new Set());
        await loadStatus();
        await loadAheadCount();
        if (activeTab === "history") {
          await loadHistory();
        }
      } catch (error) {
        console.error("Commit failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        setCommitError(isZh ? `提交失败：${msg}` : `Commit failed: ${msg}`);
        showToast(ToastType.ERROR, isZh ? "提交失败" : "Commit failed");
      } finally {
        setIsCommitting(false);
      }
    },
    [workspacePath, commitMessage, stagedFiles.length, pushAfterCommit, remoteUrl, branch, loadStatus, loadAheadCount, loadHistory, activeTab, isZh],
  );
  const handlePull = useCallback(async () => {
    if (!workspacePath || !branch) return;
    setIsPulling(true);
    try {
      await githubCommands.gitPull(workspacePath, branch);
      await loadStatus();
      await loadAheadCount();
      if (activeTab === "history") {
        await loadHistory();
      }
      showToast(ToastType.SUCCESS, isZh ? "拉取成功" : "Pull successful");
    } catch (error) {
      console.error("Pull failed:", error);
      showToast(ToastType.ERROR, isZh ? "拉取失败" : "Pull failed");
    } finally {
      setIsPulling(false);
    }
  }, [workspacePath, branch, loadStatus, loadAheadCount, loadHistory, activeTab, isZh]);
  const openPushDialog = useCallback(async () => {
    if (!workspacePath || !branch) return;
    setPushDialog(true);
    setLoadingPushData(true);
    try {
      const [allRemote, localBranches, localTags, remoteTags, unpushed] = await Promise.all([
        githubCommands.getAllRemoteBranches(workspacePath).catch(() => []),
        githubCommands.getLocalBranches(workspacePath).catch(() => []),
        githubCommands.listTags(workspacePath).catch(() => []),
        githubCommands.getRemoteTags(workspacePath).catch(() => []),
        githubCommands.getUnpushedCommits(workspacePath).catch(() => ({ commits: [] })),
      ]);
      setPushRemoteBranches(allRemote || []);
      setPushLocalBranches(localBranches || []);
      setPushTags(localTags || []);
      setPushRemoteTags(remoteTags || []);
      setPushUnpushedCommits(unpushed.commits || []);
    } catch (error) {
      console.error("Failed to load push data:", error);
      setPushRemoteBranches([]);
      setPushLocalBranches([]);
      setPushTags([]);
      setPushRemoteTags([]);
      setPushUnpushedCommits([]);
    } finally {
      setLoadingPushData(false);
    }
  }, [workspacePath, branch]);
  const confirmPushDialog = useCallback(
    async (branches: string[], tags: string[]) => {
      if (!workspacePath) return;
      setIsPushing(true);
      try {
        await githubCommands.pushSelected(workspacePath, branches, tags);
        showToast(ToastType.SUCCESS, isZh ? "推送成功" : "Push successful");
        setPushDialog(false);
        await loadStatus();
        await loadAheadCount();
        await loadRemoteBranches();
        await loadRemoteTags();
        if (activeTab === "history") {
          await loadHistory();
        }
      } catch (error) {
        console.error("Push failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        showToast(ToastType.ERROR, isZh ? `推送失败：${msg}` : `Push failed: ${msg}`);
      } finally {
        setIsPushing(false);
      }
    },
    [workspacePath, loadStatus, loadAheadCount, loadRemoteBranches, loadRemoteTags, loadHistory, activeTab, isZh],
  );
  const openTagDialog = useCallback(
    async (mode: "manage" | "new" | "delete") => {
      setTagDialog({ mode });
      setTagInput("");
      setTagMessage("");
      if (workspacePath) {
        try {
          const tags = await githubCommands.listTags(workspacePath);
          setAvailableTags(tags || []);
          await loadRemoteTags();
        } catch {
          setAvailableTags([]);
        }
      } else {
        setAvailableTags([]);
      }
    },
    [workspacePath, loadRemoteTags],
  );
  const confirmTagDialog = useCallback(
    async (tab: "new" | "delete") => {
      if (!workspacePath) return;
      const name = tagInput.trim();
      if (!name) {
        showToast(ToastType.WARNING, isZh ? "请输入标签名" : "Please enter a tag name");
        return;
      }
      setIsTagWorking(true);
      try {
        if (tab === "new") {
          await githubCommands.createTag(workspacePath, name, tagMessage || undefined);
          showToast(ToastType.SUCCESS, isZh ? `已创建标签 ${name}` : `Created tag ${name}`);
        } else {
          await githubCommands.deleteTag(workspacePath, name);
          showToast(ToastType.SUCCESS, isZh ? `已删除标签 ${name}` : `Deleted tag ${name}`);
        }
        setTagDialog(null);
        setTagInput("");
        setTagMessage("");
        await loadTags();
        await loadRemoteTags();
        await loadAheadCount();
      } catch (error) {
        console.error("Tag operation failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        showToast(ToastType.ERROR, isZh ? `标签操作失败：${msg}` : `Tag operation failed: ${msg}`);
      } finally {
        setIsTagWorking(false);
      }
    },
    [workspacePath, tagInput, tagMessage, loadTags, loadRemoteTags, loadAheadCount, isZh],
  );
  const openBranchDialog = useCallback(
    async (mode: "manage" | "new" | "delete") => {
      setBranchDialog({ mode });
      setBranchInput("");
      if (workspacePath) {
        try {
          // Load BOTH local and remote branches, then merge them so the
          // dialog can list remote-only branches as switchable targets.
          const [local, remote] = await Promise.all([githubCommands.getLocalBranches(workspacePath).catch(() => []), githubCommands.getRemoteBranches(workspacePath).catch(() => [])]);
          const remoteClean = (remote || []).map((b) => (b.startsWith("origin/") ? b.slice("origin/".length) : b)).filter((b) => b && b !== "HEAD");
          const merged = Array.from(new Set([...(local || []), ...remoteClean]));
          setAvailableBranches(merged);
          await loadRemoteBranches();
        } catch {
          setAvailableBranches([]);
        }
      } else {
        setAvailableBranches([]);
      }
    },
    [workspacePath, loadRemoteBranches],
  );
  const confirmBranchDialog = useCallback(
    async (tab: "switch" | "new" | "delete") => {
      if (!workspacePath) return;
      const name = branchInput.trim();
      if (!name) {
        showToast(ToastType.WARNING, isZh ? "请输入分支名" : "Please enter a branch name");
        return;
      }
      setIsBranchWorking(true);
      try {
        if (tab === "new") {
          await githubCommands.createBranch(workspacePath, name);
          showToast(ToastType.SUCCESS, isZh ? `已创建并切换到分支 ${name}` : `Created and switched to branch ${name}`);
        } else if (tab === "delete") {
          await githubCommands.deleteBranch(workspacePath, name);
          showToast(ToastType.SUCCESS, isZh ? `已删除分支 ${name}` : `Deleted branch ${name}`);
        } else {
          // Switch: check if the branch exists locally first.
          // If it only exists on the remote, create a local tracking
          // branch from origin/<name> before checking out.
          const localBranches = await githubCommands.getLocalBranches(workspacePath).catch(() => [] as string[]);
          const existsLocally = (localBranches || []).includes(name);
          if (!existsLocally) {
            const existsRemotely = await githubCommands.remoteBranchExists(workspacePath, name).catch(() => false);
            if (existsRemotely) {
              await githubCommands.createBranchFromRemote(workspacePath, name, name);
              showToast(ToastType.SUCCESS, isZh ? `已从远程创建并切换到分支 ${name}` : `Created and switched to branch ${name} from remote`);
            } else {
              await githubCommands.checkoutBranch(workspacePath, name);
              showToast(ToastType.SUCCESS, isZh ? `已切换到分支 ${name}` : `Switched to branch ${name}`);
            }
          } else {
            await githubCommands.checkoutBranch(workspacePath, name);
            showToast(ToastType.SUCCESS, isZh ? `已切换到分支 ${name}` : `Switched to branch ${name}`);
          }
        }
        setBranchDialog(null);
        setBranchInput("");
        await loadStatus();
        await loadAheadCount();
        await loadRemoteBranches();
        if (activeTab === "history") {
          await loadHistory();
        }
      } catch (error) {
        console.error("Branch operation failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        showToast(ToastType.ERROR, isZh ? `分支操作失败：${msg}` : `Branch operation failed: ${msg}`);
      } finally {
        setIsBranchWorking(false);
      }
    },
    [workspacePath, branchInput, loadStatus, loadAheadCount, loadRemoteBranches, loadHistory, activeTab, isZh],
  );
  /**
   * Refresh everything that can change after a history action
   */
  const refreshAfterHistoryAction = useCallback(async () => {
    await loadStatus();
    await loadAheadCount();
    await loadRemoteBranches();
    await loadHistory();
  }, [loadStatus, loadAheadCount, loadRemoteBranches, loadHistory]);
  const handleCheckoutCommit = useCallback(
    async (commit: HistoryCommit) => {
      if (!workspacePath) return;
      try {
        const split = await githubCommands.getGitStatusSplit(workspacePath);
        const dirty = (split.staged?.length ?? 0) + (split.unstaged?.length ?? 0) > 0;
        if (dirty) {
          showToast(ToastType.WARNING, isZh ? "工作区有未提交的改动，请先提交或暂存后再切换" : "Working tree has uncommitted changes; commit or stash them first");
          return;
        }
      } catch (err) {
        console.warn("Failed to check working tree status:", err);
      }
      try {
        await githubCommands.checkoutCommit(workspacePath, commit.hash);
        showToast(ToastType.SUCCESS, isZh ? `已检出提交 ${commit.shortHash}` : `Checked out ${commit.shortHash}`);
        const highlight = commit.branches && commit.branches.length > 0 ? commit.branches[0] : "";
        await loadStatus({ keepBranchOnDetached: true });
        await loadAheadCount();
        await loadRemoteBranches();
        await loadHistory();
        if (highlight) {
          setBranch(highlight);
        }
      } catch (error) {
        console.error("Checkout commit failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        showToast(ToastType.ERROR, isZh ? `检出失败：${msg}` : `Checkout failed: ${msg}`);
      }
    },
    [workspacePath, loadStatus, loadAheadCount, loadRemoteBranches, loadHistory, isZh],
  );
  const handleMergeCommit = useCallback(
    async (commit: HistoryCommit) => {
      if (!workspacePath) return;
      try {
        await githubCommands.mergeCommit(workspacePath, commit.hash);
        showToast(ToastType.SUCCESS, isZh ? `已合并提交 ${commit.shortHash}` : `Merged ${commit.shortHash}`);
        await refreshAfterHistoryAction();
      } catch (error) {
        console.error("Merge commit failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        showToast(ToastType.ERROR, isZh ? `合并失败：${msg}` : `Merge failed: ${msg}`);
      }
    },
    [workspacePath, refreshAfterHistoryAction, isZh],
  );
  const handleRebaseCommit = useCallback(
    async (commit: HistoryCommit) => {
      if (!workspacePath) return;
      try {
        await githubCommands.rebaseOnto(workspacePath, commit.hash);
        showToast(ToastType.SUCCESS, isZh ? `已变基到 ${commit.shortHash}` : `Rebased onto ${commit.shortHash}`);
        await refreshAfterHistoryAction();
      } catch (error) {
        console.error("Rebase failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        showToast(ToastType.ERROR, isZh ? `变基失败：${msg}` : `Rebase failed: ${msg}`);
      }
    },
    [workspacePath, refreshAfterHistoryAction, isZh],
  );
  const handleResetCommit = useCallback(
    async (commit: HistoryCommit) => {
      if (!workspacePath) return;
      try {
        await githubCommands.resetToCommit(workspacePath, commit.hash);
        showToast(ToastType.SUCCESS, isZh ? `已重置到 ${commit.shortHash}` : `Reset to ${commit.shortHash}`);
        await refreshAfterHistoryAction();
      } catch (error) {
        console.error("Reset failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        showToast(ToastType.ERROR, isZh ? `重置失败：${msg}` : `Reset failed: ${msg}`);
      }
    },
    [workspacePath, refreshAfterHistoryAction, isZh],
  );
  const handleRevertCommit = useCallback(
    async (commit: HistoryCommit) => {
      if (!workspacePath) return;
      try {
        await githubCommands.revertCommit(workspacePath, commit.hash);
        showToast(ToastType.SUCCESS, isZh ? `已回滚提交 ${commit.shortHash}` : `Reverted ${commit.shortHash}`);
        await refreshAfterHistoryAction();
      } catch (error) {
        console.error("Revert failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        showToast(ToastType.ERROR, isZh ? `回滚失败：${msg}` : `Revert failed: ${msg}`);
      }
    },
    [workspacePath, refreshAfterHistoryAction, isZh],
  );
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const closeCommitContextMenu = useCallback(() => setCommitContextMenu(null), []);
  const openCommitContextMenu = useCallback((e: React.MouseEvent, commit: HistoryCommit) => {
    e.preventDefault();
    e.stopPropagation();
    setCommitContextMenu({ x: e.clientX, y: e.clientY, commit });
  }, []);
  const handleOpenInExplorer = useCallback(
    async (path: string) => {
      try {
        const result = await generalCommands.openExplorer(path);
        if (!result.success) {
          showToast(ToastType.ERROR, result.message || (isZh ? "打开失败" : "Failed to open"));
        }
      } catch (error) {
        console.error("Open in explorer failed:", error);
      }
    },
    [isZh],
  );
  const handleCopyPath = useCallback(
    async (path: string) => {
      try {
        await navigator.clipboard.writeText(path);
        showToast(ToastType.SUCCESS, isZh ? "已复制路径" : "Path copied");
      } catch (error) {
        console.error("Copy path failed:", error);
        showToast(ToastType.ERROR, isZh ? "复制失败" : "Failed to copy path");
      }
    },
    [isZh],
  );
  const handleDeleteFile = useCallback(
    async (entry: GitFileEntry) => {
      if (!workspacePath) return;
      try {
        await githubCommands.deleteFile(workspacePath, entry.file);
        showToast(ToastType.SUCCESS, isZh ? `已删除文件 ${entry.file}` : `Deleted file ${entry.file}`);
        // Clear the diff preview if the deleted file was the one shown.
        if (selectedFile?.file === entry.file) {
          setSelectedFile(null);
          setSelectedIsStaged(false);
          setDiffContent("");
          setDiffType("no_diff");
          setNewFileContent("");
        }
        await loadStatus();
        await loadAheadCount();
      } catch (error) {
        console.error("Delete file failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        showToast(ToastType.ERROR, isZh ? `删除失败：${msg}` : `Delete failed: ${msg}`);
      }
    },
    [workspacePath, selectedFile, loadStatus, loadAheadCount, isZh],
  );
  const handleRestoreChanges = useCallback(
    async (entry: GitFileEntry, isStaged: boolean) => {
      if (!workspacePath) return;
      try {
        await githubCommands.restoreFile(workspacePath, entry.file, isStaged);
        showToast(ToastType.SUCCESS, isZh ? `已恢复文件改动 ${entry.file}` : `Restored changes for ${entry.file}`);
        if (selectedFile?.file === entry.file) {
          await loadDiff(entry, isStaged);
        }
        await loadStatus();
        await loadAheadCount();
      } catch (error) {
        console.error("Restore changes failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        showToast(ToastType.ERROR, isZh ? `恢复失败：${msg}` : `Restore failed: ${msg}`);
      }
    },
    [workspacePath, selectedFile, loadDiff, loadStatus, loadAheadCount, isZh],
  );
  const handleStopTracking = useCallback(
    async (entry: GitFileEntry) => {
      if (!workspacePath) return;
      try {
        await githubCommands.stopTracking(workspacePath, entry.file);
        showToast(ToastType.SUCCESS, isZh ? `已停止追踪 ${entry.file}` : `Stopped tracking ${entry.file}`);
        if (selectedFile?.file === entry.file) {
          setSelectedFile(null);
          setSelectedIsStaged(false);
          setDiffContent("");
          setDiffType("no_diff");
          setNewFileContent("");
        }
        await loadStatus();
        await loadAheadCount();
      } catch (error) {
        console.error("Stop tracking failed:", error);
        const msg = error instanceof Error ? error.message : String(error);
        showToast(ToastType.ERROR, isZh ? `停止追踪失败：${msg}` : `Stop tracking failed: ${msg}`);
      }
    },
    [workspacePath, selectedFile, loadStatus, loadAheadCount, isZh],
  );
  const handleStageFileFromMenu = useCallback(
    async (entry: GitFileEntry, isStaged: boolean) => {
      if (!workspacePath) return;
      if (isStaged) return;
      await handleStageFile(entry);
    },
    [workspacePath, handleStageFile],
  );
  const openContextMenu = useCallback((e: React.MouseEvent, entry: GitFileEntry, isStaged: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, entry, isStaged });
  }, []);
  const parsedDiff = useMemo<DiffLine[]>(() => {
    if (diffType === "new_file") {
      return newFileContent.split("\n").map((line) => ({ type: "added" as const, content: "+" + line }));
    }
    if (!diffContent) return [];
    const lines = diffContent.split("\n");
    const out: DiffLine[] = [];
    for (const line of lines) {
      if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("--- ") || line.startsWith("+++ ") || line.startsWith("@@") || line.startsWith("new file") || line.startsWith("deleted file")) {
        out.push({ type: "unchanged", content: line });
      } else if (line.startsWith("+")) {
        out.push({ type: "added", content: line });
      } else if (line.startsWith("-")) {
        out.push({ type: "removed", content: line });
      } else {
        out.push({ type: "unchanged", content: line });
      }
    }
    return out;
  }, [diffContent, newFileContent, diffType]);
  const parsedCommitDiff = useMemo<DiffLine[]>(() => {
    if (commitDiffType === "new_file") {
      return commitDiff.split("\n").map((line) => ({ type: "added" as const, content: "+" + line }));
    }
    if (!commitDiff) return [];
    const lines = commitDiff.split("\n");
    const out: DiffLine[] = [];
    for (const line of lines) {
      if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("--- ") || line.startsWith("+++ ") || line.startsWith("@@") || line.startsWith("new file") || line.startsWith("deleted file")) {
        out.push({ type: "unchanged", content: line });
      } else if (line.startsWith("+")) {
        out.push({ type: "added", content: line });
      } else if (line.startsWith("-")) {
        out.push({ type: "removed", content: line });
      } else {
        out.push({ type: "unchanged", content: line });
      }
    }
    return out;
  }, [commitDiff, commitDiffType]);
  const totalChangedCount = stagedFiles.length + unstagedFiles.length;
  const remoteShortName = useMemo(() => {
    if (!remoteUrl) return "";
    try {
      const cleaned = remoteUrl.replace(/\.git$/, "");
      const sshMatch = cleaned.match(/^git@[^:]+:(.+)$/);
      if (sshMatch) return sshMatch[1];
      const httpsMatch = cleaned.match(/^https?:\/\/[^/]+\/(.+)$/);
      if (httpsMatch) return httpsMatch[1];
      return cleaned;
    } catch {
      return remoteUrl;
    }
  }, [remoteUrl]);
  const handleStagedSplitMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingKind.current = "staged-split";
      dragStartPos.current = e.clientY;
      dragStartRatio.current = stagedSplit;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [stagedSplit],
  );
  const handleLeftColMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingKind.current = "left-col";
      dragStartPos.current = e.clientX;
      dragStartRatio.current = leftColSplit;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [leftColSplit],
  );
  const handleTopSplitMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingKind.current = "top-split";
      dragStartPos.current = e.clientY;
      dragStartRatio.current = topSplit;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [topSplit],
  );
  const handleHistorySplitMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingKind.current = "history-split";
      dragStartPos.current = e.clientY;
      dragStartRatio.current = historySplit;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [historySplit],
  );
  const handleHistoryLeftSplitMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      draggingKind.current = "history-left-split";
      dragStartPos.current = e.clientY;
      dragStartRatio.current = historyLeftSplit;
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [historyLeftSplit],
  );
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const kind = draggingKind.current;
      if (!kind) return;
      if (kind === "staged-split") {
        const container = leftColumnRef.current;
        if (!container) return;
        const totalHeight = container.clientHeight;
        if (totalHeight <= 0) return;
        const delta = e.clientY - dragStartPos.current;
        let newRatio = dragStartRatio.current + delta / totalHeight;
        newRatio = Math.max(STAGED_SPLIT_MIN, Math.min(STAGED_SPLIT_MAX, newRatio));
        setStagedSplit(newRatio);
        return;
      }
      if (kind === "history-left-split") {
        const container = historyLeftColumnRef.current;
        if (!container) return;
        const totalHeight = container.clientHeight;
        if (totalHeight <= 0) return;
        const delta = e.clientY - dragStartPos.current;
        let newRatio = dragStartRatio.current + delta / totalHeight;
        newRatio = Math.max(STAGED_SPLIT_MIN, Math.min(STAGED_SPLIT_MAX, newRatio));
        setHistoryLeftSplit(newRatio);
        return;
      }
      if (kind === "left-col") {
        const container = topAreaRef.current;
        if (!container) return;
        const totalWidth = container.clientWidth;
        if (totalWidth <= 0) return;
        const delta = e.clientX - dragStartPos.current;
        let newRatio = dragStartRatio.current + delta / totalWidth;
        newRatio = Math.max(LEFT_COL_MIN, Math.min(LEFT_COL_MAX, newRatio));
        setLeftColSplit(newRatio);
        return;
      }
      if (kind === "top-split") {
        const container = containerRef.current;
        if (!container) return;
        const totalHeight = container.clientHeight;
        if (totalHeight <= 0) return;
        const delta = e.clientY - dragStartPos.current;
        let newRatio = dragStartRatio.current + delta / totalHeight;
        const minRatio = 1 - (totalHeight - COMMIT_AREA_MIN_PX) / totalHeight;
        const lower = Math.max(TOP_SPLIT_MIN, minRatio);
        const upper = TOP_SPLIT_MAX;
        newRatio = Math.max(lower, Math.min(upper, newRatio));
        setTopSplit(newRatio);
        return;
      }
      if (kind === "history-split") {
        const container = containerRef.current;
        if (!container) return;
        const totalHeight = container.clientHeight;
        if (totalHeight <= 0) return;
        const delta = e.clientY - dragStartPos.current;
        let newRatio = dragStartRatio.current + delta / totalHeight;
        const minRatio = HISTORY_TIMELINE_MIN_PX / totalHeight;
        const maxRatio = 1 - 160 / totalHeight;
        newRatio = Math.max(minRatio, Math.min(maxRatio, newRatio));
        setHistorySplit(newRatio);
        return;
      }
    };
    const onMouseUp = () => {
      if (draggingKind.current) {
        draggingKind.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "none";
      }
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);
  const handleFileRowClick = useCallback(
    (e: React.MouseEvent, entry: GitFileEntry, isStaged: boolean) => {
      const isMulti = e.ctrlKey || e.metaKey;
      if (isMulti) {
        if (isStaged) {
          setSelectedStagedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(entry.file)) next.delete(entry.file);
            else next.add(entry.file);
            return next;
          });
        } else {
          setSelectedUnstagedPaths((prev) => {
            const next = new Set(prev);
            if (next.has(entry.file)) next.delete(entry.file);
            else next.add(entry.file);
            return next;
          });
        }
        return;
      }
      if (isStaged) {
        setSelectedStagedPaths(new Set([entry.file]));
        setSelectedUnstagedPaths(new Set());
      } else {
        setSelectedUnstagedPaths(new Set([entry.file]));
        setSelectedStagedPaths(new Set());
      }
      loadDiff(entry, isStaged);
    },
    [loadDiff],
  );
  const renderFileRow = (entry: GitFileEntry, isStaged: boolean) => (
    <FileRow
      key={`${isStaged ? "s" : "u"}-${entry.file}`}
      entry={entry}
      isStaged={isStaged}
      isZh={isZh}
      isPreviewSelected={selectedFile?.file === entry.file && selectedIsStaged === isStaged}
      isMultiSelected={isStaged ? selectedStagedPaths.has(entry.file) : selectedUnstagedPaths.has(entry.file)}
      onRowClick={(e) => handleFileRowClick(e, entry, isStaged)}
      onRowContextMenu={(e) => openContextMenu(e, entry, isStaged)}
      onToggleStage={(e) => {
        e.stopPropagation();
        if (isStaged) handleUnstageFile(entry);
        else handleStageFile(entry);
      }}
    />
  );
  const renderWorkingFileColumn = () => (
    <div
      ref={leftColumnRef}
      style={{
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: `${leftColSplit * 100}%`,
        minWidth: "220px",
        maxWidth: "70%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary)",
        overflow: "hidden",
      }}
    >
      <div style={{ flexGrow: 0, flexShrink: 0, flexBasis: `${stagedSplit * 100}%`, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <FileListSection
          isZh={isZh}
          title={isZh ? "已暂存文件" : "Staged Files"}
          count={stagedFiles.length}
          icon="check"
          isStaged={true}
          files={stagedFiles}
          loading={loadingStatus}
          selectedPaths={selectedStagedPaths}
          onSelectedAction={handleUnstageSelected}
          onAllAction={handleUnstageAll}
          renderRow={renderFileRow}
        />
      </div>
      <div
        onMouseDown={handleStagedSplitMouseDown}
        onMouseEnter={() => setHoverStaged(true)}
        onMouseLeave={() => setHoverStaged(false)}
        style={{
          height: "1px",
          background: hoverStaged ? "var(--scrollbar-thumb)" : "var(--border-color)",
          cursor: "row-resize",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: "-4px", left: 0, right: 0, bottom: "-4px", cursor: "row-resize" }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <FileListSection
          isZh={isZh}
          title={isZh ? "未暂存文件" : "Unstaged Files"}
          count={unstagedFiles.length}
          icon="file"
          isStaged={false}
          files={unstagedFiles}
          loading={loadingStatus}
          selectedPaths={selectedUnstagedPaths}
          onSelectedAction={handleStageSelected}
          onAllAction={handleStageAll}
          renderRow={renderFileRow}
        />
      </div>
    </div>
  );
  const renderHistoryFileColumn = () => (
    <div
      ref={historyLeftColumnRef}
      style={{
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: `${leftColSplit * 100}%`,
        minWidth: "220px",
        maxWidth: "70%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-secondary)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "relative",
          flexGrow: 0,
          flexShrink: 0,
          flexBasis: `${historyLeftSplit * 100}%`,
          minHeight: `${HISTORY_INFO_MIN_PX}px`,
          padding: "8px 10px",
          paddingRight: "68px",
          overflowY: "auto",
          overflowX: "hidden",
          boxSizing: "border-box",
        }}
      >
        {selectedCommit ? (
          <>
            <div style={{ position: "absolute", top: "8px", right: "10px" }}>
              <CommitAuthorAvatar email={selectedCommit.authorEmail} hash={selectedCommit.hash} size={50} />
            </div>
            <div style={HISTORY_INFO_TEXT_STYLE}>
              {isZh ? "提交hash" : "Commit hash"}: {selectedCommit.hash}
            </div>
            <div style={HISTORY_INFO_TEXT_STYLE}>
              {isZh ? "作者" : "Author"}: {selectedCommit.author || "-"}
            </div>
            <div style={HISTORY_INFO_TEXT_STYLE}>
              {isZh ? "提交者邮箱" : "Author email"}: {selectedCommit.authorEmail || "-"}
            </div>
            <div style={HISTORY_INFO_TEXT_STYLE}>
              {isZh ? "提交时间" : "Commit date"}: {selectedCommit.date || "-"}
            </div>
            <div style={HISTORY_INFO_TEXT_STYLE}>
              {isZh ? "提交者" : "Committer"}: {selectedCommit.committer || "-"}
            </div>
            <div style={{ ...HISTORY_INFO_TEXT_STYLE, whiteSpace: "pre-wrap", marginTop: "10px" }}>{selectedCommit.message || (isZh ? "（无描述）" : "(no description)")}</div>
          </>
        ) : (
          <div style={{ color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>{isZh ? "点击上方提交查看详情" : "Click a commit above to view details"}</div>
        )}
      </div>
      <div
        onMouseDown={handleHistoryLeftSplitMouseDown}
        onMouseEnter={() => setHoverHistoryLeft(true)}
        onMouseLeave={() => setHoverHistoryLeft(false)}
        style={{
          height: "1px",
          background: hoverHistoryLeft ? "var(--scrollbar-thumb)" : "var(--border-color)",
          cursor: "row-resize",
          flexShrink: 0,
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: "-4px", left: 0, right: 0, bottom: "-4px", cursor: "row-resize" }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 10px",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            background: "var(--bg-tertiary)",
            borderBottom: "1px solid var(--border-color)",
            flexShrink: 0,
          }}
        >
          {isZh ? "本次提交的文件" : "Changed Files"}
          <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 400, color: "var(--text-muted)" }}>{commitFiles.length}</span>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "4px" }}>
          {loadingCommitFiles ? (
            <div style={{ padding: "12px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "加载中..." : "Loading..."}</div>
          ) : commitFiles.length === 0 ? (
            <div style={{ padding: "12px", fontSize: "11px", color: "var(--text-muted)", textAlign: "center" }}>{selectedCommit ? (isZh ? "该提交无文件改动" : "No files in this commit") : isZh ? "选择提交后显示文件" : "Select a commit to see its files"}</div>
          ) : (
            commitFiles.map((entry) => (
              <FileRow
                key={`c-${entry.file}`}
                entry={entry}
                isStaged={false}
                isZh={isZh}
                isPreviewSelected={selectedCommitFile === entry.file}
                isMultiSelected={false}
                onRowClick={() => {
                  if (selectedCommit) loadCommitFileDiff(selectedCommit.hash, entry.file);
                }}
                onRowContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onToggleStage={(e) => {
                  e.stopPropagation();
                }}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: "var(--bg-primary)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <TopActionBar
        isZh={isZh}
        branch={branch}
        hasRemote={!!remoteUrl}
        totalChangedCount={totalChangedCount}
        aheadCount={aheadCount}
        isPulling={isPulling}
        isPushing={isPushing}
        activeTab={activeTab}
        onCommitClick={() => {
          setActiveTab("commit");
          const textarea = document.querySelector<HTMLTextAreaElement>(".git-commit-textarea");
          textarea?.focus();
        }}
        onHistoryClick={() => setActiveTab("history")}
        onPull={handlePull}
        onPushClick={openPushDialog}
        onRefresh={loadStatus}
        onOpenBranchDialog={() => openBranchDialog("manage")}
        onOpenTagDialog={() => openTagDialog("manage")}
      />
      {activeTab === "history" && (
        <>
          <div
            style={{
              flex: "0 0 auto",
              height: `${historyTimelineHeightPx}px`,
              minHeight: `${HISTORY_TIMELINE_MIN_PX}px`,
              background: "var(--bg-secondary)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 12px",
                borderBottom: "1px solid var(--border-color)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{isZh ? "提交历史" : "Commit History"}</span>
              <button
                onClick={() => setActiveTab("commit")}
                style={{
                  padding: "2px 10px",
                  height: "22px",
                  fontSize: "11px",
                  background: "transparent",
                  border: "1px solid var(--border-color)",
                  borderRadius: "4px",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                  e.currentTarget.style.color = "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                {isZh ? "返回提交" : "Back to Commit"}
              </button>
            </div>
            <HistoryTimeline isZh={isZh} commits={historyCommits} loading={loadingHistory} selectedHash={selectedCommit?.hash ?? null} onSelect={loadCommitFiles} onContextMenu={openCommitContextMenu} onDoubleClick={handleCheckoutCommit} />
          </div>
          <div
            onMouseDown={handleHistorySplitMouseDown}
            onMouseEnter={() => setHoverHistory(true)}
            onMouseLeave={() => setHoverHistory(false)}
            style={{
              height: "1px",
              background: hoverHistory ? "var(--scrollbar-thumb)" : "var(--border-color)",
              cursor: "row-resize",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: "-4px", left: 0, right: 0, bottom: "-4px", cursor: "row-resize" }} />
          </div>
        </>
      )}
      <div
        ref={topAreaRef}
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          overflow: "hidden",
        }}
      >
        {activeTab === "commit" ? renderWorkingFileColumn() : renderHistoryFileColumn()}
        <div
          onMouseDown={handleLeftColMouseDown}
          onMouseEnter={() => setHoverLeftCol(true)}
          onMouseLeave={() => setHoverLeftCol(false)}
          style={{
            width: "1px",
            background: hoverLeftCol ? "var(--scrollbar-thumb)" : "var(--border-color)",
            cursor: "col-resize",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "-4px", right: "-4px", cursor: "col-resize" }} />
        </div>
        {activeTab === "commit" ? (
          <DiffViewer isZh={isZh} selectedFile={selectedFile} selectedIsStaged={selectedIsStaged} parsedDiff={parsedDiff} loadingDiff={loadingDiff} onFileSelect={onFileSelect} />
        ) : (
          <div style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-primary)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 12px",
                borderBottom: "1px solid var(--border-color)",
                background: "var(--bg-secondary)",
                flexShrink: 0,
                minHeight: "40px",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {selectedCommitFile ? <span style={{ fontWeight: 500 }}>{selectedCommitFile}</span> : <span style={{ color: "var(--text-muted)" }}>{isZh ? "点击左侧文件查看该提交中的差异" : "Click a file on the left to view its diff in this commit"}</span>}
              </span>
            </div>
            <div
              style={{
                flex: 1,
                overflow: "auto",
                padding: "4px 0",
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: "12px",
                lineHeight: 1.7,
                background: "var(--bg-primary)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {loadingCommitDiff ? (
                <div style={{ padding: "20px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "加载差异中..." : "Loading diff..."}</div>
              ) : !selectedCommitFile ? (
                <div style={{ padding: "20px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "点击左侧文件查看差异" : "Click a file on the left to view its diff"}</div>
              ) : parsedCommitDiff.length === 0 ? (
                <div style={{ padding: "20px", fontSize: "12px", color: "var(--text-muted)", textAlign: "center" }}>{isZh ? "无差异内容" : "No diff content"}</div>
              ) : (
                parsedCommitDiff.map((line, idx) => {
                  const isAdd = line.type === "added";
                  const isDel = line.type === "removed";
                  const bg = isAdd ? "rgba(76, 175, 80, 0.12)" : isDel ? "rgba(255, 68, 68, 0.12)" : "transparent";
                  const color = isAdd ? "#4caf50" : isDel ? "#ff4444" : "var(--text-secondary)";
                  const isHeader = line.content.startsWith("diff --git") || line.content.startsWith("index ") || line.content.startsWith("--- ") || line.content.startsWith("+++ ") || line.content.startsWith("@@") || line.content.startsWith("new file") || line.content.startsWith("deleted file");
                  return (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        padding: "0 12px",
                        background: isHeader ? "var(--bg-tertiary)" : bg,
                        minHeight: "20px",
                        color: isHeader ? "var(--text-muted)" : color,
                        opacity: isHeader ? 0.75 : 1,
                      }}
                    >
                      <span style={{ flex: 1 }}>{line.content || " "}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
      {activeTab === "commit" && (
        <>
          <div
            onMouseDown={handleTopSplitMouseDown}
            onMouseEnter={() => setHoverTop(true)}
            onMouseLeave={() => setHoverTop(false)}
            style={{
              height: "1px",
              background: hoverTop ? "var(--scrollbar-thumb)" : "var(--border-color)",
              cursor: "row-resize",
              flexShrink: 0,
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: "-4px", left: 0, right: 0, bottom: "-4px", cursor: "row-resize" }} />
          </div>
          <CommitArea
            isZh={isZh}
            minHeightPx={COMMIT_AREA_MIN_PX}
            heightPx={commitAreaHeightPx}
            stagedCount={stagedFiles.length}
            profileName={profileName}
            profileEmail={profileEmail}
            profileAvatar={profileAvatar}
            commitMessage={commitMessage}
            onCommitMessageChange={setCommitMessage}
            isCommitting={isCommitting}
            isPushing={isPushing}
            pushAfterCommit={pushAfterCommit}
            onPushAfterCommitChange={setPushAfterCommit}
            remoteShortName={remoteShortName}
            branch={branch}
            canPush={!!remoteUrl && !!branch}
            commitError={commitError}
            onCommit={handleCommit}
          />
        </>
      )}
      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          isZh={isZh}
          onClose={closeContextMenu}
          onOpenInExplorer={() => {
            const fullPath = workspacePath ? `${workspacePath}/${contextMenu.entry.file}`.replace(/\/+/g, "/") : contextMenu.entry.file;
            handleOpenInExplorer(fullPath);
          }}
          onCopyPath={() => {
            const fullPath = workspacePath ? `${workspacePath}/${contextMenu.entry.file}`.replace(/\/+/g, "/") : contextMenu.entry.file;
            handleCopyPath(fullPath);
          }}
          onDelete={() => handleDeleteFile(contextMenu.entry)}
          onRestoreChanges={() => handleRestoreChanges(contextMenu.entry, contextMenu.isStaged)}
          onStopTracking={() => handleStopTracking(contextMenu.entry)}
          onStageFile={() => handleStageFileFromMenu(contextMenu.entry, contextMenu.isStaged)}
          onCommit={() => {
            setActiveTab("commit");
            handleCommit(contextMenu.entry.file);
          }}
        />
      )}
      {commitContextMenu && (
        <CommitContextMenu
          x={commitContextMenu.x}
          y={commitContextMenu.y}
          isZh={isZh}
          onClose={closeCommitContextMenu}
          onCheckout={() => handleCheckoutCommit(commitContextMenu.commit)}
          onMerge={() => handleMergeCommit(commitContextMenu.commit)}
          onRebase={() => handleRebaseCommit(commitContextMenu.commit)}
          onReset={() => handleResetCommit(commitContextMenu.commit)}
          onRevert={() => handleRevertCommit(commitContextMenu.commit)}
        />
      )}
      {branchDialog && (
        <BranchDialog
          isZh={isZh}
          mode={branchDialog.mode}
          input={branchInput}
          onInputChange={setBranchInput}
          branches={availableBranches}
          currentBranch={branch}
          remoteBranches={remoteBranches}
          isWorking={isBranchWorking}
          onCancel={() => {
            if (!isBranchWorking) {
              setBranchDialog(null);
              setBranchInput("");
            }
          }}
          onConfirm={confirmBranchDialog}
        />
      )}
      {tagDialog && (
        <TagDialog
          isZh={isZh}
          mode={tagDialog.mode}
          input={tagInput}
          onInputChange={setTagInput}
          message={tagMessage}
          onMessageChange={setTagMessage}
          tags={availableTags}
          remoteTags={availableRemoteTags}
          isWorking={isTagWorking}
          onCancel={() => {
            if (!isTagWorking) {
              setTagDialog(null);
              setTagInput("");
              setTagMessage("");
            }
          }}
          onConfirm={confirmTagDialog}
        />
      )}
      {pushDialog && (
        <PushDialog
          isZh={isZh}
          remoteShortName={remoteShortName}
          currentBranch={branch}
          remoteBranches={pushRemoteBranches}
          localBranches={pushLocalBranches}
          tags={pushTags}
          remoteTags={pushRemoteTags}
          unpushedCommits={pushUnpushedCommits}
          loadingCommits={loadingPushData}
          isPushing={isPushing}
          onCancel={() => {
            if (!isPushing) {
              setPushDialog(false);
            }
          }}
          onConfirm={confirmPushDialog}
        />
      )}
    </div>
  );
};
export default GitPanel;
