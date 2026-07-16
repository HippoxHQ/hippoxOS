import { UploadFile } from "../core/types";
export interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'process';
  message: string;
  details?: string;
  duration?: number;
}
export interface ChatMessage {
  id: string;
  role: RoleEnum;
  content: string;
  timestamp: string;
  status?: MessageStatus;
  files?: UploadFile[];
  edited?: boolean;
  originalId?: string;
  rawResponse?: string;
}
export type Theme = 'dark' | 'light';
export type Language = 'zh' | 'en';
export interface Translations {
  [key: string]: any;
}
export interface ExecutionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'process';
  message: string;
  details?: string;
  duration?: number;
}
export interface ChatResponse {
  success: boolean;
  message: string;
  session_id: string;
  error?: string;
}
export interface InitConfig {
  skills_dir: string;
  provider: string;
  api_key: string;
  workflow_mode?: 'react' | 'batch' | 'chain' | 'plan_and_execute';
}
export interface DialogSession {
  session_id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  path: string;
  workflow_mode?: string;
}
export interface TerminalEntry {
  id: string;
  type: 'task' | 'step' | 'log';
  data: any;
  timestamp: string;
}
export enum RoleEnum {
  User = 'User',
  LLM = 'LLM',
  System = 'System'
}
export enum MessageStatus {
  Pending = "pending",
  Completed = "completed",
  Failed = "failed",
  Cancelled = "cancelled",
  Paused = "paused",
}
export enum WindowTypeEnum {
  Main = 'main',
  Tray = 'tray',
  TraySubmenu = 'tray-submenu',
  MaterialPreview = "material-preview",
}
export enum WindowIdentifierEnum {
  Main = 'main-window',
  Tray = 'tray-window',
  TraySubmenu = 'tray-submenu-window'
}
export enum SystemEvent {
  NewSession = 'new-session',
  OpenSkillsMarket = 'open-skills-market',
  OpenHistory = 'open-history',
  OpenFavorites = 'open-favorites',
  OpenScheduledTasks = 'open-scheduled-tasks',
  OpenSettings = 'open-settings',
  OpenLlmConfig = 'open-llm-config',
  CheckUpdates = 'check-updates',
  ShowAbout = 'show-about',
  ShowNotification = 'show-notification',
  OpenHistoryDir = 'open-history-dir',
  OpenNotificationDir = 'open-notification-dir',
  OpenWorkspaceDir = 'open-workspace-dir',
}
export interface StepInterruptionInfo {
  interrupted: boolean;
  reason: string;
  step_index: number;
  step_name: string;
  checkpoint: string | null;
}