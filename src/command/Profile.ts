/**
 * User profile commands for interacting with the Rust backend
 * Path: C:\Users\<username>\AppData\Roaming\HippoX\profile\info.json
 */
import { invoke } from "@tauri-apps/api/core";
export interface ProfileSettings {
    timezone: string | null;
    date_format: string | null;
    notifications_enabled: boolean;
    sound_enabled: boolean;
    auto_save: boolean;
    theme_preference: string;
    extra: Record<string, any>;
}
export interface UserProfile {
    id: string;
    name: string;
    email: string | null;
    avatar: string | null;
    created_at: string;
    updated_at: string;
    settings: ProfileSettings;
    /** Total input tokens consumed across all tasks */
    total_input_tokens: number;
    /** Total output tokens consumed across all tasks */
    total_output_tokens: number;
    /** key: session id, value: session creation timestamp (milliseconds) */
    total_sessions_count: Record<string, number>;
    /** key: session id, value: chat count */
    total_sessions_chat_count: Record<string, number>;
    /** Total task count (deduplicated by task ID) */
    total_task_count: number;
}
export interface UpdateProfileRequest {
    name?: string;
    email?: string;
    avatar?: string;
    settings?: Partial<ProfileSettings>;
}
export const profileCommands = {
    /**
     * Get the current user profile from cache/disk
     */
    getProfile: async (): Promise<UserProfile> => {
        return await invoke<UserProfile>("cmd_get_profile");
    },
    /**
     * Update the user profile
     */
    updateProfile: async (update: UpdateProfileRequest): Promise<UserProfile> => {
        return await invoke<UserProfile>("cmd_update_profile", { update });
    },
    /**
     * Reset profile to default
     */
    resetProfile: async (): Promise<UserProfile> => {
        return await invoke<UserProfile>("cmd_reset_profile");
    },
    /**
     * Check if profile exists on disk
     */
    profileExists: async (): Promise<boolean> => {
        return await invoke<boolean>("cmd_profile_exists");
    },
    /**
     * Get profile directory path
     */
    getProfileDir: async (): Promise<string> => {
        return await invoke<string>("cmd_get_profile_dir");
    },
    /**
     * Update profile settings only
     */
    updateProfileSettings: async (settings: Partial<ProfileSettings>): Promise<UserProfile> => {
        return await invoke<UserProfile>("cmd_update_profile_settings", { settings });
    },
    /**
     * Get a specific profile setting
     */
    getProfileSetting: async (key: string): Promise<any> => {
        return await invoke<any>("cmd_get_profile_setting", { key });
    },
    /**
     * Update a specific profile setting
     */
    setProfileSetting: async (key: string, value: any): Promise<UserProfile> => {
        return await invoke<UserProfile>("cmd_set_profile_setting", { key, value });
    },
    /**
     * Invalidate the profile cache (forces reload from disk on next access)
     */
    invalidateProfileCache: async (): Promise<void> => {
        return await invoke<void>("cmd_invalidate_profile_cache");
    },
    /**
     * Get profile cache statistics
     */
    getProfileCacheStats: async (): Promise<{ cached: boolean }> => {
        return await invoke<{ cached: boolean }>("cmd_get_profile_cache_stats");
    },
};