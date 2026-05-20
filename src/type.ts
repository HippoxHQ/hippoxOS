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