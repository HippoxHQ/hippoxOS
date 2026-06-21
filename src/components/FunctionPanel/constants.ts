import { FunctionTab, FunctionTabConfig } from "./types";

export const FUNCTION_TABS: FunctionTabConfig[] = [
  { id: "preview", name: "预览", icon: "📄" },
  { id: "map", name: "地图", icon: "🗺️" },
  { id: "chart", name: "图表", icon: "📊" },
];

export const DEFAULT_TAB: FunctionTab = "preview";
export const DEFAULT_PANEL_WIDTH = 480;
export const MIN_PANEL_WIDTH = 320;
export const MAX_PANEL_WIDTH = 800;
export const STORAGE_KEY = "hippox-function-panel-width";