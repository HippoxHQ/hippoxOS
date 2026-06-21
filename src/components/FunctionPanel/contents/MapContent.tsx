import React, { useEffect, useState } from "react";
import IntegratedEarthView from "../integrations/IntegratedEarthView";

interface MapContentProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  taskId?: string;
  mapData?: any;
  t: (key: string, params?: any) => string;
}

export const MapContent: React.FC<MapContentProps> = ({
  theme,
  i18n,
  taskId,
  mapData,
  t,
}) => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (mapData) {
      setKey((prev) => prev + 1);
    }
  }, [mapData]);

  if (!mapData) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          color: "var(--text-tertiary)",
          fontSize: "14px",
        }}
      >
        {t("functionArea.loadingMap") || "Loading map..."}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        background: "var(--bg-secondary)",
      }}
    >
      <div style={{ flex: 1, width: "100%", height: "100%" }}>
        <IntegratedEarthView
          key={key}
          theme={theme}
          i18n={i18n}
          taskId={taskId}
          mapData={mapData}
        />
      </div>
    </div>
  );
};
