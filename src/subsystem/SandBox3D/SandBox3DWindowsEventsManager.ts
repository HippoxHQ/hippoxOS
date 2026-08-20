/** 3D Sandbox history refresh event */
export const REFRESH_3D_HISTORY = 'sandbox3d:refresh-3d-history';
/**
 * Dispatch 3D history refresh event
 */
export function dispatchRefresh3DHistory(detail?: { sessionId?: string }): void {
    window.dispatchEvent(new CustomEvent(REFRESH_3D_HISTORY, { detail }));
}
/**
 * Listen to 3D history refresh event, returns cleanup function
 */
export function listenRefresh3DHistory(callback: (event: CustomEvent) => void): () => void {
    const handler = (e: Event) => callback(e as CustomEvent);
    window.addEventListener(REFRESH_3D_HISTORY, handler);
    return () => window.removeEventListener(REFRESH_3D_HISTORY, handler);
}