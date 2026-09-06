/**
 * Data Sources Module - Unified Exports
 * Exports all data source modules for easy import
 */
// Type definitions for common data sources
export interface DataSourceConfig {
    name: string;
    type: 'crypto' | 'stocks' | 'perpetuals';
    enabled: boolean;
    wsUrl?: string;
    restUrl?: string;
}
export const AVAILABLE_DATA_SOURCES: DataSourceConfig[] = [
    {
        name: 'Binance',
        type: 'crypto',
        enabled: true,
        wsUrl: 'wss://stream.binance.com:9443/ws',
        restUrl: 'https://api.binance.com/api/v3',
    },
    {
        name: 'Yahoo Finance',
        type: 'stocks',
        enabled: true,
        restUrl: 'https://query1.finance.yahoo.com',
    },
    {
        name: 'Hyperliquid',
        type: 'perpetuals',
        enabled: true,
        wsUrl: 'wss://api.hyperliquid.xyz/ws',
        restUrl: 'https://api.hyperliquid.xyz/info',
    },
];