/**
 * LLM response structure definition
 * Used to constrain the response format returned by LLM to the frontend
 */
/**
 * Resource link (remote or local)
 */
export interface ResourceLink {
  /** Link name */
  n: string;
  /** Link description */
  d: string;
  /** Link URL */
  u: string;
  /** Resource type, e.g.: image, video, executable, torrent, document, audio, archive, code */
  t: string;
}
/**
 * Chart operation types for financial data visualization
 * This is the PRIMARY output for chart-related requests
 */
export interface ChartOperation {
  /** Symbol to display (e.g., "BTC/USDT", "AAPL") */
  symbol?: string;
  /** Timeframe for the chart: 1m|5m|15m|30m|1h|4h|1d|1w|1M */
  timeframe?: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
  /** Chart type: candle|bar|line|area|heikinashi|hollow */
  chartType?: 'candle' | 'bar' | 'line' | 'area' | 'heikinashi' | 'hollow';
  /** Chart title */
  title?: string;
  /** DSL script to execute on the chart */
  dslScript?: string;
  /** Automatically execute DSL script without user confirmation (default: true) */
  autoExecuteDSL?: boolean;
  /** Main chart indicators (built-in) */
  mainIndicators?: Array<{
    type: 'MA' | 'EMA' | 'BOLLINGER' | 'ICHIMOKU' | 'DONCHIAN' | 'ENVELOPE' | 'VWAP' | 'HEATMAP' | 'MARKETPROFILE';
    enabled: boolean;
    parameters?: Record<string, any>;
  }>;
  /** Sub-chart indicators (built-in) */
  subIndicators?: Array<{
    type: 'RSI' | 'MACD' | 'VOLUME' | 'SAR' | 'KDJ' | 'ATR' | 'STOCHASTIC' | 'CCI' | 'BBWIDTH' | 'ADX' | 'OBV';
    enabled: boolean;
  }>;
  /** Static marks on the chart */
  staticMarks?: Array<{
    time: number;
    type: 'text' | 'arrow';
    text?: string;
    direction: 'up' | 'down';
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    label?: string;
  }>;
  /** Screenshot configuration */
  screenshot?: {
    watermark?: string;
    opacity?: number;
  };
  /** Drawing tools control */
  drawingTools?: {
    tool?: 'cursor' | 'crosshair' | 'brush';
    action?: 'enable' | 'disable' | 'clear';
  };
}
/**
 * Structured analysis conclusion generated from real market data.
 * Only present when the LLM was given a [MARKET_DATA] block.
 *
 * ALL extended fields are OPTIONAL. The frontend renders only the sections
 * that are actually present. The LLM MUST omit fields it cannot ground in
 * real data instead of inventing values.
 */
export interface AnalysisResult {
  /** Overall trend judgement, e.g. "short-term bullish" */
  trend?: string;
  /** Key support level description */
  support?: string;
  /** Key resistance level description */
  resistance?: string;
  /** Risk notes */
  risk?: string;
  /** Free-form summary */
  summary?: string;
  /** Sentiment score, -100 (extremely bearish) .. 100 (extremely bullish) */
  sentimentScore?: number;
  /** Short verdict label, e.g. "Bullish" / "看多" */
  verdict?: string;
  /** Key numeric metrics rendered as cards */
  metrics?: Array<{
    key: string;
    value: string | number;
    unit?: string;
    /** "up" | "down" | "neutral" drives arrow + color */
    change?: 'up' | 'down' | 'neutral';
  }>;
  /** Price levels rendered as a vertical ladder */
  priceLevels?: Array<{
    price: number | string;
    label: string;
    type: 'support' | 'resistance' | 'current' | 'target' | 'stop';
  }>;
  /** Technical indicators snapshot */
  indicators?: Array<{
    name: string;
    value: string | number;
    signal?: 'buy' | 'sell' | 'neutral';
  }>;
  /** Time-series-ish data for a small sparkline / mini chart */
  sparkline?: {
    label: string;
    points: number[];
    /** Optional color hint */
    color?: string;
  };
  /** Related news items */
  news?: Array<{
    title: string;
    source?: string;
    time?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    url?: string;
  }>;
  /** Shareholder / holder table */
  shareholders?: {
    title?: string;
    headers: string[];
    rows: Array<Array<string | number>>;
  };
  /** Holding ratio breakdown, rendered as a donut chart */
  holdings?: {
    title?: string;
    items: Array<{
      name: string;
      ratio: number;
      color?: string;
    }>;
  };
  /** SWOT-style bullet lists */
  swot?: {
    strengths?: string[];
    weaknesses?: string[];
    opportunities?: string[];
    threats?: string[];
  };
  /** Free-form bullet list of action items / suggestions */
  suggestions?: string[];
}
/**
 * Terminal display result - structured, professional output
 */
export interface TerminalResponse {
  /** Plain text message */
  m: string;
  /** Remote resource links array */
  links?: ResourceLink[];
  /** Local resource links array */
  local?: ResourceLink[];
  /** Commands to execute */
  commands?: string[];
  /** Code blocks */
  codeBlocks?: {
    language: string;
    code: string;
    description?: string;
  }[];
  /** Table data */
  tables?: {
    headers: string[];
    rows: (string | number)[][];
    title?: string;
  }[];
  /** Key metrics/data points */
  metrics?: {
    key: string;
    value: string | number;
    unit?: string;
  }[];
  /** Warning or error messages */
  warnings?: string[];
  /** Success/failure status */
  status?: 'success' | 'error' | 'warning' | 'info';
  /** Chart operations for financial data visualization */
  chart?: ChartOperation;
  /** Structured analysis derived from real market data */
  analysis?: AnalysisResult;
}
/**
 * Dialog response data - read-only human-friendly information
 */
export interface ChatResponse {
  /** Human-friendly response message (main reply content) */
  m: string;
  /** Subtitle/additional info (optional) */
  s?: string;
  /**
   * Mandatory disclaimer when the response contains AI-generated analysis.
   * Frontend MUST render this when present, and MUST fall back to a default
   * disclaimer if the LLM omitted it.
   */
  disclaimer?: string;
}
/**
 * HippoxOS LLM response main structure
 */
export interface HippoxOSResult {
  /** Terminal display result */
  terminalResponse: TerminalResponse | null;
  /** Dialog response data */
  chatResponse: ChatResponse;
}
/**
 * Default disclaimer texts. Used as a fallback when the LLM omits one.
 */
export const DEFAULT_DISCLAIMER_ZH =
  '内容由AI生成，不构成投资建议，投资需谨慎。';
export const DEFAULT_DISCLAIMER_EN =
  'AI-generated content, not investment advice. Invest with caution.';
/**
 * Resolve the disclaimer to display.
 * Prefers the LLM-provided one; falls back to a localized default.
 */
export function resolveDisclaimer(
  provided: string | undefined,
  language: 'zh' | 'en'
): string {
  if (provided && provided.trim().length > 0) return provided.trim();
  return language === 'zh' ? DEFAULT_DISCLAIMER_ZH : DEFAULT_DISCLAIMER_EN;
}
/**
 * Whether an analysis object has any renderable content.
 * Used to skip rendering the empty AIAnalysis panel and to decide
 * whether the mandatory disclaimer should be shown.
 */
export function hasRenderableAnalysis(a?: AnalysisResult | null): boolean {
  if (!a) return false;
  if (a.trend || a.support || a.resistance || a.risk || a.summary) return true;
  if (a.verdict || typeof a.sentimentScore === 'number') return true;
  if (a.metrics && a.metrics.length > 0) return true;
  if (a.priceLevels && a.priceLevels.length > 0) return true;
  if (a.indicators && a.indicators.length > 0) return true;
  if (a.sparkline && a.sparkline.points && a.sparkline.points.length > 1) return true;
  if (a.news && a.news.length > 0) return true;
  if (a.shareholders && a.shareholders.rows && a.shareholders.rows.length > 0) return true;
  if (a.holdings && a.holdings.items && a.holdings.items.length > 0) return true;
  if (
    a.swot &&
    (a.swot.strengths || a.swot.weaknesses || a.swot.opportunities || a.swot.threats)
  )
    return true;
  if (a.suggestions && a.suggestions.length > 0) return true;
  return false;
}
/**
 * Validate if response is a valid HippoxOSResult
 */
export function isValidHippoxOSResult(obj: any): obj is HippoxOSResult {
  if (!obj || typeof obj !== 'object') return false;
  if (!obj.chatResponse || typeof obj.chatResponse !== 'object') return false;
  if (typeof obj.chatResponse.m !== 'string') return false;
  if (obj.chatResponse.s !== undefined && typeof obj.chatResponse.s !== 'string') return false;
  if (obj.chatResponse.disclaimer !== undefined && typeof obj.chatResponse.disclaimer !== 'string') return false;
  if (obj.terminalResponse !== null && typeof obj.terminalResponse !== 'object') return false;
  if (obj.terminalResponse) {
    const tr = obj.terminalResponse;
    if (tr.links !== undefined && !Array.isArray(tr.links)) return false;
    if (tr.local !== undefined && !Array.isArray(tr.local)) return false;
    if (tr.commands !== undefined && !Array.isArray(tr.commands)) return false;
    if (tr.codeBlocks !== undefined && !Array.isArray(tr.codeBlocks)) return false;
    if (tr.tables !== undefined && !Array.isArray(tr.tables)) return false;
    if (tr.metrics !== undefined && !Array.isArray(tr.metrics)) return false;
    if (tr.warnings !== undefined && !Array.isArray(tr.warnings)) return false;
    if (tr.status !== undefined && !['success', 'error', 'warning', 'info'].includes(tr.status)) return false;
    if (tr.chart !== undefined && typeof tr.chart !== 'object') return false;
    if (tr.analysis !== undefined && typeof tr.analysis !== 'object') return false;
  }
  return true;
}
/**
 * Extract HippoxOSResult JSON from arbitrary text
 */
export function extractHippoxOSResult(text: string): HippoxOSResult | null {
  try {
    const parsed = JSON.parse(text);
    if (isValidHippoxOSResult(parsed)) return parsed;
    return null;
  } catch {
    const jsonRegex = /\{[\s\S]*"chatResponse"[\s\S]*"terminalResponse"[\s\S]*\}/;
    const match = text.match(jsonRegex);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (isValidHippoxOSResult(parsed)) return parsed;
      } catch {
        return null;
      }
    }
    return null;
  }
}
/**
 * Extract chart operation data from LLM response
 */
export function extractChartOperation(content: string): ChartOperation | null {
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
 * Check if the response contains an analysis block
 */
export function hasAnalysis(content: string): boolean {
  if (!content) return false;
  try {
    const parsed = JSON.parse(content);
    return !!(parsed.terminalResponse?.analysis);
  } catch {
    return false;
  }
}
/**
 * Extract the analysis block from the response
 */
export function extractAnalysis(content: string): AnalysisResult | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed.terminalResponse?.analysis || null;
  } catch {
    return null;
  }
}
/**
 * Extract the chat response (human-readable message + disclaimer)
 */
export function extractChatResponse(content: string): ChatResponse | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (parsed.chatResponse && typeof parsed.chatResponse.m === 'string') {
      return parsed.chatResponse;
    }
    return null;
  } catch {
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
 */
export function extractDSLScript(content: string): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed.terminalResponse?.chart?.dslScript || null;
  } catch {
    return null;
  }
}
/**
 * Extract symbol from chart operation
 */
export function extractSymbol(content: string): string | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    return parsed.terminalResponse?.chart?.symbol || null;
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