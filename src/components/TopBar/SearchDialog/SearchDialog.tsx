import React, { useEffect, useRef, useState, useCallback } from "react";
import { SearchResult } from "./types";
import { useSearch } from "./hooks/useSearch";
import { useDialogPosition } from "./hooks/useDialogPosition";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { useSessionTitles } from "./hooks/useSessionTitles";
import { SearchInput } from "./components/SearchInput";
import { SearchResults } from "./components/SearchResults";
import { SearchSkeleton } from "./components/SearchSkeleton";
import { EmptyState } from "./components/EmptyState";
import { filesCommands } from "../../../command/files";
import { UploadFile } from "../../../core/types";
import { searchService, RecentSessionItem } from "../../../command/search";
import { dispatchOpenSubsystem } from "../../../App/AppWindowEventManager";
export interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: "zh" | "en";
  currentTheme: "dark" | "light";
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onFileClick?: (file: UploadFile) => void;
}
/**
 * Convert a RecentSessionItem into a SearchResult-shaped object so the
 * existing recent-list renderer and click handler can be reused unchanged.
 */
const recentSessionToSearchResult = (item: RecentSessionItem, language: "zh" | "en"): SearchResult => {
  return {
    category: "session",
    subsystem: item.subsystem as any,
    id: item.id,
    title: item.title,
    description: item.description || item.session_id,
    path: item.path,
    timestamp: item.timestamp,
    highlight: null,
    sessionId: item.session_id,
    sessionTitle: item.title,
  };
};
/**
 * Main search dialog component with subsystem support.
 */
const SearchDialog: React.FC<SearchDialogProps> = ({ isOpen, onClose, currentLanguage, currentTheme, onToggleTheme, onToggleLanguage, onFileClick }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recentSessions, setRecentSessions] = useState<SearchResult[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  const { sessionTitlesMap, loading: titlesLoading } = useSessionTitles();
  const { position, isDragging, dialogRef, handleDragStart } = useDialogPosition(isOpen);
  const { isLoading: searchLoading } = useSearch({
    searchQuery,
    sessionTitlesMap,
    onResultsChange: useCallback((results: SearchResult[]) => {
      setSearchResults(results);
      setSelectedIndex(results.length > 0 ? 0 : -1);
    }, []),
    onLoadingChange: useCallback((loading: boolean) => {
      setIsLoading(loading);
    }, []),
  });
  /**
   * Load recent sessions from every subsystem via the dedicated backend command.
   */
  const loadRecentSessions = useCallback(async () => {
    if (!isOpen) return;
    setIsLoadingRecent(true);
    try {
      const items = await searchService.getRecentSessions(5);
      const mapped = items.map((item) => recentSessionToSearchResult(item, currentLanguage));
      setRecentSessions(mapped);
    } catch (error) {
      console.error("Failed to load recent sessions:", error);
      setRecentSessions([]);
    } finally {
      setIsLoadingRecent(false);
    }
  }, [isOpen, currentLanguage]);
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedIndex(-1);
      setIsLoading(false);
      loadRecentSessions();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, loadRecentSessions]);
  const handleResultClick = useCallback(
    async (result: SearchResult) => {
      switch (result.category) {
        case "message": {
          const sessionId = result.sessionId || result.path;
          if (sessionId) {
            const subsystem = result.subsystem || "general";
            console.log("[SearchDialog] message click", {
              rawSubsystem: result.subsystem,
              resolvedSubsystem: subsystem,
              sessionId,
              resultId: result.id,
              path: result.path,
            });
            dispatchOpenSubsystem(subsystem, sessionId);
            setTimeout(() => {
              onClose();
            }, 100);
          }
          break;
        }
        case "skill":
          console.log("[SearchDialog] skill click", { path: result.path, title: result.title });
          window.dispatchEvent(
            new CustomEvent("APP_WINDOW_EVENT_SEARCH_OPEN_SKILL", {
              detail: { path: result.path, title: result.title },
            }),
          );
          setTimeout(() => {
            onClose();
          }, 100);
          break;
        case "session": {
          const rawId = result.sessionId || result.id.replace("session_", "");
          const subsystem = result.subsystem || "general";
          console.log("[SearchDialog] session click", {
            rawSubsystem: result.subsystem,
            resolvedSubsystem: subsystem,
            rawId,
            resultId: result.id,
            path: result.path,
          });
          dispatchOpenSubsystem(subsystem, rawId);
          setTimeout(() => {
            onClose();
          }, 100);
          break;
        }
        case "log": {
          console.log("[SearchDialog] log click", { path: result.path });
          try {
            const content = await filesCommands.readTextFile(result.path);
            const file: UploadFile = {
              id: `log_${Date.now()}`,
              name: result.title || result.path.split("/").pop() || "log.log",
              path: result.path,
              size: content.length,
              file: new File([content], result.title || "log.log", {
                type: "text/plain",
              }),
              type: "text/plain",
              status: "success" as const,
            };
            if (onFileClick) {
              onFileClick(file);
            }
          } catch (error) {
            console.error("Failed to read log file:", error);
          }
          setTimeout(() => {
            onClose();
          }, 100);
          break;
        }
        default:
          console.warn("[SearchDialog] unknown category", result.category, result);
          break;
      }
    },
    [onClose, onFileClick],
  );
  useKeyboardNavigation({
    isOpen,
    searchQuery,
    searchResults,
    selectedIndex,
    onSelectedIndexChange: useCallback((index: number) => {
      setSelectedIndex(index);
    }, []),
    onResultClick: handleResultClick,
    onClose,
  });
  /**
   * Clear search input.
   */
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedIndex(-1);
    searchInputRef.current?.focus();
  }, []);
  if (!isOpen) return null;
  const isLoadingState = isLoading || searchLoading || titlesLoading;
  const hasResults = searchResults.length > 0;
  const hasQuery = searchQuery.trim().length > 0;
  const hasRecentSessions = recentSessions.length > 0;
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        background: "rgba(0, 0, 0, 0.5)",
        pointerEvents: "auto",
        userSelect: "none",
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        style={{
          position: "fixed",
          width: "min(540px, 90vw)",
          minWidth: "320px",
          maxWidth: "90vw",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
          zIndex: 10000,
          overflow: "hidden",
          pointerEvents: "auto",
          left: `${position.x}px`,
          top: `${position.y}px`,
          padding: "5px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <SearchInput
          ref={searchInputRef}
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={clearSearch}
          onClose={onClose}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
          placeholder={currentLanguage === "zh" ? "搜索技能、会话、对话记录或日志..." : "Search skills, sessions, messages or logs..."}
          isFocused={isInputFocused}
          isDragging={isDragging}
          onDragStart={handleDragStart}
        />
        <div
          style={{
            maxHeight: "340px",
            overflowY: "auto",
            background: "var(--bg-primary)",
            borderRadius: "5px",
          }}
        >
          {hasQuery ? (
            <>{isLoadingState ? <SearchSkeleton language={currentLanguage} /> : hasResults ? <SearchResults results={searchResults} selectedIndex={selectedIndex} onResultClick={handleResultClick} currentLanguage={currentLanguage} /> : <EmptyState language={currentLanguage} />}</>
          ) : (
            <>
              {isLoadingRecent ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                  }}
                >
                  {currentLanguage === "zh" ? "加载中..." : "Loading..."}
                </div>
              ) : hasRecentSessions ? (
                <>
                  <div
                    style={{
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      letterSpacing: "0.5px",
                      paddingTop: "8px",
                    }}
                  >
                    {currentLanguage === "zh" ? "最近会话" : "Recent Sessions"}
                  </div>
                  {recentSessions.map((result) => (
                    <div
                      key={result.id}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                      onClick={() => handleResultClick(result)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--hover-bg)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          marginBottom: "2px",
                        }}
                      >
                        {result.title}
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                          wordBreak: "break-word",
                          lineHeight: 1.3,
                        }}
                      >
                        {result.description}
                      </div>
                      {result.timestamp && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            marginTop: "2px",
                          }}
                        >
                          {new Date(result.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default SearchDialog;
