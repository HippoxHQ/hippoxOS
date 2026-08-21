import { invoke } from "@tauri-apps/api/core";
/**
 * News item structure matching Rust backend
 */
export interface NewsItem {
    id: string;
    title: string;
    source: string;
    source_url: string;
    published_at: string;
    summary?: string;
    url: string;
    sentiment?: string; // "positive", "negative", "neutral"
    category?: string; // "crypto", "stocks", "economy", "tech"
}
/**
 * News response structure
 */
export interface NewsResponse {
    success: boolean;
    message: string;
    total: number;
    data: NewsItem[];
}
/**
 * News API commands
 */
export const newsCommands = {
    /**
     * Fetch financial news from multiple sources
     * @param count - Number of news items to fetch (default: 30, max: 100)
     */
    fetchFinancialNews: async (count: number = 30): Promise<NewsResponse> => {
        return await invoke("cmd_fetch_financial_news", { count });
    },
    /**
     * Fetch news by category
     * @param category - News category: "crypto", "stocks", "economy", "tech"
     * @param count - Number of news items to fetch (default: 20, max: 50)
     */
    fetchNewsByCategory: async (category: string, count: number = 20): Promise<NewsResponse> => {
        return await invoke("cmd_fetch_news_by_category", { category, count });
    },
};
/**
 * Fetch financial news and return mapped frontend format
 */
export async function fetchFinancialNews(count: number = 30): Promise<NewsItem[]> {
    try {
        const response = await newsCommands.fetchFinancialNews(count);
        if (response.success) {
            return response.data;
        }
        console.error("[News] Failed to fetch news:", response.message);
        return [];
    } catch (error) {
        console.error("[News] Error fetching news:", error);
        return [];
    }
}
/**
 * Fetch news by category
 */
export async function fetchNewsByCategory(category: string, count: number = 20): Promise<NewsItem[]> {
    try {
        const response = await newsCommands.fetchNewsByCategory(category, count);
        if (response.success) {
            return response.data;
        }
        console.error(`[News] Failed to fetch news for category ${category}:`, response.message);
        return [];
    } catch (error) {
        console.error(`[News] Error fetching news for category ${category}:`, error);
        return [];
    }
}
/**
 * Get available news categories
 */
export const NEWS_CATEGORIES = [
    { value: "crypto", label: "加密货币" },
    { value: "stocks", label: "股票" },
    { value: "economy", label: "经济" },
    { value: "tech", label: "科技" },
] as const;
export type NewsCategory = typeof NEWS_CATEGORIES[number]["value"];