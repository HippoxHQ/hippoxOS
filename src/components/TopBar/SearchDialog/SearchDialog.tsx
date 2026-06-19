import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  SearchDialogProps,
  SearchResult,
  SearchSuggestion,
} from "./types";
import { useSearch } from "./hooks/useSearch";
import { useDialogPosition } from "./hooks/useDialogPosition";
import { useKeyboardNavigation } from "./hooks/useKeyboardNavigation";
import { useSessionTitles } from "./hooks/useSessionTitles";
import { SearchInput } from "./components/SearchInput";
import { SearchResults } from "./components/SearchResults";
import { SearchSkeleton } from "./components/SearchSkeleton";
import { EmptyState } from "./components/EmptyState";
import { QuickActions } from "./components/QuickActions";

const SearchDialog: React.FC<SearchDialogProps> = ({
  isOpen,
  onClose,
  currentLanguage,
  currentTheme,
  onToggleTheme,
  onToggleLanguage,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
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
  const handleResultClick = useCallback((result: SearchResult) => {
    switch (result.category) {
      case "message":
        if (result.sessionId) {
          window.dispatchEvent(
            new CustomEvent("search-switch-session", {
              detail: {
                sessionId: result.sessionId,
                title: result.sessionTitle || "会话",
                highlightMessageId: result.id,
              },
            })
          );
        }
        break;
      case "skill":
        window.dispatchEvent(
          new CustomEvent("search-open-skill", {
            detail: { path: result.path, title: result.title },
          })
        );
        break;
      case "session":
        const sessionId = result.id.replace("session_", "");
        window.dispatchEvent(
          new CustomEvent("search-switch-session", {
            detail: { sessionId, title: result.title },
          })
        );
        break;
      case "log":
        window.dispatchEvent(
          new CustomEvent("search-open-log", {
            detail: { path: result.path, highlight: result.highlight },
          })
        );
        break;
    }
    onClose();
  }, [onClose]);
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
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedIndex(-1);
      setIsLoading(false);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);
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
  const handleQuickAction = useCallback((action: () => void) => {
    action();
    onClose();
  }, [onClose]);
  if (!isOpen) return null;
  const isLoadingState = isLoading || searchLoading || titlesLoading;
  const hasResults = searchResults.length > 0;
  const hasQuery = searchQuery.trim().length > 0;
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
          width: "540px",
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
            <QuickActions
              suggestions={getSearchSuggestions()}
              onActionClick={handleQuickAction}
              language={currentLanguage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchDialog;