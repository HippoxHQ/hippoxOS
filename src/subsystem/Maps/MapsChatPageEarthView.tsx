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
  const defaultColor: number[] = [255, 87, 34, 1];
  if (!color) return defaultColor;
  if (Array.isArray(color) && color.length >= 3) {
    const r = typeof color[0] === "number" ? color[0] : 255;
    const g = typeof color[1] === "number" ? color[1] : 87;
    const b = typeof color[2] === "number" ? color[2] : 34;
    const a = typeof color[3] === "number" ? color[3] : 1;
    return [r, g, b, a];
  }
  if (typeof color === "string") {
    const clean = color.trim().toLowerCase();
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
  return defaultColor;
};
/**
 * Stable hash helper for generating dedup keys from coordinates + title.
 * Used to avoid adding the same marker twice when applyEarthViewConfig is
 * called multiple times for the same LLM message (e.g. session-switch race
 * between replayAllEarthviewMessages and the incremental effect).
 */
const coordKey = (lng: any, lat: any): string => `${lng}_${lat}`;
/**
 * MapsChatPageEarthView - EarthView map component with ref support
 */
export const MapsChatPageEarthView = forwardRef<EarthViewRef, MapsChatPageEarthViewProps>(({ theme, i18n, onLoad, onMapClick, onMoveEnd, mapData, taskId }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const earthViewRef = useRef<EarthView | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingMapDataRef = useRef<any>(null);
  /** Track all applied layers to support clearing */
  const appliedLayerIdsRef = useRef<Set<string>>(new Set());
  /**
   * Track all applied earthview configs so they can be replayed after the
   * map is recreated (e.g. on theme change). Ensures graphics do not
   * disappear when the theme is switched.
   */
  const appliedConfigsRef = useRef<any[]>([]);
  /**
   * FIX (double bubble): Track which marker/circle/polygon/polyline ids have
   * already been added. Because applyEarthViewConfig can be invoked twice for
   * the same logical LLM message (session-switch race between
   * replayAllEarthviewMessages and the incremental effect), we dedupe by id.
   */
  const addedMarkerIdsRef = useRef<Set<string>>(new Set());
  const addedCircleIdsRef = useRef<Set<string>>(new Set());
  const addedPolygonIdsRef = useRef<Set<string>>(new Set());
  const addedPolylineIdsRef = useRef<Set<string>>(new Set());
  /** Keep latest theme in a ref so we can change theme without recreating the map */
  const themeRef = useRef<"light" | "dark">(theme);
  /** Recreate key used to force remount when theme cannot be changed in place */
  const [recreateKey, setRecreateKey] = useState(0);
  const locateToCoordinate = useCallback(
    (center: [number, number], zoom?: number): boolean => {
      if (!earthViewRef.current || !isReady) {
        return false;
      }
      const [lng, lat] = center;
      if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
        earthViewRef.current.setCenter([lng, lat]);
        earthViewRef.current.setZoom(typeof zoom === "number" && !isNaN(zoom) ? zoom : DEFAULT_ZOOM);
        return true;
      }
      return false;
    },
    [isReady],
  );
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
  const getFirstHeatmapCoordinate = useCallback((heatmap: any[]): [number, number] | null => {
    if (!heatmap || heatmap.length === 0) return null;
    for (const point of heatmap) {
      const lng = point.longitude;
      const lat = point.latitude;
      if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
        return [lng, lat];
      }
    }
    return null;
  }, []);
  const getFirstClusterCoordinate = useCallback((clusters: any[]): [number, number] | null => {
    if (!clusters || clusters.length === 0) return null;
    for (const c of clusters) {
      const lng = c.longitude;
      const lat = c.latitude;
      if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
        return [lng, lat];
      }
    }
    return null;
  }, []);
  const getFirstBarChartCoordinate = useCallback((barcharts: any[]): [number, number] | null => {
    if (!barcharts || barcharts.length === 0) return null;
    for (const b of barcharts) {
      const lng = b.longitude;
      const lat = b.latitude;
      if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
        return [lng, lat];
      }
    }
    return null;
  }, []);
  const getFirstCoordinateFromConfig = useCallback(
    (config: any): [number, number] | null => {
      if (!config) return null;
      const containers: any[] = [config];
      if (config.earthview) containers.push(config.earthview);
      if (config.terminalResponse?.earthview) containers.push(config.terminalResponse.earthview);
      for (const c of containers) {
        if (Array.isArray(c?.markers) && c.markers.length > 0) {
          const coord = getFirstMarkerCoordinate(c.markers);
          if (coord) return coord;
        }
      }
      for (const c of containers) {
        if (Array.isArray(c?.polylines) && c.polylines.length > 0) {
          const coord = getFirstPolylineCoordinate(c.polylines);
          if (coord) return coord;
        }
      }
      for (const c of containers) {
        if (Array.isArray(c?.circles) && c.circles.length > 0) {
          const coord = getFirstCircleCoordinate(c.circles);
          if (coord) return coord;
        }
      }
      for (const c of containers) {
        if (Array.isArray(c?.polygons) && c.polygons.length > 0) {
          const coord = getFirstPolygonCoordinate(c.polygons);
          if (coord) return coord;
        }
      }
      for (const c of containers) {
        if (Array.isArray(c?.heatmap) && c.heatmap.length > 0) {
          const coord = getFirstHeatmapCoordinate(c.heatmap);
          if (coord) return coord;
        }
      }
      for (const c of containers) {
        if (Array.isArray(c?.clusters) && c.clusters.length > 0) {
          const coord = getFirstClusterCoordinate(c.clusters);
          if (coord) return coord;
        }
      }
      for (const c of containers) {
        if (Array.isArray(c?.barcharts) && c.barcharts.length > 0) {
          const coord = getFirstBarChartCoordinate(c.barcharts);
          if (coord) return coord;
        }
      }
      return null;
    },
    [getFirstMarkerCoordinate, getFirstPolylineCoordinate, getFirstCircleCoordinate, getFirstPolygonCoordinate, getFirstHeatmapCoordinate, getFirstClusterCoordinate, getFirstBarChartCoordinate],
  );
  const getViewCenterFromConfig = useCallback((config: any): { center: [number, number]; zoom?: number } | null => {
    if (!config) return null;
    const candidates = [config?.view, config?.earthview?.view, config?.terminalResponse?.earthview?.view];
    for (const v of candidates) {
      if (v?.center && Array.isArray(v.center) && v.center.length === 2) {
        const [lng, lat] = v.center;
        if (typeof lng === "number" && typeof lat === "number" && !isNaN(lng) && !isNaN(lat)) {
          return { center: [lng, lat], zoom: typeof v.zoom === "number" ? v.zoom : undefined };
        }
      }
    }
    return null;
  }, []);
  /**
   * Add markers layer with id-based dedup.
   *
   * FIX (double bubble): The root cause of the duplicate popup is that the
   * same marker was being added twice — once from replayAllEarthviewMessages
   * (session switch) and once from the incremental effect that also sees the
   * same last LLM message. We now build a stable id per marker and skip it if
   * already present in addedMarkerIdsRef.
   *
   * We also only pass bubbleBoxTitle/bubbleBoxDescription for the popup and
   * blank out name/pointText to avoid a secondary built-in tooltip.
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
      // Build a stable id. If the LLM provides one, use it; otherwise fall
      // back to a coordinate+title based key so re-application is idempotent.
      const stableId = marker.id || `marker_${coordKey(marker.longitude, marker.latitude)}_${marker.bubbleBoxTitle || marker.title || ""}`;
      if (addedMarkerIdsRef.current.has(stableId)) {
        // Already added — skip to prevent duplicate popups
        continue;
      }
      addedMarkerIdsRef.current.add(stableId);
      const colorArray = normalizeColor(marker.color || "#FF5722");
      const colorString = `rgba(${colorArray[0]}, ${colorArray[1]}, ${colorArray[2]}, ${colorArray[3] ?? 1})`;
      const bubbleTitle = marker.bubbleBoxTitle || marker.title || "";
      const bubbleDesc = marker.bubbleBoxDescription || "";
      await markerLayer.addMarker({
        id: stableId,
        longitude: marker.longitude,
        latitude: marker.latitude,
        // Do NOT pass name/title here: it would trigger a second popup
        name: "",
        pointColor: colorString,
        pointSize: marker.size || 15,
        pointType: marker.pointType || "circle",
        // Keep pointText empty to avoid the built-in label bubble
        pointText: "",
        bubbleBoxTitle: bubbleTitle,
        bubbleBoxDescription: bubbleDesc,
        bubbleBoxCoverImage: marker.bubbleBoxCoverImage || "",
      });
    }
  }, []);
  /**
   * Add circles layer with id-based dedup
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
      const stableId = circle.id || `circle_${coordKey(circle.center?.[0], circle.center?.[1])}_${circle.radius ?? ""}`;
      if (addedCircleIdsRef.current.has(stableId)) {
        continue;
      }
      addedCircleIdsRef.current.add(stableId);
      circleLayer.addCircle({
        id: stableId,
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
   * Add polygons layer with id-based dedup
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
      const firstPt = Array.isArray(polygon.points) && polygon.points[0] ? polygon.points[0] : [];
      const stableId = polygon.id || `polygon_${coordKey(firstPt[0], firstPt[1])}_${polygon.title || ""}`;
      if (addedPolygonIdsRef.current.has(stableId)) {
        continue;
      }
      addedPolygonIdsRef.current.add(stableId);
      polygonLayer.addPolygon({
        id: stableId,
        points: polygon.points,
        title: polygon.title || "",
        fillColor: normalizeColor(polygon.fillColor || "rgba(0,0,255,0.3)"),
        outlineColor: normalizeColor(polygon.outlineColor || "#0000FF"),
        outlineWidth: polygon.outlineWidth || 3,
      });
    }
  }, []);
  /**
   * Add polylines layer with id-based dedup
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
      const firstPt = Array.isArray(polyline.points) && polyline.points[0] ? polyline.points[0] : [];
      const stableId = polyline.id || `polyline_${coordKey(firstPt[0], firstPt[1])}_${polyline.title || ""}`;
      if (addedPolylineIdsRef.current.has(stableId)) {
        continue;
      }
      addedPolylineIdsRef.current.add(stableId);
      polylineLayer.addPolyline({
        id: stableId,
        points: polyline.points,
        title: polyline.title || "",
        color: normalizeColor(polyline.color || "#FF0000"),
        width: polyline.width || 3,
      });
    }
  }, []);
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
  const forceLocateFromConfig = useCallback(
    (config: any): boolean => {
      const firstCoord = getFirstCoordinateFromConfig(config);
      if (firstCoord) {
        locateToCoordinate(firstCoord);
        return true;
      }
      const viewInfo = getViewCenterFromConfig(config);
      if (viewInfo) {
        locateToCoordinate(viewInfo.center, viewInfo.zoom);
        return true;
      }
      return false;
    },
    [getFirstCoordinateFromConfig, getViewCenterFromConfig, locateToCoordinate],
  );
  /**
   * Clear all LLM-added layers from the map and reset all dedup sets.
   */
  const clearLayers = useCallback(() => {
    if (!earthViewRef.current) return;
    const layerManager = earthViewRef.current.getLayerManager();
    const layerIds = Array.from(appliedLayerIdsRef.current);
    for (const layerId of layerIds) {
      const layer: any = layerManager.getLayer(layerId);
      if (layer) {
        try {
          if (typeof layer.clearMarkers === "function") {
            layer.clearMarkers();
          } else if (typeof layer.clearCircles === "function") {
            layer.clearCircles();
          } else if (typeof layer.clearPolygons === "function") {
            layer.clearPolygons();
          } else if (typeof layer.clearPolylines === "function") {
            layer.clearPolylines();
          } else if (typeof layer.clear === "function") {
            layer.clear();
          } else if (typeof layer.setData === "function") {
            layer.setData([]);
          }
        } catch (e) {
          console.warn("[clearLayers] failed to clear layer data:", layerId, e);
        }
        layerManager.removeLayer(layerId);
      }
    }
    appliedLayerIdsRef.current.clear();
    appliedConfigsRef.current = [];
    // FIX: reset dedup sets so the next session can add the same coords again
    addedMarkerIdsRef.current.clear();
    addedCircleIdsRef.current.clear();
    addedPolygonIdsRef.current.clear();
    addedPolylineIdsRef.current.clear();
  }, []);
  const applyEarthViewConfig = useCallback(
    async (config: any) => {
      if (!earthViewRef.current || !isReady) {
        pendingMapDataRef.current = config;
        return;
      }
      appliedConfigsRef.current.push(config);
      if (config?.markers && Array.isArray(config.markers) && config.markers.length > 0) {
        await addMarkersLayer(config.markers);
      } else if (config?.earthview?.markers && Array.isArray(config.earthview.markers)) {
        await addMarkersLayer(config.earthview.markers);
      } else if (config?.terminalResponse?.earthview?.markers && Array.isArray(config.terminalResponse.earthview.markers)) {
        await addMarkersLayer(config.terminalResponse.earthview.markers);
      }
      if (config?.circles && Array.isArray(config.circles)) {
        addCirclesLayer(config.circles);
      } else if (config?.earthview?.circles && Array.isArray(config.earthview.circles)) {
        addCirclesLayer(config.earthview.circles);
      } else if (config?.terminalResponse?.earthview?.circles && Array.isArray(config.terminalResponse.earthview.circles)) {
        addCirclesLayer(config.terminalResponse.earthview.circles);
      }
      if (config?.polygons && Array.isArray(config.polygons)) {
        addPolygonsLayer(config.polygons);
      } else if (config?.earthview?.polygons && Array.isArray(config.earthview.polygons)) {
        addPolygonsLayer(config.earthview.polygons);
      } else if (config?.terminalResponse?.earthview?.polygons && Array.isArray(config.terminalResponse.earthview.polygons)) {
        addPolygonsLayer(config.terminalResponse.earthview.polygons);
      }
      if (config?.polylines && Array.isArray(config.polylines)) {
        addPolylinesLayer(config.polylines);
      } else if (config?.earthview?.polylines && Array.isArray(config.earthview.polylines)) {
        addPolylinesLayer(config.earthview.polylines);
      } else if (config?.terminalResponse?.earthview?.polylines && Array.isArray(config.terminalResponse.earthview.polylines)) {
        addPolylinesLayer(config.terminalResponse.earthview.polylines);
      }
      if (config?.heatmap && Array.isArray(config.heatmap)) {
        addHeatmapLayer(config.heatmap);
      } else if (config?.earthview?.heatmap && Array.isArray(config.earthview.heatmap)) {
        addHeatmapLayer(config.earthview.heatmap);
      } else if (config?.terminalResponse?.earthview?.heatmap && Array.isArray(config.terminalResponse.earthview.heatmap)) {
        addHeatmapLayer(config.terminalResponse.earthview.heatmap);
      }
      if (config?.clusters && Array.isArray(config.clusters)) {
        addClusterLayer(config.clusters);
      } else if (config?.earthview?.clusters && Array.isArray(config.earthview.clusters)) {
        addClusterLayer(config.earthview.clusters);
      } else if (config?.terminalResponse?.earthview?.clusters && Array.isArray(config.terminalResponse.earthview.clusters)) {
        addClusterLayer(config.terminalResponse.earthview.clusters);
      }
      if (config?.barcharts && Array.isArray(config.barcharts)) {
        addBarChartLayer(config.barcharts);
      } else if (config?.earthview?.barcharts && Array.isArray(config.earthview.barcharts)) {
        addBarChartLayer(config.earthview.barcharts);
      } else if (config?.terminalResponse?.earthview?.barcharts && Array.isArray(config.terminalResponse.earthview.barcharts)) {
        addBarChartLayer(config.terminalResponse.earthview.barcharts);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      forceLocateFromConfig(config);
    },
    [isReady, addMarkersLayer, addCirclesLayer, addPolygonsLayer, addPolylinesLayer, addHeatmapLayer, addClusterLayer, addBarChartLayer, forceLocateFromConfig],
  );
  const reapplyAllConfigs = useCallback(async () => {
    if (!earthViewRef.current || !isReady) return;
    const configs = [...appliedConfigsRef.current];
    appliedLayerIdsRef.current.clear();
    appliedConfigsRef.current = [];
    // FIX: also reset dedup sets before replaying so each config is applied
    // exactly once after recreation.
    addedMarkerIdsRef.current.clear();
    addedCircleIdsRef.current.clear();
    addedPolygonIdsRef.current.clear();
    addedPolylineIdsRef.current.clear();
    for (const cfg of configs) {
      await applyEarthViewConfig(cfg);
    }
  }, [isReady, applyEarthViewConfig]);
  useImperativeHandle(ref, () => ({
    applyEarthViewConfig,
    clearLayers,
    isReady: () => isReady,
    getEarthView: () => earthViewRef.current,
    locateToCoordinate,
    reapplyAllConfigs,
  }));
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
  useEffect(() => {
    if (isReady && earthViewRef.current && mapData) {
      applyEarthViewConfig(mapData);
    } else if (mapData && !isReady) {
      pendingMapDataRef.current = mapData;
    }
  }, [mapData, isReady, applyEarthViewConfig]);
  useEffect(() => {
    themeRef.current = theme;
    const ev: any = earthViewRef.current;
    if (!ev) return;
    if (typeof ev.setTheme === "function") {
      try {
        ev.setTheme(theme === "dark" ? "dark" : "light");
        return;
      } catch (e) {
        console.warn("[EarthView] setTheme failed, will recreate on next init", e);
      }
    }
    if (typeof ev.updateOptions === "function") {
      try {
        ev.updateOptions({ theme: theme === "dark" ? "dark" : "light" });
        return;
      } catch (e) {
        console.warn("[EarthView] updateOptions failed", e);
      }
    }
    setRecreateKey((k) => k + 1);
  }, [theme]);
  useEffect(() => {
    if (!containerRef.current) return;
    if (earthViewRef.current) {
      earthViewRef.current.destroy();
      earthViewRef.current = null;
      setIsReady(false);
      appliedLayerIdsRef.current.clear();
    }
    let initialCenter: [number, number] = DEFAULT_CENTER;
    let initialZoom: number = DEFAULT_ZOOM;
    const firstCoord = getFirstCoordinateFromConfig(mapData);
    if (firstCoord) {
      initialCenter = firstCoord;
    } else {
      const viewInfo = getViewCenterFromConfig(mapData);
      if (viewInfo) {
        initialCenter = viewInfo.center;
        if (typeof viewInfo.zoom === "number") initialZoom = viewInfo.zoom;
      }
    }
    const earthView = new EarthView({
      container: containerRef.current,
      basemap: BasemapTypeEnum.SATELLITE,
      center: initialCenter,
      zoom: initialZoom,
      coordinateSystem: CoordinateSystemTypeEnum.WGS84,
      theme: themeRef.current === "dark" ? "dark" : "light",
      i18n: i18n === "zh-cn" ? "zh" : "en",
      enableDrawing: true,
      onLoad: () => {
        setIsReady(true);
        if (appliedConfigsRef.current.length > 0) {
          setTimeout(() => {
            reapplyAllConfigs();
          }, 100);
        } else if (pendingMapDataRef.current) {
          setTimeout(() => {
            applyEarthViewConfig(pendingMapDataRef.current);
            pendingMapDataRef.current = null;
          }, 100);
        } else if (mapData) {
          setTimeout(() => {
            applyEarthViewConfig(mapData);
          }, 100);
        }
        window.dispatchEvent(
          new CustomEvent("earthview-recreated", {
            detail: { theme: themeRef.current, i18n },
          }),
        );
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
        appliedLayerIdsRef.current.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n, recreateKey]);
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
