import { ChatMessage } from "../../../types/types";

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
}

export interface SearchSuggestion {
  id: string;
  title: string;
  description: string;
  action: () => void;
  icon: string;
}

export interface SearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: "zh" | "en";
  currentTheme: "dark" | "light";
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
}

export interface MessageSearchResult {
  message: ChatMessage;
  sessionId: string;
  sessionTitle: string;
  matchHighlight: string;
}

export const CATEGORY_CONFIG: Record<
  string,
  { zh: string; en: string; icon: string }
> = {
  skill: { zh: "技能市场", en: "Skills", icon: "🧩" },
  session: { zh: "历史会话", en: "Sessions", icon: "💬" },
  log: { zh: "日志记录", en: "Logs", icon: "📋" },
  message: { zh: "对话记录", en: "Messages", icon: "💭" },
};