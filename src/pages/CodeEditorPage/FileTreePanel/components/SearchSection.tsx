import React, { useState, useEffect, useRef, useCallback } from "react";
import { FileNode } from "../types";
import { SearchIcon, CloseIcon } from "../../../../icons";
import { FileSearchResult, codeEditorCommands, SearchMatch } from "../../../../command/CodeEditor";
import { getFileIconComponent } from "../../fileUtils";

interface SearchSectionProps {
  fileTree: FileNode[];
  onFileSelect: (path: string) => void;
  t: (key: string) => string;
  workspacePath?: string | null;
}

export const SearchSection: React.FC<SearchSectionProps> = ({ fileTree, onFileSelect, t, workspacePath }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FileSearchResult[]>([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [selectedMatchIndex, setSelectedMatchIndex] = useState<{
    fileIdx: number;
    matchIdx: number;
  } | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resultRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const performSearch = useCallback(
    async (query: string) => {
      if (!query.trim() || !workspacePath) {
        setSearchResults([]);
        setTotalMatches(0);
        setExpandedFiles(new Set());
        return;
      }
      setIsSearching(true);
      try {
        const result = await codeEditorCommands.searchInFiles(workspacePath, query.trim());
        if (result.success) {
          setSearchResults(result.results);
          setTotalMatches(result.total_matches);
          if (result.results.length > 0) {
            setExpandedFiles(new Set([result.results[0].file_path]));
          }
        } else {
          setSearchResults([]);
          setTotalMatches(0);
        }
      } catch (error) {
        console.error("Search failed:", error);
        setSearchResults([]);
        setTotalMatches(0);
      } finally {
        setIsSearching(false);
      }
    },
    [workspacePath],
  );

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setTotalMatches(0);
      setExpandedFiles(new Set());
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, performSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (searchResults.length === 0) return;
      const allMatches: { fileIdx: number; matchIdx: number }[] = [];
      searchResults.forEach((file, fileIdx) => {
        file.matches.forEach((_, matchIdx) => {
          allMatches.push({ fileIdx, matchIdx });
        });
      });
      if (allMatches.length === 0) return;
      let currentIdx = -1;
      if (selectedMatchIndex) {
        currentIdx = allMatches.findIndex((m) => m.fileIdx === selectedMatchIndex.fileIdx && m.matchIdx === selectedMatchIndex.matchIdx);
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = (currentIdx + 1) % allMatches.length;
        setSelectedMatchIndex(allMatches[nextIdx]);
        const file = searchResults[allMatches[nextIdx].fileIdx];
        setExpandedFiles((prev) => new Set(prev).add(file.file_path));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIdx = currentIdx <= 0 ? allMatches.length - 1 : currentIdx - 1;
        setSelectedMatchIndex(allMatches[prevIdx]);
        const file = searchResults[allMatches[prevIdx].fileIdx];
        setExpandedFiles((prev) => new Set(prev).add(file.file_path));
      } else if (e.key === "Enter" && selectedMatchIndex) {
        e.preventDefault();
        const file = searchResults[selectedMatchIndex.fileIdx];
        if (file) {
          onFileSelect(file.file_path);
          setSearchQuery("");
          setSearchResults([]);
          setTotalMatches(0);
          setExpandedFiles(new Set());
          setSelectedMatchIndex(null);
        }
      } else if (e.key === "Escape") {
        setSearchQuery("");
        setSearchResults([]);
        setTotalMatches(0);
        setExpandedFiles(new Set());
        setSelectedMatchIndex(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [searchResults, selectedMatchIndex, onFileSelect]);

  useEffect(() => {
    if (selectedMatchIndex) {
      const key = `${selectedMatchIndex.fileIdx}-${selectedMatchIndex.matchIdx}`;
      const el = resultRefs.current.get(key);
      if (el) {
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [selectedMatchIndex]);

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setTotalMatches(0);
    setExpandedFiles(new Set());
    setSelectedMatchIndex(null);
    setIsSearchFocused(false);
  };

  const toggleFileExpand = (filePath: string) => {
    setExpandedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(filePath)) {
        newSet.delete(filePath);
      } else {
        newSet.add(filePath);
      }
      return newSet;
    });
  };

  const handleMatchClick = (filePath: string) => {
    onFileSelect(filePath);
    setSearchQuery("");
    setSearchResults([]);
    setTotalMatches(0);
    setExpandedFiles(new Set());
    setSelectedMatchIndex(null);
  };

  const highlightAllMatches = (text: string, query: string) => {
    if (!query.trim()) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    const matches: { start: number; end: number }[] = [];
    let searchIndex = 0;
    while (searchIndex < lowerText.length) {
      const index = lowerText.indexOf(lowerQuery, searchIndex);
      if (index === -1) break;
      matches.push({ start: index, end: index + lowerQuery.length });
      searchIndex = index + lowerQuery.length;
    }
    if (matches.length === 0) return text;
    const parts: React.ReactNode[] = [];
    let lastEnd = 0;
    for (const match of matches) {
      if (match.start > lastEnd) {
        parts.push(text.substring(lastEnd, match.start));
      }
      parts.push(
        <span key={match.start} style={{ color: "var(--accent-color)", fontWeight: "bold" }}>
          {text.substring(match.start, match.end)}
        </span>,
      );
      lastEnd = match.end;
    }
    if (lastEnd < text.length) {
      parts.push(text.substring(lastEnd));
    }
    return <>{parts}</>;
  };

  const renderMatchContext = (match: SearchMatch, query: string, fullLine: string) => {
    const contextSize = 15;
    let start = Math.max(0, match.start_index - contextSize);
    let end = Math.min(fullLine.length, match.end_index + contextSize);
    let context = fullLine.substring(start, end);
    let prefix = start > 0 ? "..." : "";
    let suffix = end < fullLine.length ? "..." : "";
    const displayText = prefix + context + suffix;
    const lowerText = displayText.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    const matchStartInDisplay = match.start_index - start + (start > 0 ? 3 : 0);
    const matchEndInDisplay = match.end_index - start + (start > 0 ? 3 : 0);
    return (
      <>
        {displayText.substring(0, matchStartInDisplay)}
        <span style={{ color: "var(--accent-color)", fontWeight: "bold" }}>{displayText.substring(matchStartInDisplay, matchEndInDisplay)}</span>
        {displayText.substring(matchEndInDisplay)}
      </>
    );
  };

  const formatMatchCount = (count: number): string => {
    if (count > 99) return "99+";
    return count.toString();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* 搜索框 */}
      <div
        style={{
          padding: "4px 0",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--bg-tertiary)",
            borderRadius: "4px",
            border: `1px solid ${isSearchFocused ? "var(--accent-color)" : "var(--border-color)"}`,
            padding: "0 8px",
            transition: "border-color 0.15s ease",
            height: "28px",
          }}
        >
          <SearchIcon />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder={t("codeEditor.searchFilesContent") || "搜索文件内容..."}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "12px",
              padding: "4px 8px",
              height: "100%",
            }}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
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
                padding: 0,
                flexShrink: 0,
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
              <CloseIcon size={12} />
            </button>
          )}
        </div>
        {searchQuery && (
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-muted)",
              padding: "2px 4px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              {isSearching
                ? t("codeEditor.searching") || "搜索中..."
                : searchResults.length > 0
                  ? (t as any)("codeEditor.searchResultsSummary", {
                      total: totalMatches,
                      files: searchResults.length,
                    })
                  : t("codeEditor.noSearchContentResults") || "未找到匹配的内容"}
            </span>
          </div>
        )}
      </div>

      {/* 搜索结果列表 */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          minHeight: 0,
        }}
      >
        {!searchQuery.trim() ? (
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              padding: "20px 0",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <SearchIcon />
            <span>{t("codeEditor.searchContentPlaceholder") || "输入关键词搜索文件内容"}</span>
            <span style={{ fontSize: "10px", opacity: 0.6 }}>{t("codeEditor.searchContentHint") || "支持内容搜索，按 ↑ ↓ 选择，Enter 打开文件"}</span>
          </div>
        ) : isSearching ? (
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              padding: "20px 0",
              textAlign: "center",
            }}
          >
            {t("codeEditor.searching") || "搜索中..."}
          </div>
        ) : searchResults.length === 0 ? (
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              padding: "12px 0",
              textAlign: "center",
            }}
          >
            {t("codeEditor.noSearchContentResults") || "未找到匹配的内容"}
          </div>
        ) : (
          searchResults.map((fileResult, fileIdx) => {
            const isExpanded = expandedFiles.has(fileResult.file_path);
            const isFileSelected = selectedMatchIndex?.fileIdx === fileIdx;

            return (
              <div key={fileResult.file_path} style={{ marginBottom: "2px" }}>
                {/* 文件行 */}
                <div
                  onClick={() => toggleFileExpand(fileResult.file_path)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    background: isFileSelected ? "var(--accent-glow)" : "transparent",
                    color: isFileSelected ? "var(--accent-color)" : "var(--text-primary)",
                    fontSize: "12px",
                    transition: "background 0.1s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isFileSelected) {
                      e.currentTarget.style.background = "var(--hover-bg)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isFileSelected) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                  title={fileResult.file_path}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      transition: "transform 0.15s ease",
                      transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  >
                    &gt;
                  </span>
                  <span style={{ fontSize: "14px", flexShrink: 0 }}>{getFileIconComponent(fileResult.relative_path)}</span>
                  <span
                    style={{
                      flex: 1,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {fileResult.relative_path}
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      color: "var(--text-muted)",
                      flexShrink: 0,
                      background: "var(--bg-tertiary)",
                      padding: "1px 6px",
                      borderRadius: "8px",
                      minWidth: "20px",
                      textAlign: "center",
                    }}
                  >
                    {formatMatchCount(fileResult.match_count)}
                  </span>
                </div>

                {/* 匹配列表 */}
                {isExpanded && (
                  <div style={{ paddingLeft: "20px" }}>
                    {fileResult.matches.map((match, matchIdx) => {
                      const isSelected = selectedMatchIndex?.fileIdx === fileIdx && selectedMatchIndex?.matchIdx === matchIdx;
                      const key = `${fileIdx}-${matchIdx}`;

                      return (
                        <div
                          key={key}
                          ref={(el) => {
                            if (el) {
                              resultRefs.current.set(key, el);
                            }
                          }}
                          onClick={() => handleMatchClick(fileResult.file_path)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "3px 8px",
                            borderRadius: "3px",
                            cursor: "pointer",
                            background: isSelected ? "var(--accent-glow)" : "transparent",
                            color: isSelected ? "var(--accent-color)" : "var(--text-secondary)",
                            fontSize: "11px",
                            transition: "background 0.1s ease",
                            borderLeft: isSelected ? "2px solid var(--accent-color)" : "2px solid transparent",
                            marginBottom: "1px",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = "var(--hover-bg)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          <span
                            style={{
                              fontSize: "9px",
                              color: "var(--text-muted)",
                              flexShrink: 0,
                              minWidth: "24px",
                              textAlign: "right",
                            }}
                          >
                            {match.line_number}
                          </span>
                          <span
                            style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontFamily: "monospace",
                              fontSize: "11px",
                            }}
                          >
                            {renderMatchContext(match, searchQuery, match.line)}
                          </span>
                          {isSelected && (
                            <span
                              style={{
                                fontSize: "9px",
                                color: "var(--accent-color)",
                                flexShrink: 0,
                              }}
                            >
                              ↵
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
