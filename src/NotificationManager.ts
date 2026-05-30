import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export enum NotificationType {
    Info = "info",
    Success = "success",
    Warning = "warning",
    Error = "error",
}

export interface SystemNotification {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    timestamp: string;
    read: boolean;
    data?: any;
}

export interface AddNotificationParams {
    title: string;
    message: string;
    type?: NotificationType;
    data?: any;
}

type NotificationListener = (notifications: SystemNotification[]) => void;

class NotificationManager {
    private notifications: SystemNotification[] = [];
    private listeners: Set<NotificationListener> = new Set();
    private unreadCount: number = 0;
    private initialized: boolean = false;

    constructor() {
        this.init();
    }

    private async init() {
        await this.initialize();
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;
        await this.loadNotifications();
        this.setupEventListeners();
        this.initialized = true;
    }

    private async loadNotifications(): Promise<void> {
        try {
            this.notifications = await invoke<SystemNotification[]>("cmd_notification_get_all");
            this.updateUnreadCount();
            this.notifyListeners();
        } catch (error) {
            console.error("[NotificationManager] Failed to load notifications:", error);
        }
    }

    private updateUnreadCount(): void {
        this.unreadCount = this.notifications.filter(n => !n.read).length;
        window.dispatchEvent(new CustomEvent("system-notification-count-update", {
            detail: { count: this.unreadCount }
        }));
    }

    private notifyListeners(): void {
        this.listeners.forEach(listener => listener([...this.notifications]));
    }

    private showToast(message: string, type: NotificationType): void {
        window.dispatchEvent(new CustomEvent("show-toast", {
            detail: { message, type }
        }));
    }

    private setupEventListeners(): void {
        listen("task_complete", (event: any) => {
            this.add({
                title: "notification.taskCompleted",
                message: event.payload.final_output?.slice(0, 100) || "Task completed",
                type: NotificationType.Success,
                data: event.payload,
            });
        });

        listen("task_failed", (event: any) => {
            this.add({
                title: "notification.taskFailed",
                message: event.payload.error || "Task failed",
                type: NotificationType.Error,
                data: event.payload,
            });
        });

        listen("task_step_update", (event: any) => {
            const { step_name, status, output } = event.payload;
            if (status === "FAILURE") {
                this.add({
                    title: "notification.taskStepUpdate",
                    message: `Step "${step_name}" failed: ${output || "Unknown error"}`,
                    type: NotificationType.Warning,
                    data: event.payload,
                });
            }
        });

        listen("skill_installed", (event: any) => {
            this.add({
                title: "notification.skillInstalled",
                message: event.payload.skill_name || "Skill installed successfully",
                type: NotificationType.Success,
                data: event.payload,
            });
        });
        listen("skill_updated", (event: any) => {
            this.add({
                title: "notification.skillUpdated",
                message: event.payload.skill_name || "Skill updated successfully",
                type: NotificationType.Success,
                data: event.payload,
            });
        });
        listen("task_created", (event: any) => {
            this.add({
                title: "notification.taskCreated",
                message: event.payload.task_name || "New task created",
                type: NotificationType.Info,
                data: event.payload,
            });
        });
        listen("system_ready", (event: any) => {
            this.add({
                title: "notification.systemReady",
                message: event.payload.message || "System ready",
                type: NotificationType.Success,
                data: event.payload,
            });
        });
        listen("engine_initialized", (event: any) => {
            this.add({
                title: "notification.engineInitialized",
                message: event.payload.engine_name || "Engine initialized successfully",
                type: NotificationType.Success,
                data: event.payload,
            });
        });
    }

    async add(params: AddNotificationParams): Promise<SystemNotification> {
        try {
            const notification = await invoke<SystemNotification>("cmd_notification_add", {
                params: {  
                    title: params.title,
                    message: params.message,
                    notificationType: params.type || NotificationType.Info,
                    data: params.data,
                }
            });
            await this.loadNotifications();
            this.showToast(params.message, params.type || NotificationType.Info);
            return notification;
        } catch (error) {
            console.error("[NotificationManager] Failed to add notification:", error);
            throw error;
        }
    }

    async addInfo(title: string, message: string, data?: any): Promise<SystemNotification> {
        return this.add({ title, message, type: NotificationType.Info, data });
    }
    async addSuccess(title: string, message: string, data?: any): Promise<SystemNotification> {
        return this.add({ title, message, type: NotificationType.Success, data });
    }
    async addWarning(title: string, message: string, data?: any): Promise<SystemNotification> {
        return this.add({ title, message, type: NotificationType.Warning, data });
    }
    async addError(title: string, message: string, data?: any): Promise<SystemNotification> {
        return this.add({ title, message, type: NotificationType.Error, data });
    }
    async getAll(): Promise<SystemNotification[]> {
        if (!this.initialized) {
            await this.loadNotifications();
        }
        return [...this.notifications];
    }
    async getUnread(): Promise<SystemNotification[]> {
        try {
            return await invoke<SystemNotification[]>("cmd_notification_get_unread");
        } catch (error) {
            console.error("[NotificationManager] Failed to get unread notifications:", error);
            return [];
        }
    }
    getUnreadCountSync(): number {
        return this.unreadCount;
    }

    async getUnreadCount(): Promise<number> {
        try {
            return await invoke<number>("cmd_notification_get_unread_count");
        } catch (error) {
            console.error("[NotificationManager] Failed to get unread count:", error);
            return 0;
        }
    }
    async getById(id: string): Promise<SystemNotification | null> {
        try {
            return await invoke<SystemNotification | null>("cmd_notification_get_by_id", { id });
        } catch (error) {
            console.error("[NotificationManager] Failed to get notification by id:", error);
            return null;
        }
    }
    async getLatest(limit: number = 10): Promise<SystemNotification[]> {
        try {
            return await invoke<SystemNotification[]>("cmd_notification_get_latest", { limit });
        } catch (error) {
            console.error("[NotificationManager] Failed to get latest notifications:", error);
            return [];
        }
    }
    async getByDateRange(startDate: string, endDate: string): Promise<SystemNotification[]> {
        try {
            return await invoke<SystemNotification[]>("cmd_notification_get_by_date_range", { startDate, endDate });
        } catch (error) {
            console.error("[NotificationManager] Failed to get notifications by date range:", error);
            return [];
        }
    }
    async markAsRead(id: string): Promise<boolean> {
        try {
            const result = await invoke<boolean>("cmd_notification_mark_as_read", { id });
            if (result) {
                await this.loadNotifications();
            }
            return result;
        } catch (error) {
            console.error("[NotificationManager] Failed to mark as read:", error);
            return false;
        }
    }
    async markAllAsRead(): Promise<number> {
        try {
            const count = await invoke<number>("cmd_notification_mark_all_as_read");
            await this.loadNotifications();
            return count;
        } catch (error) {
            console.error("[NotificationManager] Failed to mark all as read:", error);
            return 0;
        }
    }
    async delete(id: string): Promise<boolean> {
        try {
            const result = await invoke<boolean>("cmd_notification_delete", { id });
            if (result) {
                await this.loadNotifications();
            }
            return result;
        } catch (error) {
            console.error("[NotificationManager] Failed to delete notification:", error);
            return false;
        }
    }
    async deleteRead(): Promise<number> {
        try {
            const count = await invoke<number>("cmd_notification_delete_read");
            await this.loadNotifications();
            return count;
        } catch (error) {
            console.error("[NotificationManager] Failed to delete read notifications:", error);
            return 0;
        }
    }
    async deleteByType(type: NotificationType): Promise<number> {
        try {
            const count = await invoke<number>("cmd_notification_delete_by_type", { notificationType: type });
            await this.loadNotifications();
            return count;
        } catch (error) {
            console.error("[NotificationManager] Failed to delete by type:", error);
            return 0;
        }
    }
    async clearAll(): Promise<number> {
        try {
            const count = await invoke<number>("cmd_notification_clear_all");
            await this.loadNotifications();
            return count;
        } catch (error) {
            console.error("[NotificationManager] Failed to clear all:", error);
            return 0;
        }
    }
    async refresh(): Promise<void> {
        await this.loadNotifications();
    }
    subscribe(listener: NotificationListener): () => void {
        this.listeners.add(listener);
        listener([...this.notifications]);
        return () => this.listeners.delete(listener);
    }
}

export const notificationManager = new NotificationManager();

export const systemNotificationService = {
    initialize: () => notificationManager.initialize(),
    add: (params: AddNotificationParams) => notificationManager.add(params),
    addInfo: (title: string, message: string, data?: any) => notificationManager.addInfo(title, message, data),
    addSuccess: (title: string, message: string, data?: any) => notificationManager.addSuccess(title, message, data),
    addWarning: (title: string, message: string, data?: any) => notificationManager.addWarning(title, message, data),
    addError: (title: string, message: string, data?: any) => notificationManager.addError(title, message, data),
    getAll: () => notificationManager.getAll(),
    getUnread: () => notificationManager.getUnread(),
    getUnreadCount: () => notificationManager.getUnreadCount(),
    markAsRead: (id: string) => notificationManager.markAsRead(id),
    markAllAsRead: () => notificationManager.markAllAsRead(),
    delete: (id: string) => notificationManager.delete(id),
    clearAll: () => notificationManager.clearAll(),
    subscribe: (listener: (notifications: SystemNotification[]) => void) => notificationManager.subscribe(listener),
};

export const notificationService = systemNotificationService;

export const notifySystem = {
    info: (title: string, message: string, data?: any) => notificationManager.addInfo(title, message, data),
    success: (title: string, message: string, data?: any) => notificationManager.addSuccess(title, message, data),
    warning: (title: string, message: string, data?: any) => notificationManager.addWarning(title, message, data),
    error: (title: string, message: string, data?: any) => notificationManager.addError(title, message, data),
};

export const notify = notifySystem;
export const showNotification = notifySystem;