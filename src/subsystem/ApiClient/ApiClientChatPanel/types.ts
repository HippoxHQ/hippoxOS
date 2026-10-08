import { EarthView } from "@earthview/core";
export interface EarthViewRef {
    applyEarthViewConfig: (config: any) => Promise<void>;
    applyEarthViewConfigsSequentially: (configs: any[]) => Promise<void>;
    clearLayers: () => void;
    isReady: () => boolean;
    getEarthView: () => EarthView | null;
    locateToCoordinate: (center: [number, number]) => boolean;
    reapplyAllConfigs: () => Promise<void>;
}