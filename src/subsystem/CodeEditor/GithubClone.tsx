import React, { useState, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { showToast, ToastType } from "../../components/Toast";
import { githubCommands } from "../../command/net/github";
import { Lock as LockIcon, Star } from "lucide-react";
import { GithubIcon, FolderTargetIcon, BrowseFolderIcon, RepoIcon, CheckCircleIcon, SpinnerIcon, AlertCircleIcon, CloseIcon, ChevronRightIcon } from "../../icons";
interface GithubRepoInfo {
  valid: boolean;
  owner?: string;
  name?: string;
  description?: string;
  stars?: number;
  forks?: number;
  private?: boolean;
  default_branch?: string;
  error?: string;
}
interface GithubCloneProps {
  t: (key: string, params?: any) => string;
  language?: "zh" | "en";
  isOpen: boolean;
  onClose: () => void;
  onClone: (repoUrl: string, targetPath: string, branch: string) => Promise<void>;
  isLoading?: boolean;
}
// Spinner with built-in rotation animation
const SpinnerWithAnimation = ({ size = 16 }: { size?: number }) => (
  <div
    style={{
      display: "inline-block",
      width: size,
      height: size,
      border: `2px solid var(--border-color)`,
      borderTop: `2px solid var(--accent-color)`,
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
      flexShrink: 0,
    }}
  />
);
const GithubClone: React.FC<GithubCloneProps> = ({ t, language = "en", isOpen, onClose, onClone, isLoading = false }) => {
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [cloneTargetPath, setCloneTargetPath] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [branches, setBranches] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [repoInfo, setRepoInfo] = useState<GithubRepoInfo | null>(null);
  const [showRepoInfo, setShowRepoInfo] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [cloneError, setCloneError] = useState<string>("");
  const [isCloning, setIsCloning] = useState(false);
  const [cloneProgress, setCloneProgress] = useState<string>("");
  const verifyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);
  const cloneTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isZh = language === "zh";
  // Click outside handler for branch dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
        setShowBranchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setGithubRepoUrl("");
      setCloneTargetPath("");
      setRepoInfo(null);
      setShowRepoInfo(false);
      setBranches([]);
      setSelectedBranch("");
      setCloneError("");
      setIsCloning(false);
      setCloneProgress("");
      // Clear any pending timeout
      if (cloneTimeoutRef.current) {
        clearTimeout(cloneTimeoutRef.current);
        cloneTimeoutRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [isOpen]);
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cloneTimeoutRef.current) {
        clearTimeout(cloneTimeoutRef.current);
        cloneTimeoutRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);
  const loadBranches = async (url: string) => {
    if (!url.trim()) return;
    setIsLoadingBranches(true);
    try {
      const result = await githubCommands.getGithubBranches(url.trim());
      if (result.branches && result.branches.length > 0) {
        setBranches(result.branches);
        if (repoInfo?.default_branch && result.branches.includes(repoInfo.default_branch)) {
          setSelectedBranch(repoInfo.default_branch);
        } else {
          setSelectedBranch(result.branches[0]);
        }
      }
    } catch (error) {
      // Silent fail for branches
    } finally {
      setIsLoadingBranches(false);
    }
  };
  const verifyGithubRepo = async (url: string) => {
    if (!url.trim()) {
      setRepoInfo(null);
      setShowRepoInfo(false);
      setBranches([]);
      setSelectedBranch("");
      return;
    }
    const githubPattern = /^(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/[\w-]+(\.git)?$/;
    if (!githubPattern.test(url.trim())) {
      setRepoInfo(null);
      setShowRepoInfo(false);
      setBranches([]);
      setSelectedBranch("");
      return;
    }
    setIsVerifying(true);
    try {
      const info = await githubCommands.verifyGithubRepo(url.trim());
      setRepoInfo(info);
      setShowRepoInfo(true);
      if (info.valid) {
        await loadBranches(url.trim());
      } else {
        setBranches([]);
        setSelectedBranch("");
      }
    } catch (error) {
      setRepoInfo(null);
      setShowRepoInfo(false);
      setBranches([]);
      setSelectedBranch("");
    } finally {
      setIsVerifying(false);
    }
  };
  // Debounced verification
  useEffect(() => {
    if (verifyTimerRef.current) {
      clearTimeout(verifyTimerRef.current);
    }
    if (githubRepoUrl.trim()) {
      verifyTimerRef.current = setTimeout(() => {
        verifyGithubRepo(githubRepoUrl);
      }, 600);
    } else {
      setRepoInfo(null);
      setShowRepoInfo(false);
      setBranches([]);
      setSelectedBranch("");
    }
    return () => {
      if (verifyTimerRef.current) {
        clearTimeout(verifyTimerRef.current);
      }
    };
  }, [githubRepoUrl]);
  const handleSelectCloneTarget = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: language === "zh" ? "选择克隆目标目录" : "Select Clone Target Directory",
      });
      if (selected && typeof selected === "string") {
        setCloneTargetPath(selected);
        setCloneError("");
      }
    } catch (error) {
      showToast(ToastType.ERROR, language === "zh" ? "选择目录失败" : "Failed to select directory");
    }
  };
  const handleCloneTargetPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCloneTargetPath(e.target.value);
    setCloneError("");
  };
  /**
   * Handle clone with timeout and abort support
   * - 5 minute timeout for clone operation
   * - AbortController for cancellation
   * - Progress feedback
   */
  const handleClone = async () => {
    // Validate inputs
    if (!githubRepoUrl.trim()) {
      showToast(ToastType.WARNING, language === "zh" ? "请输入 GitHub 仓库地址" : "Please enter GitHub repo URL");
      return;
    }
    if (!repoInfo?.valid) {
      showToast(ToastType.WARNING, language === "zh" ? "请输入有效的 GitHub 仓库地址" : "Please enter a valid GitHub repository URL");
      return;
    }
    if (!cloneTargetPath.trim()) {
      showToast(ToastType.WARNING, language === "zh" ? "请选择克隆目标目录" : "Please select clone target directory");
      return;
    }
    // Create abort controller for this operation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;
    setIsCloning(true);
    setCloneProgress(isZh ? "正在克隆..." : "Cloning...");
    setCloneError("");
    try {
      // Clone with timeout (5 minutes)
      const clonePromise = onClone(githubRepoUrl.trim(), cloneTargetPath, selectedBranch || repoInfo.default_branch || "main");
      // Race between clone and timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        cloneTimeoutRef.current = setTimeout(() => {
          reject(new Error("CLONE_TIMEOUT"));
        }, 300000); // 5 minutes timeout
      });
      // Race between clone, timeout, and abort
      await Promise.race([clonePromise, timeoutPromise]);
      // Clear timeout on success
      if (cloneTimeoutRef.current) {
        clearTimeout(cloneTimeoutRef.current);
        cloneTimeoutRef.current = null;
      }
      setCloneProgress(isZh ? "克隆完成！" : "Clone complete!");
      // Close dialog after short delay to show success
      setTimeout(() => {
        onClose();
        setGithubRepoUrl("");
        setCloneTargetPath("");
        setRepoInfo(null);
        setShowRepoInfo(false);
        setBranches([]);
        setSelectedBranch("");
        setCloneError("");
        setCloneProgress("");
      }, 500);
    } catch (error) {
      // Clear timeout
      if (cloneTimeoutRef.current) {
        clearTimeout(cloneTimeoutRef.current);
        cloneTimeoutRef.current = null;
      }
      // Check if aborted
      if (signal.aborted) {
        setCloneError(language === "zh" ? "克隆已取消" : "Clone cancelled");
        showToast(ToastType.INFO, language === "zh" ? "克隆已取消" : "Clone cancelled");
        return;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      // Handle timeout specifically
      if (errorMsg === "CLONE_TIMEOUT") {
        setCloneError(language === "zh" ? "克隆超时（5分钟），请检查网络连接" : "Clone timeout (5 minutes), please check network connection");
        showToast(ToastType.ERROR, language === "zh" ? "克隆超时，请检查网络" : "Clone timeout, check network");
        return;
      }
      // Handle other errors
      if (errorMsg.includes("already exists") || errorMsg.includes("destination path")) {
        setCloneError(language === "zh" ? "目标目录已存在且不为空，请选择其他目录" : "Destination path already exists and is not empty, please choose another directory");
        showToast(ToastType.ERROR, language === "zh" ? "目录已存在，请选择其他目录" : "Directory exists, please choose another");
      } else if (errorMsg.includes("Failed to create directory")) {
        setCloneError(language === "zh" ? "无法创建目录，请检查路径权限" : "Failed to create directory, please check permissions");
        showToast(ToastType.ERROR, language === "zh" ? "无法创建目录，请检查权限" : "Failed to create directory, check permissions");
      } else {
        setCloneError(language === "zh" ? "克隆失败，请检查网络或重试" : "Clone failed, please check network or retry");
        showToast(ToastType.ERROR, language === "zh" ? "克隆仓库失败" : "Failed to clone repository");
      }
    } finally {
      setIsCloning(false);
      abortControllerRef.current = null;
    }
  };
  /**
   * Handle cancel - aborts the clone operation if in progress
   */
  const handleCancel = () => {
    if (isCloning) {
      // Abort the clone operation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (cloneTimeoutRef.current) {
        clearTimeout(cloneTimeoutRef.current);
        cloneTimeoutRef.current = null;
      }
      setIsCloning(false);
      setCloneProgress("");
      setCloneError(language === "zh" ? "克隆已取消" : "Clone cancelled");
      showToast(ToastType.INFO, language === "zh" ? "克隆已取消" : "Clone cancelled");
      // Don't close the dialog, let user see the cancellation
    } else if (!isLoading) {
      onClose();
    }
  };
  if (!isOpen) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: "rgba(0, 0, 0, 0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "fadeIn 0.15s ease",
      }}
      onClick={() => {
        // Only close if not cloning and not loading
        if (!isCloning && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        style={{
          position: "relative",
          width: "min(480px, 90vw)",
          minWidth: "320px",
          maxWidth: "90vw",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
          overflow: "hidden",
          pointerEvents: "auto",
          padding: "4px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px",
            borderBottom: "1px solid var(--border-color)",
            background: "var(--bg-secondary)",
            height: "32px",
            borderRadius: "5px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <GithubIcon size={14} />
            {isZh ? "从 GitHub 拉取仓库" : "Clone from GitHub"}
            {isCloning && <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 400 }}>({isZh ? "克隆中..." : "Cloning..."})</span>}
          </span>
          <button
            onClick={handleCancel}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "22px",
              height: "22px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              borderRadius: "4px",
              padding: 0,
              opacity: isLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = "var(--hover-bg)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            title={isCloning ? (isZh ? "取消克隆" : "Cancel clone") : isZh ? "关闭" : "Close"}
            disabled={isLoading}
          >
            <CloseIcon size={14} />
          </button>
        </div>
        {/* Body */}
        <div
          style={{
            padding: "10px 14px 14px 14px",
            background: "var(--bg-primary)",
            borderRadius: "5px",
          }}
        >
          {/* Repository URL */}
          <div style={{ marginBottom: "8px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              {isZh ? "仓库地址" : "Repository URL"}
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                border: `1px solid ${isFocused ? "var(--accent-color)" : "var(--border-color)"}`,
                borderRadius: "6px",
                background: "var(--bg-secondary)",
                padding: "0 10px",
                transition: "border-color 0.2s ease",
                height: "32px",
                opacity: isCloning || isLoading ? 0.6 : 1,
              }}
            >
              <RepoIcon size={13} />
              <input
                type="text"
                value={githubRepoUrl}
                onChange={(e) => setGithubRepoUrl(e.target.value)}
                placeholder="github.com/user/repo"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isCloning || isLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && repoInfo?.valid && cloneTargetPath && !isCloning && !isLoading) {
                    handleClone();
                  }
                  if (e.key === "Escape" && !isCloning && !isLoading) {
                    onClose();
                  }
                }}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-primary)",
                  fontSize: "12px",
                  padding: "6px 0",
                  fontFamily: "monospace",
                  opacity: isCloning || isLoading ? 0.6 : 1,
                }}
                autoFocus
              />
              {isVerifying && <SpinnerWithAnimation size={13} />}
              {!isVerifying && repoInfo?.valid && <CheckCircleIcon size={13} />}
              {!isVerifying && repoInfo && !repoInfo.valid && <AlertCircleIcon size={13} />}
              {githubRepoUrl && !isCloning && !isLoading && (
                <button
                  onClick={() => {
                    setGithubRepoUrl("");
                    setRepoInfo(null);
                    setShowRepoInfo(false);
                    setBranches([]);
                    setSelectedBranch("");
                    setCloneError("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "18px",
                    height: "18px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    borderRadius: "4px",
                    flexShrink: 0,
                    padding: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <CloseIcon size={12} />
                </button>
              )}
            </div>
            {/* Repo info */}
            {showRepoInfo && repoInfo && (
              <div
                style={{
                  marginTop: "4px",
                  padding: "6px 10px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  background: repoInfo.valid ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
                  border: `1px solid ${repoInfo.valid ? "rgba(76, 175, 80, 0.3)" : "rgba(255, 68, 68, 0.3)"}`,
                }}
              >
                {repoInfo.valid ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        fontSize: "13px",
                      }}
                    >
                      {repoInfo.owner}/{repoInfo.name}
                    </span>
                    {repoInfo.description && (
                      <span
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "13px",
                        }}
                      >
                        {repoInfo.description.length > 40 ? repoInfo.description.slice(0, 40) + "..." : repoInfo.description}
                      </span>
                    )}
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "12px",
                      }}
                    >
                      <Star size={18} /> {repoInfo.stars || 0} · 🍴 {repoInfo.forks || 0}
                    </span>
                    {repoInfo.private && (
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        <LockIcon size={18} />
                      </span>
                    )}
                  </div>
                ) : (
                  <span
                    style={{
                      color: "var(--error-color)",
                      fontSize: "13px",
                    }}
                  >
                    {repoInfo.error || (isZh ? "无效的仓库" : "Invalid repository")}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* Branch selector */}
          {repoInfo?.valid && branches.length > 0 && (
            <div style={{ marginBottom: "8px" }}>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                {isZh ? "分支" : "Branch"}
              </label>
              <div ref={branchDropdownRef} style={{ position: "relative" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    border: "1px solid var(--border-color)",
                    borderRadius: "6px",
                    background: "var(--bg-secondary)",
                    padding: "0 10px",
                    height: "32px",
                    cursor: isCloning || isLoading ? "not-allowed" : "pointer",
                    userSelect: "none",
                    opacity: isCloning || isLoading ? 0.6 : 1,
                  }}
                  onClick={() => {
                    if (!isCloning && !isLoading) setShowBranchDropdown(!showBranchDropdown);
                  }}
                  onMouseEnter={(e) => {
                    if (!isCloning && !isLoading) {
                      e.currentTarget.style.borderColor = "var(--accent-color)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border-color)";
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span>🌿</span>
                    {selectedBranch || (isZh ? "选择分支" : "Select branch")}
                  </span>
                  <ChevronRightIcon size={12} />
                </div>
                {showBranchDropdown && (
                  <div
                    style={{
                      position: "absolute",
                      top: "34px",
                      left: 0,
                      right: 0,
                      maxHeight: "150px",
                      overflowY: "auto",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                      zIndex: 10,
                    }}
                  >
                    {isLoadingBranches ? (
                      <div
                        style={{
                          padding: "8px 12px",
                          textAlign: "center",
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        {isZh ? "加载中..." : "Loading..."}
                      </div>
                    ) : (
                      branches.map((branch) => (
                        <div
                          key={branch}
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            color: selectedBranch === branch ? "var(--accent-color)" : "var(--text-primary)",
                            cursor: "pointer",
                            background: selectedBranch === branch ? "var(--accent-glow)" : "transparent",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                          onClick={() => {
                            if (!isCloning && !isLoading) {
                              setSelectedBranch(branch);
                              setShowBranchDropdown(false);
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (selectedBranch !== branch) {
                              e.currentTarget.style.background = "var(--hover-bg)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (selectedBranch !== branch) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          <span>🌿</span>
                          {branch}
                          {selectedBranch === branch && (
                            <span
                              style={{
                                marginLeft: "auto",
                                color: "var(--accent-color)",
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Clone target */}
          <div style={{ marginBottom: "12px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: "var(--text-secondary)",
                display: "block",
                marginBottom: "4px",
              }}
            >
              {isZh ? "克隆到" : "Clone to"}
            </label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  border: `1px solid ${cloneError ? "var(--error-color)" : "var(--border-color)"}`,
                  borderRadius: "6px",
                  background: "var(--bg-secondary)",
                  padding: "0 10px",
                  height: "32px",
                  opacity: isCloning || isLoading ? 0.6 : 1,
                }}
              >
                <FolderTargetIcon size={13} />
                <input
                  type="text"
                  value={cloneTargetPath}
                  onChange={handleCloneTargetPathChange}
                  placeholder={isZh ? "输入或选择目标目录..." : "Enter or select target directory..."}
                  disabled={isCloning || isLoading}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: cloneError ? "var(--error-color)" : "var(--text-primary)",
                    fontSize: "12px",
                    padding: "6px 0",
                    opacity: isCloning || isLoading ? 0.6 : 1,
                  }}
                />
                {cloneTargetPath && !isCloning && !isLoading && (
                  <button
                    onClick={() => {
                      setCloneTargetPath("");
                      setCloneError("");
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "18px",
                      height: "18px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      borderRadius: "4px",
                      flexShrink: 0,
                      padding: 0,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <CloseIcon size={12} />
                  </button>
                )}
              </div>
              <button
                onClick={handleSelectCloneTarget}
                disabled={isCloning || isLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "4px",
                  padding: "0 12px",
                  height: "32px",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "6px",
                  cursor: isCloning || isLoading ? "not-allowed" : "pointer",
                  color: isCloning || isLoading ? "var(--text-muted)" : "var(--text-secondary)",
                  fontSize: "11px",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                  opacity: isCloning || isLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isCloning && !isLoading) {
                    e.currentTarget.style.background = "var(--hover-bg)";
                    e.currentTarget.style.color = "var(--text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCloning && !isLoading) {
                    e.currentTarget.style.background = "var(--bg-tertiary)";
                    e.currentTarget.style.color = "var(--text-secondary)";
                  }
                }}
              >
                <BrowseFolderIcon size={13} />
                {isZh ? "浏览" : "Browse"}
              </button>
            </div>
            {/* Clone progress or error */}
            {cloneProgress && !cloneError && (
              <div
                style={{
                  marginTop: "6px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <SpinnerWithAnimation size={14} />
                <span>{cloneProgress}</span>
              </div>
            )}
            {cloneError && (
              <div
                style={{
                  marginTop: "6px",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--error-color)",
                  background: "rgba(255, 68, 68, 0.08)",
                  border: "1px solid rgba(255, 68, 68, 0.15)",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "6px",
                  wordBreak: "break-all",
                }}
              >
                <AlertCircleIcon size={14} />
                <span>{cloneError}</span>
              </div>
            )}
          </div>
          {/* Actions */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              justifyContent: "flex-end",
              paddingTop: "2px",
            }}
          >
            <button
              onClick={handleCancel}
              disabled={isLoading}
              style={{
                padding: "4px 14px",
                height: "28px",
                fontSize: "11px",
                background: isCloning ? "rgba(255, 68, 68, 0.1)" : "transparent",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                color: isLoading ? "var(--text-muted)" : isCloning ? "var(--error-color)" : "var(--text-secondary)",
                cursor: isLoading ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                opacity: isLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = isCloning ? "rgba(255, 68, 68, 0.2)" : "var(--hover-bg)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.background = isCloning ? "rgba(255, 68, 68, 0.1)" : "transparent";
                }
              }}
            >
              {isCloning ? (isZh ? "取消克隆" : "Cancel Clone") : isZh ? "取消" : "Cancel"}
            </button>
            <button
              onClick={handleClone}
              disabled={isCloning || isLoading || !repoInfo?.valid || !cloneTargetPath.trim()}
              style={{
                padding: "4px 16px",
                height: "28px",
                fontSize: "11px",
                fontWeight: 500,
                background: isCloning || isLoading || !repoInfo?.valid || !cloneTargetPath.trim() ? "var(--bg-tertiary)" : "var(--accent-color)",
                border: "none",
                borderRadius: "6px",
                color: isCloning || isLoading || !repoInfo?.valid || !cloneTargetPath.trim() ? "var(--text-muted)" : "#fff",
                cursor: isCloning || isLoading || !repoInfo?.valid || !cloneTargetPath.trim() ? "not-allowed" : "pointer",
                opacity: isCloning || isLoading || !repoInfo?.valid || !cloneTargetPath.trim() ? 0.6 : 1,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onMouseEnter={(e) => {
                if (!isCloning && !isLoading && repoInfo?.valid && cloneTargetPath.trim()) {
                  e.currentTarget.style.background = "var(--accent-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCloning && !isLoading && repoInfo?.valid && cloneTargetPath.trim()) {
                  e.currentTarget.style.background = "var(--accent-color)";
                }
              }}
            >
              {(isCloning || isLoading) && <SpinnerWithAnimation size={12} />}
              {isCloning ? (isZh ? "克隆中..." : "Cloning...") : isLoading ? (isZh ? "加载中..." : "Loading...") : isZh ? "拉取" : "Clone"}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
export default GithubClone;
