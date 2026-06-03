import React from "react";
import { ModuleConfig, FunctionModule } from "./types";

export const TEST_MODULES: FunctionModule[] = [
  "indicator",
  "analysis",
  "pattern",
  "backtest",
  "strategy",
  "signal",
  "news",
  "sentiment",
  "volatility",
  "correlation",
  "risk",
];

export const getAllModules = (params: {
  cachedCandleView: React.ReactNode;
  cachedEarthOS: React.ReactNode;
  t: (key: string, params?: any) => string;
}): ModuleConfig[] => {
  const { cachedCandleView, cachedEarthOS, t } = params;

  return [
    {
      id: "candleview",
      name: t("functionArea.candleChart"),
      icon: "📊",
      closable: true,
      component: cachedCandleView,
    },
    {
      id: "earthos",
      name: t("functionArea.earthMap"),
      icon: "🗺️",
      closable: true,
      component: cachedEarthOS,
    },
    {
      id: "indicator",
      name: t("functionArea.technicalIndicators"),
      icon: "📈",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>{t("functionArea.technicalIndicators")}</h3>
          <p>{t("functionArea.rsiValue", { value: "52.3" })}</p>
          <p>{t("functionArea.macdStatus", { status: "Golden Cross" })}</p>
          <p>
            {t("functionArea.bollingerStatus", {
              status: "Upper Band Breakout",
            })}
          </p>
          <p>{t("functionArea.kdjStatus", { status: "Overbought" })}</p>
        </div>
      ),
    },
    {
      id: "analysis",
      name: t("functionArea.aiAnalysis"),
      icon: "🤖",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>{t("functionArea.aiAnalysis")}</h3>
          <p>
            Based on current candlestick patterns, the market is in an upward
            channel...
          </p>
          <p>{t("functionArea.supportLevel", { value: "$65,000" })}</p>
          <p>{t("functionArea.resistanceLevel", { value: "$68,500" })}</p>
        </div>
      ),
    },
    {
      id: "pattern",
      name: t("functionArea.patternRecognition"),
      icon: "🔍",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>{t("functionArea.patternRecognition")}</h3>
          <p>Detected: Head and Shoulders Bottom</p>
          <p>{t("functionArea.confidence", { value: "85%" })}</p>
          <p>{t("functionArea.targetPrice", { value: "$70,000" })}</p>
        </div>
      ),
    },
    {
      id: "backtest",
      name: t("functionArea.backtest"),
      icon: "⏮️",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>{t("functionArea.backtest")}</h3>
          <p>{t("functionArea.winRate", { value: "62.5%" })}</p>
          <p>{t("functionArea.maxDrawdown", { value: "-12.3%" })}</p>
          <p>{t("functionArea.sharpeRatio", { value: "1.8" })}</p>
        </div>
      ),
    },
    {
      id: "strategy",
      name: t("functionArea.strategies"),
      icon: "⚙️",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>{t("functionArea.strategies")}</h3>
          <p>Grid Trading Strategy</p>
          <p>Martingale Strategy</p>
          <p>Trend Following Strategy</p>
        </div>
      ),
    },
    {
      id: "signal",
      name: t("functionArea.signals"),
      icon: "🔔",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>{t("functionArea.signals")}</h3>
          <p>🟢 Buy Signal (2024-01-15)</p>
          <p>🔴 Sell Signal (2024-01-10)</p>
          <p>🟡 Wait Signal</p>
        </div>
      ),
    },
    {
      id: "news",
      name: t("functionArea.news"),
      icon: "📰",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>{t("functionArea.news")}</h3>
          <p>• BTC breaks $70,000 to new highs</p>
          <p>• Institutional funds continue to flow in</p>
          <p>• Halving expected to drive upward momentum</p>
        </div>
      ),
    },
    {
      id: "sentiment",
      name: t("functionArea.sentiment"),
      icon: "😊",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>{t("functionArea.sentiment")}</h3>
          <p>{t("functionArea.fearGreedIndex", { value: "72 (Greed)" })}</p>
          <p>{t("functionArea.longShortRatio", { value: "1.25" })}</p>
          <p>{t("functionArea.fundingRate", { value: "0.01%" })}</p>
        </div>
      ),
    },
    {
      id: "volatility",
      name: t("functionArea.volatility"),
      icon: "📊",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>{t("functionArea.volatility")}</h3>
          <p>{t("functionArea.historicalVolatility", { value: "45%" })}</p>
          <p>{t("functionArea.impliedVolatility", { value: "52%" })}</p>
          <p>{t("functionArea.volatilityCone", { value: "Mid-High" })}</p>
        </div>
      ),
    },
    {
      id: "correlation",
      name: t("functionArea.correlation"),
      icon: "🔗",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>{t("functionArea.correlation")}</h3>
          <p>BTC-ETH: 0.85</p>
          <p>BTC-S&P500: 0.32</p>
          <p>BTC-DXY: -0.28</p>
        </div>
      ),
    },
    {
      id: "risk",
      name: t("functionArea.riskManagement"),
      icon: "🛡️",
      closable: true,
      component: (
        <div style={{ padding: "20px", color: "var(--text-primary)" }}>
          <h3>{t("functionArea.riskManagement")}</h3>
          <p>{t("functionArea.currentPosition", { value: "30%" })}</p>
          <p>{t("functionArea.stopLossSuggestion", { value: "$62,000" })}</p>
          <p>{t("functionArea.takeProfitSuggestion", { value: "$72,000" })}</p>
        </div>
      ),
    },
  ];
};
