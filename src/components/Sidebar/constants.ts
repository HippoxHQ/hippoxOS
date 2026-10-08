import { MenuItemWithSection } from "./types";
const SubSytemSwitch = {
    generalChat: true,
    videoEditor: true,
    chartChat: true,
    codeEditorChat: true,
    mapChat: true,
    sandbox3d: true,
    blockchain: true,
    imageEditor: true,
    pixelEditor: true,
    databaseClient: true,
    dockerClient: true,
    apiClient: true,
}
export const topMenuItems: MenuItemWithSection[] = [];
if (SubSytemSwitch.generalChat) { topMenuItems.push({ id: "generalChat", icon: "chat", label: "menu.general", section: "main" }); }
if (SubSytemSwitch.videoEditor) { topMenuItems.push({ id: "videoEditor", icon: "videoEditor", label: "menu.videoEditor", section: "main" }); }
// New buttons below video editor
if (SubSytemSwitch.imageEditor) { topMenuItems.push({ id: "imageEditor", icon: "imageEditor", label: "menu.imageEditor", section: "main" }); }
if (SubSytemSwitch.pixelEditor) { topMenuItems.push({ id: "pixelEditor", icon: "pixelEditor", label: "menu.pixelEditor", section: "main" }); }
if (SubSytemSwitch.chartChat) { topMenuItems.push({ id: "chartChat", icon: "chart", label: "menu.chart", section: "main" }); }
if (SubSytemSwitch.codeEditorChat) { topMenuItems.push({ id: "codeEditorChat", icon: "codeEditor", label: "menu.codeEditor", section: "main" }); }
if (SubSytemSwitch.mapChat) { topMenuItems.push({ id: "mapChat", icon: "map", label: "menu.map", section: "main" }); }
// New buttons below map module
if (SubSytemSwitch.databaseClient) { topMenuItems.push({ id: "databaseClient", icon: "databaseClient", label: "menu.databaseClient", section: "main" }); }
if (SubSytemSwitch.dockerClient) { topMenuItems.push({ id: "dockerClient", icon: "dockerClient", label: "menu.dockerClient", section: "main" }); }
if (SubSytemSwitch.apiClient) { topMenuItems.push({ id: "apiClient", icon: "apiClient", label: "menu.apiClient", section: "main" }); }
if (SubSytemSwitch.sandbox3d) { topMenuItems.push({ id: "sandbox3d", icon: "sandbox3d", label: "menu.sandbox3d", section: "main" }); }
if (SubSytemSwitch.blockchain) {
    topMenuItems.push({ id: "blockchain", icon: "blockchain", label: "menu.blockchain", section: "main" },);
}
topMenuItems.push(
    { id: "skillsManager", icon: "skillsManager", label: "menu.skillsManager", section: "ai" }
);
topMenuItems.push({ id: "skillMarket", icon: "skillMarket", label: "menu.skillMarket", section: "ai" });
topMenuItems.push({ id: "favorites", icon: "favorites", label: "menu.favorites", section: "main" });
topMenuItems.push({
    id: "tasks_group",
    icon: "tasks",
    label: "menu.tasksGroup",
    section: "ai",
    children: [
        { id: "scheduledTasks", icon: "scheduledTasks", label: "menu.scheduledTasks" },
        { id: "taskQueue", icon: "taskQueue", label: "menu.taskQueue" },
    ],
});
topMenuItems.push({ id: "workspace", icon: "workspace", label: "menu.workspace", section: "main" });
topMenuItems.push({ id: "logs", icon: "logs", label: "menu.logs", section: "config" });
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