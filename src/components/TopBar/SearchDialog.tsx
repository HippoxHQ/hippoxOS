import React, { useEffect, useState, useRef, useCallback } from "react";
import { SearchIcon, ClearIcon } from "../../icons";
import { searchService } from "../../api/search";

interface SearchResult {
  category: "skill" | "session" | "log";
  id: string;
  title: string;
  description: string;
  path: string;
  timestamp?: string;
  highlight?: string | null;
}

interface SearchSuggestion {
  id: string;
  title: string;
  description: string;
  action: () => void;
  icon: string;
}

interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: "zh" | "en";
  currentTheme: "dark" | "light";
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
}

const CATEGORY_CONFIG: Record<
  string,
  { zh: string; en: string; icon: string }
> = {
  skill: { zh: "技能市场", en: "Skills", icon: "🧩" },
  session: { zh: "历史会话", en: "Sessions", icon: "💬" },
  log: { zh: "日志记录", en: "Logs", icon: "📋" },
};

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
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [isInputFocused, setIsInputFocused] = useState(false);

  const searchDialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const performSearch = async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      setIsSearchLoading(false);
      return;
    }
    setIsSearchLoading(true);
    try {
      const results = await searchService.search(keyword, 30);
      setSearchResults(results);
      setSelectedIndex(results.length > 0 ? 0 : -1);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsSearchLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    const timeout = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    setSearchTimeout(timeout);
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        return;
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
        return;
      }
      if (isOpen && searchQuery.trim() && searchResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : prev,
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        } else if (
          e.key === "Enter" &&
          selectedIndex >= 0 &&
          searchResults[selectedIndex]
        ) {
          e.preventDefault();
          handleResultClick(searchResults[selectedIndex]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, searchQuery]);

  useEffect(() => {
    if (selectedIndex >= 0 && searchResults[selectedIndex]) {
      const selectedElement = document.querySelector(
        `[data-result-idx="${selectedIndex}"]`,
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, searchResults]);

  const openDialog = () => {
    const dialogWidth = 540;
    const x = (window.innerWidth - dialogWidth) / 2;
    const y = 80;
    setDialogPosition({ x, y });
    setSearchQuery("");
    setSearchResults([]);
    setSelectedIndex(-1);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  useEffect(() => {
    if (isOpen) {
      openDialog();
    }
  }, [isOpen]);

  const clearSearchInput = () => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - dialogPosition.x,
      y: e.clientY - dialogPosition.y,
    });
  };

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && searchDialogRef.current) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const dialogWidth = searchDialogRef.current.offsetWidth;
        const dialogHeight = searchDialogRef.current.offsetHeight;
        const minX = 0;
        const maxX = windowWidth - dialogWidth;
        const minY = 0;
        const maxY = windowHeight - dialogHeight;
        setDialogPosition({
          x: Math.min(maxX, Math.max(minX, newX)),
          y: Math.min(maxY, Math.max(minY, newY)),
        });
      }
    },
    [isDragging, dragStart],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  const handleResultClick = async (result: SearchResult) => {
    switch (result.category) {
      case "skill":
        window.dispatchEvent(
          new CustomEvent("search-open-skill", {
            detail: { path: result.path, title: result.title },
          }),
        );
        break;
      case "session":
        const sessionId = result.id.replace("session_", "");
        window.dispatchEvent(
          new CustomEvent("search-switch-session", {
            detail: { sessionId, title: result.title },
          }),
        );
        break;
      case "log":
        window.dispatchEvent(
          new CustomEvent("search-open-log", {
            detail: { path: result.path, highlight: result.highlight },
          }),
        );
        break;
    }
    onClose();
  };

  const handleSuggestionClick = (action: () => void) => {
    action();
    onClose();
  };

  const groupResultsByCategory = (
    results: SearchResult[],
  ): Map<string, SearchResult[]> => {
    const grouped = new Map<string, SearchResult[]>();
    for (const result of results) {
      if (!grouped.has(result.category)) {
        grouped.set(result.category, []);
      }
      grouped.get(result.category)!.push(result);
    }
    return grouped;
  };

  const getCategoryDisplay = (category: string): string => {
    const config = CATEGORY_CONFIG[category];
    if (!config) return category;
    return currentLanguage === "zh" ? config.zh : config.en;
  };

  const getCategoryIcon = (category: string): string => {
    return CATEGORY_CONFIG[category]?.icon || "🔍";
  };

  const getSearchSuggestions = (): SearchSuggestion[] => {
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
  };

  const groupedResults = groupResultsByCategory(searchResults);
  const suggestions = getSearchSuggestions();

  if (!isOpen) return null;

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
        ref={searchDialogRef}
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
          left: `${dialogPosition.x}px`,
          top: `${dialogPosition.y}px`,
          padding: "5px",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 12px",
            border: `1px solid ${isInputFocused ? "#0078d4" : "var(--border-color)"}`,
            background: "var(--bg-secondary)",
            height: "35px",
            marginBottom: "5px",
            borderRadius: "5px",
            transition: "border-color 0.2s ease",
            cursor: isDragging ? "grabbing" : "grab",
          }}
          onMouseDown={handleDragStart}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              color: "var(--text-secondary)",
              flexShrink: 0,
            }}
          >
            <SearchIcon />
          </span>
          <input
            ref={searchInputRef}
            type="text"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--text-primary)",
              fontSize: "13px",
              padding: "8px 0",
              marginLeft: "4px",
            }}
            placeholder={
              currentLanguage === "zh"
                ? "搜索技能、会话或日志..."
                : "Search skills, sessions or logs..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flexShrink: 0,
            }}
          >
            {searchQuery && (
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  borderRadius: "4px",
                }}
                onClick={clearSearchInput}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <ClearIcon size={14} />
              </button>
            )}
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--text-secondary)",
                fontSize: "16px",
                borderRadius: "4px",
              }}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              ✕
            </button>
          </div>
        </div>

        <div
          style={{
            maxHeight: "340px",
            overflowY: "auto",
            background: "var(--bg-primary)",
            borderRadius: "5px",
          }}
        >
          {searchQuery.trim() ? (
            <>
              {isSearchLoading ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                  }}
                >
                  {currentLanguage === "zh" ? "搜索中..." : "Searching..."}
                </div>
              ) : searchResults.length === 0 ? (
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                  }}
                >
                  {currentLanguage === "zh"
                    ? "没有找到相关结果"
                    : "No results found"}
                </div>
              ) : (
                Array.from(groupedResults.entries()).map(
                  ([category, results]) => (
                    <div key={category}>
                      <div
                        style={{
                          padding: "6px 12px",
                          fontSize: "11px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          color: "var(--text-muted)",
                          background: "var(--bg-primary)",
                          letterSpacing: "0.5px",
                          borderBottom: "1px solid var(--border-color)",
                        }}
                      >
                        <span>{getCategoryIcon(category)}</span>
                        <span style={{ marginLeft: "8px" }}>
                          {getCategoryDisplay(category)}
                        </span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: "10px",
                            background: "var(--bg-tertiary)",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            float: "right",
                          }}
                        >
                          {results.length}
                        </span>
                      </div>
                      {results.map((result, idx) => {
                        const globalIdx = Array.from(groupedResults.values())
                          .flat()
                          .findIndex((r) => r.id === result.id);
                        return (
                          <div
                            key={result.id}
                            data-result-idx={globalIdx}
                            style={{
                              padding: "8px 12px",
                              cursor: "pointer",
                              borderBottom: "1px solid var(--border-color)",
                              background:
                                selectedIndex === globalIdx
                                  ? "var(--hover-bg)"
                                  : "transparent",
                            }}
                            onClick={() => handleResultClick(result)}
                            onMouseEnter={(e) => {
                              if (selectedIndex !== globalIdx) {
                                e.currentTarget.style.background =
                                  "var(--hover-bg)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (selectedIndex !== globalIdx) {
                                e.currentTarget.style.background =
                                  "transparent";
                              }
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
                              {result.highlight || result.description}
                            </div>
                            {result.timestamp && (
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: "var(--text-muted)",
                                  marginTop: "2px",
                                }}
                              >
                                {new Date(
                                  parseInt(result.timestamp) * 1000,
                                ).toLocaleString()}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ),
                )
              )}
            </>
          ) : (
            <div style={{ padding: "6px 0" }}>
              <div
                style={{
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  letterSpacing: "0.5px",
                }}
              >
                {currentLanguage === "zh" ? "快速操作" : "Quick Actions"}
              </div>
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "6px 12px",
                    cursor: "pointer",
                  }}
                  onClick={() => handleSuggestionClick(suggestion.action)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    style={{
                      fontSize: "14px",
                      width: "20px",
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {suggestion.icon}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "13px",
                        color: "var(--text-primary)",
                      }}
                    >
                      {suggestion.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                        marginTop: "1px",
                      }}
                    >
                      {suggestion.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchDialog;
