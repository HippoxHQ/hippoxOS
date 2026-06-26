import React, { useEffect, useRef, useState, useCallback } from "react";
import { SearchResult, SearchSuggestion } from "./types";
import { useSearch } from "./hooks/useSearch";
import { useDialogPosition } from "./hooks/useDialogPosition";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { useSessionTitles } from "./hooks/useSessionTitles";
import { SearchInput } from "./components/SearchInput";
import { SearchResults } from "./components/SearchResults";
import { SearchSkeleton } from "./components/SearchSkeleton";
import { EmptyState } from "./components/EmptyState";
import { QuickActions } from "./components/QuickActions";
import { filesCommands } from "../../../command/files";
import { UploadFile } from "../../../core/types";
import { sessionCommands } from "../../../command/session/general";

export interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: "zh" | "en";
  currentTheme: "dark" | "light";
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onFileClick?: (file: UploadFile) => void;
}

const SearchDialog: React.FC<SearchDialogProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  currentTheme,
  onToggleTheme,
  onToggleLanguage,
  onFileClick,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [recentMessages, setRecentMessages] = useState<SearchResult[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const { sessionTitlesMap, loading: titlesLoading } = useSessionTitles();
  const { position, isDragging, dialogRef, handleDragStart } =
    useDialogPosition(isOpen);

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

  const readSessionChatFromFile = async (
    sessionDir: string,
  ): Promise<any[]> => {
    try {
      const chatPath = `${sessionDir}/chat.json`;
      const exists = await filesCommands.pathExists(chatPath);
      if (!exists) return [];
      const content = await filesCommands.readTextFile(chatPath);
      return JSON.parse(content);
    } catch {
      return [];
    }
  };

  const loadRecentMessages = useCallback(async () => {
    if (!isOpen) return;
    setIsLoadingRecent(true);
    try {
      const sessions = await sessionCommands.listSessions();
      if (!sessions || sessions.length === 0) {
        setRecentMessages([]);
        setIsLoadingRecent(false);
        return;
      }
      const allMessages: SearchResult[] = [];
      for (const session of sessions) {
        const sessionId = session.session_id;
        const sessionTitle = session.title || `会话 ${sessionId.slice(-6)}`;
        const sessionPath = (session as any).path;
        if (!sessionPath) continue;
        const messages = await readSessionChatFromFile(sessionPath);
        for (const msg of messages) {
          if (!msg.content) continue;
          let displayContent = msg.content;
          try {
            const parsed = JSON.parse(msg.content);
            if (parsed?.chatResponse?.m) {
              displayContent = parsed.chatResponse.m;
            } else if (parsed?.terminalResponse?.m) {
              displayContent = parsed.terminalResponse.m;
            }
          } catch {}
          allMessages.push({
            category: "message",
            id: msg.id || `msg_${Date.now()}`,
            title: sessionTitle,
            description:
              displayContent.length > 100
                ? displayContent.substring(0, 100) + "..."
                : displayContent,
            path: sessionId,
            timestamp: msg.timestamp,
            highlight: null,
            sessionId: sessionId,
            sessionTitle: sessionTitle,
            messageContent: displayContent,
          });
        }
      }
      allMessages.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return (
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      });
      setRecentMessages(allMessages.slice(0, 5));
    } catch (error) {
      console.error("Failed to load recent messages:", error);
      setRecentMessages([]);
    } finally {
      setIsLoadingRecent(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedIndex(-1);
      setIsLoading(false);
      loadRecentMessages();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, loadRecentMessages]);

  const handleResultClick = useCallback(
    async (result: SearchResult) => {
      switch (result.category) {
        case "message": {
          const sessionId = result.sessionId || result.path;
          if (sessionId) {
            window.dispatchEvent(
              new CustomEvent("search-switch-session", {
                detail: {
                  sessionId: sessionId,
                  title: result.sessionTitle || result.title || "会话",
                  highlightMessageId: result.id,
                },
              }),
            );
            window.dispatchEvent(
              new CustomEvent("session-selected", {
                detail: {
                  sessionId: sessionId,
                  title: result.sessionTitle || result.title || "会话",
                },
              }),
            );
            setTimeout(() => {
              onClose();
            }, 100);
          }
          break;
        }
        case "skill":
          window.dispatchEvent(
            new CustomEvent("search-open-skill", {
              detail: { path: result.path, title: result.title },
            }),
          );
          setTimeout(() => {
            onClose();
          }, 100);
          break;
        case "session": {
          const sessionId = result.id.replace("session_", "");
          window.dispatchEvent(
            new CustomEvent("search-switch-session", {
              detail: { sessionId, title: result.title },
            }),
          );
          window.dispatchEvent(
            new CustomEvent("session-selected", {
              detail: { sessionId, title: result.title },
            }),
          );
          setTimeout(() => {
            onClose();
          }, 100);
          break;
        }
        case "log": {
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
      }
    },
    [onClose],
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
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedIndex(-1);
    searchInputRef.current?.focus();
  }, []);
  const getSearchSuggestions = useCallback((): SearchSuggestion[] => {
    const isZh = currentLanguage === "zh";
    return [
      {
        id: "new-session",
        title: isZh ? "新建会话" : "New Session",
        description: isZh
          ? "创建一个新的对话会话"
          : "Create a new chat session",
        icon: "💬",
        action: () => {
          window.dispatchEvent(new CustomEvent("search-new-session"));
        },
      },
      {
        id: "toggle-theme",
        title: isZh ? "切换主题" : "Toggle Theme",
        description: isZh
          ? "切换深色/浅色模式"
          : "Switch between dark and light mode",
        icon: currentTheme === "dark" ? "☀️" : "🌙",
        action: () => onToggleTheme(),
      },
      {
        id: "toggle-language",
        title: isZh ? "切换语言" : "Toggle Language",
        description: isZh
          ? "切换中文/英文界面"
          : "Switch between Chinese and English",
        icon: "🌐",
        action: () => onToggleLanguage(),
      },
    ];
  }, [currentLanguage, currentTheme, onToggleTheme, onToggleLanguage]);
  const handleQuickAction = useCallback(
    (action: () => void) => {
      action();
      onClose();
    },
    [onClose],
  );
  if (!isOpen) return null;
  const isLoadingState = isLoading || searchLoading || titlesLoading;
  const hasResults = searchResults.length > 0;
  const hasQuery = searchQuery.trim().length > 0;
  const hasRecentMessages = recentMessages.length > 0;
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
          placeholder={
            currentLanguage === "zh"
              ? "搜索技能、会话、对话记录或日志..."
              : "Search skills, sessions, messages or logs..."
          }
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
            <>
              {isLoadingState ? (
                <SearchSkeleton language={currentLanguage} />
              ) : hasResults ? (
                <SearchResults
                  results={searchResults}
                  selectedIndex={selectedIndex}
                  onResultClick={handleResultClick}
                  currentLanguage={currentLanguage}
                />
              ) : (
                <EmptyState language={currentLanguage} />
              )}
            </>
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
              ) : hasRecentMessages ? (
                <>
                  <div
                    style={{
                      padding: "6px 12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      letterSpacing: "0.5px",
                      paddingTop: "8px",
                    }}
                  >
                    {currentLanguage === "zh" ? "最近对话" : "Recent Messages"}
                  </div>
                  {recentMessages.map((result) => (
                    <div
                      key={result.id}
                      style={{
                        padding: "8px 12px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-color)",
                        // transition: "background 0.15s ease",
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
              <QuickActions
                suggestions={getSearchSuggestions()}
                onActionClick={handleQuickAction}
                language={currentLanguage}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchDialog;
