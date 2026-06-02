export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  status: "uploading" | "success" | "error";
  progress?: number;
  path?: string;
}

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


export interface TaskStepInfo {
  step_index: number;
  step_name: string;
  status: StepStatusEnum;
  output?: string;
  error?: string;
  duration_ms?: number;
  parameters?: string;
}

export interface TaskInfo {
  task_id: string;
  session_id: string;
  user_input: string;
  status: TaskStatusEnum;
  steps: TaskStepInfo[];
  final_output?: string;
  error?: string;
  total_duration_ms?: number;
  total_steps?: number;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  progress?: number;
  resume_data?: string | null;
  files?: UploadFile[];
}
export interface DialogSession {
  session_id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  path: string;
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
}

export enum WindowTypeEnum {
  Main = 'main',
  Tray = 'tray',
  TraySubmenu = 'tray-submenu'
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

export enum TaskStatusEnum {
  Pending = "pending",
  Running = "running",
  Paused = "paused",
  Completed = "completed",
  Cancelled = "cancelled",
  Failed = "failed",
  Timeout = "timeout",
}

export enum StepStatusEnum {
  Waiting = "WAITING",
  Running = "RUNNING",
  Success = "SUCCESS",
  Failure = "FAILURE",
  Skipped = "skipped",
  Paused = "paused",
  Cancelled = "cancelled",
}

export interface StepInterruptionInfo {
  interrupted: boolean;
  reason: string;
  step_index: number;
  step_name: string;
  checkpoint: string | null;
}