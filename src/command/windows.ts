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
    async windowHide(windowId?: string): Promise<void> {
        return await invoke('cmd_window_hide', { windowId });
    },
    async windowShow(windowId?: string): Promise<void> {
        return await invoke('cmd_window_show', { windowId });
    },
    async windowMinimize(windowId?: string): Promise<void> {
        return await invoke('cmd_window_minimize', { windowId });
    },
    async windowMaximize(windowId?: string): Promise<void> {
        return await invoke('cmd_window_maximize', { windowId });
    },
    async windowUnmaximize(windowId?: string): Promise<void> {
        return await invoke('cmd_window_unmaximize', { windowId });
    },
    async windowClose(windowId?: string): Promise<void> {
        return await invoke('cmd_window_close', { windowId });
    },
    async windowIsMaximized(windowId?: string): Promise<boolean> {
        return await invoke('cmd_window_is_maximized', { windowId });
    },
    async windowIsVisible(windowId?: string): Promise<boolean> {
        return await invoke('cmd_window_is_visible', { windowId });
    },
    async windowSetFocus(windowId?: string): Promise<void> {
        return await invoke('cmd_window_set_focus', { windowId });
    },
    async windowToggleFullscreen(windowId?: string): Promise<void> {
        return await invoke('cmd_window_toggle_fullscreen', { windowId });
    },
    async windowGetState(windowId?: string): Promise<any> {
        return await invoke('cmd_window_get_state', { windowId });
    },
    async windowSetSize(width: number, height: number, windowId?: string): Promise<void> {
        return await invoke('cmd_window_set_size', { windowId, width, height });
    },
    async windowSetPosition(x: number, y: number, windowId?: string): Promise<void> {
        return await invoke('cmd_window_set_position', { windowId, x, y });
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