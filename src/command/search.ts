import { invoke } from "@tauri-apps/api/core";

export interface SearchResult {
  category: "skill" | "session" | "log";
  id: string;
  title: string;
  description: string;
  path: string;
  timestamp?: string;
  highlight?: string | null;
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
      const results = await invoke<SearchResult[]>("cmd_search_content", {
        request: {
          keyword: keyword.trim(),
          limit,
        },
      });
      return results;
    } catch (error) {
      console.error("Search failed:", error);
      throw error;
    }
  }

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
      default:
        return "🔍";
    }
  }

  getCategoryName(category: string, language: "zh" | "en"): string {
    const names: Record<string, Record<"zh" | "en", string>> = {
      skill: { zh: "技能市场", en: "Skills" },
      session: { zh: "历史会话", en: "Sessions" },
      log: { zh: "日志记录", en: "Logs" },
    };
    return names[category]?.[language] || category;
  }

  async openResult(result: SearchResult): Promise<void> {
    switch (result.category) {
      case "skill":
        window.dispatchEvent(new CustomEvent("search-open-skill", { detail: { path: result.path } }));
        break;
      case "session":
        const sessionId = result.id.replace("session_", "");
        window.dispatchEvent(new CustomEvent("search-switch-session", { detail: { sessionId } }));
        break;
      case "log":
        window.dispatchEvent(new CustomEvent("search-open-log", { detail: { path: result.path, highlight: result.highlight } }));
        break;
    }
  }
}

export const searchService = SearchService.getInstance();