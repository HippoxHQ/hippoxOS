import { HippoxOSResult, isValidHippoxOSResult, EditorOperation } from "../llm/types";
/**
 * Parse LLM response and extract HippoxOSResult
 * Handles both raw JSON and JSON wrapped in text/markdown
 */
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
/**
 * Check if the response is a structured LLM response
 * Returns true if it contains chatResponse or terminalResponse
 */
export function isStructuredLLMResponse(content: string): boolean {
    if (!content) return false;
    try {
        const parsed = JSON.parse(content);
        return !!(parsed.chatResponse || parsed.terminalResponse);
    } catch {
        return false;
    }
}
/**
 * Check if the response contains editor data (code modification)
 */
export function hasEditorData(content: string): boolean {
    if (!content) return false;
    try {
        const parsed = JSON.parse(content);
        return !!(parsed.terminalResponse?.editor);
    } catch {
        return false;
    }
}
/**
 * Extract editor data from LLM response
 * Returns null if no editor data is present
 */
export function extractEditorData(content: string): EditorOperation | null {
    if (!content) return null;
    try {
        const parsed = JSON.parse(content);
        return parsed.terminalResponse?.editor || null;
    } catch {
        return null;
    }
}