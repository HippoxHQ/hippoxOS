use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
/// Unified HTTP client for all external API calls
#[derive(Clone)]
pub struct HttpClient {
    client: Client,
}
impl HttpClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .build()
            .expect("Failed to build HTTP client");
        Self { client }
    }
    pub fn get_client(&self) -> &Client {
        &self.client
    }
    /// Fetch text content from a URL with custom headers
    pub async fn fetch_text(&self, url: &str, referer: Option<&str>) -> Result<String, String> {
        let mut request = self.client.get(url);
        if let Some(ref_val) = referer {
            request = request.header("Referer", ref_val);
        }
        let response = request.send().await.map_err(|e| format!("Request failed: {}", e))?;
        if !response.status().is_success() {
            return Err(format!("HTTP error: {}", response.status()));
        }
        response.text().await.map_err(|e| format!("Failed to read response: {}", e))
    }
    /// Fetch JSON content from a URL with custom headers
    pub async fn fetch_json(&self, url: &str, referer: Option<&str>) -> Result<Value, String> {
        let mut request = self.client.get(url);
        if let Some(ref_val) = referer {
            request = request.header("Referer", ref_val);
        }
        request = request.header("Accept", "application/json");
        let response = request.send().await.map_err(|e| format!("Request failed: {}", e))?;
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(format!("HTTP {}: {}", status, text));
        }
        response.json::<Value>().await.map_err(|e| format!("Failed to parse JSON: {}", e))
    }
}
impl Default for HttpClient {
    fn default() -> Self {
        Self::new()
    }
}
