import { invoke } from '@tauri-apps/api/core';

export const windowsCommands = {
    async createSubmenuWindow(items: any[], currentDefaultId: string): Promise<void> {
        return await invoke('cmd_create_submenu_window', { items, currentDefaultId });
    },

    async emitToMainWindow(event: string, payload?: any): Promise<void> {
        return await invoke('cmd_emit_to_main_window', { event, payload });
    },

    async exitApp(): Promise<void> {
        return await invoke('cmd_exit_app');
    },

    async windowHide(): Promise<void> {
        return await invoke('cmd_window_hide');
    },

    async windowMinimize(): Promise<void> {
        return await invoke('cmd_window_minimize');
    },

    async windowMaximize(): Promise<void> {
        return await invoke('cmd_window_maximize');
    },

    async windowIsMaximized(): Promise<boolean> {
        return await invoke('cmd_window_is_maximized');
    },

    async getLlmInstances(): Promise<any> {
        return await invoke('cmd_get_llm_instances');
    },

    async getDefaultLlmInstanceId(): Promise<string> {
        return await invoke('cmd_get_default_llm_instance_id');
    },

    async setDefaultLlmInstance(instanceId: string): Promise<void> {
        return await invoke('cmd_set_default_llm_instance', { instanceId });
    },

    async openLogsDir(): Promise<void> {
        return await invoke('cmd_emit_to_main_window', { event: 'open-logs-dir' });
    },

    async openHistoryDir(): Promise<void> {
        return await invoke('cmd_emit_to_main_window', { event: 'open-history-dir' });
    },

    async openSkillsMarketDir(): Promise<void> {
        return await invoke('cmd_emit_to_main_window', { event: 'open-skills-market-dir' });
    },

    async openScheduledTasksDir(): Promise<void> {
        return await invoke('cmd_emit_to_main_window', { event: 'open-scheduled-tasks-dir' });
    },

    async openSettingsDir(): Promise<void> {
        return await invoke('cmd_emit_to_main_window', { event: 'open-settings-dir' });
    },

    async sendEvent(event: string): Promise<void> {
        return await invoke('cmd_emit_to_main_window', { event });
    }
};