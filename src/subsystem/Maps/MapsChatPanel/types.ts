/**
 * Shared types for Maps subsystem
 * This file contains type definitions used across multiple map components
 * to ensure type consistency, especially for the EarthViewRef interface
 */
import { EarthView } from "@earthview/core";
/**
 * Reference interface for EarthView map component
 * Exposed to parent components (MapsChatPage) for programmatic control
 *
 * This follows the same pattern as SandBox3DRef in the 3D sandbox:
 * - Chat panel calls these methods to render map data
 * - All calls accumulate layers for overlay display
 * - All tasks in the same session are overlaid on the map
 */
export interface EarthViewRef {
    /**
     * Apply earthview config to the map
     * Accumulates layers from all calls (supports overlay)
     * Same pattern as executeThreeCode in 3D Sandbox
     */
    applyEarthViewConfig: (config: any) => Promise<void>;
    /** Clear all map layers added by LLM */
    clearLayers: () => void;
    /** Check if map is ready for rendering */
    isReady: () => boolean;
    /** Get the EarthView instance */
    getEarthView: () => EarthView | null;
    /** Locate to a specific coordinate */
    locateToCoordinate: (center: [number, number]) => boolean;
}