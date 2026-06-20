import { MenuItemWithSection } from "./types";

export const topMenuItems: MenuItemWithSection[] = [
    { id: "history", icon: "history", label: "menu.history", section: "main" },
    { id: "favorites", icon: "favorites", label: "menu.favorites", section: "main" },
    { id: "skillsManager", icon: "skillsManager", label: "menu.skillsManager", section: "ai" },
    { id: "skillMarket", icon: "skillMarket", label: "menu.skillMarket", section: "ai" },
    { id: "workspace", icon: "workspace", label: "menu.workspace", section: "main" },
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
            { id: "drivers", icon: "skills", label: "menu.drivers" },
            // {
            //     id: "engine_group",
            //     icon: "config",
            //     label: "menu.engineConfig",
            //     children: [
            //         { id: "engine_database", icon: "database", label: "settings.tab.database" },
            //         { id: "engine_network", icon: "network", label: "settings.tab.network" },
            //         { id: "engine_container", icon: "container", label: "settings.tab.container" },
            //         { id: "engine_notification", icon: "notification", label: "settings.tab.notification" },
            //     ],
            // },
            {
                id: "system_group",
                icon: "config",
                label: "menu.systemConfig",
                children: [
                    { id: "interface", icon: "config", label: "settings.interfaceConfig" },
                    { id: "workspaceConfig", icon: "config", label: "settings.workspaceConfig" },
                    { id: "storage", icon: "config", label: "menu.storage" },
                ],
            },
        ],
    },
];

export const allMenuItems = [...topMenuItems, ...bottomMenuItems];