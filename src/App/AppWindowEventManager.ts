/**
 * App Window Event Manager
 * Centralized event definitions for cross-window communication
 * All events use the APP_WINDOW_EVENT_* prefix
 */
export const APP_WINDOW_EVENTS = {
    // Session related events
    SESSION_CREATED: "APP_WINDOW_EVENT_SESSION_CREATED",
    SESSION_SELECTED: "APP_WINDOW_EVENT_SESSION_SELECTED",
    SESSION_SWITCH: "APP_WINDOW_EVENT_SESSION_SWITCH",
    // Search related events
    SEARCH_NEW_SESSION: "APP_WINDOW_EVENT_SEARCH_NEW_SESSION",
    SEARCH_OPEN_SKILL: "APP_WINDOW_EVENT_SEARCH_OPEN_SKILL",
    SEARCH_OPEN_LOG: "APP_WINDOW_EVENT_SEARCH_OPEN_LOG",
    SEARCH_SWITCH_SESSION: "APP_WINDOW_EVENT_SEARCH_SWITCH_SESSION",
    // Subsystem session switch events
    CHART_SWITCH_SESSION: "APP_WINDOW_EVENT_CHART_SWITCH_SESSION",
    MAP_SWITCH_SESSION: "APP_WINDOW_EVENT_MAP_SWITCH_SESSION",
    CODEEDITOR_SWITCH_SESSION: "APP_WINDOW_EVENT_CODEEDITOR_SWITCH_SESSION",
    VIDEO_SWITCH_SESSION: "APP_WINDOW_EVENT_VIDEO_SWITCH_SESSION",
    SANDBOX3D_SWITCH_SESSION: "APP_WINDOW_EVENT_SANDBOX3D_SWITCH_SESSION",
    // Subsystem session created events
    CHART_SESSION_CREATED: "APP_WINDOW_EVENT_CHART_SESSION_CREATED",
    MAP_SESSION_CREATED: "APP_WINDOW_EVENT_MAP_SESSION_CREATED",
    CODEEDITOR_SESSION_CREATED: "APP_WINDOW_EVENT_CODEEDITOR_SESSION_CREATED",
    VIDEO_SESSION_CREATED: "APP_WINDOW_EVENT_VIDEO_SESSION_CREATED",
    SANDBOX3D_SESSION_CREATED: "APP_WINDOW_EVENT_SANDBOX3D_SESSION_CREATED",
    // Theme and language events
    THEME_CHANGED: "APP_WINDOW_EVENT_THEME_CHANGED",
    LANGUAGE_CHANGED: "APP_WINDOW_EVENT_LANGUAGE_CHANGED",
    // File and workspace events
    FILE_DROPPED: "APP_WINDOW_EVENT_FILE_DROPPED",
    WORKSPACE_LOADED: "APP_WINDOW_EVENT_WORKSPACE_LOADED",
    SCENE_LOADED: "APP_WINDOW_EVENT_SCENE_LOADED",
    VIDEO_LOADED: "APP_WINDOW_EVENT_VIDEO_LOADED",
    // UI events
    TOGGLE_FUNCTION_PANEL_MAXIMIZE: "APP_WINDOW_EVENT_TOGGLE_FUNCTION_PANEL_MAXIMIZE",
    OPEN_SKILLS_MARKET: "APP_WINDOW_EVENT_OPEN_SKILLS_MARKET",
    OPEN_HISTORY: "APP_WINDOW_EVENT_OPEN_HISTORY",
    OPEN_FAVORITES: "APP_WINDOW_EVENT_OPEN_FAVORITES",
    OPEN_SCHEDULED_TASKS: "APP_WINDOW_EVENT_OPEN_SCHEDULED_TASKS",
    OPEN_SETTINGS: "APP_WINDOW_EVENT_OPEN_SETTINGS",
    // Directory events
    OPEN_LOGS_DIR: "APP_WINDOW_EVENT_OPEN_LOGS_DIR",
    OPEN_HISTORY_DIR: "APP_WINDOW_EVENT_OPEN_HISTORY_DIR",
    OPEN_SKILLS_MARKET_DIR: "APP_WINDOW_EVENT_OPEN_SKILLS_MARKET_DIR",
    OPEN_SCHEDULED_TASKS_DIR: "APP_WINDOW_EVENT_OPEN_SCHEDULED_TASKS_DIR",
    OPEN_SETTINGS_DIR: "APP_WINDOW_EVENT_OPEN_SETTINGS_DIR",
} as const;
// Event Payload Types
export interface SessionSwitchPayload {
    sessionId: string;
    title?: string;
    highlightMessageId?: string;
    subsystem?: string;
}
export interface SessionSelectedPayload {
    sessionId: string;
    title?: string;
    subsystem?: string;
}
export interface SearchOpenSkillPayload {
    path: string;
    title: string;
}
export interface SearchOpenLogPayload {
    path: string;
    highlight?: string | null;
}
export interface ThemeChangedPayload {
    theme: "dark" | "light";
}
export interface LanguageChangedPayload {
    language: "zh" | "en";
}
export interface FileDroppedPayload {
    filePaths: string[];
}
export interface WorkspaceLoadedPayload {
    path: string;
    type: "directory" | "file";
}
export interface SceneLoadedPayload {
    path: string;
    name: string;
}
export interface VideoLoadedPayload {
    path: string;
    title: string;
}
export interface OpenSettingsPayload {
    subView?: string;
}
/**
 * Dispatch a window event with payload
 */
export function dispatchWindowEvent<T = any>(
    eventName: string,
    payload?: T
): void {
    const event = new CustomEvent(eventName, {
        detail: payload,
    });
    window.dispatchEvent(event);
}
/**
 * Add event listener with type safety
 */
export function addWindowEventListener<T = any>(
    eventName: string,
    handler: (payload: T) => void
): () => void {
    const wrappedHandler = (event: CustomEvent<T>) => {
        handler(event.detail);
    };
    window.addEventListener(
        eventName,
        wrappedHandler as EventListener
    );
    // Return cleanup function
    return () => {
        window.removeEventListener(
            eventName,
            wrappedHandler as EventListener
        );
    };
}
/**
 * Add event listener for a specific event name with custom event handling
 */
export function addWindowEventListenerRaw(
    eventName: string,
    handler: EventListener
): () => void {
    window.addEventListener(eventName, handler);
    return () => {
        window.removeEventListener(eventName, handler);
    };
}
// Subsystem Mapping
export const SUBSYSTEM_EVENT_MAP: Record<
    string,
    { event: string; panel: string }
> = {
    general: { event: APP_WINDOW_EVENTS.SESSION_SELECTED, panel: "generalChat" },
    chart: { event: APP_WINDOW_EVENTS.CHART_SWITCH_SESSION, panel: "chartChat" },
    map: { event: APP_WINDOW_EVENTS.MAP_SWITCH_SESSION, panel: "mapChat" },
    codeeditor: { event: APP_WINDOW_EVENTS.CODEEDITOR_SWITCH_SESSION, panel: "codeEditorChat" },
    video: { event: APP_WINDOW_EVENTS.VIDEO_SWITCH_SESSION, panel: "videoEditor" },
    sandbox3d: { event: APP_WINDOW_EVENTS.SANDBOX3D_SWITCH_SESSION, panel: "sandbox3d" },
};
/**
 * Get the subsystem event and panel for a given subsystem
 */
export function getSubsystemEventInfo(subsystem: string): { event: string; panel: string } | null {
    return SUBSYSTEM_EVENT_MAP[subsystem] || null;
}