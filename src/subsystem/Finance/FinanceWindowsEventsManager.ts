export const SET_CHART_DATA = 'finance:set-chart-data';
/**
 * Dispatch event to set chart data
 * @param detail - Event detail containing symbol or other data
 */
export function dispatchSetChartData(detail?: {
    symbol: string;
}): void {
    window.dispatchEvent(new CustomEvent(SET_CHART_DATA, { detail }));
}
/**
 * Listen for chart data events
 * @param callback - Callback function to handle the event
 * @returns Unsubscribe function
 */
export function listenSetChartData(callback: (event: CustomEvent) => void): () => void {
    const handler = (e: Event) => callback(e as CustomEvent);
    window.addEventListener(SET_CHART_DATA, handler);
    return () => window.removeEventListener(SET_CHART_DATA, handler);
}