import {
  BasemapTypeEnum,
  CoordinateSystemTypeEnum,
  EarthView,
} from "@earthview/core";
import React, { useEffect, useRef, useState, useCallback } from "react";

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
  const saveAndRestoreTheme = useCallback(() => {
    const root = document.documentElement;
    const savedVariables: Record<string, string> = {};
    const variablesToSave = [
      "--bg-primary",
      "--bg-secondary",
      "--bg-tertiary",
      "--text-primary",
      "--text-secondary",
      "--text-tertiary",
      "--border-color",
      "--accent-color",
      "--hover-bg",
    ];
    variablesToSave.forEach((varName) => {
      savedVariables[varName] =
        getComputedStyle(root).getPropertyValue(varName);
    });
    return savedVariables;
  }, []);
  const restoreTheme = useCallback((savedVariables: Record<string, string>) => {
    const root = document.documentElement;
    Object.entries(savedVariables).forEach(([varName, value]) => {
      if (value) {
        root.style.setProperty(varName, value);
      }
    });
  }, []);
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
    const savedTheme = saveAndRestoreTheme();
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
    setTimeout(() => {
      restoreTheme(savedTheme);
    }, 0);
    return () => {
      if (earthViewRef.current) {
        earthViewRef.current.destroy();
        earthViewRef.current = null;
        setIsReady(false);
      }
      restoreTheme(savedTheme);
    };
  }, [
    theme,
    i18n,
    onLoad,
    onMapClick,
    onMoveEnd,
    saveAndRestoreTheme,
    restoreTheme,
  ]);

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
