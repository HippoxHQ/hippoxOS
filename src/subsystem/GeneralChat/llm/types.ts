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
 * Mind map node structure for tree/flowchart visualization
 */
export interface MindMapNode {
  /** Unique node identifier */
  id: string;
  /** Display label text */
  label: string;
  /** Child nodes */
  children?: MindMapNode[];
  /** Node color (hex, rgba, or hsl) */
  color?: string;
  /** Node style variant: circle, square, rounded */
  style?: 'circle' | 'square' | 'rounded';
  /** Icon emoji or text to display before label */
  icon?: string;
  /** Additional description or tooltip */
  description?: string;
}
/**
 * Mind map data structure for rendering tree diagrams
 * Supports both tree format (root) and Mermaid format (definition)
 */
export interface MindMapData {
  /** Root node of the tree (for tree format) */
  root?: MindMapNode;
  /** Mermaid diagram definition string (for Mermaid format) */
  definition?: string;
  /** Diagram type for Mermaid format: flowchart, mindmap, sequence, etc. */
  type?: 'mindmap' | 'flowchart' | 'sequence' | 'class' | 'state' | 'er' | 'gantt' | 'pie' | 'git' | 'timeline' | 'journey' | 'quadrantchart' | 'sankey' | 'xychart-beta';
  /** Title of the mind map */
  title?: string;
  /** Layout direction: vertical, horizontal, radial (for tree format) */
  direction?: 'vertical' | 'horizontal' | 'radial';
}
/**
 * Chart data for line/bar/area/scatter/pie charts
 */
export interface ChartData {
  /** Chart type */
  type: 'line' | 'bar' | 'area' | 'scatter' | 'pie';
  /** Chart title */
  title?: string;
  /** X-axis label */
  xAxisLabel?: string;
  /** Y-axis label */
  yAxisLabel?: string;
  /** X-axis data (categories or labels) */
  xAxisData: string[];
  /** Series data */
  series: ChartSeries[];
  /** Colors for pie chart or series */
  colors?: string[];
}
export interface ChartSeries {
  /** Series name */
  name: string;
  /** Data values */
  data: number[];
  /** Color for this series (optional) */
  color?: string;
  /** Stack id for stacked bar charts (optional) */
  stack?: string;
}
/**
 * Timeline data for displaying event sequences
 */
export interface TimelineData {
  /** Timeline title */
  title?: string;
  /** Events in chronological order */
  events: TimelineEvent[];
}
export interface TimelineEvent {
  /** Event date (ISO string or display string) */
  date: string;
  /** Event title */
  title: string;
  /** Event description (optional) */
  description?: string;
  /** Event icon emoji (optional) */
  icon?: string;
  /** Event color (optional) */
  color?: string;
  /** Event status (optional) */
  status?: 'completed' | 'in-progress' | 'planned' | 'cancelled';
}
/**
 * Comparison data for feature/option comparison tables
 */
export interface ComparisonData {
  /** Comparison title */
  title?: string;
  /** Column headers (first column is the feature name) */
  headers: string[];
  /** Rows of comparison data */
  rows: ComparisonRow[];
  /** Highlight best values (default: true) */
  highlightBest?: boolean;
  /** Best value direction: 'higher' or 'lower' (default: 'higher') */
  bestDirection?: 'higher' | 'lower';
}
export interface ComparisonRow {
  /** Feature name */
  feature: string;
  /** Values for each option (match headers length - 1) */
  values: (string | number)[];
  /** Unit for this row (optional) */
  unit?: string;
  /** Whether this is a highlight row (optional) */
  highlight?: boolean;
}
/**
 * Audio resource for playback
 */
export interface AudioResource {
  /** Audio title */
  title: string;
  /** Audio URL (local file path or remote URL) */
  url: string;
  /** Audio format: mp3, wav, ogg, flac, etc. */
  format?: string;
  /** Duration in seconds */
  duration?: number;
  /** Cover image URL */
  cover?: string;
  /** Artist name */
  artist?: string;
  /** Album name */
  album?: string;
}
/**
 * Video resource for playback
 */
export interface VideoResource {
  /** Video title */
  title: string;
  /** Video URL */
  url: string;
  /** Thumbnail image URL */
  thumbnail?: string;
  /** Video format: mp4, webm, etc. */
  format?: string;
  /** Duration in seconds */
  duration?: number;
  /** Width */
  width?: number;
  /** Height */
  height?: number;
}
/**
 * WebView/IFrame resource for embedded browsing
 */
export interface WebViewResource {
  /** URL to display */
  url: string;
  /** Title */
  title?: string;
  /** Width (default: 100%) */
  width?: number | string;
  /** Height (default: 400px) */
  height?: number | string;
  /** Allow fullscreen */
  allowFullscreen?: boolean;
  /** Sandbox attributes */
  sandbox?: string;
}
/**
* Terminal display result - structured, professional output
*/
export interface TerminalResponse {
  /** Plain text message */
  m: string,
  /** Remote resource links array */
  links?: ResourceLink[];
  /** Local resource links array */
  local?: ResourceLink[];
  /** Commands to execute (if user needs to run specific commands) */
  commands?: string[];
  /** Code blocks (for displaying code) */
  codeBlocks?: {
    language: string;      // Language type: json, bash, javascript, python, yaml, xml, etc.
    code: string;          // Code content (as string)
    description?: string;  // Description
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
  /** EarthView map operations */
  earthview?: EarthViewOperation;
  /** CandleView chart operations */
  candleview?: CandleViewOperation;
  /** Mind map data for tree/flowchart visualization */
  mindmap?: MindMapData;
  /** Chart data for line/bar/area/scatter/pie charts */
  chart?: ChartData;
  /** Timeline data for event sequences */
  timeline?: TimelineData;
  /** Comparison table data */
  comparison?: ComparisonData;
  /** Audio resources for playback */
  audio?: AudioResource[];
  /** Video resources for playback */
  video?: VideoResource[];
  /** WebView/IFrame resources for embedded browsing */
  webview?: WebViewResource[];
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
export interface EarthViewOperation {
  view?: {
    center?: [number, number];
  };
  markers?: Array<{
    id?: string;
    longitude: number;
    latitude: number;
    title?: string;
    name?: string;
    color?: string;
    size?: number;
    pointType?: 'circle' | 'square' | 'triangle' | 'pin' | 'star' | 'heart' | 'flag';
    pointText?: string;
    bubbleBoxTitle?: string;
    bubbleBoxDescription?: string;
    bubbleBoxCoverImage?: string;
  }>;
  circles?: Array<{
    id?: string;
    center: [number, number];
    radius: number;
    title?: string;
    fillColor?: string;
    outlineColor?: string;
    outlineWidth?: number;
  }>;
  polygons?: Array<{
    id?: string;
    points: [number, number][];
    title?: string;
    fillColor?: string;
    outlineColor?: string;
    outlineWidth?: number;
  }>;
  polylines?: Array<{
    id?: string;
    points: [number, number][];
    title?: string;
    color?: string;
    width?: number;
  }>;
  heatmap?: Array<{
    id?: string;
    longitude: number;
    latitude: number;
    value?: number;
    title?: string;
  }>;
  clusters?: Array<{
    id?: string;
    longitude: number;
    latitude: number;
    title?: string;
    popupContent?: string;
  }>;
  barcharts?: Array<{
    id?: string;
    longitude: number;
    latitude: number;
    value: number;
    title?: string;
    color?: string;
  }>;
}
export interface CandleViewOperation {
  timeframe?: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w' | '1M';
  timezone?: 'NewYork' | 'London' | 'Tokyo' | 'Shanghai' | 'UTC';
  chartType?: 'candle' | 'bar' | 'line' | 'area' | 'heikinashi' | 'hollow';
  title?: string;
  mainIndicators?: Array<{
    type: 'MA' | 'EMA' | 'BOLLINGER' | 'ICHIMOKU' | 'DONCHIAN' | 'ENVELOPE' | 'VWAP' | 'HEATMAP' | 'MARKETPROFILE';
    enabled: boolean;
    parameters?: Record<string, any>;
  }>;
  subIndicators?: Array<{
    type: 'RSI' | 'MACD' | 'VOLUME' | 'SAR' | 'KDJ' | 'ATR' | 'STOCHASTIC' | 'CCI' | 'BBWIDTH' | 'ADX' | 'OBV';
    enabled: boolean;
  }>;
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
  priceEvents?: Array<{
    price: number;
    title?: string;
    color?: string;
    showPrice?: boolean;
  }>;
  screenshot?: {
    watermark?: string;
    opacity?: number;
  };
  drawingTools?: {
    tool?: 'cursor' | 'crosshair' | 'brush';
    action?: 'enable' | 'disable' | 'clear';
  };
}
/**
* Validate if response is a valid HippoxOSResult
*/
export function isValidHippoxOSResult(obj: any): obj is HippoxOSResult {
  if (!obj || typeof obj !== 'object') return false;
  // Check if chatResponse exists and has correct format
  if (!obj.chatResponse || typeof obj.chatResponse !== 'object') return false;
  if (typeof obj.chatResponse.m !== 'string') return false;
  // s field is optional, must be string if present
  if (obj.chatResponse.s !== undefined && typeof obj.chatResponse.s !== 'string') return false;
  // terminalResponse can be null or object
  if (obj.terminalResponse !== null && typeof obj.terminalResponse !== 'object') return false;
  // Validate terminalResponse field types (if present)
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
    // earthview and candleview are optional, just check they are objects if present
    if (tr.earthview !== undefined && typeof tr.earthview !== 'object') return false;
    if (tr.candleview !== undefined && typeof tr.candleview !== 'object') return false;
    // mindmap is optional, check it's an object if present
    if (tr.mindmap !== undefined && typeof tr.mindmap !== 'object') return false;
    // chart is optional, check it's an object if present
    if (tr.chart !== undefined && typeof tr.chart !== 'object') return false;
    // timeline is optional, check it's an object if present
    if (tr.timeline !== undefined && typeof tr.timeline !== 'object') return false;
    // comparison is optional, check it's an object if present
    if (tr.comparison !== undefined && typeof tr.comparison !== 'object') return false;
    // audio is optional, check it's an object if present
    if (tr.audio !== undefined && !Array.isArray(tr.audio)) return false;
    // video is optional, check it's an object if present
    if (tr.video !== undefined && !Array.isArray(tr.video)) return false;
    // webview is optional, check it's an object if present
    if (tr.webview !== undefined && !Array.isArray(tr.webview)) return false;
  }
  return true;
}
/**
* Extract HippoxOSResult JSON from arbitrary text
* Used to handle LLM responses that may contain extra characters
*/
export function extractHippoxOSResult(text: string): HippoxOSResult | null {
  try {
    // Try direct parsing
    const parsed = JSON.parse(text);
    if (isValidHippoxOSResult(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    // Try to extract JSON block
    const jsonRegex = /\{[\s\S]*"chatResponse"[\s\S]*"terminalResponse"[\s\S]*\}/;
    const match = text.match(jsonRegex);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (isValidHippoxOSResult(parsed)) {
          return parsed;
        }
      } catch {
        // Ignore parsing error
      }
    }
    return null;
  }
}