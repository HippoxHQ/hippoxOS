/**
 * Subsystem types supported by the application
 */
export type SubsystemType = "general" | "chart" | "map" | "codeeditor" | "video" | "sandbox3d";
/**
 * Subsystem ID constants
 */
export const SUBSYSTEM = {
    GENERAL: "general",
    CHART: "chart",
    MAP: "map",
    CODEEDITOR: "codeeditor",
    VIDEO: "video",
    SANDBOX3D: "sandbox3d",
} as const;
// Helper type to extract value type from SUBSYSTEM
type SubsystemValue = typeof SUBSYSTEM[keyof typeof SUBSYSTEM];
/**
 * Map subsystem to sidebar icon ID
 */
export const SUBSYSTEM_TO_SIDEBAR_ID: Record<SubsystemValue, string> = {
    [SUBSYSTEM.GENERAL]: "generalChat",
    [SUBSYSTEM.CHART]: "chartChat",
    [SUBSYSTEM.MAP]: "mapChat",
    [SUBSYSTEM.CODEEDITOR]: "codeEditorChat",
    [SUBSYSTEM.VIDEO]: "videoEditor",
    [SUBSYSTEM.SANDBOX3D]: "sandbox3d",
};
/**
 * Map subsystem to content panel view
 */
export const SUBSYSTEM_TO_PANEL: Record<SubsystemValue, string> = {
    [SUBSYSTEM.GENERAL]: "generalChat",
    [SUBSYSTEM.CHART]: "chartChat",
    [SUBSYSTEM.MAP]: "mapChat",
    [SUBSYSTEM.CODEEDITOR]: "codeEditorChat",
    [SUBSYSTEM.VIDEO]: "videoEditor",
    [SUBSYSTEM.SANDBOX3D]: "sandbox3d",
};