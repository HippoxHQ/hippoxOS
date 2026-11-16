import { HippoxOSResult } from "./types";

export function parseLLMResponse(content: string): HippoxOSResult | null {
    return null;
}
export function isStructuredLLMResponse(content: string): boolean {
    return true;
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