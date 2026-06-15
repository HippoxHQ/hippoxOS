import { invoke } from "@tauri-apps/api/core";
import { taskPoolCommands } from "../../core/TaskPool";
import { sessionCommands } from "../../command/session";

export const loadAllTasksFromBackups = async (): Promise<any[]> => {
  try {
    const backups = await taskPoolCommands.listBackups();
    let allTasks: any[] = [];
    for (const backup of backups) {
      try {
        const content = await invoke<string>("cmd_read_text_file", {
          path: backup.path,
        });
        const data = JSON.parse(content);
        if (data.tasks && Array.isArray(data.tasks)) {
          allTasks = allTasks.concat(data.tasks);
        }
      } catch (e) {
        console.error("Failed to load backup:", backup.path, e);
      }
    }
    return allTasks;
  } catch (e) {
    console.error("Failed to list backups:", e);
    return [];
  }
};

export const loadAllSessions = async (): Promise<any[]> => {
  try {
    const sessions = await sessionCommands.listSessions();
    return sessions;
  } catch (e) {
    console.error("Failed to list sessions:", e);
    return [];
  }
};

export const loadSessionChat = async (sessionId: string): Promise<any[]> => {
  try {
    const content = await sessionCommands.loadChatContent(sessionId);
    if (Array.isArray(content)) {
      return content;
    }
    if (content && typeof content === "string") {
      return JSON.parse(content);
    }
    return [];
  } catch (e) {
    console.error("Failed to load chat content for session:", sessionId, e);
    return [];
  }
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};

export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};