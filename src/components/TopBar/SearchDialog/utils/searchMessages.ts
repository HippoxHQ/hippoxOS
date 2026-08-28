import { sessionCommands } from "../../../../command/session/general";
import { taskManager } from "../../../../core/TaskManager";
import { SessionDomain } from "../../../../core/types";
import { ChatMessage } from "../../../../types/types";
import { MessageSearchResult } from "../types";
/**
 * Generate highlight snippet for search results
 */
export const generateHighlight = (text: string, keyword: string): string => {
  if (!text || !keyword) return text;
  const keywordLower = keyword.toLowerCase();
  const textLower = text.toLowerCase();
  const index = textLower.indexOf(keywordLower);
  if (index === -1) {
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  }
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + keyword.length + 30);
  let snippet = text.substring(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";
  return snippet;
};
/**
 * Get session title from map or generate fallback
 */
export const getSessionTitle = (
  sessionId: string,
  titlesMap?: Map<string, string>
): string => {
  if (titlesMap?.has(sessionId)) {
    return titlesMap.get(sessionId)!;
  }
  return `Session ${sessionId.slice(-6)}`;
};
/**
 * Get messages for a session
 */
const getMessagesForSession = (sessionId: string): ChatMessage[] => {
  const userMessages =
    taskManager.getUserMessagesBySession?.(sessionId, SessionDomain.General) ||
    [];
  const assistantMessages =
    taskManager.getAssistantMessagesBySessionAsArray?.(
      sessionId,
      SessionDomain.General
    ) || [];
  return [...userMessages, ...assistantMessages].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
};
/**
 * Extract subsystem from session ID or path
 */
export const extractSubsystem = (
  sessionId: string,
  path?: string
): string | undefined => {
  // Check if path contains subsystem info
  if (path) {
    if (path.includes("ChartDialogHistory")) return "chart";
    if (path.includes("MapDialogHistory")) return "map";
    if (path.includes("CodeEditorDialogHistory")) return "codeeditor";
    if (path.includes("SandBox3DDialogHistory")) return "sandbox3d";
    if (path.includes("VideoDialogHistory")) return "video";
  }
  return undefined;
};
/**
 * Search messages across all sessions with subsystem support
 */
export const searchMessagesInAllSessions = async (
  keyword: string,
  sessionTitlesMap: Map<string, string>
): Promise<MessageSearchResult[]> => {
  if (!keyword.trim()) return [];
  const results: MessageSearchResult[] = [];
  const keywordLower = keyword.toLowerCase().trim();
  try {
    const sessions = await sessionCommands.listSessions();
    if (!sessions || sessions.length === 0) {
      return results;
    }
    for (const session of sessions) {
      const sessionId = session.session_id;
      const sessionTitle =
        session.title || getSessionTitle(sessionId, sessionTitlesMap);
      const allMessages = getMessagesForSession(sessionId);
      for (const msg of allMessages) {
        if (!msg.content) continue;
        const contentLower = msg.content.toLowerCase();
        if (contentLower.includes(keywordLower)) {
          const highlight = generateHighlight(msg.content, keyword);
          results.push({
            message: msg,
            sessionId,
            sessionTitle,
            matchHighlight: highlight,
          });
        }
      }
    }
    results.sort(
      (a, b) =>
        new Date(b.message.timestamp).getTime() -
        new Date(a.message.timestamp).getTime()
    );
    return results;
  } catch (error) {
    console.error("Failed to search messages in sessions:", error);
    return results;
  }
};
/**
 * Get message preview text
 */
export const getMessagePreview = (
  message: ChatMessage,
  maxLength: number = 80
): string => {
  if (!message.content) return "";
  const text = message.content.replace(/\n/g, " ");
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};
/**
 * Get localized message role label
 */
export const getMessageRoleLabel = (
  role: string,
  language: "zh" | "en"
): string => {
  if (role === "user") {
    return language === "zh" ? "用户" : "User";
  }
  return language === "zh" ? "助手" : "Assistant";
};