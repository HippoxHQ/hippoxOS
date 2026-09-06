use crate::commons::https::HttpClient;
use serde::{Deserialize, Serialize};
use tauri::command;
/// Yahoo Finance stock data structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct YahooStockData {
    pub symbol: String,
    pub name: String,
    pub current_price: f64,
    pub change_percent: f64,
    pub change_amount: f64,
    pub volume: u64,
    pub market_cap: Option<f64>,
    pub sector: Option<String>,
    pub exchange: Option<String>,
    pub open: Option<f64>,
    pub high: Option<f64>,
    pub low: Option<f64>,
    pub previous_close: Option<f64>,
}
/// Batch response
#[derive(Debug, Serialize, Deserialize)]
pub struct YahooBatchResponse {
    pub success: bool,
    pub message: String,
    pub total: usize,
    pub data: Vec<YahooStockData>,
}
/// Yahoo Finance fetcher
pub struct YahooFetcher {
    http: HttpClient,
}
impl YahooFetcher {
    pub fn new() -> Self {
        Self { http: HttpClient::new() }
    }
    /// Fetch single stock from Yahoo Finance
    pub async fn fetch_stock(&self, symbol: &str) -> Result<YahooStockData, String> {
        let url = format!("https://query1.finance.yahoo.com/v8/finance/chart/{}?range=1d&interval=5m", symbol);
        let response = self.http.fetch_json(&url, None).await.map_err(|e| format!("HTTP error: {}", e))?;
        // Parse response
        let chart = response.get("chart").ok_or("Missing chart field")?;
        let error = chart.get("error");
        if error.is_some() && !error.as_ref().unwrap().is_null() {
            return Err("Yahoo API returned error".to_string());
        }
        let result = chart.get("result").and_then(|v| v.as_array()).and_then(|arr| arr.first()).ok_or("No result data")?;
        let meta = result.get("meta").ok_or("Missing meta")?;
        let indicators = result.get("indicators").ok_or("Missing indicators")?;
        let quote = indicators.get("quote").and_then(|v| v.as_array()).and_then(|arr| arr.first()).ok_or("Missing quote data")?;
        let current_price = meta.get("regularMarketPrice").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let previous_close = meta
            .get("regularMarketPreviousClose")
            .and_then(|v| v.as_f64())
            .or_else(|| meta.get("chartPreviousClose").and_then(|v| v.as_f64()))
            .unwrap_or(current_price * 0.99);
        let change_amount = current_price - previous_close;
        let change_percent = if previous_close > 0.0 { (change_amount / previous_close) * 100.0 } else { 0.0 };
        let symbol_name = meta.get("symbol").and_then(|v| v.as_str()).unwrap_or(symbol).to_string();
        let long_name = meta
            .get("longName")
            .and_then(|v| v.as_str())
            .or_else(|| meta.get("shortName").and_then(|v| v.as_str()))
            .unwrap_or(&symbol_name)
            .to_string();
        let open = quote.get("open").and_then(|v| v.as_array()).and_then(|arr| arr.first()).and_then(|v| v.as_f64());
        let high = meta.get("regularMarketDayHigh").and_then(|v| v.as_f64());
        let low = meta.get("regularMarketDayLow").and_then(|v| v.as_f64());
        let volume = meta.get("regularMarketVolume").and_then(|v| v.as_u64()).unwrap_or(0);
        let exchange = meta.get("fullExchangeName").and_then(|v| v.as_str()).map(|s| s.to_string());
        Ok(YahooStockData {
            symbol: symbol_name,
            name: long_name,
            current_price,
            change_percent,
            change_amount,
            volume,
            market_cap: None,
            sector: None,
            exchange,
            open,
            high,
            low,
            previous_close: Some(previous_close),
        })
    }
    /// Fetch multiple stocks from Yahoo Finance
    pub async fn fetch_stocks_batch(&self, symbols: &[&str]) -> Vec<YahooStockData> {
        let mut results = Vec::new();
        for (i, &symbol) in symbols.iter().enumerate() {
            match self.fetch_stock(symbol).await {
                Ok(data) => results.push(data),
                Err(e) => eprintln!("[Yahoo] Failed to fetch {}: {}", symbol, e),
            }
            // Rate limiting to avoid being blocked
            if i < symbols.len() - 1 {
                tokio::time::sleep(tokio::time::Duration::from_millis(200)).await;
            }
        }
        results
    }
}
impl Default for YahooFetcher {
    fn default() -> Self {
        Self::new()
    }
}
#[command]
pub async fn cmd_fetch_yahoo_stocks(symbols: Vec<String>) -> Result<YahooBatchResponse, String> {
    if symbols.is_empty() {
        return Ok(YahooBatchResponse { success: false, message: "No symbols provided".to_string(), total: 0, data: Vec::new() });
    }
    let fetcher = YahooFetcher::new();
    let symbol_refs: Vec<&str> = symbols.iter().map(|s| s.as_str()).collect();
    let stocks = fetcher.fetch_stocks_batch(&symbol_refs).await;
    if stocks.is_empty() {
        Ok(YahooBatchResponse { success: false, message: "Failed to fetch any stock data".to_string(), total: 0, data: Vec::new() })
    } else {
        Ok(YahooBatchResponse { success: true, message: format!("Fetched {} stocks", stocks.len()), total: stocks.len(), data: stocks })
    }
}
