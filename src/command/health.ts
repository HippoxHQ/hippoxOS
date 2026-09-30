import { invoke } from '@tauri-apps/api/core';
export interface HealthCheckResult {
    instance_id: string;
    instance_name: string;
    status: 'online' | 'offline' | 'error';
    message: string | null;
    latency_ms: number | null;
}
export const healthCommands = {
    async checkAllLlmHealth(): Promise<HealthCheckResult[]> {
        return await invoke('cmd_check_all_llm_health');
    },
    async checkAllImageHealth(): Promise<HealthCheckResult[]> {
        return await invoke('cmd_check_all_image_health');
    },
    async checkAllVideoHealth(): Promise<HealthCheckResult[]> {
        return await invoke('cmd_check_all_video_health');
    },
    async checkAllAudioHealth(): Promise<HealthCheckResult[]> {
        return await invoke('cmd_check_all_audio_health');
    },
};