import { invoke } from "@tauri-apps/api/core";

export interface AtomicSkillInfo {
  name: string;
  description: string;
  category: string;
  parameters: SkillParameterInfo[];
}

export interface SkillParameterInfo {
  name: string;
  param_type: string;
  description: string;
  required: boolean;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  provider_name: string;
  description: string;
  streaming: boolean;
  context_length: number | null;
  recommended: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  requires_api_key: boolean;
  requires_extra_config: boolean;
  extra_config_fields: ExtraConfigField[];
}

export interface ExtraConfigField {
  key: string;
  name: string;
  placeholder: string;
  required: boolean;
}

export async function getAtomicSkills(): Promise<AtomicSkillInfo[]> {
  return await invoke('get_atomic_skills');
}

export async function getAtomicSkillsByCategory(category: string): Promise<AtomicSkillInfo[]> {
  return await invoke('get_atomic_skills_by_category', { category });
}

export async function getSkillCategories(): Promise<string[]> {
  return await invoke('get_skill_categories');
}

export async function executeAtomicSkill(
  skillName: string,
  parameters: Record<string, any>
): Promise<string> {
  return await invoke('execute_atomic_skill', { skillName, parameters });
}

export async function getAllModels(): Promise<ModelInfo[]> {
  return await invoke('get_all_models');
}

export async function getAllProviders(): Promise<ProviderInfo[]> {
  return await invoke('get_all_providers');
}

export async function getModelsByProvider(provider: string): Promise<ModelInfo[]> {
  return await invoke('get_models_by_provider', { provider });
}

export async function getRecommendedModels(): Promise<ModelInfo[]> {
  return await invoke('get_recommended_models');
}