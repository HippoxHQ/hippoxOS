import React from "react";
import { GitInfo } from "../types";

interface TimelineSectionProps {
  gitInfo: GitInfo | null;
  loadingGit: boolean;
}

export const TimelineSection: React.FC<TimelineSectionProps> = ({
  gitInfo,
  loadingGit,
}) => {
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

  if (!gitInfo || gitInfo.commits.length === 0) {
    return (
      <div
        style={{
          fontSize: "12px",
          color: "var(--text-muted)",
          padding: "4px 0",
        }}
      >
        暂无提交记录
      </div>
    );
  }

  return (
    <div
      style={{
        overflow: "hidden",
        wordBreak: "break-word",
        maxWidth: "100%",
      }}
    >
      {gitInfo.commits
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((commit, index) => (
          <div
            key={commit.hash}
            style={{
              padding: "4px 0",
              borderBottom:
                index < gitInfo.commits.length - 1
                  ? "1px solid var(--border-color)"
                  : "none",
              overflow: "hidden",
              maxWidth: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "6px",
                fontSize: "12px",
                overflow: "hidden",
                maxWidth: "100%",
              }}
            >
              <span
                style={{
                  color: "var(--text-muted)",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                ●
              </span>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      color: "var(--text-primary)",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                    }}
                  >
                    {commit.message}
                  </span>
                  {commit.isHead && (
                    <span
                      style={{
                        fontSize: "8px",
                        background: "var(--accent-color)",
                        color: "white",
                        padding: "1px 4px",
                        borderRadius: "8px",
                        flexShrink: 0,
                      }}
                    >
                      HEAD
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    marginTop: "1px",
                    flexWrap: "wrap",
                    wordBreak: "break-word",
                  }}
                >
                  <span style={{ flexShrink: 0 }}>{commit.shortHash}</span>
                  <span style={{ flexShrink: 0 }}>·</span>
                  <span style={{ flexShrink: 0 }}>{commit.author}</span>
                  <span style={{ flexShrink: 0 }}>·</span>
                  <span
                    style={{
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(commit.date).toLocaleString()}
                  </span>
                  {commit.branch &&
                    commit.branch !== "main" &&
                    commit.branch !== "master" && (
                      <>
                        <span style={{ flexShrink: 0 }}>·</span>
                        <span
                          style={{
                            color: "var(--accent-color)",
                            flexShrink: 0,
                          }}
                        >
                          {commit.branch}
                        </span>
                      </>
                    )}
                </div>
              </div>
            </div>
          </div>
        ))}
    </div>
  );
};
