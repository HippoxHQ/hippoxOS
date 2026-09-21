// Unified HTTP client for all external API calls
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;
/// Unified HTTP client for all external API calls
#[derive(Clone)]
pub struct HttpClient {
    client: Client,
    /// Dedicated client for large file downloads (installers, etc.).
    /// Kept separate from the shared client so that download-specific timeouts
    /// do not affect regular JSON / text requests.
    download_client: Client,
}
impl HttpClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .build()
            .expect("Failed to build HTTP client");
        // Dedicated download client:
        // - No total request timeout (a 400MB installer may take a long time).
        // - connect_timeout limits only the TCP/TLS handshake phase.
        // - read_timeout limits the idle gap between two received chunks,
        //   so a slow-but-alive download is never killed by a global timer.
        let download_client = Client::builder()
            .connect_timeout(Duration::from_secs(30))
            .read_timeout(Duration::from_secs(60))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .build()
            .expect("Failed to build download HTTP client");
        Self { client, download_client }
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
    /// Fetch text content from a URL, decoding the body as GBK.
    ///
    /// Some Chinese quote endpoints (Tencent's qt.gtimg.cn, Sina's
    /// hq.sinajs.cn) return GBK-encoded bodies. Decoding them as UTF-8
    /// corrupts every Chinese name, which is why A-share names showed up
    /// as garbage in the UI. This helper reads the raw bytes and decodes
    /// them with the GBK codec instead.
    ///
    /// The decode is pure-Rust (encoding_rs), so behaviour is identical
    /// on Windows, macOS and Linux.
    pub async fn fetch_text_gbk(&self, url: &str, referer: Option<&str>) -> Result<String, String> {
        let bytes = self.fetch_bytes(url, referer).await?;
        let (decoded, _, _) = encoding_rs::GBK.decode(&bytes);
        Ok(decoded.into_owned())
    }
    /// Fetch JSON content from a URL with custom headers (GET)
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
    /// Fetch JSON content from a URL with POST method and JSON body
    pub async fn fetch_json_post(&self, url: &str, body: &Value, referer: Option<&str>) -> Result<Value, String> {
        let mut request = self.client.post(url);
        if let Some(ref_val) = referer {
            request = request.header("Referer", ref_val);
        }
        request = request.header("Accept", "application/json").header("Content-Type", "application/json").json(body);
        let response = request.send().await.map_err(|e| format!("Request failed: {}", e))?;
        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            return Err(format!("HTTP {}: {}", status, text));
        }
        response.json::<Value>().await.map_err(|e| format!("Failed to parse JSON: {}", e))
    }
    /// Fetch raw bytes from a URL (for downloading files)
    pub async fn fetch_bytes(&self, url: &str, referer: Option<&str>) -> Result<Vec<u8>, String> {
        let mut request = self.client.get(url);
        if let Some(ref_val) = referer {
            request = request.header("Referer", ref_val);
        }
        let response = request.send().await.map_err(|e| format!("Request failed: {}", e))?;
        if !response.status().is_success() {
            let status = response.status();
            return Err(format!("HTTP {}: Failed to download file", status));
        }
        let bytes = response.bytes().await.map_err(|e| format!("Failed to read response bytes: {}", e))?;
        Ok(bytes.to_vec())
    }
    /// Streaming download for large files (installers, packages, etc.).
    ///
    /// Unlike `fetch_bytes`, this method:
    /// - Uses the dedicated `download_client` (no global timeout, only connect/read timeouts).
    /// - Reads the response as a stream of chunks instead of one giant allocation.
    /// - Reports progress through the `on_progress` callback as `(downloaded, total)`.
    /// - Validates the received size against `Content-Length` when available.
    ///
    /// `on_progress` receives the number of bytes downloaded so far and the total
    /// expected size (if the server provided `Content-Length`, otherwise `None`).
    pub async fn fetch_bytes_streaming<F>(&self, url: &str, referer: Option<&str>, mut on_progress: F) -> Result<Vec<u8>, String>
    where
        F: FnMut(u64, Option<u64>),
    {
        use futures_util::StreamExt;
        let mut request = self.download_client.get(url);
        if let Some(ref_val) = referer {
            request = request.header("Referer", ref_val);
        }
        let response = request.send().await.map_err(|e| format!("Request failed: {}", e))?;
        let status = response.status();
        let total = response.content_length();
        if !status.is_success() {
            return Err(format!("HTTP {}: Failed to download file from {}", status, url));
        }
        // Pre-allocate when the total size is known and reasonable.
        let initial_capacity = match total {
            Some(len) if len > 0 && len <= 1024 * 1024 * 1024 => len as usize,
            _ => 0,
        };
        let mut stream = response.bytes_stream();
        let mut buf: Vec<u8> = Vec::with_capacity(initial_capacity);
        let start = std::time::Instant::now();
        while let Some(chunk) = stream.next().await {
            match chunk {
                Ok(c) => {
                    buf.extend_from_slice(&c);
                    let downloaded = buf.len() as u64;
                    on_progress(downloaded, total);
                }
                Err(e) => {
                    // Build the full error chain so the real cause is visible.
                    let mut msg = format!("Stream error after {} bytes: {}", buf.len(), e);
                    let mut source = std::error::Error::source(&e);
                    while let Some(s) = source {
                        msg.push_str(&format!(" -> {}", s));
                        source = std::error::Error::source(s);
                    }
                    return Err(msg);
                }
            }
        }
        // Validate against Content-Length when provided.
        if let Some(expected) = total {
            if buf.len() as u64 != expected {
                return Err(format!("Incomplete download: got {} / expected {} bytes", buf.len(), expected));
            }
        }
        Ok(buf)
    }
}
impl Default for HttpClient {
    fn default() -> Self {
        Self::new()
    }
}
