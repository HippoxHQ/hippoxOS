import { invoke } from "@tauri-apps/api/core";
import { Brain, MessageSquare, FileText, Search, FolderOpen, Logs, PieChart, Map, Code, Box, Video } from "lucide-react";
export interface SearchResult {
  category: "skill" | "session" | "log" | "message";
  subsystem?: "general" | "chart" | "map" | "codeeditor" | "sandbox3d" | "video";
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
  subsystem?: string;
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
  /**
   * Search content across the system
   */
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
  /**
   * Search messages only (returns raw message results with subsystem info)
   */
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
  /**
   * Search messages and return formatted results with subsystem support
   */
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
  /**
   * Search all content types including messages from all subsystems
   */
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
/**
 * Search service singleton for managing search operations
 */
export class SearchService {
  private static instance: SearchService;
  private searchAbortController: AbortController | null = null;
  static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }
  /**
   * Perform a search across all content types including all subsystems
   */
  async search(keyword: string, limit: number = 30): Promise<SearchResult[]> {
    if (!keyword.trim()) {
      return [];
    }
    try {
      const results = await searchCommands.searchAll(keyword, limit);
      return results;
    } catch (error) {
      console.error("Search failed:", error);
      // Fallback to separate searches if unified search fails
      try {
        const [existing, messages] = await Promise.all([searchCommands.searchContent(keyword, limit), searchCommands.searchMessagesFormatted(keyword, limit)]);
        return [...messages, ...existing];
      } catch (fallbackError) {
        console.error("Fallback search failed:", fallbackError);
        return [];
      }
    }
  }
  /**
   * Search messages only across all subsystems
   */
  async searchMessagesOnly(keyword: string, limit: number = 50): Promise<SearchResult[]> {
    return await searchCommands.searchMessagesFormatted(keyword, limit);
  }
  /**
   * Debounced search with anti-shake
   */
  debouncedSearch(keyword: string, callback: (results: SearchResult[]) => void, delay: number = 300): () => void {
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
  /**
   * Group search results by category, with subsystem grouping for messages
   */
  groupResultsByCategory(results: SearchResult[]): Record<string, SearchResult[]> {
    const grouped: Record<string, SearchResult[]> = {};
    for (const result of results) {
      // Use string type to allow custom group keys like "message_general"
      let groupKey: string = result.category;
      // For messages, group by subsystem if available
      if (result.category === "message" && result.subsystem) {
        groupKey = `message_${result.subsystem}`;
      }
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(result);
    }
    return grouped;
  }
  /**
   * Get the icon component for a category or subsystem
   */
  getCategoryIcon(category: string): React.ReactNode {
    switch (category) {
      case "skill":
        return <Brain size={16} />;
      case "session":
        return <MessageSquare size={16} />;
      case "log":
        return <Logs size={16} />;
      case "message":
        return <FileText size={16} />;
      case "message_general":
        return <FileText size={16} />;
      case "message_chart":
        return <PieChart size={16} />;
      case "message_map":
        return <Map size={16} />;
      case "message_codeeditor":
        return <Code size={16} />;
      case "message_sandbox3d":
        return <Box size={16} />;
      case "message_video":
        return <Video size={16} />;
      default:
        return <Search size={16} />;
    }
  }
  /**
   * Get the display name for a category or subsystem
   */
  getCategoryName(category: string, language: "zh" | "en"): string {
    // Use Record<string, ...> to allow dynamic keys like "message_general"
    const names: Record<string, Record<"zh" | "en", string>> = {
      skill: { zh: "技能市场", en: "Skills" },
      session: { zh: "历史会话", en: "Sessions" },
      log: { zh: "日志记录", en: "Logs" },
      message: { zh: "对话记录", en: "Messages" },
      message_general: { zh: "通用对话", en: "General Messages" },
      message_chart: { zh: "图表对话", en: "Chart Messages" },
      message_map: { zh: "地图对话", en: "Map Messages" },
      message_codeeditor: { zh: "代码编辑", en: "Code Editor Messages" },
      message_sandbox3d: { zh: "3D 沙盒", en: "Sandbox 3D Messages" },
      message_video: { zh: "视频编辑", en: "Video Editor Messages" },
    };
    return names[category]?.[language] || category;
  }
  /**
   * Open a search result
   */
  async openResult(result: SearchResult): Promise<void> {
    switch (result.category) {
      case "message":
        if (result.sessionId) {
          window.dispatchEvent(
            new CustomEvent("search-switch-session", {
              detail: {
                sessionId: result.sessionId,
                title: result.sessionTitle || "Session",
                highlightMessageId: result.id,
              },
            }),
          );
        }
        break;
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
  }
  /**
   * Parse subsystem from path string with proper type
   */
  parseSubsystemFromPath(path: string): "general" | "chart" | "map" | "codeeditor" | "sandbox3d" | "video" {
    if (path.includes("ChartDialogHistory")) return "chart";
    if (path.includes("MapDialogHistory")) return "map";
    if (path.includes("CodeEditorDialogHistory")) return "codeeditor";
    if (path.includes("SandBox3DDialogHistory")) return "sandbox3d";
    if (path.includes("VideoDialogHistory")) return "video";
    return "general";
  }
}
export const searchService = SearchService.getInstance();
