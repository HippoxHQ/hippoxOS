import { invoke } from "@tauri-apps/api/core";

export interface SearchResult {
  category: "skill" | "session" | "log" | "message";
  id: string;
  title: string;
  description: string;
  path: string;
  timestamp?: string;
  highlight?: string | null;
  sessionId?: string;
  sessionTitle?: string;
  messageContent?: string;
  messageRole?: string;
}

export interface SearchRequest {
  keyword: string;
  limit?: number;
}

export interface SearchState {
  keyword: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  selectedIndex: number;
}

export interface MessageSearchResult {
  session_id: string;
  session_title: string;
  message_id: string;
  message_content: string;
  message_role: string;
  timestamp: string;
  highlight: string;
}

export interface SearchMessagesRequest {
  keyword: string;
  limit?: number;
}

export interface SearchMessagesResponse {
  results: MessageSearchResult[];
  total: number;
}

export const searchCommands = {
  async searchContent(keyword: string, limit: number = 30): Promise<SearchResult[]> {
    if (!keyword.trim()) {
      return [];
    }
    return await invoke<SearchResult[]>("cmd_search_content", {
      request: {
        keyword: keyword.trim(),
        limit,
      },
    });
  },

  async searchMessages(keyword: string, limit: number = 50): Promise<SearchMessagesResponse> {
    if (!keyword.trim()) {
      return { results: [], total: 0 };
    }
    return await invoke<SearchMessagesResponse>("cmd_search_messages", {
      request: {
        keyword: keyword.trim(),
        limit,
      },
    });
  },

  async searchMessagesFormatted(keyword: string, limit: number = 50): Promise<SearchResult[]> {
    if (!keyword.trim()) {
      return [];
    }
    return await invoke<SearchResult[]>("cmd_search_messages_formatted", {
      request: {
        keyword: keyword.trim(),
        limit,
      },
    });
  },

  async searchAll(keyword: string, limit: number = 30): Promise<SearchResult[]> {
    if (!keyword.trim()) {
      return [];
    }
    return await invoke<SearchResult[]>("cmd_search_all", {
      request: {
        keyword: keyword.trim(),
        limit,
      },
    });
  },
};

export class SearchService {
  private static instance: SearchService;
  private searchAbortController: AbortController | null = null;

  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  async search(keyword: string, limit: number = 30): Promise<SearchResult[]> {
    if (!keyword.trim()) {
      return [];
    }
    try {
      const results = await searchCommands.searchAll(keyword, limit);
      return results;
    } catch (error) {
      console.error("Search failed:", error);
      try {
        const [existing, messages] = await Promise.all([
          searchCommands.searchContent(keyword, limit),
          searchCommands.searchMessagesFormatted(keyword, limit),
        ]);
        return [...messages, ...existing];
      } catch (fallbackError) {
        console.error("Fallback search failed:", fallbackError);
        return [];
      }
    }
  }

  async searchMessagesOnly(keyword: string, limit: number = 50): Promise<SearchResult[]> {
    return await searchCommands.searchMessagesFormatted(keyword, limit);
  }

  // Anti-shake search
  debouncedSearch(
    keyword: string,
    callback: (results: SearchResult[]) => void,
    delay: number = 300
  ): () => void {
    let timeoutId: NodeJS.Timeout;
    const handler = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          const results = await this.search(keyword);
          callback(results);
        } catch (error) {
          callback([]);
        }
      }, delay);
    };
    handler();
    return () => clearTimeout(timeoutId);
  }
  groupResultsByCategory(results: SearchResult[]): Map<string, SearchResult[]> {
    const grouped = new Map<string, SearchResult[]>();
    for (const result of results) {
      if (!grouped.has(result.category)) {
        grouped.set(result.category, []);
      }
      grouped.get(result.category)!.push(result);
    }
    return grouped;
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case "skill":
        return "🧩";
      case "session":
        return "💬";
      case "log":
        return "📋";
      case "message":
        return "💭";
      default:
        return "🔍";
    }
  }

  getCategoryName(category: string, language: "zh" | "en"): string {
    const names: Record<string, Record<"zh" | "en", string>> = {
      skill: { zh: "技能市场", en: "Skills" },
      session: { zh: "历史会话", en: "Sessions" },
      log: { zh: "日志记录", en: "Logs" },
      message: { zh: "对话记录", en: "Messages" },
    };
    return names[category]?.[language] || category;
  }

  async openResult(result: SearchResult): Promise<void> {
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
  }
}

export const searchService = SearchService.getInstance();