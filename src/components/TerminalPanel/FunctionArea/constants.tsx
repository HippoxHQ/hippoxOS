import React from "react";
import { ModuleConfig, FunctionModule, FunctionInstance } from "./types";

export const getAllModules = (params: {
  cachedCandleView: React.ReactNode;
  cachedEarthView: React.ReactNode;
  t: (key: string, params?: any) => string;
}): ModuleConfig[] => {
  const { cachedCandleView, cachedEarthView, t } = params;

  return [
    {
      id: FunctionInstance.Canldeview,
      name: t("functionArea.candleChart"),
      icon: "📊",
      closable: true,
      component: cachedCandleView,
    },
    {
      id: FunctionInstance.Earthview,
      name: t("functionArea.earthMap"),
      icon: "🗺️",
      closable: true,
      component: cachedEarthView,
    },
  ];
};
