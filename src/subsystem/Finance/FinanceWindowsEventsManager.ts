/**
 * Finance Windows Events Manager
 * Handles cross-component communication for finance/chart data
 */
export const SET_CHART_DATA = 'finance:set-chart-data';
export const CHART_DATA_UPDATED = 'chart-data-updated';
/**
 * Dispatch event to set chart data
 * This is triggered when user clicks on a ticker or when LLM returns a symbol
 * @param detail - Event detail containing symbol and optional data type
 */
export function dispatchSetChartData(detail?: {
  symbol: string;
  dataType?: 'crypto' | 'stock' | 'astock' | 'perpetual';
  timeframe?: string;
}): void {
  window.dispatchEvent(new CustomEvent(SET_CHART_DATA, { detail }));
}
/**
 * Dispatch event when chart data is updated from LLM response
 * This connects the LLM response pipeline to the chart rendering engine
 * @param detail - Event detail containing the LLM response content
 */
export function dispatchChartDataUpdated(detail: {
  content: string;
  messageId?: string;
  sessionId?: string;
}): void {
  window.dispatchEvent(new CustomEvent(CHART_DATA_UPDATED, { detail }));
}
/**
 * Listen for chart data events (from ticker clicks or external triggers)
 * @param callback - Callback function to handle the event
 * @returns Unsubscribe function
 */
export function listenSetChartData(
  callback: (event: CustomEvent) => void
): () => void {
  const handler = (e: Event) => callback(e as CustomEvent);
  window.addEventListener(SET_CHART_DATA, handler);
  return () => window.removeEventListener(SET_CHART_DATA, handler);
}
/**
 * Listen for chart data updated events from LLM responses
 * This is the primary integration point between LLM and chart rendering
 * @param callback - Callback function to handle the event
 * @returns Unsubscribe function
 */
export function listenChartDataUpdated(
  callback: (event: CustomEvent) => void
): () => void {
  const handler = (e: Event) => callback(e as CustomEvent);
  window.addEventListener(CHART_DATA_UPDATED, handler);
  return () => window.removeEventListener(CHART_DATA_UPDATED, handler);
}