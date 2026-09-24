import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { STAGED_SPLIT_MIN, STAGED_SPLIT_MAX, STAGED_SPLIT_DEFAULT, LEFT_COL_MIN, LEFT_COL_MAX, LEFT_COL_DEFAULT, TOP_SPLIT_MIN, TOP_SPLIT_MAX, TOP_SPLIT_DEFAULT, COMMIT_AREA_MIN_PX } from "./constants";
import { generalCommands } from "../../../../command/General";
import { githubCommands } from "../../../../command/github";
import { profileCommands } from "../../../../command/Profile";
import { showToast, ToastType } from "../../../../components/Toast";
import BranchDialog from "./BranchDialog";
import CommitArea from "./CommitArea";
import DiffViewer from "./DiffViewer";
import FileContextMenu from "./FileContextMenu";
import FileListSection from "./FileListSection";
import FileRow from "./FileRow";
import TopActionBar from "./TopActionBar";
import { GitFileEntry, DraggingKind, DiffLine } from "./types";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const topAreaRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const draggingKind = useRef<DraggingKind>(null);
  const dragStartPos = useRef<number>(0);
  const dragStartRatio = useRef<number>(0);
  const [hoverStaged, setHoverStaged] = useState(false);
  const [hoverLeftCol, setHoverLeftCol] = useState(false);
  const [hoverTop, setHoverTop] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: GitFileEntry; isStaged: boolean } | null>(null);
  // Branch dialog state.
  // `mode === "manage"` opens the unified dialog on the "switch" tab.
  const [branchDialog, setBranchDialog] = useState<{ mode: "manage" | "new" | "delete" } | null>(null);
  const [branchInput, setBranchInput] = useState<string>("");
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  const [isBranchWorking, setIsBranchWorking] = useState(false);
  /**
   * Tracked pixel height of the entire panel container.
   * Used to convert the top split ratio into an exact pixel height for
   * the commit area, so it can never overflow its own content.
   */
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
  /**
   * Commit area height in pixels.
   * Derived from the top split ratio and clamped to at least
   * COMMIT_AREA_MIN_PX so the button row is never pushed out.
   */
  const commitAreaHeightPx = useMemo(() => {
    if (containerHeight <= 0) return COMMIT_AREA_MIN_PX;
    const raw = (1 - topSplit) * containerHeight;
    // Never go below the minimum, and never eat the whole panel
    return Math.max(COMMIT_AREA_MIN_PX, Math.min(containerHeight - 80, raw));
  }, [topSplit, containerHeight]);
  const loadProfile = useCallback(async () => {
    try {
      const profile = await profileCommands.getProfile();
      setProfileName(profile?.name || "");
      setProfileEmail(profile?.email || "");
      setProfileAvatar(profile?.avatar || "");
    } catch {
      setProfileName("");
      setProfileEmail("");
      setProfileAvatar("");
    }
  }, []);
  const loadStatus = useCallback(async () => {
    if (!workspacePath) {
      setStagedFiles([]);
      setUnstagedFiles([]);
      setBranch("");
      setRemoteUrl("");
      return;
    }
    setLoadingStatus(true);
    try {
      const [split, currentBranch, url] = await Promise.all([githubCommands.getGitStatusSplit(workspacePath).catch(() => ({ staged: [], unstaged: [], hasChanges: false })), githubCommands.getCurrentBranch(workspacePath).catch(() => ""), githubCommands.getRemoteUrl(workspacePath).catch(() => "")]);
      setStagedFiles(split.staged || []);
      setUnstagedFiles(split.unstaged || []);
      setBranch(currentBranch || "");
      setRemoteUrl(url || "");
    } catch (error) {
      console.error("Failed to load git status:", error);
      setStagedFiles([]);
      setUnstagedFiles([]);
    } finally {
      setLoadingStatus(false);
    }
  }, [workspacePath]);
  useEffect(() => {
    loadStatus();
    loadProfile();
    setSelectedFile(null);
    setSelectedIsStaged(false);
    setDiffContent("");
    setDiffType("no_diff");
    setNewFileContent("");
    setCommitMessage("");
    setSelectedStagedPaths(new Set());
    setSelectedUnstagedPaths(new Set());
  }, [loadStatus, loadProfile]);
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
  const handleCommit = useCallback(async () => {
    if (!workspacePath) return;
    const message = commitMessage.trim();
    if (!message) {
      showToast(ToastType.WARNING, isZh ? "请输入提交信息" : "Please enter a commit message");
      return;
    }
    if (stagedFiles.length === 0) {
      showToast(ToastType.WARNING, isZh ? "没有已暂存的文件" : "No staged files to commit");
      return;
    }
    setIsCommitting(true);
    try {
      await githubCommands.commit(workspacePath, message);
      if (pushAfterCommit && remoteUrl && branch) {
        try {
          await githubCommands.gitPush(workspacePath, branch);
          showToast(ToastType.SUCCESS, isZh ? "提交并推送成功" : "Commit and push successful");
        } catch (pushError) {
          console.error("Push after commit failed:", pushError);
          showToast(ToastType.ERROR, isZh ? "提交成功，但推送失败" : "Committed, but push failed");
        }
      } else {
        showToast(ToastType.SUCCESS, isZh ? "提交成功" : "Commit successful");
      }
      setCommitMessage("");
      setSelectedFile(null);
      setDiffContent("");
      setDiffType("no_diff");
      setNewFileContent("");
      setSelectedStagedPaths(new Set());
      await loadStatus();
    } catch (error) {
      console.error("Commit failed:", error);
      showToast(ToastType.ERROR, isZh ? "提交失败" : "Commit failed");
    } finally {
      setIsCommitting(false);
    }
  }, [workspacePath, commitMessage, stagedFiles.length, pushAfterCommit, remoteUrl, branch, loadStatus, isZh]);
  const handlePull = useCallback(async () => {
    if (!workspacePath || !branch) return;
    setIsPulling(true);
    try {
      await githubCommands.gitPull(workspacePath, branch);
      await loadStatus();
      showToast(ToastType.SUCCESS, isZh ? "拉取成功" : "Pull successful");
    } catch (error) {
      console.error("Pull failed:", error);
      showToast(ToastType.ERROR, isZh ? "拉取失败" : "Pull failed");
    } finally {
      setIsPulling(false);
    }
  }, [workspacePath, branch, loadStatus, isZh]);
  const handlePush = useCallback(async () => {
    if (!workspacePath || !branch) return;
    setIsPushing(true);
    try {
      await githubCommands.gitPush(workspacePath, branch);
      await loadStatus();
      showToast(ToastType.SUCCESS, isZh ? "推送成功" : "Push successful");
    } catch (error) {
      console.error("Push failed:", error);
      showToast(ToastType.ERROR, isZh ? "推送失败" : "Push failed");
    } finally {
      setIsPushing(false);
    }
  }, [workspacePath, branch, loadStatus, isZh]);
  /**
   * Open the unified branch management dialog.
   * "manage" is the default mode opened from the single Branch button.
   */
  const openBranchDialog = useCallback(
    async (mode: "manage" | "new" | "delete") => {
      setBranchDialog({ mode });
      setBranchInput("");
      if (workspacePath) {
        try {
          const branches = await githubCommands.getLocalBranches(workspacePath);
          setAvailableBranches(branches || []);
        } catch {
          setAvailableBranches([]);
        }
      } else {
        setAvailableBranches([]);
      }
    },
    [workspacePath],
  );
  /**
   * Confirm the currently active tab in the branch dialog.
   * The `tab` argument is passed up from BranchDialog so we know whether
   * the user wants to switch, create, or delete a branch.
   */
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
        const anyCommands = githubCommands as any;
        if (tab === "new") {
          if (typeof anyCommands.createBranch === "function") {
            await anyCommands.createBranch(workspacePath, name);
            showToast(ToastType.SUCCESS, isZh ? `已创建并切换到分支 ${name}` : `Created and switched to branch ${name}`);
          } else {
            throw new Error("createBranch command not available");
          }
        } else if (tab === "delete") {
          if (typeof anyCommands.deleteBranch === "function") {
            await anyCommands.deleteBranch(workspacePath, name);
            showToast(ToastType.SUCCESS, isZh ? `已删除分支 ${name}` : `Deleted branch ${name}`);
          } else {
            throw new Error("deleteBranch command not available");
          }
        } else {
          // switch
          if (typeof anyCommands.checkoutBranch === "function") {
            await anyCommands.checkoutBranch(workspacePath, name);
            showToast(ToastType.SUCCESS, isZh ? `已切换到分支 ${name}` : `Switched to branch ${name}`);
          } else {
            throw new Error("checkoutBranch command not available");
          }
        }
        setBranchDialog(null);
        setBranchInput("");
        await loadStatus();
      } catch (error) {
        console.error("Branch operation failed:", error);
        showToast(ToastType.ERROR, isZh ? "分支操作失败（缺少后端命令）" : "Branch operation failed (missing backend command)");
      } finally {
        setIsBranchWorking(false);
      }
    },
    [workspacePath, branchInput, loadStatus, isZh],
  );
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
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
    (entry: GitFileEntry) => {
      showToast(ToastType.INFO, isZh ? "删除命令未实现" : "Delete command not implemented");
    },
    [isZh],
  );
  const handleRestoreChanges = useCallback(
    async (entry: GitFileEntry) => {
      showToast(ToastType.INFO, isZh ? "恢复命令未实现" : "Restore command not implemented");
    },
    [isZh],
  );
  const handleStopTracking = useCallback(
    async (entry: GitFileEntry) => {
      showToast(ToastType.INFO, isZh ? "停止追踪命令未实现" : "Stop tracking command not implemented");
    },
    [isZh],
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
        isPulling={isPulling}
        isPushing={isPushing}
        onCommitClick={() => {
          const textarea = document.querySelector<HTMLTextAreaElement>(".git-commit-textarea");
          textarea?.focus();
        }}
        onPull={handlePull}
        onPush={handlePush}
        onRefresh={loadStatus}
        onOpenBranchDialog={() => openBranchDialog("manage")}
      />
      {/* Top area (file lists + diff viewer). Uses flex: 1 1 auto so it
          automatically fills whatever vertical space is left after the
          commit area (which has an exact pixel height). */}
      <div
        ref={topAreaRef}
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          overflow: "hidden",
        }}
      >
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
        <DiffViewer isZh={isZh} selectedFile={selectedFile} selectedIsStaged={selectedIsStaged} parsedDiff={parsedDiff} loadingDiff={loadingDiff} onFileSelect={onFileSelect} />
      </div>
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
      {/* Commit area uses an exact pixel height so its internal button
          row can never be pushed out by the textarea. */}
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
        pushAfterCommit={pushAfterCommit}
        onPushAfterCommitChange={setPushAfterCommit}
        remoteShortName={remoteShortName}
        branch={branch}
        canPush={!!remoteUrl && !!branch}
        onCommit={handleCommit}
      />
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
          onRestoreChanges={() => handleRestoreChanges(contextMenu.entry)}
          onStopTracking={() => handleStopTracking(contextMenu.entry)}
          onCommit={() => {
            const textarea = document.querySelector<HTMLTextAreaElement>(".git-commit-textarea");
            textarea?.focus();
          }}
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
    </div>
  );
};
export default GitPanel;
