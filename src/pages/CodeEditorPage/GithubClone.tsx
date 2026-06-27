import React, { useState, useEffect, useRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { showToast, ToastType } from "../../components/Toast";
import { githubCommands } from "../../command/net/github";
import {
  GithubIcon,
  FolderTargetIcon,
  BrowseFolderIcon,
  RepoIcon,
  CheckCircleIcon,
  SpinnerIcon,
  AlertCircleIcon,
  CloseIcon,
  ChevronRightIcon,
} from "../../icons";

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
  onClone: (
    repoUrl: string,
    targetPath: string,
    branch: string,
  ) => Promise<void>;
  isLoading?: boolean;
}

const GithubClone: React.FC<GithubCloneProps> = ({
  t,
  language = "en",
  isOpen,
  onClose,
  onClone,
  isLoading = false,
}) => {
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
  const verifyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  const isZh = language === "zh";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        branchDropdownRef.current &&
        !branchDropdownRef.current.contains(event.target as Node)
      ) {
        setShowBranchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    }
  }, [isOpen]);

  const loadBranches = async (url: string) => {
    if (!url.trim()) return;
    setIsLoadingBranches(true);
    try {
      const result = await githubCommands.getGithubBranches(url.trim());
      if (result.branches && result.branches.length > 0) {
        setBranches(result.branches);
        if (
          repoInfo?.default_branch &&
          result.branches.includes(repoInfo.default_branch)
        ) {
          setSelectedBranch(repoInfo.default_branch);
        } else {
          setSelectedBranch(result.branches[0]);
        }
      }
    } catch (error) {
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

    const githubPattern =
      /^(https?:\/\/)?(www\.)?github\.com\/[\w-]+\/[\w-]+(\.git)?$/;
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
        title:
          language === "zh"
            ? "选择克隆目标目录"
            : "Select Clone Target Directory",
      });
      if (selected && typeof selected === "string") {
        setCloneTargetPath(selected);
        setCloneError("");
      }
    } catch (error) {
      showToast(
        ToastType.ERROR,
        language === "zh" ? "选择目录失败" : "Failed to select directory",
      );
    }
  };

  const handleCloneTargetPathChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCloneTargetPath(e.target.value);
    setCloneError("");
  };

  const handleClone = async () => {
    if (!githubRepoUrl.trim()) {
      showToast(
        ToastType.WARNING,
        language === "zh"
          ? "请输入 GitHub 仓库地址"
          : "Please enter GitHub repo URL",
      );
      return;
    }

    if (!repoInfo?.valid) {
      showToast(
        ToastType.WARNING,
        language === "zh"
          ? "请输入有效的 GitHub 仓库地址"
          : "Please enter a valid GitHub repository URL",
      );
      return;
    }

    if (!cloneTargetPath.trim()) {
      showToast(
        ToastType.WARNING,
        language === "zh"
          ? "请选择克隆目标目录"
          : "Please select clone target directory",
      );
      return;
    }

    setIsCloning(true);
    setCloneError("");

    try {
      const branch = selectedBranch || repoInfo.default_branch || "main";
      await onClone(githubRepoUrl.trim(), cloneTargetPath, branch);
      onClose();
      setGithubRepoUrl("");
      setCloneTargetPath("");
      setRepoInfo(null);
      setShowRepoInfo(false);
      setBranches([]);
      setSelectedBranch("");
      setCloneError("");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        errorMsg.includes("already exists") ||
        errorMsg.includes("destination path")
      ) {
        setCloneError(
          language === "zh"
            ? "目标目录已存在且不为空，请选择其他目录"
            : "Destination path already exists and is not empty, please choose another directory",
        );
        showToast(
          ToastType.ERROR,
          language === "zh"
            ? "目录已存在，请选择其他目录"
            : "Directory exists, please choose another",
        );
      } else if (errorMsg.includes("Failed to create directory")) {
        setCloneError(
          language === "zh"
            ? "无法创建目录，请检查路径权限"
            : "Failed to create directory, please check permissions",
        );
        showToast(
          ToastType.ERROR,
          language === "zh"
            ? "无法创建目录，请检查权限"
            : "Failed to create directory, check permissions",
        );
      } else {
        setCloneError(
          language === "zh"
            ? "克隆失败，请检查网络或重试"
            : "Clone failed, please check network or retry",
        );
        showToast(
          ToastType.ERROR,
          language === "zh" ? "克隆仓库失败" : "Failed to clone repository",
        );
      }
    } finally {
      setIsCloning(false);
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
          </span>
          <button
            onClick={() => {
              if (!isCloning && !isLoading) {
                onClose();
              }
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "22px",
              height: "22px",
              background: "transparent",
              border: "none",
              cursor: isCloning || isLoading ? "not-allowed" : "pointer",
              color: "var(--text-secondary)",
              borderRadius: "4px",
              padding: 0,
              opacity: isCloning || isLoading ? 0.5 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isCloning && !isLoading) {
                e.currentTarget.style.background = "var(--hover-bg)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <CloseIcon size={14} />
          </button>
        </div>

        <div
          style={{
            padding: "10px 14px 14px 14px",
            background: "var(--bg-primary)",
            borderRadius: "5px",
          }}
        >
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
                  if (e.key === "Enter" && repoInfo?.valid && cloneTargetPath) {
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
              {isVerifying && <SpinnerIcon size={13} />}
              {!isVerifying && repoInfo?.valid && <CheckCircleIcon size={13} />}
              {!isVerifying && repoInfo && !repoInfo.valid && (
                <AlertCircleIcon size={13} />
              )}
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
            {showRepoInfo && repoInfo && (
              <div
                style={{
                  marginTop: "4px",
                  padding: "6px 10px",
                  borderRadius: "4px",
                  fontSize: "13px",
                  background: repoInfo.valid
                    ? "var(--bg-tertiary)"
                    : "var(--bg-tertiary)",
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
                        {repoInfo.description.length > 40
                          ? repoInfo.description.slice(0, 40) + "..."
                          : repoInfo.description}
                      </span>
                    )}
                    <span
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "12px",
                      }}
                    >
                      ⭐ {repoInfo.stars || 0} · 🍴 {repoInfo.forks || 0}
                    </span>
                    {repoInfo.private && (
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        🔒
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
                    {repoInfo.error ||
                      (isZh ? "无效的仓库" : "Invalid repository")}
                  </span>
                )}
              </div>
            )}
          </div>

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
                    if (!isCloning && !isLoading)
                      setShowBranchDropdown(!showBranchDropdown);
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
                            color:
                              selectedBranch === branch
                                ? "var(--accent-color)"
                                : "var(--text-primary)",
                            cursor: "pointer",
                            background:
                              selectedBranch === branch
                                ? "var(--accent-glow)"
                                : "transparent",
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
                              e.currentTarget.style.background =
                                "var(--hover-bg)";
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
                }}
              >
                <FolderTargetIcon size={13} />
                <input
                  type="text"
                  value={cloneTargetPath}
                  onChange={handleCloneTargetPathChange}
                  placeholder={
                    isZh
                      ? "输入或选择目标目录..."
                      : "Enter or select target directory..."
                  }
                  disabled={isCloning || isLoading}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: cloneError
                      ? "var(--error-color)"
                      : "var(--text-primary)",
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
                  color:
                    isCloning || isLoading
                      ? "var(--text-muted)"
                      : "var(--text-secondary)",
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

          <div
            style={{
              display: "flex",
              gap: "6px",
              justifyContent: "flex-end",
              paddingTop: "2px",
            }}
          >
            <button
              onClick={() => {
                if (isCloning || isLoading) return;
                onClose();
              }}
              disabled={isCloning || isLoading}
              style={{
                padding: "4px 14px",
                height: "28px",
                fontSize: "11px",
                background: "transparent",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                color:
                  isCloning || isLoading
                    ? "var(--text-muted)"
                    : "var(--text-secondary)",
                cursor: isCloning || isLoading ? "not-allowed" : "pointer",
                transition: "all 0.15s",
                opacity: isCloning || isLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isCloning && !isLoading) {
                  e.currentTarget.style.background = "var(--hover-bg)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {isZh ? "取消" : "Cancel"}
            </button>
            <button
              onClick={handleClone}
              disabled={
                isCloning ||
                isLoading ||
                !repoInfo?.valid ||
                !cloneTargetPath.trim()
              }
              style={{
                padding: "4px 16px",
                height: "28px",
                fontSize: "11px",
                fontWeight: 500,
                background:
                  isCloning ||
                  isLoading ||
                  !repoInfo?.valid ||
                  !cloneTargetPath.trim()
                    ? "var(--bg-tertiary)"
                    : "var(--accent-color)",
                border: "none",
                borderRadius: "6px",
                color:
                  isCloning ||
                  isLoading ||
                  !repoInfo?.valid ||
                  !cloneTargetPath.trim()
                    ? "var(--text-muted)"
                    : "#fff",
                cursor:
                  isCloning ||
                  isLoading ||
                  !repoInfo?.valid ||
                  !cloneTargetPath.trim()
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  isCloning ||
                  isLoading ||
                  !repoInfo?.valid ||
                  !cloneTargetPath.trim()
                    ? 0.6
                    : 1,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              onMouseEnter={(e) => {
                if (
                  !isCloning &&
                  !isLoading &&
                  repoInfo?.valid &&
                  cloneTargetPath.trim()
                ) {
                  e.currentTarget.style.background = "var(--accent-hover)";
                }
              }}
              onMouseLeave={(e) => {
                if (
                  !isCloning &&
                  !isLoading &&
                  repoInfo?.valid &&
                  cloneTargetPath.trim()
                ) {
                  e.currentTarget.style.background = "var(--accent-color)";
                }
              }}
            >
              {(isCloning || isLoading) && <SpinnerIcon size={12} />}
              {isCloning || isLoading
                ? isZh
                  ? "克隆中..."
                  : "Cloning..."
                : isZh
                  ? "拉取"
                  : "Clone"}
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
