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
    <div>
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
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
              }}
            >
              <span style={{ color: "var(--text-muted)" }}>●</span>
              <span style={{ color: "var(--text-primary)" }}>
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
                paddingLeft: "16px",
                fontSize: "10px",
                color: "var(--text-muted)",
                marginTop: "1px",
              }}
            >
              <span>{commit.shortHash}</span>
              <span>·</span>
              <span>{commit.author}</span>
              <span>·</span>
              <span>{new Date(commit.date).toLocaleString()}</span>
              {commit.branch &&
                commit.branch !== "main" &&
                commit.branch !== "master" && (
                  <>
                    <span>·</span>
                    <span style={{ color: "var(--accent-color)" }}>
                      {commit.branch}
                    </span>
                  </>
                )}
            </div>
          </div>
        ))}
    </div>
  );
};
