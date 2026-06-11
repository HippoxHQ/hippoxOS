import { HippoxOSResult } from "../llm/types";

export function parseLLMResponse(content: string): HippoxOSResult | null {
    try {
        const parsed = JSON.parse(content);
        if (isValidHippoxOSResult(parsed)) {
            return parsed;
        }
        return null;
    } catch {
        const jsonMatch = content.match(/\{[\s\S]*"chatResponse"[\s\S]*"terminalResponse"[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                if (isValidHippoxOSResult(parsed)) {
                    return parsed;
                }
            } catch {
                return null;
            }
        }
        return null;
    }
}

function isValidHippoxOSResult(obj: any): obj is HippoxOSResult {
    if (!obj || typeof obj !== 'object') return false;
    if (!obj.chatResponse || typeof obj.chatResponse !== 'object') return false;
    if (typeof obj.chatResponse.m !== 'string') return false;
    if (obj.terminalResponse !== null && typeof obj.terminalResponse !== 'object') return false;
    return true;
}

export function isStructuredLLMResponse(content: string): boolean {
    if (!content) return false;
    try {
        const parsed = JSON.parse(content);
        return !!(parsed.chatResponse || parsed.terminalResponse);
    } catch {
        return false;
    }
}