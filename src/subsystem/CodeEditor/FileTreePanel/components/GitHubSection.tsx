import React, { useState } from "react";
import { GitInfo, FileChange } from "../types";
import { getStatusColor, getStatusLabel } from "../../fileUtils";
import { githubCommands } from "../../../../command/net/github";
interface GitHubSectionProps {
  gitInfo: GitInfo | null;
  loadingGit: boolean;
  fileChanges: FileChange[];
  loadingChanges: boolean;
  isPulling: boolean;
  isPushing: boolean;
  handlePull: () => void;
  handlePush: () => void;
  handleRefresh: () => void;
  onFileSelect: (path: string) => void;
  getRemoteStatusText: () => { text: string; color: string } | null;
  workspacePath: string | null | undefined;
}
export const GitHubSection: React.FC<GitHubSectionProps> = ({
  gitInfo,
  loadingGit,
  fileChanges,
  loadingChanges,
  isPulling,
  isPushing,
  handlePull,
  handlePush,
  handleRefresh,
  onFileSelect,
  getRemoteStatusText,
  workspacePath,
}) => {
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);
  const [diffData, setDiffData] = useState<{
    diff: string;
    additions?: number;
    deletions?: number;
    type: "diff" | "new_file" | "no_diff";
    content?: string;
  } | null>(null);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const handleFileClick = async (file: string) => {
    if (expandedDiff === file) {
      setExpandedDiff(null);
      setDiffData(null);
      return;
    }
    setExpandedDiff(file);
    setLoadingDiff(true);
    try {
      const result = await githubCommands.getFileDiff(workspacePath!, file);
      setDiffData(result);
    } catch (error) {
      console.error("Failed to load diff:", error);
      setDiffData({
        type: "no_diff",
        diff: "",
      });
    } finally {
      setLoadingDiff(false);
    }
  };
  if (loadingGit) {
    return (
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          padding: "4px 0",
        }}
      >
        Loading...
      </div>
    );
  }
  if (!gitInfo) {
    return (
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          padding: "4px 0",
        }}
      >
        不是 Git 仓库
      </div>
    );
  }
  return (
    <div>
      {gitInfo.remoteUrl && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "2px 0",
            fontSize: "10px",
            color: "var(--text-muted)",
            fontFamily: "monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={gitInfo.remoteUrl}
        >
          <span>🔗</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{gitInfo.remoteUrl}</span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "4px 0 6px 0",
          fontSize: "11px",
          color: "var(--text-secondary)",
          marginBottom: "6px",
          flexWrap: "wrap",
        }}
      >
        <span>🌿</span>
        <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{gitInfo.branch}</span>
        {gitInfo.remoteStatus && (
          <span
            style={{
              fontSize: "10px",
              color: getRemoteStatusText()?.color || "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            {getRemoteStatusText()?.text}
          </span>
        )}
        <span
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            marginLeft: "auto",
          }}
        >
          {gitInfo.hasChanges ? "🔵 有未提交更改" : "✅ 干净工作区"}
        </span>
      </div>
      <div
        style={{
          marginBottom: "6px",
          padding: "4px 0",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            fontWeight: 500,
            marginBottom: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.3px",
          }}
        >
          本地分支
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
          }}
        >
          {gitInfo.localBranches.length > 0 ? (
            gitInfo.localBranches.map((branch) => (
              <span
                key={branch}
                style={{
                  fontSize: "10px",
                  padding: "2px 8px",
                  borderRadius: "10px",
                  background: branch === gitInfo.branch ? "var(--accent-color)" : "var(--bg-tertiary)",
                  color: branch === gitInfo.branch ? "white" : "var(--text-secondary)",
                  fontWeight: branch === gitInfo.branch ? 500 : 400,
                }}
              >
                {branch}
                {branch === gitInfo.branch && " ✓"}
              </span>
            ))
          ) : (
            <span
              style={{
                fontSize: "10px",
                color: "var(--text-muted)",
              }}
            >
              无分支
            </span>
          )}
        </div>
      </div>
      {gitInfo.remoteUrl && (
        <div
          style={{
            display: "flex",
            gap: "6px",
            marginBottom: "6px",
          }}
        >
          <button
            onClick={handlePull}
            disabled={isPulling || isPushing}
            style={{
              padding: "2px 10px",
              height: "24px",
              fontSize: "10px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              cursor: isPulling || isPushing ? "not-allowed" : "pointer",
              opacity: isPulling || isPushing ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            onMouseEnter={(e) => {
              if (!isPulling && !isPushing) {
                e.currentTarget.style.background = "var(--hover-bg)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isPulling && !isPushing) {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
          >
            {isPulling ? "⏳ 拉取中..." : "⬇ Pull"}
          </button>
          <button
            onClick={handlePush}
            disabled={isPushing || isPulling}
            style={{
              padding: "2px 10px",
              height: "24px",
              fontSize: "10px",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-secondary)",
              cursor: isPushing || isPulling ? "not-allowed" : "pointer",
              opacity: isPushing || isPulling ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            onMouseEnter={(e) => {
              if (!isPushing && !isPulling) {
                e.currentTarget.style.background = "var(--hover-bg)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isPushing && !isPulling) {
                e.currentTarget.style.background = "var(--bg-tertiary)";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
          >
            {isPushing ? "⏳ 推送中..." : "⬆ Push"}
          </button>
          <button
            onClick={handleRefresh}
            style={{
              padding: "2px 8px",
              height: "24px",
              fontSize: "10px",
              background: "transparent",
              border: "1px solid var(--border-color)",
              borderRadius: "4px",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            🔄 刷新
          </button>
        </div>
      )}
      <div>
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            fontWeight: 500,
            marginBottom: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.3px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>📝 文件改动</span>
          {fileChanges.length > 0 && <span style={{ fontSize: "9px", fontWeight: 400 }}>{fileChanges.length} 个文件</span>}
        </div>
        {loadingChanges ? (
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              padding: "8px 0",
              textAlign: "center",
            }}
          >
            加载中...
          </div>
        ) : fileChanges.length > 0 ? (
          <div>
            {fileChanges.map((change, index) => {
              const isExpanded = expandedDiff === change.file;
              return (
                <div key={index}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "3px 4px",
                      borderRadius: "3px",
                      fontSize: "11px",
                      cursor: "pointer",
                      borderBottom: index < fileChanges.length - 1 ? "1px solid var(--border-color)" : "none",
                      background: isExpanded ? "var(--hover-bg)" : "transparent",
                    }}
                    onClick={() => handleFileClick(change.file)}
                    onMouseEnter={(e) => {
                      if (!isExpanded) {
                        e.currentTarget.style.background = "var(--hover-bg)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isExpanded) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: getStatusColor(change.status),
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        color: "var(--text-primary)",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {change.file}
                    </span>
                    <span
                      style={{
                        fontSize: "9px",
                        color: "var(--text-muted)",
                        display: "flex",
                        gap: "6px",
                        flexShrink: 0,
                      }}
                    >
                      {change.additions !== undefined && <span style={{ color: "#4caf50" }}>+{change.additions}</span>}
                      {change.deletions !== undefined && <span style={{ color: "#ff4444" }}>-{change.deletions}</span>}
                      <span style={{ color: getStatusColor(change.status) }}>{getStatusLabel(change.statusDesc)}</span>
                      <span
                        style={{
                          fontSize: "10px",
                          transition: "transform 0.15s ease",
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          display: "inline-block",
                        }}
                      >
                        &gt;
                      </span>
                    </span>
                  </div>
                  {isExpanded && (
                    <div style={{ padding: "4px 0 4px 14px" }}>
                      {loadingDiff ? (
                        <div
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            color: "var(--text-muted)",
                            fontSize: "12px",
                          }}
                        >
                          加载差异中...
                        </div>
                      ) : diffData && diffData.type !== "no_diff" ? (
                        <div
                          style={{
                            border: "1px solid var(--border-color)",
                            borderRadius: "4px",
                            overflow: "hidden",
                            margin: "4px 0",
                            background: "var(--bg-secondary)",
                          }}
                        >
                          {diffData.type === "new_file" && diffData.content ? (
                            <div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  color: "var(--text-muted)",
                                  padding: "4px 8px",
                                  background: "var(--bg-tertiary)",
                                  borderBottom: "1px solid var(--border-color)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                }}
                              >
                                <span style={{ color: "#4caf50" }}>+ 新文件</span>
                                <span>{change.file}</span>
                              </div>
                              <div
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "12px",
                                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                  whiteSpace: "pre-wrap",
                                  wordBreak: "break-all",
                                  maxHeight: "400px",
                                  overflow: "auto",
                                  background: "var(--bg-primary)",
                                }}
                              >
                                {diffData.content.split("\n").map((line, idx) => (
                                  <div key={idx} style={{ display: "flex" }}>
                                    <span
                                      style={{
                                        color: "var(--text-muted)",
                                        width: "30px",
                                        textAlign: "right",
                                        paddingRight: "12px",
                                        userSelect: "none",
                                        fontSize: "11px",
                                      }}
                                    >
                                      {idx + 1}
                                    </span>
                                    <span style={{ flex: 1 }}>{line}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div
                                style={{
                                  fontSize: "11px",
                                  padding: "4px 8px",
                                  background: "var(--bg-tertiary)",
                                  borderBottom: "1px solid var(--border-color)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    color: "var(--text-primary)",
                                    fontWeight: 500,
                                  }}
                                >
                                  {change.file}
                                </span>
                                {diffData.additions !== undefined && diffData.additions > 0 && <span style={{ color: "#4caf50" }}>+{diffData.additions}</span>}
                                {diffData.deletions !== undefined && diffData.deletions > 0 && <span style={{ color: "#ff4444" }}>-{diffData.deletions}</span>}
                              </div>
                              <div
                                style={{
                                  padding: "4px 0",
                                  fontSize: "12px",
                                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                  maxHeight: "400px",
                                  overflow: "auto",
                                  background: "var(--bg-primary)",
                                }}
                              >
                                {diffData.diff.split("\n").map((line, idx) => {
                                  if (line.startsWith("diff --git") || line.startsWith("index ") || line.startsWith("--- ") || line.startsWith("+++ ") || line.startsWith("@@")) {
                                    return null;
                                  }
                                  const isAdd = line.startsWith("+") && !line.startsWith("+++");
                                  const isDel = line.startsWith("-") && !line.startsWith("---");
                                  const isHeader = line.startsWith("@@");
                                  const getBgColor = () => {
                                    if (isAdd) return "rgba(76, 175, 80, 0.15)";
                                    if (isDel) return "rgba(255, 68, 68, 0.15)";
                                    if (isHeader) return "transparent";
                                    return "transparent";
                                  };
                                  const getTextColor = () => {
                                    if (isAdd) return "#4caf50";
                                    if (isDel) return "#ff4444";
                                    if (isHeader) return "var(--text-muted)";
                                    return "var(--text-secondary)";
                                  };
                                  const getPrefix = () => {
                                    if (isAdd) return "+";
                                    if (isDel) return "-";
                                    return " ";
                                  };
                                  if (isHeader) {
                                    return (
                                      <div
                                        key={idx}
                                        style={{
                                          color: "var(--text-muted)",
                                          padding: "0 8px",
                                          fontSize: "11px",
                                          background: "var(--bg-tertiary)",
                                          opacity: 0.7,
                                        }}
                                      >
                                        {line}
                                      </div>
                                    );
                                  }
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        background: getBgColor(),
                                        color: getTextColor(),
                                        padding: "1px 8px",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-all",
                                      }}
                                    >
                                      <span
                                        style={{
                                          userSelect: "none",
                                          opacity: 0.5,
                                          marginRight: "4px",
                                        }}
                                      >
                                        {getPrefix()}
                                      </span>
                                      {line}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: "12px",
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            textAlign: "center",
                            background: "var(--bg-tertiary)",
                            borderRadius: "4px",
                          }}
                        >
                          无差异内容
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              padding: "8px 0",
              textAlign: "center",
            }}
          >
            {gitInfo.hasChanges ? "暂无文件改动" : "工作区干净，无文件改动"}
          </div>
        )}
      </div>
    </div>
  );
};
