import { invoke } from '@tauri-apps/api/core';

export interface DataPaths {
  app_root_dir: string;
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

export interface DiskInfo {
  total: number;
  free: number;
  used: number;
}

export async function getDataPaths(): Promise<DataPaths> {
  return await invoke('get_data_paths');
}

export async function getDirectorySize(path: string): Promise<number> {
  return await invoke('get_directory_size', { path });
}

export async function getDiskInfo(path: string): Promise<DiskInfo> {
  return await invoke('get_disk_info', { path });
}

export async function getMaxLogSize(): Promise<number> {
  return await invoke('get_max_log_size');
}

export async function setMaxLogSize(maxSizeMb: number): Promise<void> {
  return await invoke('set_max_log_size', { maxSizeMb });
}

export async function getMaxDialogSize(): Promise<number> {
  return await invoke('get_max_dialog_size');
}

export async function setMaxDialogSize(maxSizeMb: number): Promise<void> {
  return await invoke('set_max_dialog_size', { maxSizeMb });
}