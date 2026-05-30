import { listen } from '@tauri-apps/api/event';

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  data?: any;
}

const STORAGE_KEY = 'hippox_system_notifications';
const MAX_NOTIFICATIONS = 100;

type NotificationListener = (notifications: SystemNotification[]) => void;

class SystemNotificationService {
  private notifications: SystemNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private unreadCount = 0;

  constructor() {
    this.loadFromStorage();
    this.setupEventListeners();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.notifications = JSON.parse(stored);
        this.updateUnreadCount();
      }
    } catch (error) {
      console.error('Failed to load system notifications:', error);
    }
  }

  private saveToStorage() {
    try {
      const toStore = this.notifications.slice(0, MAX_NOTIFICATIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('Failed to save system notifications:', error);
    }
  }

  private updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
    window.dispatchEvent(new CustomEvent('system-notification-count-update', {
      detail: { count: this.unreadCount }
    }));
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  private showToast(message: string, type: 'info' | 'success' | 'warning' | 'error') {
    window.dispatchEvent(new CustomEvent('show-toast', {
      detail: { message, type }
    }));
  }

  private setupEventListeners() {
    listen('task_complete', (event: any) => {
      this.add({
        title: 'notification.taskCompleted',
        message: event.payload.final_output?.slice(0, 100) || 'Task completed',
        type: 'success',
        data: event.payload,
      });
    });
    listen('task_failed', (event: any) => {
      this.add({
        title: 'notification.taskFailed',
        message: event.payload.error || 'Task failed',
        type: 'error',
        data: event.payload,
      });
    });
    listen('task_step_update', (event: any) => {
      const { step_name, status, output } = event.payload;
      if (status === 'FAILURE') {
        this.add({
          title: 'notification.taskStepUpdate',
          message: `Step "${step_name}" failed: ${output || 'Unknown error'}`,
          type: 'warning',
          data: event.payload,
        });
      }
    });
  }
  add(notification: Omit<SystemNotification, 'id' | 'timestamp' | 'read'>) {
    const newNotification: SystemNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    };
    this.notifications.unshift(newNotification);
    if (this.notifications.length > MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(0, MAX_NOTIFICATIONS);
    }
    this.saveToStorage();
    this.updateUnreadCount();
    this.notifyListeners();
    this.showToast(notification.message, notification.type);
    return newNotification.id;
  }

  addInfo(title: string, message: string, data?: any) {
    return this.add({ title, message, type: 'info', data });
  }

  addSuccess(title: string, message: string, data?: any) {
    return this.add({ title, message, type: 'success', data });
  }

  addWarning(title: string, message: string, data?: any) {
    return this.add({ title, message, type: 'warning', data });
  }

  addError(title: string, message: string, data?: any) {
    return this.add({ title, message, type: 'error', data });
  }

  getAll(): SystemNotification[] {
    return [...this.notifications];
  }

  getUnread(): SystemNotification[] {
    return this.notifications.filter(n => !n.read);
  }

  getUnreadCount(): number {
    return this.unreadCount;
  }

  markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      notification.read = true;
      this.saveToStorage();
      this.updateUnreadCount();
      this.notifyListeners();
    }
  }

  markAllAsRead() {
    this.notifications.forEach(n => n.read = true);
    this.saveToStorage();
    this.updateUnreadCount();
    this.notifyListeners();
  }

  delete(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
    this.updateUnreadCount();
    this.notifyListeners();
  }

  clearAll() {
    this.notifications = [];
    this.saveToStorage();
    this.updateUnreadCount();
    this.notifyListeners();
  }

  subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener([...this.notifications]);
    return () => this.listeners.delete(listener);
  }
}

export const systemNotificationService = new SystemNotificationService();
export const notificationService = systemNotificationService;
export const notifySystem = {
  info: (title: string, message: string, data?: any) => systemNotificationService.addInfo(title, message, data),
  success: (title: string, message: string, data?: any) => systemNotificationService.addSuccess(title, message, data),
  warning: (title: string, message: string, data?: any) => systemNotificationService.addWarning(title, message, data),
  error: (title: string, message: string, data?: any) => systemNotificationService.addError(title, message, data),
};
export const notify = notifySystem;
export const showNotification = notifySystem;