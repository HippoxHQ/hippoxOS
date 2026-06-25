import { MenuItemWithSection } from "./types";

export const topMenuItems: MenuItemWithSection[] = [
    { id: "generalChat", icon: "history", label: "menu.general", section: "main" },
    { id: "codeEditorChat", icon: "codeEditor", label: "menu.codeEditor", section: "main" },
    { id: "chartChat", icon: "chart", label: "menu.chart", section: "main" },
    { id: "mapChat", icon: "map", label: "menu.map", section: "main" },
    { id: "skillsManager", icon: "skillsManager", label: "menu.skillsManager", section: "ai" },
    { id: "skillMarket", icon: "skillMarket", label: "menu.skillMarket", section: "ai" },
    { id: "favorites", icon: "favorites", label: "menu.favorites", section: "main" },
    {
        id: "tasks_group",
        icon: "tasks",
        label: "menu.tasksGroup",
        section: "ai",
        children: [
            { id: "scheduledTasks", icon: "scheduledTasks", label: "menu.scheduledTasks" },
            { id: "taskQueue", icon: "taskQueue", label: "menu.taskQueue" },
        ],
    },
    { id: "workspace", icon: "workspace", label: "menu.workspace", section: "main" },
    { id: "logs", icon: "logs", label: "menu.logs", section: "config" },
];

export const bottomMenuItems: MenuItemWithSection[] = [
    {
        id: "settings_group",
        icon: "settings",
        label: "menu.settings",
        section: "config",
        children: [
            { id: "llmModel", icon: "settings", label: "menu.llmModelConfig" },
            { id: "universal", icon: "config", label: "settings.universalSettings" },
            { id: "workspaceConfig", icon: "config", label: "settings.workspaceConfig" },
            { id: "storage", icon: "config", label: "menu.storage" },
            { id: "drivers", icon: "skills", label: "menu.drivers" },
            // {
            //     id: "system_group",
            //     icon: "config",
            //     label: "menu.systemConfig",
            //     children: [
            //         { id: "interface", icon: "config", label: "settings.universalSettings" },
            //         { id: "workspaceConfig", icon: "config", label: "settings.workspaceConfig" },
            //         { id: "storage", icon: "config", label: "menu.storage" },
            //     ],
            // },
        ],
    },
];

export const allMenuItems = [...topMenuItems, ...bottomMenuItems];