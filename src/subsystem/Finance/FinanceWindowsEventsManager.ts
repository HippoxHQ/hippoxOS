/**
 * Finance Windows Events Manager
 * Handles cross-component communication for finance/chart data
 */
export const SET_CHART_DATA = 'finance:set-chart-data';
export const CHART_DATA_UPDATED = 'chart-data-updated';
export const CHART_ANALYSIS_UPDATED = 'chart-analysis-updated';
/**
 * Dispatch event to set chart data
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
 * Dispatch event carrying a structured analysis produced by the LLM.
 * The disclaimer is resolved by the caller (with fallback) before dispatch.
 */
export function dispatchChartAnalysisUpdated(detail: {
  message: string;
  disclaimer: string;
  analysis?: {
    trend?: string;
    support?: string;
    resistance?: string;
    risk?: string;
    summary?: string;
  };
  messageId?: string;
  sessionId?: string;
}): void {
  window.dispatchEvent(new CustomEvent(CHART_ANALYSIS_UPDATED, { detail }));
}
/**
 * Listen for chart data events (from ticker clicks or external triggers)
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
 */
export function listenChartDataUpdated(
  callback: (event: CustomEvent) => void
): () => void {
  const handler = (e: Event) => callback(e as CustomEvent);
  window.addEventListener(CHART_DATA_UPDATED, handler);
  return () => window.removeEventListener(CHART_DATA_UPDATED, handler);
}
/**
 * Listen for structured analysis events from LLM responses
 */
export function listenChartAnalysisUpdated(
  callback: (event: CustomEvent) => void
): () => void {
  const handler = (e: Event) => callback(e as CustomEvent);
  window.addEventListener(CHART_ANALYSIS_UPDATED, handler);
  return () => window.removeEventListener(CHART_ANALYSIS_UPDATED, handler);
}