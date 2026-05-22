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