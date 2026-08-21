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
 * All interactions MUST be expressed through this structure
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
  /**
   * DSL script to execute on the chart
   * This script will be loaded into the DSL editor and executed
   * Supports all CandleView DSL API:
   * - Data: getClose(), getOpen(), getHigh(), getLow(), getVolume(), getTime(), getCloseAt(offset), etc.
   * - Indicators: SMA(), EMA(), WMA(), RSI(), MACD(), BOLL(), KDJ(), ATR(), CCI(), ADX(), OBV(), SAR(), BBWIDTH()
   * - Chart: plotMain(), plotSub(), openIndicator(), closeIndicator(), closeAllIndicators()
   * - Marks: addTextMark(), addArrowUp(), addArrowDown(), clearAllMarks()
   */
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
  /**
   * Static marks on the chart - converted to CandleView format
   * All visual markers (arrows, text, labels) should use this field
   */
  staticMarks?: Array<{
    time: number; // milliseconds timestamp
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
 * Terminal display result - structured, professional output
 */
export interface TerminalResponse {
  /** Plain text message */
  m: string;
  /** Remote resource links array */
  links?: ResourceLink[];
  /** Local resource links array */
  local?: ResourceLink[];
  /** Commands to execute (if user needs to run specific commands) */
  commands?: string[];
  /** Code blocks (for displaying code) */
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
  /**
   * Chart operations for financial data visualization
   * This is the PRIMARY output for ALL chart-related requests
   * All interactions MUST be expressed through this structure
   */
  chart?: ChartOperation;
}
/**
 * Dialog response data - read-only human-friendly information, concise, token-efficient
 */
export interface ChatResponse {
  /** Human-friendly response message (main reply content) */
  m: string;
  /** Subtitle/additional info (optional, for extra human-friendly information) */
  s?: string;
}
/**
 * HippoxOS LLM response main structure
 * LLM must strictly return according to this structure, no extra characters allowed
 */
export interface HippoxOSResult {
  /** Terminal display result - structured, professional output, can be null */
  terminalResponse: TerminalResponse | null;
  /** Dialog response data - read-only human-friendly info */
  chatResponse: ChatResponse;
}
/**
 * Validate if response is a valid HippoxOSResult
 */
export function isValidHippoxOSResult(obj: any): obj is HippoxOSResult {
  if (!obj || typeof obj !== 'object') return false;
  if (!obj.chatResponse || typeof obj.chatResponse !== 'object') return false;
  if (typeof obj.chatResponse.m !== 'string') return false;
  if (obj.chatResponse.s !== undefined && typeof obj.chatResponse.s !== 'string') return false;
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
  }
  return true;
}
/**
 * Extract HippoxOSResult JSON from arbitrary text
 * Used to handle LLM responses that may contain extra characters
 */
export function extractHippoxOSResult(text: string): HippoxOSResult | null {
  try {
    const parsed = JSON.parse(text);
    if (isValidHippoxOSResult(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    const jsonRegex = /\{[\s\S]*"chatResponse"[\s\S]*"terminalResponse"[\s\S]*\}/;
    const match = text.match(jsonRegex);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
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
 * Extract chart operation data from LLM response
 * Returns null if no chart data is present
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