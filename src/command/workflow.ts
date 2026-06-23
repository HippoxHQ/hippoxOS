import { invoke } from '@tauri-apps/api/core';

export interface WorkflowModeInfo {
    name: string;
    display_name: string;
    description: string;
}

export const workflowCommands = {
    /**
     * Get all workflow mode names
     */
    async getWorkflowModeNames(): Promise<string[]> {
        return await invoke('cmd_get_workflow_mode_names');
    },

    /**
     * Get workflow mode names in Chinese
     */
    async getWorkflowModeNamesZh(): Promise<string[]> {
        return await invoke('cmd_get_workflow_mode_names_zh');
    },

    /**
     * Get workflow mode names in English
     */
    async getWorkflowModeNamesEn(): Promise<string[]> {
        return await invoke('cmd_get_workflow_mode_names_en');
    },

    /**
     * Get workflow mode names by language
     */
    async getWorkflowModeNamesByLang(lang: string): Promise<string[]> {
        return await invoke('cmd_get_workflow_mode_names_by_lang', { lang });
    },

    /**
     * Convert string to workflow mode
     */
    async stringToWorkflowMode(s: string): Promise<string | null> {
        return await invoke('cmd_string_to_workflow_mode', { s });
    },

    /**
     * Convert workflow mode to string
     */
    async workflowModeToString(mode: string): Promise<string> {
        return await invoke('cmd_workflow_mode_to_string', { mode });
    },

    /**
     * Get workflow mode display name
     */
    async workflowModeDisplayName(mode: string): Promise<string> {
        return await invoke('cmd_workflow_mode_display_name', { mode });
    },

    /**
     * Get workflow mode display name in Chinese
     */
    async workflowModeDisplayNameZh(mode: string): Promise<string> {
        return await invoke('cmd_workflow_mode_display_name_zh', { mode });
    },

    /**
     * Get workflow mode display name by language
     */
    async workflowModeDisplayNameByLang(mode: string, lang: string): Promise<string> {
        return await invoke('cmd_workflow_mode_display_name_by_lang', { mode, lang });
    },

    /**
     * Get workflow mode description in Chinese
     */
    async workflowModeDescriptionZh(mode: string): Promise<string> {
        return await invoke('cmd_workflow_mode_description_zh', { mode });
    },

    /**
     * Get workflow mode description in English
     */
    async workflowModeDescriptionEn(mode: string): Promise<string> {
        return await invoke('cmd_workflow_mode_description_en', { mode });
    },

    /**
     * Get workflow mode description by language
     */
    async workflowModeDescription(mode: string, lang: string): Promise<string> {
        return await invoke('cmd_workflow_mode_description', { mode, lang });
    },

    /**
     * Get all workflow mode info (name, display_name, description) by language
     */
    async getAllWorkflowModeInfo(lang: string): Promise<WorkflowModeInfo[]> {
        return await invoke('cmd_get_all_workflow_mode_info', { lang });
    },
};