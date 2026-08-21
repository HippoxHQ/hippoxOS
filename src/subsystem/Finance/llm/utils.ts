import { HippoxOSResult, isValidHippoxOSResult, ChartOperation } from "../llm/types";
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
 * Check if the response contains chart data
 */
export function hasChartData(content: string): boolean {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return !!(parsed.terminalResponse?.chart);
  } catch {
    return false;
  }
}
/**
 * Extract chart operation data from LLM response
 * Returns null if no chart data is present
 */
export function extractChartData(content: string): ChartOperation | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed.terminalResponse?.chart || null;
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*"terminalResponse"[\s\S]*"chart"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.terminalResponse?.chart || null;
      } catch {
        return null;
      }
    }
    return null;
  }
}
/**
 * Check if the response contains a DSL script
 */
export function hasDSLScript(content: string): boolean {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    const chart = parsed.terminalResponse?.chart;
    return !!(chart?.dslScript && chart.dslScript.length > 0);
  } catch {
    return false;
  }
}
/**
 * Extract DSL script from LLM response
 * Returns null if no DSL script is present
 */
export function extractDSLScript(content: string): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    const chart = parsed.terminalResponse?.chart;
    return chart?.dslScript || null;
  } catch {
    return null;
  }
}
/**
 * Extract symbol from chart operation
 * Returns null if no symbol is present
 */
export function extractSymbol(content: string): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    const chart = parsed.terminalResponse?.chart;
    return chart?.symbol || null;
  } catch {
    return null;
  }
}
/**
 * Check if the response contains a symbol that should trigger data loading
 */
export function hasSymbolToLoad(content: string): boolean {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    const chart = parsed.terminalResponse?.chart;
    return !!(chart?.symbol && chart.symbol.length > 0);
  } catch {
    return false;
  }
}
/**
 * Check if the response should auto-execute DSL script
 * Defaults to true if not specified
 */
export function shouldAutoExecuteDSL(content: string): boolean {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    const chart = parsed.terminalResponse?.chart;
    if (chart?.dslScript) {
      return chart.autoExecuteDSL !== false;
    }
    return false;
  } catch {
    return false;
  }
}