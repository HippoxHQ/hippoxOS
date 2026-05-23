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
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export type Theme = 'dark' | 'light';
export type Language = 'zh' | 'en';

export interface Translations {
  [key: string]: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
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
  status: string;  // pending, running, success, failure
  output?: string;
  error?: string;
}

export interface TaskInfo {
  task_id: string;
  session_id: string;
  user_input: string;
  status: string;  // pending, running, completed, failed
  steps: TaskStepInfo[];
  final_output?: string;
  created_at: string;
  updated_at: string;
}


// ==================== Session Type ====================
export interface DialogSession {
  session_id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  path: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TerminalEntry {
  id: string;
  type: 'task' | 'step' | 'log';
  data: any;
  timestamp: string;
}