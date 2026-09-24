/**
 * Carries no payload.
 */
export const FILE_TREE_REFRESH_EVENT = "codeeditor-file-tree-refresh";
/**
 * Dispatch the file tree refresh event.
 * Safe to call from anywhere.
 */
export function dispatchFileTreeRefresh(): void {
    window.dispatchEvent(new CustomEvent(FILE_TREE_REFRESH_EVENT));
}
/**
 * Subscribe to the file tree refresh event.
 * Returns an unsubscribe function.
 */
export function onFileTreeRefresh(handler: () => void): () => void {
    const listener = () => handler();
    window.addEventListener(FILE_TREE_REFRESH_EVENT, listener);
    return () => {
        window.removeEventListener(FILE_TREE_REFRESH_EVENT, listener);
    };
}