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
  /** EarthView map operations - this is the PRIMARY output for map-related requests */
  earthview?: EarthViewOperation;
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
 * EarthView map operations - supports all map rendering capabilities
 */
export interface EarthViewOperation {
  /** Map view control - center the map at specific coordinates */
  view?: {
    center?: [number, number];  // [longitude, latitude]
    zoom?: number;              // Optional zoom level
  };
  /** Point markers on the map */
  markers?: Array<{
    id?: string;
    longitude: number;
    latitude: number;
    title?: string;
    name?: string;
    color?: string;              // Supports #RRGGBB, rgba(), or [r,g,b,a] array
    size?: number;               // 5-20
    pointType?: 'circle' | 'square' | 'triangle' | 'pin' | 'star' | 'heart' | 'flag';
    pointText?: string;
    bubbleBoxTitle?: string;     // REQUIRED - concise title for popup, max 30 chars
    bubbleBoxDescription?: string; // REQUIRED - brief description for popup, max 100 chars
    bubbleBoxCoverImage?: string;
  }>;
  /** Circles drawn on the map */
  circles?: Array<{
    id?: string;
    center: [number, number];    // [longitude, latitude]
    radius: number;              // Radius in meters
    title?: string;
    fillColor?: string;          // Supports #RRGGBB, rgba(), or [r,g,b,a] array
    outlineColor?: string;
    outlineWidth?: number;
  }>;
  /** Polygons drawn on the map */
  polygons?: Array<{
    id?: string;
    points: [number, number][];  // Array of [longitude, latitude] points
    title?: string;
    fillColor?: string;          // Supports #RRGGBB, rgba(), or [r,g,b,a] array
    outlineColor?: string;
    outlineWidth?: number;
  }>;
  /** Polylines (paths) drawn on the map */
  polylines?: Array<{
    id?: string;
    points: [number, number][];  // Array of [longitude, latitude] points
    title?: string;
    color?: string;              // Supports #RRGGBB, rgba(), or [r,g,b,a] array
    width?: number;
  }>;
  /** Heatmap data for density visualization */
  heatmap?: Array<{
    id?: string;
    longitude: number;
    latitude: number;
    value?: number;
    title?: string;
  }>;
  /** Cluster markers for grouped locations */
  clusters?: Array<{
    id?: string;
    longitude: number;
    latitude: number;
    title?: string;
    popupContent?: string;
  }>;
  /** Bar charts displayed on the map */
  barcharts?: Array<{
    id?: string;
    longitude: number;
    latitude: number;
    value: number;
    title?: string;
    color?: string;              // Supports #RRGGBB or [r,g,b,a] array
  }>;
  /** GeoJSON data for rendering complex geographic features */
  geojson?: {
    id?: string;
    data: any;                   // GeoJSON object
    style?: {
      fillColor?: string;
      outlineColor?: string;
      outlineWidth?: number;
      fillOpacity?: number;
    };
    title?: string;
  }[];
  /** Layer control for managing multiple data layers */
  layers?: Array<{
    id: string;
    name: string;
    type: 'marker' | 'circle' | 'polygon' | 'polyline' | 'heatmap' | 'cluster' | 'geojson';
    visible: boolean;
    opacity?: number;
  }>;
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
    // Validate earthview field
    if (tr.earthview !== undefined && typeof tr.earthview !== 'object') return false;
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