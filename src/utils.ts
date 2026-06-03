import { open } from "@tauri-apps/plugin-shell";
import { showToast, ToastType } from "./components/Toast";
import { filesCommands } from "./api/files";

export const openUrl = async (
    url: string,
    t: (key: string, params?: any) => string,
) => {
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

export const handleOpenPath = async (
    path: string,
    t: (key: string, params?: any) => string,
) => {
    try {
        await filesCommands.openPath(path);
    } catch (error) {
        showToast(
            ToastType.ERROR,
            t("common.openPathFailed", { path }) || `Unable to open: ${path}`,
        );
    }
};
