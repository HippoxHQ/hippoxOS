import { invoke } from '@tauri-apps/api/core';

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

export interface ExtraConfigField {
  key: string;
  name: string;
  placeholder: string;
  required: boolean;
}

export interface ProviderInfo {
  id: string;
  name: string;
  icon: string;
  requires_api_key: boolean;
  requires_extra_config: boolean;
  extra_config_fields: ExtraConfigField[];
}

export interface LlmInstance {
  id: string;
  name: string;
  provider: string;
  api_key: string;
  api_base: string;
  workflow_mode: string;
  default_model: string;
  models: ModelConfig[];
  created_at: string;
  updated_at: string;
  extra?: Record<string, string>;
  is_default?: boolean;
}

export interface AddLlmInstanceRequest {
  name: string;
  provider: string;
  api_key: string;
  api_base: string;
  workflow_mode: string;
  default_model: string;
  models: ModelConfig[];
  is_default?: boolean;
  extra?: Record<string, string>;
}

export interface ModelConfig {
  name: string;
  api_key: string;
  is_default: boolean;
  provider: string;
}

export const llmCommands = {
  async getAllModels(): Promise<ModelInfo[]> {
    return await invoke('cmd_get_all_models');
  },

  async getAllProviders(): Promise<ProviderInfo[]> {
    return await invoke('cmd_get_all_providers');
  },

  async getModelsByProvider(provider: string): Promise<ModelInfo[]> {
    return await invoke('cmd_get_models_by_provider', { provider });
  },

  async getRecommendedModels(): Promise<ModelInfo[]> {
    return await invoke('cmd_get_recommended_models');
  },

  async getLlmInstances(): Promise<Record<string, LlmInstance>> {
    return await invoke('get_llm_instances');
  },

  async getDefaultLlmInstanceId(): Promise<string> {
    return await invoke('get_default_llm_instance_id');
  },

  async addLlmInstance(request: AddLlmInstanceRequest): Promise<string> {
    return await invoke('add_llm_instance', { request });
  },

  async updateLlmInstance(instanceId: string, instance: LlmInstance): Promise<boolean> {
    return await invoke('update_llm_instance', { instanceId, instance });
  },

  async deleteLlmInstance(instanceId: string): Promise<boolean> {
    return await invoke('delete_llm_instance', { instanceId });
  },

  async setDefaultLlmInstance(instanceId: string): Promise<boolean> {
    return await invoke('set_default_llm_instance', { instanceId });
  },

  async getLlmInstance(instanceId: string): Promise<LlmInstance | null> {
    return await invoke('get_llm_instance', { instanceId });
  },

  async addLlmModel(model: ModelConfig): Promise<boolean> {
    return await invoke('add_llm_model', { model });
  },

  async removeLlmModel(modelName: string): Promise<boolean> {
    return await invoke('remove_llm_model', { modelName });
  },

  async setDefaultLlmModel(modelName: string): Promise<boolean> {
    return await invoke('set_default_llm_model', { modelName });
  }
};