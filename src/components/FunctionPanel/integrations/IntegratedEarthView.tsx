import {
  BasemapTypeEnum,
  CoordinateSystemTypeEnum,
  EarthView,
  MarkerLayer,
  CircleLayer,
  PolygonLayer,
  PolylineLayer,
  HeatmapLayer,
  ClusterLayer,
  BarChartLayer,
} from "@earthview/core";
import React, { useEffect, useRef, useState, useCallback } from "react";
interface IntegratedEarthViewProps {
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
export const IntegratedEarthView: React.FC<IntegratedEarthViewProps> = ({
  theme,
  i18n,
  onLoad,
  onMapClick,
  onMoveEnd,
  mapData,
  taskId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const earthViewRef = useRef<EarthView | null>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingMapDataRef = useRef<any>(null);
  const hasLocatedRef = useRef<boolean>(false);
  const locateToCoordinate = useCallback(
    (center: [number, number], source: string = "unknown") => {
      if (!earthViewRef.current || !isReady) {
        return false;
      }
      const [lng, lat] = center;
      if (
        typeof lng === "number" &&
        typeof lat === "number" &&
        !isNaN(lng) &&
        !isNaN(lat)
      ) {
        earthViewRef.current.setCenter([lng, lat]);
        earthViewRef.current.setZoom(DEFAULT_ZOOM);
        hasLocatedRef.current = true;
        return true;
      }
      return false;
    },
    [isReady],
  );
  const getFirstMarkerCoordinate = useCallback(
    (markers: any[]): [number, number] | null => {
      if (!markers || markers.length === 0) return null;
      for (const marker of markers) {
        const lng = marker.longitude;
        const lat = marker.latitude;
        if (
          typeof lng === "number" &&
          typeof lat === "number" &&
          !isNaN(lng) &&
          !isNaN(lat)
        ) {
          return [lng, lat];
        }
      }
      return null;
    },
    [],
  );
  const getFirstPolylineCoordinate = useCallback(
    (polylines: any[]): [number, number] | null => {
      if (!polylines || polylines.length === 0) return null;
      for (const polyline of polylines) {
        if (
          polyline.points &&
          Array.isArray(polyline.points) &&
          polyline.points.length > 0
        ) {
          const firstPoint = polyline.points[0];
          if (Array.isArray(firstPoint) && firstPoint.length === 2) {
            const [lng, lat] = firstPoint;
            if (
              typeof lng === "number" &&
              typeof lat === "number" &&
              !isNaN(lng) &&
              !isNaN(lat)
            ) {
              return [lng, lat];
            }
          }
        }
      }
      return null;
    },
    [],
  );
  const getFirstCircleCoordinate = useCallback(
    (circles: any[]): [number, number] | null => {
      if (!circles || circles.length === 0) return null;
      for (const circle of circles) {
        if (
          circle.center &&
          Array.isArray(circle.center) &&
          circle.center.length === 2
        ) {
          const [lng, lat] = circle.center;
          if (
            typeof lng === "number" &&
            typeof lat === "number" &&
            !isNaN(lng) &&
            !isNaN(lat)
          ) {
            return [lng, lat];
          }
        }
      }
      return null;
    },
    [],
  );
  const getFirstPolygonCoordinate = useCallback(
    (polygons: any[]): [number, number] | null => {
      if (!polygons || polygons.length === 0) return null;
      for (const polygon of polygons) {
        if (
          polygon.points &&
          Array.isArray(polygon.points) &&
          polygon.points.length > 0
        ) {
          const firstPoint = polygon.points[0];
          if (Array.isArray(firstPoint) && firstPoint.length === 2) {
            const [lng, lat] = firstPoint;
            if (
              typeof lng === "number" &&
              typeof lat === "number" &&
              !isNaN(lng) &&
              !isNaN(lat)
            ) {
              return [lng, lat];
            }
          }
        }
      }
      return null;
    },
    [],
  );
  const getFirstCoordinateFromConfig = useCallback(
    (config: any): [number, number] | null => {
      if (!config) {
        return null;
      }
      if (
        config.markers &&
        Array.isArray(config.markers) &&
        config.markers.length > 0
      ) {
        const coord = getFirstMarkerCoordinate(config.markers);
        if (coord) return coord;
      }
      if (
        config.earthview?.markers &&
        Array.isArray(config.earthview.markers)
      ) {
        const coord = getFirstMarkerCoordinate(config.earthview.markers);
        if (coord) return coord;
      }
      if (config.terminalResponse?.earthview?.markers) {
        const coord = getFirstMarkerCoordinate(
          config.terminalResponse.earthview.markers,
        );
        if (coord) return coord;
      }
      if (
        Array.isArray(config) &&
        config.length > 0 &&
        config[0].longitude !== undefined
      ) {
        const coord = getFirstMarkerCoordinate(config);
        if (coord) return coord;
      }
      if (config.polylines && Array.isArray(config.polylines)) {
        const coord = getFirstPolylineCoordinate(config.polylines);
        if (coord) return coord;
      }
      if (config.circles && Array.isArray(config.circles)) {
        const coord = getFirstCircleCoordinate(config.circles);
        if (coord) return coord;
      }
      if (config.polygons && Array.isArray(config.polygons)) {
        const coord = getFirstPolygonCoordinate(config.polygons);
        if (coord) return coord;
      }
      return null;
    },
    [
      getFirstMarkerCoordinate,
      getFirstPolylineCoordinate,
      getFirstCircleCoordinate,
      getFirstPolygonCoordinate,
    ],
  );

  const addMarkersLayer = useCallback(async (markers: any[]) => {
    if (!earthViewRef.current || !markers.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let markerLayer = layerManager.getLayer("llm-markers") as MarkerLayer;
    if (!markerLayer) {
      markerLayer = new MarkerLayer("llm-markers", "LLM标记点", {
        visible: true,
        zIndex: 100,
      });
      markerLayer.setView(earthViewRef.current.getMap());
      layerManager.addLayer(markerLayer);
    }
    for (const marker of markers) {
      await markerLayer.addMarker({
        id: marker.id || `marker_${Date.now()}_${Math.random()}`,
        longitude: marker.longitude,
        latitude: marker.latitude,
        name: marker.name || marker.title || "",
        pointColor: marker.color || "#FF5722",
        pointSize: marker.size || 15,
        pointType: marker.pointType || "circle",
        pointText: marker.pointText || "",
        bubbleBoxTitle: marker.bubbleBoxTitle || marker.title,
        bubbleBoxDescription: marker.bubbleBoxDescription || "",
        bubbleBoxCoverImage: marker.bubbleBoxCoverImage || "",
      });
    }
  }, []);

  const addCirclesLayer = useCallback((circles: any[]) => {
    if (!earthViewRef.current || !circles.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let circleLayer = layerManager.getLayer("llm-circles") as CircleLayer;
    if (!circleLayer) {
      circleLayer = new CircleLayer("llm-circles", "LLM圆形", {
        visible: true,
        zIndex: 90,
      });
      layerManager.addLayer(circleLayer);
    }
    for (const circle of circles) {
      circleLayer.addCircle({
        id: circle.id || `circle_${Date.now()}_${Math.random()}`,
        center: circle.center,
        radius: circle.radius,
        title: circle.title || "",
        fillColor: circle.fillColor || "rgba(255,87,34,0.3)",
        outlineColor: circle.outlineColor || "#FF5722",
        outlineWidth: circle.outlineWidth || 3,
      });
    }
  }, []);

  const addPolygonsLayer = useCallback((polygons: any[]) => {
    if (!earthViewRef.current || !polygons.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let polygonLayer = layerManager.getLayer("llm-polygons") as PolygonLayer;
    if (!polygonLayer) {
      polygonLayer = new PolygonLayer("llm-polygons", "LLM多边形", {
        visible: true,
        zIndex: 80,
      });
      layerManager.addLayer(polygonLayer);
    }
    for (const polygon of polygons) {
      polygonLayer.addPolygon({
        id: polygon.id || `polygon_${Date.now()}_${Math.random()}`,
        points: polygon.points,
        title: polygon.title || "",
        fillColor: polygon.fillColor || "rgba(0,0,255,0.3)",
        outlineColor: polygon.outlineColor || "#0000FF",
        outlineWidth: polygon.outlineWidth || 3,
      });
    }
  }, []);

  const addPolylinesLayer = useCallback((polylines: any[]) => {
    if (!earthViewRef.current || !polylines.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let polylineLayer = layerManager.getLayer("llm-polylines") as PolylineLayer;
    if (!polylineLayer) {
      polylineLayer = new PolylineLayer("llm-polylines", "LLM线段", {
        visible: true,
        zIndex: 85,
      });
      layerManager.addLayer(polylineLayer);
    }
    for (const polyline of polylines) {
      polylineLayer.addPolyline({
        id: polyline.id || `polyline_${Date.now()}_${Math.random()}`,
        points: polyline.points,
        title: polyline.title || "",
        color: polyline.color || "#FF0000",
        width: polyline.width || 3,
      });
    }
  }, []);

  const addHeatmapLayer = useCallback((heatmapData: any[]) => {
    if (!earthViewRef.current || !heatmapData.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let heatmapLayer = layerManager.getLayer("llm-heatmap") as HeatmapLayer;

    if (!heatmapLayer) {
      heatmapLayer = new HeatmapLayer("llm-heatmap", "LLM热力图", {
        visible: true,
        zIndex: 70,
        radius: 15,
        blur: 10,
      });
      layerManager.addLayer(heatmapLayer);
    }
    heatmapLayer.setData(heatmapData);
  }, []);

  const addClusterLayer = useCallback((clusterData: any[]) => {
    if (!earthViewRef.current || !clusterData.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let clusterLayer = layerManager.getLayer("llm-clusters") as ClusterLayer;
    if (!clusterLayer) {
      clusterLayer = new ClusterLayer("llm-clusters", "LLM聚合点", {
        visible: true,
        zIndex: 95,
        distance: 60,
      });
      layerManager.addLayer(clusterLayer);
    }
    clusterLayer.setData(clusterData);
  }, []);

  const addBarChartLayer = useCallback((barData: any[]) => {
    if (!earthViewRef.current || !barData.length) return;
    const layerManager = earthViewRef.current.getLayerManager();
    let barLayer = layerManager.getLayer("llm-barcharts") as BarChartLayer;
    if (!barLayer) {
      barLayer = new BarChartLayer("llm-barcharts", "LLM柱状图", {
        visible: true,
        zIndex: 75,
        maxHeight: 80,
      });
      layerManager.addLayer(barLayer);
    }

    barLayer.setData(barData);
  }, []);

  const forceLocateToFirstMarker = useCallback(
    (config: any) => {
      const firstCoord = getFirstCoordinateFromConfig(config);
      if (firstCoord) {
        locateToCoordinate(firstCoord, "forceLocateToFirstMarker");
        return true;
      }
      return false;
    },
    [getFirstCoordinateFromConfig, locateToCoordinate],
  );

  const applyEarthViewConfig = useCallback(
    async (config: any) => {
      if (!earthViewRef.current || !isReady) {
        pendingMapDataRef.current = config;
        return;
      }
      const ev = earthViewRef.current;
      if (
        config?.markers &&
        Array.isArray(config.markers) &&
        config.markers.length > 0
      ) {
        await addMarkersLayer(config.markers);
      } else if (
        config?.earthview?.markers &&
        Array.isArray(config.earthview.markers)
      ) {
        await addMarkersLayer(config.earthview.markers);
      } else if (
        config?.terminalResponse?.earthview?.markers &&
        Array.isArray(config.terminalResponse.earthview.markers)
      ) {
        await addMarkersLayer(config.terminalResponse.earthview.markers);
      }
      if (config?.circles && Array.isArray(config.circles)) {
        addCirclesLayer(config.circles);
      }
      if (config?.polygons && Array.isArray(config.polygons)) {
        addPolygonsLayer(config.polygons);
      }
      if (config?.polylines && Array.isArray(config.polylines)) {
        addPolylinesLayer(config.polylines);
      }
      if (config?.heatmap && Array.isArray(config.heatmap)) {
        addHeatmapLayer(config.heatmap);
      }
      if (config?.clusters && Array.isArray(config.clusters)) {
        addClusterLayer(config.clusters);
      }
      if (config?.barcharts && Array.isArray(config.barcharts)) {
        addBarChartLayer(config.barcharts);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (!hasLocatedRef.current) {
        const located = forceLocateToFirstMarker(config);
        if (!located) {
          let centerCoord: [number, number] | null = null;
          if (
            config?.view?.center &&
            Array.isArray(config.view.center) &&
            config.view.center.length === 2
          ) {
            const [lng, lat] = config.view.center;
            if (
              typeof lng === "number" &&
              typeof lat === "number" &&
              !isNaN(lng) &&
              !isNaN(lat)
            ) {
              centerCoord = [lng, lat];
            }
          } else if (config?.earthview?.view?.center) {
            const [lng, lat] = config.earthview.view.center;
            if (
              typeof lng === "number" &&
              typeof lat === "number" &&
              !isNaN(lng) &&
              !isNaN(lat)
            ) {
              centerCoord = [lng, lat];
            }
          }
          if (centerCoord) {
            locateToCoordinate(centerCoord, "view.center");
          }
        }
      }
    },
    [
      isReady,
      addMarkersLayer,
      addCirclesLayer,
      addPolygonsLayer,
      addPolylinesLayer,
      addHeatmapLayer,
      addClusterLayer,
      addBarChartLayer,
      forceLocateToFirstMarker,
      locateToCoordinate,
    ],
  );

  useEffect(() => {
    const handleLocate = (event: CustomEvent) => {
      const { center, mapData: eventMapData } = event.detail;
      if (eventMapData && earthViewRef.current && isReady) {
        applyEarthViewConfig(eventMapData);
      } else if (
        earthViewRef.current &&
        isReady &&
        center &&
        Array.isArray(center) &&
        center.length === 2
      ) {
        const [lng, lat] = center;
        if (
          typeof lng === "number" &&
          typeof lat === "number" &&
          !isNaN(lng) &&
          !isNaN(lat)
        ) {
          locateToCoordinate([lng, lat], "locate-event");
        }
      }
    };

    window.addEventListener("earthview-locate", handleLocate as EventListener);
    window.addEventListener("EarthView-locate", handleLocate as EventListener);

    return () => {
      window.removeEventListener(
        "earthview-locate",
        handleLocate as EventListener,
      );
      window.removeEventListener(
        "EarthView-locate",
        handleLocate as EventListener,
      );
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
    if (!containerRef.current) return;
    if (earthViewRef.current) {
      earthViewRef.current.destroy();
      earthViewRef.current = null;
      setIsReady(false);
      hasLocatedRef.current = false;
    }
    let initialCenter: [number, number] = DEFAULT_CENTER;
    const firstCoord = getFirstCoordinateFromConfig(mapData);
    if (firstCoord) {
      initialCenter = firstCoord;
    } else if (
      mapData?.view?.center &&
      Array.isArray(mapData.view.center) &&
      mapData.view.center.length === 2
    ) {
      const [lng, lat] = mapData.view.center;
      if (
        typeof lng === "number" &&
        typeof lat === "number" &&
        !isNaN(lng) &&
        !isNaN(lat)
      ) {
        initialCenter = [lng, lat];
      }
    } else if (mapData?.earthview?.view?.center) {
      const [lng, lat] = mapData.earthview.view.center;
      if (
        typeof lng === "number" &&
        typeof lat === "number" &&
        !isNaN(lng) &&
        !isNaN(lat)
      ) {
        initialCenter = [lng, lat];
      }
    }
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
      }
    };
  }, [theme, i18n]);

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
};

export default IntegratedEarthView;
