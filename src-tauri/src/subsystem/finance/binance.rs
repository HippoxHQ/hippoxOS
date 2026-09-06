// Binance API proxy module - backend proxy to avoid CORS issues
use crate::commons::https::HttpClient;
use serde::{Deserialize, Serialize};
use tauri::command;
/// Binance K-line data structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BinanceKLine {
    pub date: String,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: f64,
    pub amount: f64,
}
/// Binance K-line response
#[derive(Debug, Serialize, Deserialize)]
pub struct BinanceKLineResponse {
    pub success: bool,
    pub message: String,
    pub symbol: String,
    pub total: usize,
    pub data: Vec<BinanceKLine>,
}
/// Binance 24hr ticker data
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BinanceTickerData {
    pub symbol: String,
    pub pair: String,
    pub current_price: f64,
    pub change_24h: f64,
    pub volume: f64,
}
/// Binance ticker response
#[derive(Debug, Serialize, Deserialize)]
pub struct BinanceTickerResponse {
    pub success: bool,
    pub message: String,
    pub total: usize,
    pub data: Vec<BinanceTickerData>,
}
/// Binance fetcher
pub struct BinanceFetcher {
    http: HttpClient,
}
impl BinanceFetcher {
    pub fn new() -> Self {
        Self { http: HttpClient::new() }
    }
    /// Fetch K-line data from Binance API
    pub async fn fetch_klines(&self, symbol: &str, interval: &str, limit: usize) -> Result<Vec<BinanceKLine>, String> {
        let url = format!("https://api.binance.com/api/v3/klines?symbol={}&interval={}&limit={}", symbol, interval, limit);
        let response = self.http.fetch_json(&url, None).await.map_err(|e| format!("HTTP error: {}", e))?;
        let data = response.as_array().ok_or("Invalid response format")?;
        let mut klines = Vec::new();
        for item in data {
            let arr = item.as_array().ok_or("Invalid kline format")?;
            if arr.len() < 7 {
                continue;
            }
            let timestamp = arr[0].as_i64().unwrap_or(0);
            let date =
                chrono::DateTime::from_timestamp_millis(timestamp).map(|dt| dt.format("%Y-%m-%d").to_string()).unwrap_or_else(|| "".to_string());
            let open = arr[1].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            let high = arr[2].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            let low = arr[3].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            let close = arr[4].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            let volume = arr[5].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            let amount = arr[7].as_str().and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            klines.push(BinanceKLine { date, open, high, low, close, volume, amount });
        }
        Ok(klines)
    }
    /// Fetch 24hr ticker data from Binance API
    pub async fn fetch_tickers(&self) -> Result<Vec<BinanceTickerData>, String> {
        let url = "https://api.binance.com/api/v3/ticker/24hr";
        let response = self.http.fetch_json(&url, None).await.map_err(|e| format!("HTTP error: {}", e))?;
        let data = response.as_array().ok_or("Invalid response format")?;
        let mut tickers = Vec::new();
        for item in data {
            let symbol = item.get("symbol").and_then(|v| v.as_str()).unwrap_or("").to_string();
            // Only include USDT pairs
            if !symbol.ends_with("USDT") {
                continue;
            }
            let last_price = item.get("lastPrice").and_then(|v| v.as_str()).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            let price_change_percent = item.get("priceChangePercent").and_then(|v| v.as_str()).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            let quote_volume = item.get("quoteVolume").and_then(|v| v.as_str()).and_then(|s| s.parse::<f64>().ok()).unwrap_or(0.0);
            if last_price > 0.0 && quote_volume > 10000.0 {
                let pair = format!("{}/USDT", symbol.replace("USDT", ""));
                tickers.push(BinanceTickerData {
                    symbol: symbol.clone(),
                    pair,
                    current_price: last_price,
                    change_24h: price_change_percent,
                    volume: quote_volume,
                });
            }
        }
        Ok(tickers)
    }
}
impl Default for BinanceFetcher {
    fn default() -> Self {
        Self::new()
    }
}
/// Command: Fetch Binance K-line data
#[command]
pub async fn cmd_fetch_binance_klines(symbol: String, interval: String, limit: usize) -> Result<BinanceKLineResponse, String> {
    let fetcher = BinanceFetcher::new();
    let data = fetcher.fetch_klines(&symbol, &interval, limit).await?;
    Ok(BinanceKLineResponse { success: true, message: format!("Fetched {} klines", data.len()), symbol, total: data.len(), data })
}
/// Command: Fetch Binance 24hr ticker data
#[command]
pub async fn cmd_fetch_binance_tickers() -> Result<BinanceTickerResponse, String> {
    let fetcher = BinanceFetcher::new();
    let data = fetcher.fetch_tickers().await?;
    Ok(BinanceTickerResponse { success: true, message: format!("Fetched {} tickers", data.len()), total: data.len(), data })
}
