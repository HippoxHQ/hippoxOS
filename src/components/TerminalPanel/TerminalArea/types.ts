import { ExecutionLog, UploadFile } from "../../../types/type";

export interface TerminalAreaProps {
  logs: ExecutionLog[];
  onClearLogs: () => void;
  t: (key: string, params?: any) => string;
  currentSessionId?: string;
  onFileClick?: (file: UploadFile) => void;
  theme: "light" | "dark";
  i18n: "en" | "zh-cn";
  onOpenFunctionArea: () => void;
}

export interface FilesScrollState {
  showLeft: boolean;
  showRight: boolean;
}

export interface FilesScrollStatesMap extends Map<string, FilesScrollState> { }