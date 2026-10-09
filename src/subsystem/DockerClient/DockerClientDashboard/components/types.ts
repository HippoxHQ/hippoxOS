/**
 * Shared helpers for translating Docker container states into localized, human-readable labels.
 */
export const KNOWN_CONTAINER_STATES = [
    "running",
    "exited",
    "paused",
    "created",
    "restarting",
    "removing",
    "dead",
] as const;
/**
 * Translate a raw Docker container state into a localized label.
 */
export const translateContainerState = (state: string, isZh: boolean): string => {
    const key = state.trim().toLowerCase();
    const zh: Record<string, string> = {
        running: "运行中",
        exited: "已退出",
        paused: "已暂停",
        created: "已创建",
        restarting: "重启中",
        removing: "删除中",
        dead: "已失效",
    };
    const en: Record<string, string> = {
        running: "Running",
        exited: "Exited",
        paused: "Paused",
        created: "Created",
        restarting: "Restarting",
        removing: "Removing",
        dead: "Dead",
    };
    const table = isZh ? zh : en;
    return table[key] ?? state;
};