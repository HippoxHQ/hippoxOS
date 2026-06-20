export interface ScheduledTask {
  id: string;
  name: string;
  schedule_type: 'fixed' | 'interval';
  schedule_config: ScheduleConfig;
  enabled: boolean;
  action_type: 'naturallanguage' | 'skillfile';
  created_at: string;
  updated_at: string;
  last_executed_at: string | null;
  next_execution_at: string | null;
  completed: boolean;
  execution_count: number;
  last_status: string | null;
  natural_language_content?: string;
  skill_md_content?: string;
}

export type ScheduleConfig =
  | { type: 'fixed'; config: FixedScheduleConfig }
  | { type: 'interval'; config: IntervalScheduleConfig };

export interface FixedScheduleConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'once';
  time: string;
  day_of_week?: number[];
  day_of_month?: number[];
  date?: string;
}

export interface IntervalScheduleConfig {
  unit: 'second' | 'minute' | 'hour' | 'day';
  value: number;
}

export interface ExecutionHistory {
  id: string;
  task_id: string;
  task_name: string;
  executed_at: string;
  status: 'success' | 'failed' | 'skipped';
  output: string;
  error?: string;
  duration_ms: number;
}

export interface ScheduledTasksPanelProps {
  t: (key: string, params?: any) => string;
  onClose?: () => void;
  currentSessionId?: string;
}