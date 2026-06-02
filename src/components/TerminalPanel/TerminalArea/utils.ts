import { open } from "@tauri-apps/plugin-shell";
import { filesCommands } from "../../../api/files";
import { TaskStatusEnum, StepStatusEnum } from "../../../types/type";
import { showToast, ToastType } from "../../Toast";

export const logToConsole = (level: string, message: string, data?: any) => {
  const timestamp = new Date().toLocaleTimeString();
  switch (level) {
    case "error":
      console.error(`[${timestamp}] ${message}`, data || "");
      break;
    case "warn":
      console.warn(`[${timestamp}] ${message}`, data || "");
      break;
    case "info":
      console.info(`[${timestamp}] ${message}`, data || "");
      break;
    default:
      console.log(`[${timestamp}] ${message}`, data || "");
  }
};

export const getTaskStatusIcon = (status: string): string => {
  switch (status) {
    case TaskStatusEnum.Completed:
      return "✅";
    case TaskStatusEnum.Failed:
      return "❌";
    case TaskStatusEnum.Running:
      return "🔄";
    case TaskStatusEnum.Pending:
      return "⏳";
    case TaskStatusEnum.Paused:
      return "⏸️";
    case TaskStatusEnum.Cancelled:
      return "⏹️";
    case TaskStatusEnum.Timeout:
      return "⏰";
    default:
      return "📌";
  }
};

export const getTaskStatusText = (t: (key: string) => string, status: string) => {
  switch (status) {
    case TaskStatusEnum.Completed:
      return t("terminal.status.completed");
    case TaskStatusEnum.Failed:
      return t("terminal.status.failed");
    case TaskStatusEnum.Running:
      return t("terminal.status.running");
    case TaskStatusEnum.Pending:
      return t("terminal.status.pending");
    case TaskStatusEnum.Paused:
      return t("terminal.status.paused");
    case TaskStatusEnum.Cancelled:
      return t("terminal.status.cancelled");
    case TaskStatusEnum.Timeout:
      return t("terminal.status.timeout");
    default:
      return status;
  }
};

export const getStepStatusIcon = (status: string): string => {
  switch (status) {
    case StepStatusEnum.Success:
      return "✅";
    case StepStatusEnum.Failure:
      return "❌";
    case StepStatusEnum.Running:
      return "🔄";
    default:
      return "⏳";
  }
};

export const getStepStatusText = (status: string): string => {
  switch (status) {
    case StepStatusEnum.Success:
      return "terminal.status.completed";
    case StepStatusEnum.Failure:
      return "terminal.status.failed";
    case StepStatusEnum.Running:
      return "terminal.status.running";
    default:
      return status;
  }
};

export const formatTime = (timeStr: string) => {
  try {
    const date = new Date(timeStr);
    return date.toLocaleTimeString();
  } catch {
    return "";
  }
};

export const formatDuration = (ms?: number): string => {
  if (ms === undefined) return "";
  if (ms === 0) return "<1ms";
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms}ms`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const formatParameters = (params?: string): string => {
  if (!params || params === "{}") return "";
  try {
    const parsed = JSON.parse(params);
    const keys = Object.keys(parsed);
    if (keys.length === 0) return "";
    const shortParams = keys
      .slice(0, 3)
      .map((k) => `${k}: ${JSON.stringify(parsed[k]).substring(0, 30)}`)
      .join(", ");
    return keys.length > 3 ? `${shortParams}...` : shortParams;
  } catch {
    return params.length > 50 ? params.substring(0, 50) + "..." : params;
  }
};

export const getFullParams = (params: string): string => {
  try {
    const parsed = JSON.parse(params);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return params;
  }
};

export const getShortParams = (params: string): string => {
  if (!params || params === "{}") return "";
  try {
    const parsed = JSON.parse(params);
    const keys = Object.keys(parsed);
    if (keys.length === 0) return "";
    const shortParams = keys
      .slice(0, 3)
      .map((k) => `${k}: ${JSON.stringify(parsed[k]).substring(0, 30)}`)
      .join(", ");
    return keys.length > 3 ? `${shortParams}...` : shortParams;
  } catch {
    return params.length > 50 ? params.substring(0, 50) + "..." : params;
  }
};

export const copyToClipboard = async (text: string | undefined, t: (key: string) => string) => {
  try {
    if (!text) {
      showToast(ToastType.ERROR, t("common.copyFailed") || "Copy Failed");
      return;
    }
    await navigator.clipboard.writeText(text);
    showToast(ToastType.SUCCESS, t("common.copied") || "Copied");
  } catch (err) {
    showToast(ToastType.ERROR, t("common.copyFailed") || "Copy Failed");
  }
};

export const openUrl = async (url: string, t: (key: string, params?: any) => string) => {
  try {
    await open(url);
  } catch (error) {
    console.error("Failed to open URL:", error);
    showToast(
      ToastType.ERROR,
      t("common.openUrlFailed", { url }) || `Unable to open link: ${url}`,
    );
  }
};

export const handleOpenPath = async (path: string, t: (key: string, params?: any) => string) => {
  try {
    await filesCommands.openPath(path);
  } catch (error) {
    showToast(
      ToastType.ERROR,
      t("common.openPathFailed", { path }) || `Unable to open: ${path}`,
    );
  }
};