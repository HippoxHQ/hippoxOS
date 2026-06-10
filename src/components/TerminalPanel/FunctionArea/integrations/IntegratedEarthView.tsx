import {
  BasemapTypeEnum,
  CoordinateSystemTypeEnum,
  EarthView,
} from "@earthview/core";
import React, { useEffect, useRef, useState } from "react";

interface IntegratedEarthViewProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  onLoad?: (earthView: EarthView) => void;
  onMapClick?: (event: any) => void;
  onMoveEnd?: (center: [number, number], zoom: number) => void;
}

export const IntegratedEarthView: React.FC<IntegratedEarthViewProps> = ({
  theme,
  i18n,
  onLoad,
  onMapClick,
  onMoveEnd,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const earthViewRef = useRef<EarthView | null>(null);
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const handleLocate = (event: CustomEvent) => {
      const { center, zoom } = event.detail;
      if (earthViewRef.current && isReady) {
        earthViewRef.current.setCenter(center);
        if (zoom !== undefined) {
          earthViewRef.current.setZoom(zoom);
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
  }, [isReady]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (earthViewRef.current) {
      earthViewRef.current.destroy();
      earthViewRef.current = null;
      setIsReady(false);
    }
    const earthView = new EarthView({
      container: containerRef.current,
      basemap: BasemapTypeEnum.SATELLITE,
      center: [-74.006, 40.7128],
      zoom: 10,
      coordinateSystem: CoordinateSystemTypeEnum.WGS84,
      theme: theme === "dark" ? "dark" : "light",
      i18n: i18n === "zh-cn" ? "zh" : "en",
      enableDrawing: true,
      onLoad: () => {
        setIsReady(true);
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
      }
    };
  }, [theme, i18n, onLoad, onMapClick, onMoveEnd]);

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
