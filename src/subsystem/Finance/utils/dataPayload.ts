/**
 * Data Payload Builder
 * Fetches real market data and serializes it into a compact prompt payload.
 *
 * IMPORTANT:
 * - The number of candles sent to the LLM is HARD LIMITED.
 * - Data is ALWAYS truncated from the NEWEST bar BACKWARDS.
 *   In other words, the OLDEST bars are dropped first.
 */
export interface RawCandle {
    date: string | number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
/**
 * Hard limit on how many candles are sent to the LLM.
 * Change this single constant to adjust the global cap.
 */
export const MAX_CANDLES_TO_LLM = 30;
/**
 * Absolute upper bound. Even if a caller passes a larger number,
 * we will never send more than this many candles to the LLM.
 */
export const ABSOLUTE_MAX_CANDLES = 60;
/**
 * Slice candles keeping ONLY the most recent N bars.
 *
 * Input order is assumed to be oldest -> newest.
 * Truncation always removes the OLDEST bars first.
 * Output order is preserved (oldest -> newest) so the LLM reads chronologically.
 *
 * @param candles  Full candle array (oldest -> newest)
 * @param maxCount Maximum number of candles to keep (from the newest end)
 */
export function truncateFromNewest(
    candles: RawCandle[],
    maxCount: number = MAX_CANDLES_TO_LLM
): RawCandle[] {
    if (!Array.isArray(candles) || candles.length === 0) return [];
    // Clamp the requested count to the absolute upper bound
    const safeMax = Math.max(1, Math.min(maxCount, ABSOLUTE_MAX_CANDLES));
    if (candles.length <= safeMax) return candles.slice();
    // Keep the LAST safeMax items (newest), drop the oldest ones
    return candles.slice(candles.length - safeMax);
}
/**
 * Format a candle array into a compact text table for the LLM.
 * Uses a pipe-separated format to minimize token usage.
 *
 * The payload is always truncated from the newest end before formatting.
 */
export function formatCandlesForPrompt(
    candles: RawCandle[],
    symbol: string,
    timeframe: string
): string {
    const limited = truncateFromNewest(candles, MAX_CANDLES_TO_LLM);
    if (limited.length === 0) return "";
    const lines: string[] = [];
    lines.push(`[MARKET_DATA]`);
    lines.push(`symbol=${symbol}`);
    lines.push(`timeframe=${timeframe}`);
    lines.push(`count=${limited.length}`);
    lines.push(
        `note=Only the newest ${limited.length} bars are included. Older bars were dropped to respect token limits.`
    );
    lines.push(`columns=time,open,high,low,close,volume`);
    for (const c of limited) {
        const t =
            typeof c.date === "number"
                ? new Date(c.date).toISOString()
                : String(c.date);
        lines.push(`${t}|${c.open}|${c.high}|${c.low}|${c.close}|${c.volume}`);
    }
    lines.push(`[/MARKET_DATA]`);
    return lines.join("\n");
}
/**
 * Build the final message string that will be sent to the LLM.
 * The user's original text comes first, then the market data block.
 *
 * If no candles are available, the original text is returned unchanged
 * so the existing chat behavior is preserved.
 */
export function buildMessageWithData(
    userText: string,
    candles: RawCandle[],
    symbol: string,
    timeframe: string
): string {
    const dataBlock = formatCandlesForPrompt(candles, symbol, timeframe);
    if (!dataBlock) return userText;
    return `${userText}\n\n${dataBlock}`;
}