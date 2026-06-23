import { invoke } from '@tauri-apps/api/core';

export type ScheduleType = 'fixed' | 'interval';
export type ActionType = 'naturallanguage' | 'skillfile';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'once';
export type IntervalUnit = 'second' | 'minute' | 'hour' | 'day';

export interface FixedScheduleConfig {
  frequency: Frequency;
  time: string;
  day_of_week?: number[];
  day_of_month?: number[];
  date?: string;
}

export interface IntervalScheduleConfig {
  unit: IntervalUnit;
  value: number;
}

export type ScheduleConfig =
  | { type: 'fixed'; config: FixedScheduleConfig }
  | { type: 'interval'; config: IntervalScheduleConfig };

export interface ScheduledTask {
  id: string;
  name: string;
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
  enabled: boolean;
  action_type: ActionType;
  created_at: string;
  updated_at: string;
  last_executed_at: string | null;
  next_execution_at: string | null;
  completed: boolean;
  execution_count: number;
  last_status: string | null;
  workflow_mode?: string;
}

export interface ScheduledTaskResponse {
  task: ScheduledTask;
  natural_language_content: string | null;
  skill_md_content: string | null;
}

export interface CreateScheduledTaskRequest {
  name: string;
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
  enabled: boolean;
  action_type: ActionType;
  natural_language_content?: string;
  skill_md_content?: string;
  workflow_mode?: string;
}

export interface UpdateScheduledTaskRequest {
  id: string;
  name: string;
  schedule_type: ScheduleType;
  schedule_config: ScheduleConfig;
  enabled: boolean;
  action_type: ActionType;
  natural_language_content?: string;
  skill_md_content?: string;
  workflow_mode?: string;
}

export function toScheduleConfig(
  scheduleType: ScheduleType,
  config: FixedScheduleConfig | IntervalScheduleConfig
): ScheduleConfig {
  if (scheduleType === 'fixed') {
    return {
      type: 'fixed',
      config: config as FixedScheduleConfig,
    };
  } else {
    return {
      type: 'interval',
      config: config as IntervalScheduleConfig,
    };
  }
}

export function fromScheduleConfig(scheduleConfig: ScheduleConfig): {
  scheduleType: ScheduleType;
  config: FixedScheduleConfig | IntervalScheduleConfig;
} {
  if (scheduleConfig.type === 'fixed') {
    return {
      scheduleType: 'fixed',
      config: scheduleConfig.config,
    };
  } else {
    return {
      scheduleType: 'interval',
      config: scheduleConfig.config,
    };
  }
}

export const scheduledTasksCommands = {
  async create(request: CreateScheduledTaskRequest): Promise<ScheduledTaskResponse> {
    return await invoke('cmd_scheduled_task_create', { request });
  },

  async update(request: UpdateScheduledTaskRequest): Promise<ScheduledTaskResponse> {
    return await invoke('cmd_scheduled_task_update', { request });
  },

  async get(taskId: string): Promise<ScheduledTaskResponse | null> {
    return await invoke('cmd_scheduled_task_get', { taskId });
  },

  async list(): Promise<ScheduledTask[]> {
    return await invoke('cmd_scheduled_task_list');
  },

  async delete(taskId: string): Promise<boolean> {
    return await invoke('cmd_scheduled_task_delete', { taskId });
  },

  async toggle(taskId: string, enabled: boolean): Promise<ScheduledTask> {
    return await invoke('cmd_scheduled_task_toggle', { taskId, enabled });
  },

  async complete(taskId: string): Promise<ScheduledTask> {
    return await invoke('cmd_scheduled_task_complete', { taskId });
  },

  async getNaturalLanguage(taskId: string): Promise<string | null> {
    return await invoke('cmd_scheduled_task_get_natural_language', { taskId });
  },

  async getSkillMd(taskId: string): Promise<string | null> {
    return await invoke('cmd_scheduled_task_get_skill_md', { taskId });
  },
};