import { sessionCommands } from "../../../../command/session/general";
import { taskManager } from "../../../../core/TaskManager";
import { SessionDomain } from "../../../../core/types";
import { ChatMessage } from "../../../../types/types";
import { MessageSearchResult } from "../types";

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

export const getSessionTitle = (
  sessionId: string,
  titlesMap?: Map<string, string>,
): string => {
  if (titlesMap?.has(sessionId)) {
    return titlesMap.get(sessionId)!;
  }
  return `会话 ${sessionId.slice(-6)}`;
};

const getMessagesForSession = (sessionId: string): ChatMessage[] => {
  const userMessages = taskManager.getUserMessagesBySession?.(sessionId, SessionDomain.General) || [];
  const assistantMessages =
    taskManager.getAssistantMessagesBySessionAsArray?.(sessionId, SessionDomain.General) || [];

  return [...userMessages, ...assistantMessages].sort(
    (a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
};

export const searchMessagesInAllSessions = async (
  keyword: string,
  sessionTitlesMap: Map<string, string>,
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
      const sessionTitle = session.title || getSessionTitle(sessionId, sessionTitlesMap);
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
        new Date(a.message.timestamp).getTime(),
    );
    return results;
  } catch (error) {
    console.error("Failed to search messages in sessions:", error);
    return results;
  }
};

export const getMessagePreview = (
  message: ChatMessage,
  maxLength: number = 80,
): string => {
  if (!message.content) return "";
  const text = message.content.replace(/\n/g, " ");
  return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
};

export const getMessageRoleLabel = (
  role: string,
  language: "zh" | "en",
): string => {
  if (role === "user") {
    return language === "zh" ? "用户" : "User";
  }
  return language === "zh" ? "助手" : "Assistant";
};