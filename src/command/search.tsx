import { invoke } from "@tauri-apps/api/core";
import { Brain, MessageSquare, FileText, Search, FolderOpen, Logs, PieChart, Map, Code, Box, Video, Image, Palette, Database, Container, Globe, Blocks, Film } from "lucide-react";
/**
 * Subsystem identifier used across search results.
 */
export type SubsystemId = "general" | "finance" | "chart" | "map" | "codeeditor" | "sandbox3d" | "videoediting" | "video" | "imageeditor" | "pixeleditor" | "databaseclient" | "dockerclient" | "apiclient" | "blockchain" | "financial_analysis";
export interface SearchResult {
  category: "skill" | "session" | "log" | "message";
  subsystem?: SubsystemId;
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
/**
 * Request payload for `cmd_get_recent_sessions`.
 */
export interface RecentSessionsRequest {
  limit?: number;
}
/**
 * A single recent session entry returned by `cmd_get_recent_sessions`.
 */
export interface RecentSessionItem {
  /** Stable identifier in the form `session_<session_id>`. */
  id: string;
  /** Raw session id (directory name). */
  session_id: string;
  /** Display title taken from config.json (falls back to session_id). */
  title: string;
  /** Session description taken from config.json (may be empty). */
  description: string;
  /** Full on-disk path of the session directory. */
  path: string;
  /** Last updated timestamp from config.json, if available. */
  timestamp?: string;
  /** The subsystem this session belongs to. */
  subsystem: string;
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
  /**
   * Get the most recent sessions across every subsystem.
   */
  async getRecentSessions(limit: number = 5): Promise<RecentSessionItem[]> {
    if (limit <= 0) {
      return [];
    }
    return await invoke<RecentSessionItem[]>("cmd_get_recent_sessions", {
      request: { limit },
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
   * Get the most recent sessions across every subsystem.
   */
  async getRecentSessions(limit: number = 5): Promise<RecentSessionItem[]> {
    try {
      return await searchCommands.getRecentSessions(limit);
    } catch (error) {
      console.error("Failed to load recent sessions:", error);
      return [];
    }
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
   * Group search results by category, with subsystem grouping for messages and sessions
   */
  groupResultsByCategory(results: SearchResult[]): Record<string, SearchResult[]> {
    const grouped: Record<string, SearchResult[]> = {};
    for (const result of results) {
      let groupKey: string = result.category;
      if ((result.category === "message" || result.category === "session") && result.subsystem) {
        groupKey = `${result.category}_${result.subsystem}`;
      }
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      grouped[groupKey].push(result);
    }
    return grouped;
  }
  /**
   * Get the icon component for a category or subsystem group key
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
      // Message groups
      case "message_general":
        return <FileText size={16} />;
      case "message_finance":
      case "message_chart":
      case "message_financial_analysis":
        return <PieChart size={16} />;
      case "message_map":
        return <Map size={16} />;
      case "message_codeeditor":
        return <Code size={16} />;
      case "message_sandbox3d":
        return <Box size={16} />;
      case "message_video":
      case "message_videoediting":
        return <Video size={16} />;
      case "message_imageeditor":
        return <Image size={16} />;
      case "message_pixeleditor":
        return <Palette size={16} />;
      case "message_databaseclient":
        return <Database size={16} />;
      case "message_dockerclient":
        return <Container size={16} />;
      case "message_apiclient":
        return <Globe size={16} />;
      case "message_blockchain":
        return <Blocks size={16} />;
      // Session groups
      case "session_general":
        return <MessageSquare size={16} />;
      case "session_finance":
      case "session_chart":
      case "session_financial_analysis":
        return <PieChart size={16} />;
      case "session_map":
        return <Map size={16} />;
      case "session_codeeditor":
        return <Code size={16} />;
      case "session_sandbox3d":
        return <Box size={16} />;
      case "session_video":
      case "session_videoediting":
        return <Film size={16} />;
      case "session_imageeditor":
        return <Image size={16} />;
      case "session_pixeleditor":
        return <Palette size={16} />;
      case "session_databaseclient":
        return <Database size={16} />;
      case "session_dockerclient":
        return <Container size={16} />;
      case "session_apiclient":
        return <Globe size={16} />;
      case "session_blockchain":
        return <Blocks size={16} />;
      default:
        return <Search size={16} />;
    }
  }
  /**
   * Get the display name for a category or subsystem group key
   */
  getCategoryName(category: string, language: "zh" | "en"): string {
    // Use Record<string, ...> to allow dynamic keys like "message_general"
    const names: Record<string, Record<"zh" | "en", string>> = {
      skill: { zh: "技能市场", en: "Skills" },
      session: { zh: "历史会话", en: "Sessions" },
      log: { zh: "日志记录", en: "Logs" },
      message: { zh: "对话记录", en: "Messages" },
      message_general: { zh: "通用对话", en: "General Messages" },
      message_finance: { zh: "图表对话", en: "Chart Messages" },
      message_chart: { zh: "图表对话", en: "Chart Messages" },
      message_financial_analysis: { zh: "图表对话", en: "Chart Messages" },
      message_map: { zh: "地图对话", en: "Map Messages" },
      message_codeeditor: { zh: "代码编辑", en: "Code Editor Messages" },
      message_sandbox3d: { zh: "3D 沙盒", en: "Sandbox 3D Messages" },
      message_video: { zh: "视频编辑", en: "Video Editor Messages" },
      message_videoediting: { zh: "视频编辑", en: "Video Editor Messages" },
      message_imageeditor: { zh: "图像编辑", en: "Image Editor Messages" },
      message_pixeleditor: { zh: "像素编辑", en: "Pixel Editor Messages" },
      message_databaseclient: { zh: "数据库", en: "Database Messages" },
      message_dockerclient: { zh: "Docker", en: "Docker Messages" },
      message_apiclient: { zh: "API 客户端", en: "API Client Messages" },
      message_blockchain: { zh: "区块链", en: "Blockchain Messages" },
      // Session groups
      session_general: { zh: "通用会话", en: "General Sessions" },
      session_finance: { zh: "图表会话", en: "Chart Sessions" },
      session_chart: { zh: "图表会话", en: "Chart Sessions" },
      session_financial_analysis: { zh: "图表会话", en: "Chart Sessions" },
      session_map: { zh: "地图会话", en: "Map Sessions" },
      session_codeeditor: { zh: "代码编辑会话", en: "Code Editor Sessions" },
      session_sandbox3d: { zh: "3D 沙盒会话", en: "Sandbox 3D Sessions" },
      session_video: { zh: "视频编辑会话", en: "Video Editor Sessions" },
      session_videoediting: { zh: "视频编辑会话", en: "Video Editor Sessions" },
      session_imageeditor: { zh: "图像编辑会话", en: "Image Editor Sessions" },
      session_pixeleditor: { zh: "像素编辑会话", en: "Pixel Editor Sessions" },
      session_databaseclient: { zh: "数据库会话", en: "Database Sessions" },
      session_dockerclient: { zh: "Docker 会话", en: "Docker Sessions" },
      session_apiclient: { zh: "API 客户端会话", en: "API Client Sessions" },
      session_blockchain: { zh: "区块链会话", en: "Blockchain Sessions" },
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
                subsystem: result.subsystem || "general",
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
      case "session": {
        const sessionId = result.id.replace("session_", "");
        const subsystem = result.subsystem || "general";
        window.dispatchEvent(
          new CustomEvent("search-switch-session", {
            detail: { sessionId, title: result.title, subsystem },
          }),
        );
        break;
      }
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
   * Parse subsystem from path string with proper type.
   */
  parseSubsystemFromPath(path: string): SubsystemId {
    // Finance / chart
    if (path.includes("Finance") || path.includes("FinancialAnalysis") || path.includes("ChartDialogHistory")) return "finance";
    if (path.includes("MapDialogHistory")) return "map";
    if (path.includes("CodeEditorDialogHistory")) return "codeeditor";
    if (path.includes("SandBox3DDialogHistory")) return "sandbox3d";
    if (path.includes("VideoDialogHistory")) return "videoediting";
    if (path.includes("ImageDialogHistory")) return "imageeditor";
    if (path.includes("PixelDialogHistory")) return "pixeleditor";
    if (path.includes("DataBaseDialogHistory")) return "databaseclient";
    if (path.includes("DockerDialogHistory")) return "dockerclient";
    if (path.includes("ApiDialogHistory")) return "apiclient";
    if (path.includes("BlockChain")) return "blockchain";
    return "general";
  }
}
export const searchService = SearchService.getInstance();
