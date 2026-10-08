/**
 * Subsystem types supported by the application
 */
export type SubsystemType = "general" | "chart" | "map" | "codeeditor" | "video" | "sandbox3d" | "blockchain" | "imageEditor" | "pixelEditor" | "databaseClient" | "dockerClient" | "apiClient";
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
    BLOCKCHAIN: "blockchain",
    // New subsystems
    IMAGE_EDITOR: "imageEditor",
    PIXEL_EDITOR: "pixelEditor",
    DATABASE_CLIENT: "databaseClient",
    DOCKER_CLIENT: "dockerClient",
    API_CLIENT: "apiClient",
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
    [SUBSYSTEM.BLOCKCHAIN]: "blockchain",
    // New subsystems
    [SUBSYSTEM.IMAGE_EDITOR]: "imageEditor",
    [SUBSYSTEM.PIXEL_EDITOR]: "pixelEditor",
    [SUBSYSTEM.DATABASE_CLIENT]: "databaseClient",
    [SUBSYSTEM.DOCKER_CLIENT]: "dockerClient",
    [SUBSYSTEM.API_CLIENT]: "apiClient",
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
    [SUBSYSTEM.BLOCKCHAIN]: "blockchain",
    // New subsystems
    [SUBSYSTEM.IMAGE_EDITOR]: "imageEditor",
    [SUBSYSTEM.PIXEL_EDITOR]: "pixelEditor",
    [SUBSYSTEM.DATABASE_CLIENT]: "databaseClient",
    [SUBSYSTEM.DOCKER_CLIENT]: "dockerClient",
    [SUBSYSTEM.API_CLIENT]: "apiClient",
};