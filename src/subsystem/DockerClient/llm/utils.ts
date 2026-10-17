import { HippoxOSResult, isValidHippoxOSResult, extractHippoxOSResult } from "./types";
/**
 * Parse an LLM response into a structured HippoxOSResult.
 */
export function parseLLMResponse(content: string): HippoxOSResult | null {
    if (!content || typeof content !== "string") return null;
    const trimmed = content.trim();
    if (!trimmed) return null;
    // Fast path: the whole payload is valid JSON.
    try {
        const direct = JSON.parse(trimmed);
        if (isValidHippoxOSResult(direct)) return direct;
    } catch {
    }
    const withoutFences = trimmed
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
    try {
        const fenced = JSON.parse(withoutFences);
        if (isValidHippoxOSResult(fenced)) return fenced;
    } catch {
        // Ignore and continue.
    }
    return extractHippoxOSResult(trimmed);
}
/**
 * Whether the content looks like a structured LLM response.
 */
export function isStructuredLLMResponse(content: string): boolean {
    if (!content || typeof content !== "string") return false;
    const trimmed = content.trim();
    if (!trimmed) return false;
    // Any payload that mentions the contract fields is worth parsing.
    return trimmed.includes("chatResponse") || trimmed.includes("terminalResponse");
}
export function hasMapData(content: string): boolean {
    return true;
}
export function extractEarthView(content: string): any | null {
    if (!content) return null;
    try {
        const parsed = JSON.parse(content);
        return parsed.terminalResponse?.earthview || null;
    } catch {
        return null;
    }
}