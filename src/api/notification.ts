import { invoke } from "@tauri-apps/api/core";
import { SystemNotification } from "../NotificationManager";

export const notificationBackendCommands = {
    async add(params: { title: string; message: string; type?: string; data?: any }): Promise<SystemNotification> {
        return await invoke('cmd_notification_add', {
            title: params.title,
            message: params.message,
            notificationType: params.type,
            data: params.data,
        });
    },

    async getAll(): Promise<SystemNotification[]> {
        return await invoke('cmd_notification_get_all');
    },

    async getById(id: string): Promise<SystemNotification | null> {
        return await invoke('cmd_notification_get_by_id', { id });
    },

    async getUnread(): Promise<SystemNotification[]> {
        return await invoke('cmd_notification_get_unread');
    },

    async getUnreadCount(): Promise<number> {
        return await invoke('cmd_notification_get_unread_count');
    },

    async markAsRead(id: string): Promise<boolean> {
        return await invoke('cmd_notification_mark_as_read', { id });
    },

    async markAllAsRead(): Promise<number> {
        return await invoke('cmd_notification_mark_all_as_read');
    },

    async delete(id: string): Promise<boolean> {
        return await invoke('cmd_notification_delete', { id });
    },

    async deleteRead(): Promise<number> {
        return await invoke('cmd_notification_delete_read');
    },

    async deleteByType(notificationType: string): Promise<number> {
        return await invoke('cmd_notification_delete_by_type', { notificationType });
    },

    async clearAll(): Promise<number> {
        return await invoke('cmd_notification_clear_all');
    },

    async getLatest(limit?: number): Promise<SystemNotification[]> {
        return await invoke('cmd_notification_get_latest', { limit });
    },

    async getByDateRange(startDate: string, endDate: string): Promise<SystemNotification[]> {
        return await invoke('cmd_notification_get_by_date_range', { startDate, endDate });
    },

    async info(title: string, message: string, data?: any): Promise<SystemNotification> {
        return await invoke('cmd_notification_info', { title, message, data });
    },

    async success(title: string, message: string, data?: any): Promise<SystemNotification> {
        return await invoke('cmd_notification_success', { title, message, data });
    },

    async warning(title: string, message: string, data?: any): Promise<SystemNotification> {
        return await invoke('cmd_notification_warning', { title, message, data });
    },

    async error(title: string, message: string, data?: any): Promise<SystemNotification> {
        return await invoke('cmd_notification_error', { title, message, data });
    },
};