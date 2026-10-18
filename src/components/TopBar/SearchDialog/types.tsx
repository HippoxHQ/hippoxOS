import { ChatMessage } from "../../../types/types";
import { Search, MessageSquare, FileText, MessagesSquare, PieChart, Map, Code, Box, Video, MessageCircle, Image, Palette, Database, Container, Globe, Blocks, Film } from "lucide-react";
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
/**
 * Subsystem configuration for message / session grouping.
 */
export const SUBSYSTEM_CONFIG: Record<string, { zh: string; en: string; icon: React.ReactNode }> = {
  general: { zh: "通用对话", en: "General", icon: <MessageCircle size={14} /> },
  finance: { zh: "图表对话", en: "Chart", icon: <PieChart size={14} /> },
  chart: { zh: "图表对话", en: "Chart", icon: <PieChart size={14} /> },
  financial_analysis: { zh: "图表对话", en: "Chart", icon: <PieChart size={14} /> },
  map: { zh: "地图对话", en: "Map", icon: <Map size={14} /> },
  codeeditor: { zh: "代码编辑", en: "Code Editor", icon: <Code size={14} /> },
  sandbox3d: { zh: "3D 沙盒", en: "Sandbox 3D", icon: <Box size={14} /> },
  videoediting: { zh: "视频编辑", en: "Video Editor", icon: <Film size={14} /> },
  video: { zh: "视频编辑", en: "Video Editor", icon: <Video size={14} /> },
  imageeditor: { zh: "图像编辑", en: "Image Editor", icon: <Image size={14} /> },
  pixeleditor: { zh: "像素编辑", en: "Pixel Editor", icon: <Palette size={14} /> },
  databaseclient: { zh: "数据库", en: "Database", icon: <Database size={14} /> },
  dockerclient: { zh: "Docker", en: "Docker", icon: <Container size={14} /> },
  apiclient: { zh: "API 客户端", en: "API Client", icon: <Globe size={14} /> },
  blockchain: { zh: "区块链", en: "Blockchain", icon: <Blocks size={14} /> },
};
