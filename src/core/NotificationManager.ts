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
/**
 * NotificationManager - Manages system notifications with backend persistence and local fallback
 */
class NotificationManager {
    private notifications: SystemNotification[] = [];
    private listeners: Set<NotificationListener> = new Set();
    private unreadCount: number = 0;
    private initialized: boolean = false;
    private isInitializing: boolean = false;
    constructor() {
        this.init();
    }
    private async init(): Promise<void> {
        await this.initialize();
    }
    /**
     * Ensure the manager is initialized before any operation
     */
    private async ensureInitialized(): Promise<void> {
        if (this.initialized) return;
        if (this.isInitializing) {
            await new Promise<void>((resolve) => {
                const check = () => {
                    if (this.initialized) {
                        resolve();
                    } else {
                        setTimeout(check, 50);
                    }
                };
                check();
            });
            return;
        }
        await this.initialize();
    }
    /**
     * Initialize the notification manager
     */
    async initialize(): Promise<void> {
        if (this.initialized) return;
        if (this.isInitializing) return;
        this.isInitializing = true;
        try {
            await this.loadNotifications();
            this.setupEventListeners();
            this.initialized = true;
        } catch (error) {
            console.warn("[NotificationManager] Init failed, using empty state:", error);
            this.notifications = [];
            this.updateUnreadCount();
            this.initialized = true;
        } finally {
            this.isInitializing = false;
        }
    }
    /**
     * Load notifications from backend, fallback to local state on error
     */
    private async loadNotifications(): Promise<void> {
        try {
            const result = await invoke<SystemNotification[]>("cmd_notification_get_all");
            this.notifications = result || [];
            this.updateUnreadCount();
            this.notifyListeners();
        } catch (error) {
            console.warn("[NotificationManager] Failed to load notifications, keeping local state:", error);
            // Keep existing notifications as fallback
            this.updateUnreadCount();
            this.notifyListeners();
        }
    }
    /**
     * Update unread count and dispatch event
     */
    private updateUnreadCount(): void {
        try {
            this.unreadCount = this.notifications.filter(n => !n.read).length;
            window.dispatchEvent(new CustomEvent("system-notification-count-update", {
                detail: { count: this.unreadCount }
            }));
        } catch (error) {
            console.warn("[NotificationManager] Failed to update unread count:", error);
        }
    }
    /**
     * Notify all listeners with current notifications
     */
    private notifyListeners(): void {
        try {
            this.listeners.forEach(listener => {
                try {
                    listener([...this.notifications]);
                } catch (e) {
                    console.warn("[NotificationManager] Listener error:", e);
                }
            });
        } catch (error) {
            console.warn("[NotificationManager] Failed to notify listeners:", error);
        }
    }
    /**
     * Show toast notification via custom event
     */
    private showToast(message: string, type: NotificationType): void {
        try {
            window.dispatchEvent(new CustomEvent("show-toast", {
                detail: { message, type }
            }));
        } catch (error) {
            console.warn("[NotificationManager] Failed to show toast:", error);
        }
    }
    /**
     * Setup event listeners for system events
     */
    private setupEventListeners(): void {
        try {
            // Task events
            listen("task_complete", (event: any) => {
                this.add({
                    title: "notification.taskCompleted",
                    message: event.payload.final_output?.slice(0, 100) || "Task completed",
                    type: NotificationType.Success,
                    data: {
                        ...event.payload,
                        sessionId: event.payload.session_id,
                    },
                }).catch(() => { });
            });
            listen("task_failed", (event: any) => {
                this.add({
                    title: "notification.taskFailed",
                    message: event.payload.error || "Task failed",
                    type: NotificationType.Error,
                    data: {
                        ...event.payload,
                        sessionId: event.payload.session_id,
                    },
                }).catch(() => { });
            });
            listen("task_step_update", (event: any) => {
                const { step_name, status, output, error, session_id } = event.payload;
                if (status === "FAILURE") {
                    let errorMsg = error || output || "Unknown error";
                    errorMsg = errorMsg
                        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                        .replace(/\\u[0-9a-fA-F]{0,3}$/g, '')
                        .replace(/\\u[0-9a-fA-F]{1,3}\s/g, ' ')
                        .replace(/[^\x20-\x7E\u4e00-\u9fa5]/g, '')
                        .slice(0, 200);
                    this.add({
                        title: "notification.taskStepUpdate",
                        message: `Step "${step_name}" failed: ${errorMsg}`,
                        type: NotificationType.Warning,
                        data: {
                            ...event.payload,
                            sessionId: session_id,
                        },
                    }).catch(() => { });
                }
            });
            listen("skill_installed", (event: any) => {
                this.add({
                    title: "notification.skillInstalled",
                    message: event.payload.skill_name || "Skill installed successfully",
                    type: NotificationType.Success,
                    data: event.payload,
                }).catch(() => { });
            });
            listen("skill_updated", (event: any) => {
                this.add({
                    title: "notification.skillUpdated",
                    message: event.payload.skill_name || "Skill updated successfully",
                    type: NotificationType.Success,
                    data: event.payload,
                }).catch(() => { });
            });
            listen("task_created", (event: any) => {
                this.add({
                    title: "notification.taskCreated",
                    message: event.payload.task_name || "New task created",
                    type: NotificationType.Info,
                    data: {
                        ...event.payload,
                        sessionId: event.payload.session_id,
                    },
                }).catch(() => { });
            });
            listen("system_ready", (event: any) => {
                this.add({
                    title: "notification.systemReady",
                    message: event.payload.message || "System ready",
                    type: NotificationType.Success,
                    data: event.payload,
                }).catch(() => { });
            });
            listen("engine_initialized", (event: any) => {
                this.add({
                    title: "notification.engineInitialized",
                    message: event.payload.engine_name || "Engine initialized successfully",
                    type: NotificationType.Success,
                    data: event.payload,
                }).catch(() => { });
            });
            // Subsystem session creation events
            listen("chart-session-created", (event: any) => {
                const detail = event.payload || event.detail || {};
                this.add({
                    title: "notification.chartSessionCreated",
                    message: detail.title ? `Chart session "${detail.title}" created` : "Chart session created",
                    type: NotificationType.Info,
                    data: {
                        sessionId: detail.sessionId,
                        subsystem: "chart",
                        title: detail.title,
                    },
                }).catch(() => { });
            });
            listen("map-session-created", (event: any) => {
                const detail = event.payload || event.detail || {};
                this.add({
                    title: "notification.mapSessionCreated",
                    message: detail.title ? `Map session "${detail.title}" created` : "Map session created",
                    type: NotificationType.Info,
                    data: {
                        sessionId: detail.sessionId,
                        subsystem: "map",
                        title: detail.title,
                    },
                }).catch(() => { });
            });
            listen("codeeditor-session-created", (event: any) => {
                const detail = event.payload || event.detail || {};
                this.add({
                    title: "notification.codeEditorSessionCreated",
                    message: detail.title ? `Code editor session "${detail.title}" created` : "Code editor session created",
                    type: NotificationType.Info,
                    data: {
                        sessionId: detail.sessionId,
                        subsystem: "codeeditor",
                        title: detail.title,
                    },
                }).catch(() => { });
            });
            listen("video-session-created", (event: any) => {
                const detail = event.payload || event.detail || {};
                this.add({
                    title: "notification.videoSessionCreated",
                    message: detail.title ? `Video session "${detail.title}" created` : "Video session created",
                    type: NotificationType.Info,
                    data: {
                        sessionId: detail.sessionId,
                        subsystem: "video",
                        title: detail.title,
                    },
                }).catch(() => { });
            });
            listen("sandbox3d-session-created", (event: any) => {
                const detail = event.payload || event.detail || {};
                this.add({
                    title: "notification.sandbox3dSessionCreated",
                    message: detail.title ? `3D Sandbox session "${detail.title}" created` : "3D Sandbox session created",
                    type: NotificationType.Info,
                    data: {
                        sessionId: detail.sessionId,
                        subsystem: "sandbox3d",
                        title: detail.title,
                    },
                }).catch(() => { });
            });
        } catch (error) {
            console.warn("[NotificationManager] Failed to setup event listeners:", error);
        }
    }
    /**
     * Add a new notification with backend fallback
     */
    async add(params: AddNotificationParams): Promise<SystemNotification> {
        await this.ensureInitialized();
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
            console.warn("[NotificationManager] Backend add failed, using local fallback:", error);
            const fallbackNotification: SystemNotification = {
                id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
                title: params.title,
                message: params.message,
                type: params.type || NotificationType.Info,
                timestamp: new Date().toISOString(),
                read: false,
                data: params.data,
            };
            this.notifications = [fallbackNotification, ...this.notifications];
            this.updateUnreadCount();
            this.notifyListeners();
            this.showToast(params.message, params.type || NotificationType.Info);
            return fallbackNotification;
        }
    }
    /**
     * Add info notification
     */
    async addInfo(title: string, message: string, data?: any): Promise<SystemNotification> {
        return this.add({ title, message, type: NotificationType.Info, data });
    }
    /**
     * Add success notification
     */
    async addSuccess(title: string, message: string, data?: any): Promise<SystemNotification> {
        return this.add({ title, message, type: NotificationType.Success, data });
    }
    /**
     * Add warning notification
     */
    async addWarning(title: string, message: string, data?: any): Promise<SystemNotification> {
        return this.add({ title, message, type: NotificationType.Warning, data });
    }
    /**
     * Add error notification
     */
    async addError(title: string, message: string, data?: any): Promise<SystemNotification> {
        return this.add({ title, message, type: NotificationType.Error, data });
    }
    /**
     * Get all notifications (from local cache)
     */
    async getAll(): Promise<SystemNotification[]> {
        await this.ensureInitialized();
        return [...this.notifications];
    }
    /**
     * Get unread notifications
     */
    async getUnread(): Promise<SystemNotification[]> {
        await this.ensureInitialized();
        try {
            return await invoke<SystemNotification[]>("cmd_notification_get_unread");
        } catch (error) {
            console.warn("[NotificationManager] Failed to get unread, using local:", error);
            return this.notifications.filter(n => !n.read);
        }
    }
    /**
     * Get unread count synchronously from local cache
     */
    getUnreadCountSync(): number {
        return this.unreadCount;
    }
    /**
     * Get unread count
     */
    async getUnreadCount(): Promise<number> {
        await this.ensureInitialized();
        try {
            return await invoke<number>("cmd_notification_get_unread_count");
        } catch (error) {
            console.warn("[NotificationManager] Failed to get unread count, using local:", error);
            return this.unreadCount;
        }
    }
    /**
     * Get notification by ID
     */
    async getById(id: string): Promise<SystemNotification | null> {
        await this.ensureInitialized();
        try {
            return await invoke<SystemNotification | null>("cmd_notification_get_by_id", { id });
        } catch (error) {
            console.warn("[NotificationManager] Failed to get by id, using local:", error);
            return this.notifications.find(n => n.id === id) || null;
        }
    }
    /**
     * Get latest notifications
     */
    async getLatest(limit: number = 10): Promise<SystemNotification[]> {
        await this.ensureInitialized();
        try {
            return await invoke<SystemNotification[]>("cmd_notification_get_latest", { limit });
        } catch (error) {
            console.warn("[NotificationManager] Failed to get latest, using local:", error);
            return this.notifications.slice(0, limit);
        }
    }
    /**
     * Get notifications by date range
     */
    async getByDateRange(startDate: string, endDate: string): Promise<SystemNotification[]> {
        await this.ensureInitialized();
        try {
            return await invoke<SystemNotification[]>("cmd_notification_get_by_date_range", { startDate, endDate });
        } catch (error) {
            console.warn("[NotificationManager] Failed to get by date range, using local:", error);
            return this.notifications.filter(n => n.timestamp >= startDate && n.timestamp <= endDate);
        }
    }
    /**
     * Mark a notification as read - uses local cache for immediate feedback
     */
    async markAsRead(id: string): Promise<boolean> {
        await this.ensureInitialized();
        // Immediate local update for UI feedback
        const localNotification = this.notifications.find(n => n.id === id);
        if (localNotification && !localNotification.read) {
            localNotification.read = true;
            this.updateUnreadCount();
            this.notifyListeners();
        }
        try {
            const result = await invoke<boolean>("cmd_notification_mark_as_read", { id });
            if (result) {
                await this.loadNotifications();
            }
            return result;
        } catch (error) {
            console.warn("[NotificationManager] Failed to mark as read, using local state:", error);
            return localNotification !== undefined;
        }
    }
    /**
     * Mark all notifications as read - uses local cache for immediate feedback
     */
    async markAllAsRead(): Promise<number> {
        await this.ensureInitialized();
        // Immediate local update for UI feedback
        let count = 0;
        this.notifications.forEach(n => {
            if (!n.read) {
                n.read = true;
                count++;
            }
        });
        if (count > 0) {
            this.updateUnreadCount();
            this.notifyListeners();
        }
        try {
            const result = await invoke<number>("cmd_notification_mark_all_as_read");
            await this.loadNotifications();
            return result;
        } catch (error) {
            console.warn("[NotificationManager] Failed to mark all as read, using local state:", error);
            return count;
        }
    }
    /**
     * Delete a notification - uses local cache for immediate feedback
     */
    async delete(id: string): Promise<boolean> {
        await this.ensureInitialized();
        // Immediate local update for UI feedback
        const initialLength = this.notifications.length;
        this.notifications = this.notifications.filter(n => n.id !== id);
        if (this.notifications.length < initialLength) {
            this.updateUnreadCount();
            this.notifyListeners();
        }
        try {
            const result = await invoke<boolean>("cmd_notification_delete", { id });
            if (result) {
                await this.loadNotifications();
            }
            return result;
        } catch (error) {
            console.warn("[NotificationManager] Failed to delete, using local state:", error);
            return this.notifications.length < initialLength;
        }
    }
    /**
     * Delete all read notifications - uses local cache for immediate feedback
     */
    async deleteRead(): Promise<number> {
        await this.ensureInitialized();
        // Immediate local update for UI feedback
        const initialLength = this.notifications.length;
        this.notifications = this.notifications.filter(n => !n.read);
        const count = initialLength - this.notifications.length;
        if (count > 0) {
            this.updateUnreadCount();
            this.notifyListeners();
        }
        try {
            const result = await invoke<number>("cmd_notification_delete_read");
            await this.loadNotifications();
            return result;
        } catch (error) {
            console.warn("[NotificationManager] Failed to delete read, using local state:", error);
            return count;
        }
    }
    /**
     * Delete notifications by type - uses local cache for immediate feedback
     */
    async deleteByType(type: NotificationType): Promise<number> {
        await this.ensureInitialized();
        // Immediate local update for UI feedback
        const initialLength = this.notifications.length;
        this.notifications = this.notifications.filter(n => n.type !== type);
        const count = initialLength - this.notifications.length;
        if (count > 0) {
            this.updateUnreadCount();
            this.notifyListeners();
        }
        try {
            const result = await invoke<number>("cmd_notification_delete_by_type", { notificationType: type });
            await this.loadNotifications();
            return result;
        } catch (error) {
            console.warn("[NotificationManager] Failed to delete by type, using local state:", error);
            return count;
        }
    }
    /**
     * Clear all notifications - uses local cache for immediate feedback
     */
    async clearAll(): Promise<number> {
        await this.ensureInitialized();
        // Immediate local update for UI feedback
        const count = this.notifications.length;
        this.notifications = [];
        this.updateUnreadCount();
        this.notifyListeners();
        try {
            const result = await invoke<number>("cmd_notification_clear_all");
            await this.loadNotifications();
            return result;
        } catch (error) {
            console.warn("[NotificationManager] Failed to clear all, using local state:", error);
            return count;
        }
    }
    /**
     * Refresh notifications from backend
     */
    async refresh(): Promise<void> {
        await this.ensureInitialized();
        await this.loadNotifications();
    }
    /**
     * Subscribe to notification changes
     */
    subscribe(listener: NotificationListener): () => void {
        this.listeners.add(listener);
        try {
            listener([...this.notifications]);
        } catch (e) {
            console.warn("[NotificationManager] Subscribe listener error:", e);
        }
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