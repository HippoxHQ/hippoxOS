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
 * 3D Scene operation - Three.js code to be executed in the 3D sandbox
 */
export interface ThreeSceneOperation {
  /** Three.js code to execute in the sandbox */
  code: string;
  /** Description of what the code does */
  description?: string;
  /** Whether to clear existing scene before executing */
  clearBeforeExecute?: boolean;
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
  /** 3D Scene operation - Three.js code to execute in the sandbox */
  threeScene?: ThreeSceneOperation;
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

    // Validate threeScene field
    if (tr.threeScene !== undefined) {
      if (typeof tr.threeScene !== 'object') return false;
      if (typeof tr.threeScene.code !== 'string') return false;
      if (tr.threeScene.description !== undefined && typeof tr.threeScene.description !== 'string') return false;
      if (tr.threeScene.clearBeforeExecute !== undefined && typeof tr.threeScene.clearBeforeExecute !== 'boolean') return false;
    }
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