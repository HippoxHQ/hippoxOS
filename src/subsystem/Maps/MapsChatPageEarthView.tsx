import { BasemapTypeEnum, CoordinateSystemTypeEnum, EarthView, MarkerLayer, CircleLayer, PolygonLayer, PolylineLayer, HeatmapLayer, ClusterLayer, BarChartLayer } from "@earthview/core";
import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { EarthViewRef } from "./MapsChatPanel/types";
interface MapsChatPageEarthViewProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  onLoad?: (earthView: EarthView) => void;
  onMapClick?: (event: any) => void;
  onMoveEnd?: (center: [number, number], zoom: number) => void;
  mapData?: any;
  taskId?: string;
}
const DEFAULT_CENTER: [number, number] = [-74.006, 40.7128];
const DEFAULT_ZOOM: number = 12;
/**
 * Normalize color from various formats to [r, g, b, a] array
 * Supports: #RRGGBB, #RRGGBBAA, rgb(), rgba(), [r,g,b,a]
 * Returns default color [255, 87, 34, 1] for invalid inputs
 */
const normalizeColor = (color: any): number[] => {
  // Default fallback color - orange
  const defaultColor: number[] = [255, 87, 34, 1];
  if (!color) return defaultColor;
  // Handle array format: [r, g, b, a] or [r, g, b]
  if (Array.isArray(color) && color.length >= 3) {
    const r = typeof color[0] === "number" ? color[0] : 255;
    const g = typeof color[1] === "number" ? color[1] : 87;
    const b = typeof color[2] === "number" ? color[2] : 34;
    const a = typeof color[3] === "number" ? color[3] : 1;
    return [r, g, b, a];
  }
  if (typeof color === "string") {
    // Clean the string - remove spaces and normalize
    const clean = color.trim().toLowerCase();
    // Handle hex format: #RRGGBB, #RRGGBBAA, #RGB, #RGBA
    if (clean.startsWith("#")) {
      let hex = clean.replace("#", "");
      let r,
        g,
        b,
        a = 1;
      try {
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 4) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
          a = parseInt(hex[3] + hex[3], 16) / 255;
        } else if (hex.length === 6) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        } else if (hex.length === 8) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
          a = parseInt(hex.substring(6, 8), 16) / 255;
        } else {
          return defaultColor;
        }
        if (isNaN(r) || isNaN(g) || isNaN(b) || isNaN(a)) {
          return defaultColor;
        }
        return [r, g, b, a];
      } catch {
        return defaultColor;
      }
    }
    // Handle rgba(r, g, b, a) format
    if (clean.startsWith("rgba")) {
      try {
        const match = clean.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
        if (match) {
          const r = parseInt(match[1], 10);
          const g = parseInt(match[2], 10);
          const b = parseInt(match[3], 10);
          const a = match[4] ? parseFloat(match[4]) : 1;
          if (!isNaN(r) && !isNaN(g) && !isNaN(b) && !isNaN(a) && r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
            return [r, g, b, a];
          }
        }
        return defaultColor;
      } catch {
        return defaultColor;
      }
    }
    // Handle rgb(r, g, b) format
    if (clean.startsWith("rgb")) {
      try {
        const match = clean.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
        if (match) {
          const r = parseInt(match[1], 10);
          const g = parseInt(match[2], 10);
          const b = parseInt(match[3], 10);
          if (!isNaN(r) && !isNaN(g) && !isNaN(b) && r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
            return [r, g, b, 1];
          }
        }
        return defaultColor;
      } catch {
        return defaultColor;
      }
    }
    // Try to handle common color names (basic)
    const colorMap: Record<string, number[]> = {
      red: [255, 0, 0, 1],
      green: [0, 255, 0, 1],
      blue: [0, 0, 255, 1],
      white: [255, 255, 255, 1],
      black: [0, 0, 0, 1],
      yellow: [255, 255, 0, 1],
      orange: [255, 165, 0, 1],
      purple: [128, 0, 128, 1],
      pink: [255, 192, 203, 1],
      brown: [165, 42, 42, 1],
      gray: [128, 128, 128, 1],
      cyan: [0, 255, 255, 1],
      magenta: [255, 0, 255, 1],
      lime: [0, 255, 0, 1],
      teal: [0, 128, 128, 1],
      indigo: [75, 0, 130, 1],
      violet: [238, 130, 238, 1],
      gold: [255, 215, 0, 1],
      silver: [192, 192, 192, 1],
      navy: [0, 0, 128, 1],
      maroon: [128, 0, 0, 1],
      olive: [128, 128, 0, 1],
      coral: [255, 127, 80, 1],
      salmon: [250, 128, 114, 1],
      turquoise: [64, 224, 208, 1],
      orchid: [218, 112, 214, 1],
      plum: [221, 160, 221, 1],
    };
    if (colorMap[clean]) {
      return colorMap[clean];
    }
  }
  // If all else fails, return default
  return defaultColor;
};
/**
 * MapsChatPageEarthView - EarthView map component with ref support
 *
 * This component wraps the EarthView map library and exposes methods
 * for programmatic control via ref, following the same pattern as
 * the 3D Sandbox component.
 *
 * Data Flow (same as 3D Sandbox):
 * 1. Chat panel parses LLM response and extracts earthview data
 * 2. Chat panel calls mapRef.current.applyEarthViewConfig(data)
 * 3. This component renders the data on the map (accumulates layers)
 * 4. All tasks in the same session are overlaid on the map
 */
export const MapsChatPageEarthView = forwardRef<EarthViewRef, MapsChatPageEarthViewProps>(({ theme, i18n, onLoad, onMapClick, onMoveEnd, mapData, taskId }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const earthViewRef = useRef<EarthView | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingMapDataRef = useRef<any>(null);
  const hasLocatedRef = useRef<boolean>(false);
  /** Track all applied layers to support clearing */
  const appliedLayerIdsRef = useRef<Set<string>>(new Set());
  /**
   * Locate map to a specific coordinate
   */
  const locateToCoordinate = useCallback(
    (center: [number, number]): boolean => {
      if (!earthViewRef.current || !isReady) {
        return false;
      }
      const [lng, lat] = center;
      if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
        earthViewRef.current.setCenter([lng, lat]);
        earthViewRef.current.setZoom(DEFAULT_ZOOM);
        hasLocatedRef.current = true;
        return true;
      }
      return false;
    },
    [isReady],
  );
  /**
   * Get first marker coordinate from markers array
   */
  const getFirstMarkerCoordinate = useCallback((markers: any[]): [number, number] | null => {
    if (!markers || markers.length === 0) return null;
    for (const marker of markers) {
      const lng = marker.longitude;
      const lat = marker.latitude;
      if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
        return [lng, lat];
      }
    }
    return null;
  }, []);
  /**
   * Get first coordinate from polyline points
   */
  const getFirstPolylineCoordinate = useCallback((polylines: any[]): [number, number] | null => {
    if (!polylines || polylines.length === 0) return null;
    for (const polyline of polylines) {
      if (polyline.points && Array.isArray(polyline.points) && polyline.points.length > 0) {
        const firstPoint = polyline.points[0];
        if (Array.isArray(firstPoint) && firstPoint.length === 2) {
          const [lng, lat] = firstPoint;
          if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
            return [lng, lat];
          }
        }
      }
    }
    return null;
  }, []);
  /**
   * Get first coordinate from circle center
   */
  const getFirstCircleCoordinate = useCallback((circles: any[]): [number, number] | null => {
    if (!circles || circles.length === 0) return null;
    for (const circle of circles) {
      if (circle.center && Array.isArray(circle.center) && circle.center.length === 2) {
        const [lng, lat] = circle.center;
        if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
          return [lng, lat];
        }
      }
    }
    return null;
  }, []);
  /**
   * Get first coordinate from polygon points
   */
  const getFirstPolygonCoordinate = useCallback((polygons: any[]): [number, number] | null => {
    if (!polygons || polygons.length === 0) return null;
    for (const polygon of polygons) {
      if (polygon.points && Array.isArray(polygon.points) && polygon.points.length > 0) {
        const firstPoint = polygon.points[0];
        if (Array.isArray(firstPoint) && firstPoint.length === 2) {
          const [lng, lat] = firstPoint;
          if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
            return [lng, lat];
          }
        }
      }
    }
    return null;
  }, []);
  /**
   * Extract first coordinate from various config structures
   * Supports: markers, polylines, circles, polygons in various nesting levels
   */
  const getFirstCoordinateFromConfig = useCallback(
    (config: any): [number, number] | null => {
      if (!config) return null;
      // Try markers at different nesting levels
      if (config.markers && Array.isArray(config.markers) && config.markers.length > 0) {
        const coord = getFirstMarkerCoordinate(config.markers);
        if (coord) return coord;
      }
      if (config.earthview?.markers && Array.isArray(config.earthview.markers)) {
        const coord = getFirstMarkerCoordinate(config.earthview.markers);
        if (coord) return coord;
      }
      if (config.terminalResponse?.earthview?.markers) {
        const coord = getFirstMarkerCoordinate(config.terminalResponse.earthview.markers);
        if (coord) return coord;
      }
      // Try polylines
      if (config.polylines && Array.isArray(config.polylines)) {
        const coord = getFirstPolylineCoordinate(config.polylines);
        if (coord) return coord;
      }
      // Try circles
      if (config.circles && Array.isArray(config.circles)) {
        const coord = getFirstCircleCoordinate(config.circles);
        if (coord) return coord;
      }
      // Try polygons
      if (config.polygons && Array.isArray(config.polygons)) {
        const coord = getFirstPolygonCoordinate(config.polygons);
        if (coord) return coord;
      }
      return null;
    },
    [getFirstMarkerCoordinate, getFirstPolylineCoordinate, getFirstCircleCoordinate, getFirstPolygonCoordinate],
  );
  /**
   * Add markers layer - accumulates markers from all calls
   * Same layer is reused, markers are added incrementally
   */
  const addMarkersLayer = useCallback(async (markers: any[]) => {
    if (!earthViewRef.current || !markers.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let markerLayer = layerManager.getLayer("llm-markers") as MarkerLayer;
    if (!markerLayer) {
      markerLayer = new MarkerLayer("llm-markers", "LLM Markers", {
        visible: true,
        zIndex: 100,
      });
      markerLayer.setView(earthViewRef.current.getMap());
      layerManager.addLayer(markerLayer);
    }
    appliedLayerIdsRef.current.add("llm-markers");
    for (const marker of markers) {
      const colorArray = normalizeColor(marker.color || "#FF5722");
      const colorString = `rgba(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]}, ${colorArray[3] ?? 1})`;
      await markerLayer.addMarker({
        id: marker.id || `marker_${Date.now()}_${Math.random()}`,
        longitude: marker.longitude,
        latitude: marker.latitude,
        name: marker.name || marker.title || "",
        pointColor: colorString,
        pointSize: marker.size || 15,
        pointType: marker.pointType || "circle",
        pointText: marker.pointText || "",
        bubbleBoxTitle: marker.bubbleBoxTitle || marker.title || "",
        bubbleBoxDescription: marker.bubbleBoxDescription || "",
        bubbleBoxCoverImage: marker.bubbleBoxCoverImage || "",
      });
    }
  }, []);
  /**
   * Add circles layer - accumulates circles from all calls
   */
  const addCirclesLayer = useCallback((circles: any[]) => {
    if (!earthViewRef.current || !circles.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let circleLayer = layerManager.getLayer("llm-circles") as CircleLayer;
    if (!circleLayer) {
      circleLayer = new CircleLayer("llm-circles", "LLM Circles", {
        visible: true,
        zIndex: 90,
      });
      layerManager.addLayer(circleLayer);
    }
    appliedLayerIdsRef.current.add("llm-circles");
    for (const circle of circles) {
      circleLayer.addCircle({
        id: circle.id || `circle_${Date.now()}_${Math.random()}`,
        center: circle.center,
        radius: circle.radius,
        title: circle.title || "",
        fillColor: normalizeColor(circle.fillColor || "rgba(255,87,34,0.3)"),
        outlineColor: normalizeColor(circle.outlineColor || "#FF5722"),
        outlineWidth: circle.outlineWidth || 3,
      });
    }
  }, []);
  /**
   * Add polygons layer - accumulates polygons from all calls
   */
  const addPolygonsLayer = useCallback((polygons: any[]) => {
    if (!earthViewRef.current || !polygons.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let polygonLayer = layerManager.getLayer("llm-polygons") as PolygonLayer;
    if (!polygonLayer) {
      polygonLayer = new PolygonLayer("llm-polygons", "LLM Polygons", {
        visible: true,
        zIndex: 80,
      });
      layerManager.addLayer(polygonLayer);
    }
    appliedLayerIdsRef.current.add("llm-polygons");
    for (const polygon of polygons) {
      polygonLayer.addPolygon({
        id: polygon.id || `polygon_${Date.now()}_${Math.random()}`,
        points: polygon.points,
        title: polygon.title || "",
        fillColor: normalizeColor(polygon.fillColor || "rgba(0,0,255,0.3)"),
        outlineColor: normalizeColor(polygon.outlineColor || "#0000FF"),
        outlineWidth: polygon.outlineWidth || 3,
      });
    }
  }, []);
  /**
   * Add polylines layer - accumulates polylines from all calls
   */
  const addPolylinesLayer = useCallback((polylines: any[]) => {
    if (!earthViewRef.current || !polylines.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let polylineLayer = layerManager.getLayer("llm-polylines") as PolylineLayer;
    if (!polylineLayer) {
      polylineLayer = new PolylineLayer("llm-polylines", "LLM Polylines", {
        visible: true,
        zIndex: 85,
      });
      layerManager.addLayer(polylineLayer);
    }
    appliedLayerIdsRef.current.add("llm-polylines");
    for (const polyline of polylines) {
      polylineLayer.addPolyline({
        id: polyline.id || `polyline_${Date.now()}_${Math.random()}`,
        points: polyline.points,
        title: polyline.title || "",
        color: normalizeColor(polyline.color || "#FF0000"),
        width: polyline.width || 3,
      });
    }
  }, []);
  /**
   * Add heatmap layer - replaces existing heatmap data
   */
  const addHeatmapLayer = useCallback((heatmapData: any[]) => {
    if (!earthViewRef.current || !heatmapData.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let heatmapLayer = layerManager.getLayer("llm-heatmap") as HeatmapLayer;
    if (!heatmapLayer) {
      heatmapLayer = new HeatmapLayer("llm-heatmap", "LLM Heatmap", {
        visible: true,
        zIndex: 70,
        radius: 15,
        blur: 10,
      });
      layerManager.addLayer(heatmapLayer);
    }
    appliedLayerIdsRef.current.add("llm-heatmap");
    heatmapLayer.setData(heatmapData);
  }, []);
  /**
   * Add cluster layer - replaces existing cluster data
   */
  const addClusterLayer = useCallback((clusterData: any[]) => {
    if (!earthViewRef.current || !clusterData.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let clusterLayer = layerManager.getLayer("llm-clusters") as ClusterLayer;
    if (!clusterLayer) {
      clusterLayer = new ClusterLayer("llm-clusters", "LLM Clusters", {
        visible: true,
        zIndex: 95,
        distance: 60,
      });
      layerManager.addLayer(clusterLayer);
    }
    appliedLayerIdsRef.current.add("llm-clusters");
    clusterLayer.setData(clusterData);
  }, []);
  /**
   * Add bar chart layer - replaces existing bar chart data
   */
  const addBarChartLayer = useCallback((barData: any[]) => {
    if (!earthViewRef.current || !barData.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let barLayer = layerManager.getLayer("llm-barcharts") as BarChartLayer;
    if (!barLayer) {
      barLayer = new BarChartLayer("llm-barcharts", "LLM Bar Charts", {
        visible: true,
        zIndex: 75,
        maxHeight: 80,
      });
      layerManager.addLayer(barLayer);
    }
    appliedLayerIdsRef.current.add("llm-barcharts");
    barLayer.setData(barData);
  }, []);
  /**
   * Force locate to first marker in config
   */
  const forceLocateToFirstMarker = useCallback(
    (config: any): boolean => {
      const firstCoord = getFirstCoordinateFromConfig(config);
      if (firstCoord) {
        locateToCoordinate(firstCoord);
        return true;
      }
      return false;
    },
    [getFirstCoordinateFromConfig, locateToCoordinate],
  );
  /**
   * Clear all LLM-added layers from the map
   */
  const clearLayers = useCallback(() => {
    if (!earthViewRef.current) return;
    const layerManager = earthViewRef.current.getLayerManager();
    const layerIds = Array.from(appliedLayerIdsRef.current);
    for (const layerId of layerIds) {
      const layer = layerManager.getLayer(layerId);
      if (layer) {
        layerManager.removeLayer(layerId);
      }
    }
    appliedLayerIdsRef.current.clear();
  }, []);
  /**
   * Apply earthview config to the map
   * This is the main entry point for rendering map data from LLM
   *
   * Same pattern as executeThreeCode in 3D Sandbox:
   * - Called by chat panel via ref
   * - Accumulates layers for overlay display
   * - All tasks in the same session are overlaid
   */
  const applyEarthViewConfig = useCallback(
    async (config: any) => {
      if (!earthViewRef.current || !isReady) {
        pendingMapDataRef.current = config;
        return;
      }
      // Extract and add markers
      if (config?.markers && Array.isArray(config.markers) && config.markers.length > 0) {
        await addMarkersLayer(config.markers);
      } else if (config?.earthview?.markers && Array.isArray(config.earthview.markers)) {
        await addMarkersLayer(config.earthview.markers);
      } else if (config?.terminalResponse?.earthview?.markers && Array.isArray(config.terminalResponse.earthview.markers)) {
        await addMarkersLayer(config.terminalResponse.earthview.markers);
      }
      // Add circles
      if (config?.circles && Array.isArray(config.circles)) {
        addCirclesLayer(config.circles);
      } else if (config?.earthview?.circles && Array.isArray(config.earthview.circles)) {
        addCirclesLayer(config.earthview.circles);
      } else if (config?.terminalResponse?.earthview?.circles && Array.isArray(config.terminalResponse.earthview.circles)) {
        addCirclesLayer(config.terminalResponse.earthview.circles);
      }
      // Add polygons
      if (config?.polygons && Array.isArray(config.polygons)) {
        addPolygonsLayer(config.polygons);
      } else if (config?.earthview?.polygons && Array.isArray(config.earthview.polygons)) {
        addPolygonsLayer(config.earthview.polygons);
      } else if (config?.terminalResponse?.earthview?.polygons && Array.isArray(config.terminalResponse.earthview.polygons)) {
        addPolygonsLayer(config.terminalResponse.earthview.polygons);
      }
      // Add polylines
      if (config?.polylines && Array.isArray(config.polylines)) {
        addPolylinesLayer(config.polylines);
      } else if (config?.earthview?.polylines && Array.isArray(config.earthview.polylines)) {
        addPolylinesLayer(config.earthview.polylines);
      } else if (config?.terminalResponse?.earthview?.polylines && Array.isArray(config.terminalResponse.earthview.polylines)) {
        addPolylinesLayer(config.terminalResponse.earthview.polylines);
      }
      // Add heatmap
      if (config?.heatmap && Array.isArray(config.heatmap)) {
        addHeatmapLayer(config.heatmap);
      } else if (config?.earthview?.heatmap && Array.isArray(config.earthview.heatmap)) {
        addHeatmapLayer(config.earthview.heatmap);
      } else if (config?.terminalResponse?.earthview?.heatmap && Array.isArray(config.terminalResponse.earthview.heatmap)) {
        addHeatmapLayer(config.terminalResponse.earthview.heatmap);
      }
      // Add clusters
      if (config?.clusters && Array.isArray(config.clusters)) {
        addClusterLayer(config.clusters);
      } else if (config?.earthview?.clusters && Array.isArray(config.earthview.clusters)) {
        addClusterLayer(config.earthview.clusters);
      } else if (config?.terminalResponse?.earthview?.clusters && Array.isArray(config.terminalResponse.earthview.clusters)) {
        addClusterLayer(config.terminalResponse.earthview.clusters);
      }
      // Add bar charts
      if (config?.barcharts && Array.isArray(config.barcharts)) {
        addBarChartLayer(config.barcharts);
      } else if (config?.earthview?.barcharts && Array.isArray(config.earthview.barcharts)) {
        addBarChartLayer(config.earthview.barcharts);
      } else if (config?.terminalResponse?.earthview?.barcharts && Array.isArray(config.terminalResponse.earthview.barcharts)) {
        addBarChartLayer(config.terminalResponse.earthview.barcharts);
      }
      // Wait a moment for layers to render
      await new Promise((resolve) => setTimeout(resolve, 200));
      // Auto-locate to first marker if not already located
      if (!hasLocatedRef.current) {
        const located = forceLocateToFirstMarker(config);
        if (!located) {
          // Try view.center from config
          let centerCoord: [number, number] | null = null;
          if (config?.view?.center && Array.isArray(config.view.center) && config.view.center.length === 2) {
            const [lng, lat] = config.view.center;
            if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
              centerCoord = [lng, lat];
            }
          } else if (config?.earthview?.view?.center) {
            const [lng, lat] = config.earthview.view.center;
            if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
              centerCoord = [lng, lat];
            }
          } else if (config?.terminalResponse?.earthview?.view?.center) {
            const [lng, lat] = config.terminalResponse.earthview.view.center;
            if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
              centerCoord = [lng, lat];
            }
          }
          if (centerCoord) {
            locateToCoordinate(centerCoord);
          }
        }
      }
    },
    [isReady, addMarkersLayer, addCirclesLayer, addPolygonsLayer, addPolylinesLayer, addHeatmapLayer, addClusterLayer, addBarChartLayer, forceLocateToFirstMarker, locateToCoordinate],
  );
  /**
   * Expose methods to parent via ref
   * Same pattern as 3D Sandbox's useImperativeHandle
   */
  useImperativeHandle(ref, () => ({
    applyEarthViewConfig,
    clearLayers,
    isReady: () => isReady,
    getEarthView: () => earthViewRef.current,
    locateToCoordinate,
  }));
  /**
   * Listen for locate events from other components
   */
  useEffect(() => {
    const handleLocate = (event: CustomEvent) => {
      const { center, mapData: eventMapData } = event.detail;
      if (eventMapData && earthViewRef.current && isReady) {
        applyEarthViewConfig(eventMapData);
      } else if (earthViewRef.current && isReady && center && Array.isArray(center) && center.length === 2) {
        const [lng, lat] = center;
        if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
          locateToCoordinate([lng, lat]);
        }
      }
    };
    window.addEventListener("earthview-locate", handleLocate as EventListener);
    window.addEventListener("EarthView-locate", handleLocate as EventListener);
    return () => {
      window.removeEventListener("earthview-locate", handleLocate as EventListener);
      window.removeEventListener("EarthView-locate", handleLocate as EventListener);
    };
  }, [isReady, applyEarthViewConfig, locateToCoordinate]);
  /**
   * Apply mapData prop when it changes
   */
  useEffect(() => {
    if (isReady && earthViewRef.current && mapData) {
      applyEarthViewConfig(mapData);
    } else if (mapData && !isReady) {
      pendingMapDataRef.current = mapData;
    }
  }, [mapData, isReady, applyEarthViewConfig]);
  /**
   * Initialize EarthView instance
   */
  useEffect(() => {
    if (!containerRef.current) return;
    // Cleanup existing instance
    if (earthViewRef.current) {
      earthViewRef.current.destroy();
      earthViewRef.current = null;
      setIsReady(false);
      hasLocatedRef.current = false;
      appliedLayerIdsRef.current.clear();
    }
    // Determine initial center
    let initialCenter: [number, number] = DEFAULT_CENTER;
    const firstCoord = getFirstCoordinateFromConfig(mapData);
    if (firstCoord) {
      initialCenter = firstCoord;
    } else if (mapData?.view?.center && Array.isArray(mapData.view.center) && mapData.view.center.length === 2) {
      const [lng, lat] = mapData.view.center;
      if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
        initialCenter = [lng, lat];
      }
    } else if (mapData?.earthview?.view?.center) {
      const [lng, lat] = mapData.earthview.view.center;
      if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
        initialCenter = [lng, lat];
      }
    }
    // Create EarthView instance
    const earthView = new EarthView({
      container: containerRef.current,
      basemap: BasemapTypeEnum.SATELLITE,
      center: initialCenter,
      zoom: DEFAULT_ZOOM,
      coordinateSystem: CoordinateSystemTypeEnum.WGS84,
      theme: theme === "dark" ? "dark" : "light",
      i18n: i18n === "zh-cn" ? "zh" : "en",
      enableDrawing: true,
      onLoad: () => {
        setIsReady(true);
        if (pendingMapDataRef.current) {
          setTimeout(() => {
            applyEarthViewConfig(pendingMapDataRef.current);
            pendingMapDataRef.current = null;
          }, 100);
        } else if (mapData) {
          setTimeout(() => {
            applyEarthViewConfig(mapData);
          }, 100);
        }
        onLoad?.(earthView);
      },
      onMapClick: (event: any) => {
        onMapClick?.(event);
      },
      onMoveEnd: (center: [number, number], zoom: number) => {
        onMoveEnd?.(center, zoom);
      },
    });
    earthViewRef.current = earthView;
    return () => {
      if (earthViewRef.current) {
        earthViewRef.current.destroy();
        earthViewRef.current = null;
        setIsReady(false);
        hasLocatedRef.current = false;
        appliedLayerIdsRef.current.clear();
      }
    };
  }, [theme, i18n, mapData]);
  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "var(--bg-secondary)",
      }}
    />
  );
});
MapsChatPageEarthView.displayName = "MapsChatPageEarthView";
export default MapsChatPageEarthView;
