use reqwest;
use scraper::{Html, Selector};
use std::time::Duration;

#[derive(Debug, Clone, serde::Serialize)]
pub struct UrlMetadata {
    pub favicon_url: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub image: Option<String>,
    pub theme_color: Option<String>,
    pub background_image: Option<String>,
}

#[tauri::command]
pub async fn cmd_get_url_metadata(url: String) -> Result<UrlMetadata, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    let response = client.get(&url).send().await.map_err(|e| format!("Failed to fetch URL: {}", e))?;
    let html = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;
    let fragment = scraper::Html::parse_document(&html);
    let title_selector = Selector::parse("title").unwrap();
    let title = fragment.select(&title_selector).next().map(|el| el.inner_html()).or_else(|| {
        let og_title_selector = Selector::parse("meta[property='og:title']").unwrap();
        fragment.select(&og_title_selector).next().and_then(|el| el.value().attr("content").map(|s| s.to_string()))
    });
    let desc_selector = Selector::parse("meta[name='description']").unwrap();
    let description = fragment.select(&desc_selector).next().and_then(|el| el.value().attr("content").map(|s| s.to_string())).or_else(|| {
        let og_desc_selector = Selector::parse("meta[property='og:description']").unwrap();
        fragment.select(&og_desc_selector).next().and_then(|el| el.value().attr("content").map(|s| s.to_string()))
    });
    let image_selector = Selector::parse("meta[property='og:image']").unwrap();
    let image = fragment.select(&image_selector).next().and_then(|el| el.value().attr("content").map(|s| s.to_string()));
    let theme_color_selector = Selector::parse("meta[name='theme-color']").unwrap();
    let theme_color = fragment.select(&theme_color_selector).next().and_then(|el| el.value().attr("content").map(|s| s.to_string())).or_else(|| {
        let ms_selector = Selector::parse("meta[name='msapplication-TileColor']").unwrap();
        fragment.select(&ms_selector).next().and_then(|el| el.value().attr("content").map(|s| s.to_string()))
    });
    let background_image = image.clone();
    let favicon_url = get_favicon_from_html(&fragment, &url).or_else(|| get_favicon_from_root(&url));
    Ok(UrlMetadata { favicon_url, title, description, image, theme_color, background_image })
}

fn get_favicon_from_html(fragment: &Html, base_url: &str) -> Option<String> {
    let icon_selector = Selector::parse("link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']").unwrap();

    for element in fragment.select(&icon_selector) {
        if let Some(href) = element.value().attr("href") {
            let absolute_url = if href.starts_with("http") {
                href.to_string()
            } else if href.starts_with('/') {
                let base = get_base_url(base_url);
                format!("{}{}", base, href)
            } else {
                let base = get_base_url(base_url);
                format!("{}/{}", base, href)
            };
            return Some(absolute_url);
        }
    }
    None
}

fn get_favicon_from_root(base_url: &str) -> Option<String> {
    let base = get_base_url(base_url);
    Some(format!("{}/favicon.ico", base))
}

fn get_base_url(url: &str) -> String {
    if let Ok(parsed) = url::Url::parse(url) {
        format!("{}://{}", parsed.scheme(), parsed.host_str().unwrap_or(""))
    } else {
        url.to_string()
    }
}
