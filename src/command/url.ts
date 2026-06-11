import { invoke } from '@tauri-apps/api/core';

export interface UrlMetadata {
    favicon_url: string | null;
    title: string | null;
    description: string | null;
    image: string | null;
    theme_color: string | null;
    background_image: string | null;
}

export const urlCommands = {
    async getUrlMetadata(url: string): Promise<UrlMetadata> {
        return await invoke('cmd_get_url_metadata', { url });
    },
};