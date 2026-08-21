/**
 * Yahoo Finance Data Source Module
 * Provides stock market data from Yahoo Finance API
 */
export interface YahooStockItem {
    symbol: string;
    name: string;
    currentPrice: number;
    changePercent: number;
    changeAmount: number;
    volume: number;
    marketCap?: number;
    sector?: string;
    exchange?: string;
    lastUpdated?: number;
    open?: number;
    high?: number;
    low?: number;
    previousClose?: number;
}
export interface YahooChartResult {
    meta: {
        currency: string;
        symbol: string;
        exchangeName: string;
        fullExchangeName: string;
        instrumentType: string;
        regularMarketPrice: number;
        regularMarketChange?: number;
        regularMarketChangePercent?: number;
        regularMarketTime: number;
        regularMarketVolume: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketPreviousClose?: number;
        chartPreviousClose?: number;
        longName?: string;
        shortName?: string;
        priceHint: number;
        dataGranularity: string;
        range: string;
    };
    timestamp: number[];
    indicators: {
        quote: Array<{
            open: (number | null)[];
            high: (number | null)[];
            low: (number | null)[];
            close: (number | null)[];
            volume: (number | null)[];
        }>;
    };
}
export interface YahooFinanceResponse {
    chart: {
        result: YahooChartResult[];
        error: any;
    };
}
// Popular US stocks for default tracking
export const POPULAR_STOCKS = [
    "AAPL", "MSFT", "GOOGL", "AMZN", "META",
    "TSLA", "NVDA", "BRK-B", "JPM", "V",
    "JNJ", "WMT", "UNH", "PG", "MA",
    "HD", "CVX", "BAC", "XOM", "PFE"
];
/**
 * Fetch stock data from Yahoo Finance
 * @param symbol - Stock symbol (e.g., "AAPL")
 * @returns Stock data or null if failed
 */
export const fetchStockFromYahoo = async (symbol: string): Promise<YahooStockItem | null> => {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`;
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                "User-Agent": "Mozilla/5.0",
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        const data: YahooFinanceResponse = await response.json();
        if (data.chart.error || !data.chart.result || data.chart.result.length === 0) {
            return null;
        }
        const result = data.chart.result[0];
        const meta = result.meta;
        const indicators = result.indicators;
        const quote = indicators.quote[0];
        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.regularMarketPreviousClose || meta.chartPreviousClose || currentPrice * 0.99;
        const changeAmount = currentPrice - previousClose;
        const changePercent = (changeAmount / previousClose) * 100;
        return {
            symbol: meta.symbol,
            name: meta.longName || meta.shortName || symbol,
            currentPrice,
            changePercent,
            changeAmount,
            volume: meta.regularMarketVolume,
            marketCap: undefined,
            sector: undefined,
            exchange: meta.fullExchangeName,
            lastUpdated: meta.regularMarketTime * 1000,
            open: quote.open[0] || undefined,
            high: meta.regularMarketDayHigh,
            low: meta.regularMarketDayLow,
            previousClose: previousClose,
        };
    } catch (err) {
        console.warn(`[Yahoo] Failed to fetch ${symbol}:`, err);
        return null;
    }
};
/**
 * Fetch multiple stocks data from Yahoo Finance
 * @param symbols - Array of stock symbols
 * @param onProgress - Optional progress callback
 * @returns Array of successful stock data
 */
export const fetchStocksBatch = async (
    symbols: string[],
    onProgress?: (current: number, total: number) => void
): Promise<YahooStockItem[]> => {
    const results: YahooStockItem[] = [];
    const total = symbols.length;
    for (let i = 0; i < total; i++) {
        const symbol = symbols[i];
        try {
            const stockData = await fetchStockFromYahoo(symbol);
            if (stockData) {
                results.push(stockData);
            }
            // Rate limiting to avoid being blocked
            if (i < total - 1) {
                await new Promise((resolve) => setTimeout(resolve, 300));
            }
        } catch (err) {
            console.warn(`[Yahoo] Failed to fetch ${symbol}:`, err);
        }
        if (onProgress) {
            onProgress(i + 1, total);
        }
    }
    return results;
};
/**
 * Generate fallback stock data when API is unavailable
 */
export const createFallbackStockData = (): YahooStockItem[] => {
    const stockTemplates = [
        { symbol: "AAPL", name: "Apple Inc.", basePrice: 185, sector: "Technology" },
        { symbol: "MSFT", name: "Microsoft Corp.", basePrice: 415, sector: "Technology" },
        { symbol: "GOOGL", name: "Alphabet Inc.", basePrice: 153, sector: "Technology" },
        { symbol: "AMZN", name: "Amazon.com Inc.", basePrice: 178, sector: "Consumer" },
        { symbol: "TSLA", name: "Tesla Inc.", basePrice: 245, sector: "Automotive" },
        { symbol: "NVDA", name: "NVIDIA Corp.", basePrice: 950, sector: "Technology" },
        { symbol: "META", name: "Meta Platforms", basePrice: 485, sector: "Technology" },
        { symbol: "JPM", name: "JPMorgan Chase", basePrice: 189, sector: "Financial" },
        { symbol: "V", name: "Visa Inc.", basePrice: 279, sector: "Financial" },
        { symbol: "JNJ", name: "Johnson & Johnson", basePrice: 161, sector: "Healthcare" },
    ];
    return stockTemplates.map((stock) => {
        const changePercent = (Math.random() - 0.5) * 5;
        const currentPrice = stock.basePrice * (1 + changePercent / 100);
        const changeAmount = currentPrice - stock.basePrice;
        const volume = Math.random() * 1e7 + 1e6;
        return {
            symbol: stock.symbol,
            name: stock.name,
            currentPrice,
            changePercent,
            changeAmount,
            volume,
            marketCap: stock.basePrice * (Math.random() * 5e6 + 1e6),
            sector: stock.sector,
            exchange: "NASDAQ",
            lastUpdated: Date.now(),
        };
    });
};