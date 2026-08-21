use crate::commons::https::HttpClient;
use log::error;
use serde::{Deserialize, Serialize};
use tauri::command;
/// News item structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NewsItem {
    pub id: String,
    pub title: String,
    pub source: String,
    pub source_url: String,
    pub published_at: String,
    pub summary: Option<String>,
    pub url: String,
    pub sentiment: Option<String>,
    pub category: Option<String>,
}
/// News response structure
#[derive(Debug, Serialize, Deserialize)]
pub struct NewsResponse {
    pub success: bool,
    pub message: String,
    pub total: usize,
    pub data: Vec<NewsItem>,
}
/// News fetcher with multiple sources
pub struct NewsFetcher {
    http: HttpClient,
}
impl NewsFetcher {
    pub fn new() -> Self {
        Self { http: HttpClient::new() }
    }
    /// Fetch financial news with interleaved foreign and domestic sources
    pub async fn fetch_news(&self, limit: usize) -> Vec<NewsItem> {
        let half_limit = (limit + 1) / 2;
        // Fetch foreign and domestic news in parallel
        let (foreign_news, domestic_news) = tokio::join!(self.fetch_foreign_news(half_limit * 2), self.fetch_domestic_news(half_limit * 2));
        // Interleave foreign and domestic news
        let mut interleaved = Vec::with_capacity(limit);
        let max_len = std::cmp::max(foreign_news.len(), domestic_news.len());
        for i in 0..max_len {
            if i < foreign_news.len() {
                interleaved.push(foreign_news[i].clone());
            }
            if i < domestic_news.len() {
                interleaved.push(domestic_news[i].clone());
            }
        }
        interleaved.truncate(limit);
        interleaved
    }
    /// Fetch foreign news from CryptoPanic, MarketScoop, TechCrunch
    async fn fetch_foreign_news(&self, limit: usize) -> Vec<NewsItem> {
        let mut all_news = Vec::new();
        // Crypto news from CryptoPanic
        match self.fetch_crypto_panic(limit / 3).await {
            Ok(items) => all_news.extend(items),
            Err(e) => error!("[News] CryptoPanic failed: {}", e),
        }
        // Stock market news from MarketScoop
        match self.fetch_market_scoop(limit / 3).await {
            Ok(items) => all_news.extend(items),
            Err(e) => error!("[News] MarketScoop failed: {}", e),
        }
        // Technology news from TechCrunch
        match self.fetch_techcrunch(limit / 3).await {
            Ok(items) => all_news.extend(items),
            Err(e) => error!("[News] TechCrunch failed: {}", e),
        }
        all_news.truncate(limit);
        all_news
    }
    /// Fetch domestic news from Eastmoney, Tencent, Sina
    async fn fetch_domestic_news(&self, limit: usize) -> Vec<NewsItem> {
        let mut all_news = Vec::new();
        // Eastmoney RSS
        match self.fetch_eastmoney_news(limit / 3).await {
            Ok(items) => all_news.extend(items),
            Err(e) => error!("[News] Eastmoney failed: {}", e),
        }
        // Tencent Finance RSS
        match self.fetch_tencent_news(limit / 3).await {
            Ok(items) => all_news.extend(items),
            Err(e) => error!("[News] Tencent Finance failed: {}", e),
        }
        // Sina Finance RSS
        match self.fetch_sina_news(limit / 3).await {
            Ok(items) => all_news.extend(items),
            Err(e) => error!("[News] Sina Finance failed: {}", e),
        }
        all_news.truncate(limit);
        all_news
    }
    /// Fetch crypto news from CryptoPanic API
    async fn fetch_crypto_panic(&self, limit: usize) -> Result<Vec<NewsItem>, String> {
        let url = "https://cryptopanic.com/api/v1/posts/?auth_token=9ef0a36366b599ec1e5336cd210f0c899641b9ce&public=true&limit=30";
        match self.http.fetch_json(&url, None).await {
            Ok(json) => {
                let mut items = Vec::new();
                if let Some(results) = json.get("results").and_then(|v| v.as_array()) {
                    for post in results {
                        if let Some(item) = Self::parse_crypto_panic_item(post) {
                            items.push(item);
                        }
                    }
                }
                Ok(items)
            }
            Err(e) => {
                error!("[News] CryptoPanic API error: {}", e);
                Err(e)
            }
        }
    }
    fn parse_crypto_panic_item(post: &serde_json::Value) -> Option<NewsItem> {
        let title = post.get("title").and_then(|v| v.as_str())?.to_string();
        let url = post.get("url").and_then(|v| v.as_str())?.to_string();
        let source = post.get("domain").and_then(|v| v.as_str()).unwrap_or("CryptoPanic").to_string();
        let source_url = "https://cryptopanic.com".to_string();
        let published_at = post.get("published_at").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let sentiment = post.get("sentiment").and_then(|v| v.as_str()).map(|s| s.to_string());
        let id = format!("cryptopanic_{}", post.get("id").and_then(|v| v.as_i64()).unwrap_or(0));
        Some(NewsItem { id, title, source, source_url, published_at, summary: None, url, sentiment, category: Some("crypto".to_string()) })
    }
    /// Fetch stock market news from MarketScoop RSS
    async fn fetch_market_scoop(&self, limit: usize) -> Result<Vec<NewsItem>, String> {
        let url = "https://api.rss2json.com/v1/api.json?rss_url=https://marketscoop.news/feed";
        match self.http.fetch_json(&url, None).await {
            Ok(json) => {
                let mut items = Vec::new();
                if let Some(feed_items) = json.get("items").and_then(|v| v.as_array()) {
                    for item in feed_items {
                        if let Some(news) = Self::parse_rss_item(item, "MarketScoop", "https://marketscoop.news", Some("stocks".to_string())) {
                            items.push(news);
                        }
                    }
                }
                Ok(items)
            }
            Err(e) => {
                error!("[News] MarketScoop error: {}", e);
                Err(e)
            }
        }
    }
    /// Fetch technology news from TechCrunch
    async fn fetch_techcrunch(&self, limit: usize) -> Result<Vec<NewsItem>, String> {
        let url = "https://api.rss2json.com/v1/api.json?rss_url=https://techcrunch.com/feed";
        match self.http.fetch_json(&url, None).await {
            Ok(json) => {
                let mut items = Vec::new();
                if let Some(feed_items) = json.get("items").and_then(|v| v.as_array()) {
                    for item in feed_items {
                        if let Some(news) = Self::parse_rss_item(item, "TechCrunch", "https://techcrunch.com", Some("tech".to_string())) {
                            items.push(news);
                        }
                    }
                }
                Ok(items)
            }
            Err(e) => {
                error!("[News] TechCrunch error: {}", e);
                Err(e)
            }
        }
    }
    /// Fetch Chinese financial news from Eastmoney RSS
    async fn fetch_eastmoney_news(&self, limit: usize) -> Result<Vec<NewsItem>, String> {
        let url = "https://api.rss2json.com/v1/api.json?rss_url=https://news.eastmoney.com/rss/stock.xml";
        match self.http.fetch_json(&url, None).await {
            Ok(json) => {
                let mut items = Vec::new();
                if let Some(feed_items) = json.get("items").and_then(|v| v.as_array()) {
                    for item in feed_items {
                        if let Some(news) = Self::parse_rss_item(item, "东方财富", "https://www.eastmoney.com", Some("stocks".to_string())) {
                            items.push(news);
                        }
                    }
                }
                Ok(items)
            }
            Err(e) => {
                error!("[News] Eastmoney error: {}", e);
                Err(e)
            }
        }
    }
    /// Fetch Chinese financial news from Tencent Finance RSS
    async fn fetch_tencent_news(&self, limit: usize) -> Result<Vec<NewsItem>, String> {
        let url = "https://api.rss2json.com/v1/api.json?rss_url=https://finance.qq.com/news/index.rss";
        match self.http.fetch_json(&url, None).await {
            Ok(json) => {
                let mut items = Vec::new();
                if let Some(feed_items) = json.get("items").and_then(|v| v.as_array()) {
                    for item in feed_items {
                        if let Some(news) = Self::parse_rss_item(item, "腾讯财经", "https://finance.qq.com", Some("economy".to_string())) {
                            items.push(news);
                        }
                    }
                }
                Ok(items)
            }
            Err(e) => {
                error!("[News] Tencent error: {}", e);
                Err(e)
            }
        }
    }
    /// Fetch Chinese financial news from Sina Finance RSS
    async fn fetch_sina_news(&self, limit: usize) -> Result<Vec<NewsItem>, String> {
        let url = "https://api.rss2json.com/v1/api.json?rss_url=https://finance.sina.com.cn/chanjing/roll/roll_news.xml";
        match self.http.fetch_json(&url, None).await {
            Ok(json) => {
                let mut items = Vec::new();
                if let Some(feed_items) = json.get("items").and_then(|v| v.as_array()) {
                    for item in feed_items {
                        if let Some(news) = Self::parse_rss_item(item, "新浪财经", "https://finance.sina.com.cn", Some("economy".to_string())) {
                            items.push(news);
                        }
                    }
                }
                Ok(items)
            }
            Err(e) => {
                error!("[News] Sina error: {}", e);
                Err(e)
            }
        }
    }
    /// Parse RSS2JSON feed item with category support
    fn parse_rss_item(item: &serde_json::Value, default_source: &str, source_url: &str, category: Option<String>) -> Option<NewsItem> {
        let title = item.get("title").and_then(|v| v.as_str())?.to_string();
        let url = item.get("link").and_then(|v| v.as_str())?.to_string();
        let source = item.get("author").and_then(|v| v.as_str()).unwrap_or(default_source).to_string();
        let published_at = item.get("pubDate").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let summary = item.get("description").and_then(|v| v.as_str()).map(|s| s.to_string());
        let id = format!("{}_{}", default_source.to_lowercase(), item.get("guid").and_then(|v| v.as_str()).unwrap_or(""));
        Some(NewsItem { id, title, source, source_url: source_url.to_string(), published_at, summary, url, sentiment: None, category })
    }
}
impl Default for NewsFetcher {
    fn default() -> Self {
        Self::new()
    }
}
/// Command: Fetch financial news from multiple sources
#[command]
pub async fn cmd_fetch_financial_news(count: Option<usize>) -> Result<NewsResponse, String> {
    let fetcher = NewsFetcher::new();
    let count = count.unwrap_or(30);
    let count = if count > 100 { 100 } else { count };
    let news = fetcher.fetch_news(count).await;
    if news.is_empty() {
        Ok(NewsResponse { success: false, message: "Failed to fetch any news".to_string(), total: 0, data: Vec::new() })
    } else {
        Ok(NewsResponse { success: true, message: format!("Fetched {} news items", news.len()), total: news.len(), data: news })
    }
}
/// Command: Get news by category
#[command]
pub async fn cmd_fetch_news_by_category(category: String, count: Option<usize>) -> Result<NewsResponse, String> {
    let fetcher = NewsFetcher::new();
    let count = count.unwrap_or(20);
    let count = if count > 50 { 50 } else { count };
    let all_news = fetcher.fetch_news(count * 2).await;
    let filtered: Vec<NewsItem> =
        all_news.into_iter().filter(|item| item.category.as_ref().map(|c| c == &category).unwrap_or(false)).take(count).collect();
    if filtered.is_empty() {
        Ok(NewsResponse { success: false, message: format!("No news found for category: {}", category), total: 0, data: Vec::new() })
    } else {
        Ok(NewsResponse {
            success: true,
            message: format!("Fetched {} news items for category: {}", filtered.len(), category),
            total: filtered.len(),
            data: filtered,
        })
    }
}
