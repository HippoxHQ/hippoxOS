import { HippoxOSResult, isValidHippoxOSResult } from "../llm/types";
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
export function isStructuredLLMResponse(content: string): boolean {
    if (!content) return false;
    try {
        const parsed = JSON.parse(content);
        return !!(parsed.chatResponse || parsed.terminalResponse);
    } catch {
        return false;
    }
}