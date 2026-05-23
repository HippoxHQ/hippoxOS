import { invoke } from '@tauri-apps/api/core';

export interface DataPaths {
  app_internal_dir: string;
  dialog_history_dir: string;
  skills_market_dir: string;
  scheduled_tasks_dir: string;
  scheduled_tasks_history_dir: string;
  log_dir: string;
  settings_dir: string;
  ai_model_config_dir: string;
  atomic_skills_config_dir: string;
  workspace_config_dir: string;
  engine_config_dir: string;
  system_config_dir: string;
}

export async function getDataPaths(): Promise<DataPaths> {
  return await invoke('get_data_paths');
}