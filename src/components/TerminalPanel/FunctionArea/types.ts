export type FunctionModule =
  | "candleview"
  | "indicator"
  | "analysis"
  | "pattern"
  | "backtest"
  | "strategy"
  | "signal"
  | "news"
  | "sentiment"
  | "volatility"
  | "correlation"
  | "risk"
  | "earthos";

export interface ModuleConfig {
  id: FunctionModule;
  name: string;
  icon: string;
  component: React.ReactNode;
  closable?: boolean;
}

export interface FunctionAreaProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
  onClose: () => void;
  containerHeight: number;
  defaultModule?: "candleview" | "earthos" | null;
}