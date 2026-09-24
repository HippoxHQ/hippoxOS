/**
 * Build a "global email avatar" URL from a given email address.
 */
export const buildGlobalEmailAvatarUrl = (email: string): string => {
    const trimmed = (email || "").trim();
    if (!trimmed) return "";
    return `https://unavatar.io/${encodeURIComponent(trimmed)}?fallback=false`;
};
/**
 * Deterministic avatar URL based on a commit hash.
 */
export const buildHashAvatarUrl = (hash: string): string => {
    const seed = (hash || "").trim();
    if (!seed) return "";
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
};