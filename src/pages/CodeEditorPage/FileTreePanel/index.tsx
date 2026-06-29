import React, { useState, useRef } from "react";
import { SearchBar } from "./components/SearchBar";
import { FileTreeSection } from "./components/FileTreeSection";
import { GitHubSection } from "./components/GitHubSection";
import { TimelineSection } from "./components/TimelineSection";
import { SearchSection } from "./components/SearchSection";
import { useGit } from "./hooks/useGit";
import { FileNode, FileTreePanelProps } from "./types";
import { getDirectoryName } from "../fileUtils";
import {
  FolderIcon,
  GithubIcon,
  HistoryChatIcon2,
  SearchIcon,
} from "../../../icons";

const FileTreePanel: React.FC<FileTreePanelProps> = ({
  t,
  onFileSelect,
  selectedFile,
  workspacePath,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(
    new Set(["git", "timeline", "search"]),
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const {
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
  } = useGit(workspacePath);
  const directoryName = getDirectoryName(workspacePath);
  const clearSearch = () => {
    setSearchQuery("");
  };
  const toggleSectionCollapse = (sectionKey: string) => {
    const newSet = new Set(collapsedSections);
    if (newSet.has(sectionKey)) {
      newSet.delete(sectionKey);
    } else {
      newSet.add(sectionKey);
    }
    setCollapsedSections(newSet);
  };
  const renderSectionHeader = (
    key: string,
    icon: React.ReactNode,
    title: string,
    count?: number,
    rightContent?: React.ReactNode,
  ) => {
    const isCollapsed = collapsedSections.has(key);
    return (
      <div
        onClick={() => toggleSectionCollapse(key)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 8px",
          cursor: "pointer",
          userSelect: "none",
          color: "var(--text-secondary)",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          flexShrink: 0,
          minHeight: "28px",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "var(--text-secondary)";
        }}
      >
        <span
          style={{
            fontSize: "10px",
            transition: "transform 0.15s ease",
            transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
            display: "inline-block",
          }}
        >
          &gt;
        </span>
        {icon}
        <span style={{ flex: 1 }}>{title}</span>
        {count !== undefined && (
          <span
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              fontWeight: 400,
            }}
          >
            {count}
          </span>
        )}
        {rightContent}
      </div>
    );
  };

  const renderDivider = () => (
    <div
      style={{
        height: "1px",
        background: "var(--border-color)",
        margin: "0",
        flexShrink: 0,
      }}
    />
  );

  const isProjectCollapsed = collapsedSections.has("project");
  const isGitCollapsed = collapsedSections.has("git");
  const isTimelineCollapsed = collapsedSections.has("timeline");
  const isSearchCollapsed = collapsedSections.has("search");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-secondary)",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearchFocused={isSearchFocused}
        setIsSearchFocused={setIsSearchFocused}
        clearSearch={clearSearch}
        t={t}
      />

      <div
        style={{
          flex: 1,
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <div
          ref={containerRef}
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: isProjectCollapsed ? "0 0 auto" : 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {renderSectionHeader(
              "project",
              <FolderIcon size={14} />,
              directoryName,
              undefined,
            )}
            {!isProjectCollapsed && (
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "2px 4px 4px 4px",
                  minHeight: 0,
                }}
              >
                <FileTreeSection
                  workspacePath={workspacePath}
                  selectedFile={selectedFile}
                  onFileSelect={onFileSelect}
                  searchQuery={searchQuery}
                  isCollapsed={isProjectCollapsed}
                  t={t}
                  onFileTreeChange={setFileTree}
                />
              </div>
            )}
          </div>
          {renderDivider()}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: isGitCollapsed ? "0 0 auto" : 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {renderSectionHeader(
              "git",
              <GithubIcon size={14} />,
              "GitHub",
              undefined,
              gitInfo && (
                <span
                  style={{
                    fontSize: "10px",
                    color: gitInfo.hasChanges
                      ? "var(--accent-color)"
                      : "#4caf50",
                    fontWeight: 400,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: gitInfo.hasChanges
                        ? "var(--accent-color)"
                        : "#4caf50",
                    }}
                  />
                  {gitInfo.branch}
                </span>
              ),
            )}
            {!isGitCollapsed && (
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "2px 12px 8px 12px",
                  minHeight: 0,
                }}
              >
                <GitHubSection
                  gitInfo={gitInfo}
                  loadingGit={loadingGit}
                  fileChanges={fileChanges}
                  loadingChanges={loadingChanges}
                  isPulling={isPulling}
                  isPushing={isPushing}
                  handlePull={handlePull}
                  handlePush={handlePush}
                  handleRefresh={() => checkGitRepo(workspacePath!)}
                  onFileSelect={onFileSelect}
                  getRemoteStatusText={getRemoteStatusText}
                  workspacePath={workspacePath}
                />
              </div>
            )}
          </div>

          {renderDivider()}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: isTimelineCollapsed ? "0 0 auto" : 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {renderSectionHeader(
              "timeline",
              <HistoryChatIcon2 size={14} />,
              "时间线",
              gitInfo ? gitInfo.commits.length : 0,
            )}
            {!isTimelineCollapsed && (
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "2px 12px 8px 12px",
                  minHeight: 0,
                }}
              >
                <TimelineSection gitInfo={gitInfo} loadingGit={loadingGit} />
              </div>
            )}
          </div>

          {renderDivider()}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: isSearchCollapsed ? "0 0 auto" : 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            {renderSectionHeader(
              "search",
              <SearchIcon />,
              "搜索",
              fileTree.length > 0 ? undefined : 0,
            )}
            {!isSearchCollapsed && (
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "2px 12px 8px 12px",
                  minHeight: 0,
                }}
              >
                <SearchSection
                  fileTree={fileTree}
                  onFileSelect={onFileSelect}
                  t={t}
                  workspacePath={workspacePath}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileTreePanel;
