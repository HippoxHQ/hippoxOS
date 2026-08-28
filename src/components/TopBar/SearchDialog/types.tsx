import { ChatMessage } from "../../../types/types";
import { Search, MessageSquare, FileText, MessagesSquare, PieChart, Map, Code, Box, Video, MessageCircle } from "lucide-react";
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
}
export interface SearchSuggestion {
  id: string;
  title: string;
  description: string;
  action: () => void;
  icon: React.ReactNode;
}
export interface MessageSearchResult {
  message: ChatMessage;
  sessionId: string;
  sessionTitle: string;
  matchHighlight: string;
  subsystem?: string;
}
export const CATEGORY_CONFIG: Record<string, { zh: string; en: string; icon: React.ReactNode }> = {
  skill: { zh: "技能市场", en: "Skills", icon: <Search size={16} /> },
  session: { zh: "历史会话", en: "Sessions", icon: <MessageSquare size={16} /> },
  log: { zh: "日志记录", en: "Logs", icon: <FileText size={16} /> },
  message: { zh: "对话记录", en: "Messages", icon: <MessagesSquare size={16} /> },
};
// Subsystem configuration for message categorization
export const SUBSYSTEM_CONFIG: Record<string, { zh: string; en: string; icon: React.ReactNode }> = {
  general: { zh: "通用对话", en: "General", icon: <MessageCircle size={14} /> },
  chart: { zh: "图表对话", en: "Chart", icon: <PieChart size={14} /> },
  map: { zh: "地图对话", en: "Map", icon: <Map size={14} /> },
  codeeditor: { zh: "代码编辑", en: "Code Editor", icon: <Code size={14} /> },
  sandbox3d: { zh: "3D 沙盒", en: "Sandbox 3D", icon: <Box size={14} /> },
  video: { zh: "视频编辑", en: "Video Editor", icon: <Video size={14} /> },
};
