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
  /** Short English description of what this provider is good at. */
  description: string;
  /** Short Chinese description of what this provider is good at. */
  description_zh: string;
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
    return await invoke('cmd_get_llm_instances');
  },
  async getDefaultLlmInstanceId(): Promise<string> {
    return await invoke('cmd_get_default_llm_instance_id');
  },
  async addLlmInstance(request: AddLlmInstanceRequest): Promise<string> {
    return await invoke('cmd_add_llm_instance', { request });
  },
  async updateLlmInstance(instanceId: string, instance: LlmInstance): Promise<boolean> {
    return await invoke('cmd_update_llm_instance', { instanceId, instance });
  },
  async deleteLlmInstance(instanceId: string): Promise<boolean> {
    return await invoke('cmd_delete_llm_instance', { instanceId });
  },
  async setDefaultLlmInstance(instanceId: string): Promise<boolean> {
    return await invoke('cmd_set_default_llm_instance', { instanceId });
  },
  async getLlmInstance(instanceId: string): Promise<LlmInstance | null> {
    return await invoke('cmd_get_llm_instance', { instanceId });
  },
  async addLlmModel(model: ModelConfig): Promise<boolean> {
    return await invoke('cmd_add_llm_model', { model });
  },
  async removeLlmModel(modelName: string): Promise<boolean> {
    return await invoke('cmd_remove_llm_model', { modelName });
  },
  async setDefaultLlmModel(modelName: string): Promise<boolean> {
    return await invoke('cmd_set_default_llm_model', { modelName });
  }
};
// ---------------------------------------------------------------------------
// Image generation commands
// ---------------------------------------------------------------------------
export interface ImageInstance {
  id: string;
  name: string;
  provider: string;
  api_key: string;
  api_base: string;
  default_model: string;
  models: ModelConfig[];
  created_at: string;
  updated_at: string;
  extra?: Record<string, string>;
  is_default?: boolean;
}
export interface AddImageInstanceRequest {
  name: string;
  provider: string;
  api_key: string;
  api_base: string;
  default_model: string;
  models: ModelConfig[];
  is_default?: boolean;
  extra?: Record<string, string>;
}
export const imageCommands = {
  async getAllImageModels(): Promise<ModelInfo[]> {
    return await invoke('cmd_get_all_image_models');
  },
  async getAllImageProviders(): Promise<ProviderInfo[]> {
    return await invoke('cmd_get_all_image_providers');
  },
  async getImageModelsByProvider(provider: string): Promise<ModelInfo[]> {
    return await invoke('cmd_get_image_models_by_provider', { provider });
  },
  async getRecommendedImageModels(): Promise<ModelInfo[]> {
    return await invoke('cmd_get_recommended_image_models');
  },
  async getImageInstances(): Promise<Record<string, ImageInstance>> {
    return await invoke('cmd_get_image_instances');
  },
  async getDefaultImageInstanceId(): Promise<string> {
    return await invoke('cmd_get_default_image_instance_id');
  },
  async addImageInstance(request: AddImageInstanceRequest): Promise<string> {
    return await invoke('cmd_add_image_instance', { request });
  },
  async updateImageInstance(instanceId: string, instance: ImageInstance): Promise<boolean> {
    return await invoke('cmd_update_image_instance', { instanceId, instance });
  },
  async deleteImageInstance(instanceId: string): Promise<boolean> {
    return await invoke('cmd_delete_image_instance', { instanceId });
  },
  async setDefaultImageInstance(instanceId: string): Promise<boolean> {
    return await invoke('cmd_set_default_image_instance', { instanceId });
  },
  async getImageInstance(instanceId: string): Promise<ImageInstance | null> {
    return await invoke('cmd_get_image_instance', { instanceId });
  },
};
// ---------------------------------------------------------------------------
// Video generation commands
// ---------------------------------------------------------------------------
export interface VideoInstance {
  id: string;
  name: string;
  provider: string;
  api_key: string;
  api_base: string;
  default_model: string;
  models: ModelConfig[];
  created_at: string;
  updated_at: string;
  extra?: Record<string, string>;
  is_default?: boolean;
}
export interface AddVideoInstanceRequest {
  name: string;
  provider: string;
  api_key: string;
  api_base: string;
  default_model: string;
  models: ModelConfig[];
  is_default?: boolean;
  extra?: Record<string, string>;
}
export const videoCommands = {
  async getAllVideoModels(): Promise<ModelInfo[]> {
    return await invoke('cmd_get_all_video_models');
  },
  async getAllVideoProviders(): Promise<ProviderInfo[]> {
    return await invoke('cmd_get_all_video_providers');
  },
  async getVideoModelsByProvider(provider: string): Promise<ModelInfo[]> {
    return await invoke('cmd_get_video_models_by_provider', { provider });
  },
  async getRecommendedVideoModels(): Promise<ModelInfo[]> {
    return await invoke('cmd_get_recommended_video_models');
  },
  async getVideoInstances(): Promise<Record<string, VideoInstance>> {
    return await invoke('cmd_get_video_instances');
  },
  async getDefaultVideoInstanceId(): Promise<string> {
    return await invoke('cmd_get_default_video_instance_id');
  },
  async addVideoInstance(request: AddVideoInstanceRequest): Promise<string> {
    return await invoke('cmd_add_video_instance', { request });
  },
  async updateVideoInstance(instanceId: string, instance: VideoInstance): Promise<boolean> {
    return await invoke('cmd_update_video_instance', { instanceId, instance });
  },
  async deleteVideoInstance(instanceId: string): Promise<boolean> {
    return await invoke('cmd_delete_video_instance', { instanceId });
  },
  async setDefaultVideoInstance(instanceId: string): Promise<boolean> {
    return await invoke('cmd_set_default_video_instance', { instanceId });
  },
  async getVideoInstance(instanceId: string): Promise<VideoInstance | null> {
    return await invoke('cmd_get_video_instance', { instanceId });
  },
};
// ---------------------------------------------------------------------------
// Audio generation commands
// ---------------------------------------------------------------------------
export interface AudioInstance {
  id: string;
  name: string;
  provider: string;
  api_key: string;
  api_base: string;
  default_model: string;
  models: ModelConfig[];
  created_at: string;
  updated_at: string;
  extra?: Record<string, string>;
  is_default?: boolean;
}
export interface AddAudioInstanceRequest {
  name: string;
  provider: string;
  api_key: string;
  api_base: string;
  default_model: string;
  models: ModelConfig[];
  is_default?: boolean;
  extra?: Record<string, string>;
}
export const audioCommands = {
  async getAllAudioModels(): Promise<ModelInfo[]> {
    return await invoke('cmd_get_all_audio_models');
  },
  async getAllAudioProviders(): Promise<ProviderInfo[]> {
    return await invoke('cmd_get_all_audio_providers');
  },
  async getAudioModelsByProvider(provider: string): Promise<ModelInfo[]> {
    return await invoke('cmd_get_audio_models_by_provider', { provider });
  },
  async getRecommendedAudioModels(): Promise<ModelInfo[]> {
    return await invoke('cmd_get_recommended_audio_models');
  },
  async getAudioInstances(): Promise<Record<string, AudioInstance>> {
    return await invoke('cmd_get_audio_instances');
  },
  async getDefaultAudioInstanceId(): Promise<string> {
    return await invoke('cmd_get_default_audio_instance_id');
  },
  async addAudioInstance(request: AddAudioInstanceRequest): Promise<string> {
    return await invoke('cmd_add_audio_instance', { request });
  },
  async updateAudioInstance(instanceId: string, instance: AudioInstance): Promise<boolean> {
    return await invoke('cmd_update_audio_instance', { instanceId, instance });
  },
  async deleteAudioInstance(instanceId: string): Promise<boolean> {
    return await invoke('cmd_delete_audio_instance', { instanceId });
  },
  async setDefaultAudioInstance(instanceId: string): Promise<boolean> {
    return await invoke('cmd_set_default_audio_instance', { instanceId });
  },
  async getAudioInstance(instanceId: string): Promise<AudioInstance | null> {
    return await invoke('cmd_get_audio_instance', { instanceId });
  },
};