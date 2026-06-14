export type FunctionModule =
  | FunctionInstance.Canldeview
  | FunctionInstance.Earthview;

export interface ModuleConfig {
  id: FunctionModule;
  name: string;
  icon: string;
  component: React.ReactNode;
  closable?: boolean;
  taskId?: string;
}

export interface FunctionAreaProps {
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
  onClose: () => void;
  containerHeight: number;
  defaultModule?: FunctionInstance.Canldeview | FunctionInstance.Earthview | null;
  defaultTaskId?: string;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export enum FunctionInstance {
  Canldeview = "candleview",
  Earthview = "earthview"
}