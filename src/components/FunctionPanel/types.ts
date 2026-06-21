import { UploadFile } from "../../core/types";

export type FunctionTab = "preview" | "map" | "chart";

export interface FunctionTabConfig {
    id: FunctionTab;
    name: string;
    icon: string;
    closable?: boolean;
}

export type FunctionModule = "preview" | "candleview" | "earthview";

export interface ModuleConfig {
    id: FunctionModule;
    name: string;
    icon: string;
    component: React.ReactNode;
    closable?: boolean;
    taskId?: string;
    fileId?: string;
}

export interface FunctionPanelProps {
    theme: "light" | "dark";
    i18n: "en" | "zh-cn";
    t: (key: string, params?: any) => string;
    currentSessionId?: string;
    onClose: () => void;
    onSendSkillMessage?: (message: string, files?: UploadFile[]) => void;
}