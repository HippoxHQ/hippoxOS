import { invoke } from '@tauri-apps/api/core';
import React from 'react';
import { TaskInfo, TaskStatusEnum } from './types';
export interface TaskStepInfo {
    step_index: number;
    skill_name: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
    output?: string;
    error?: string;
    duration_ms?: number;
}
export interface TaskPoolStats {
    running_count: number;
    pending_count: number;
    total_count: number;
    max_concurrent: number;
}
export interface TaskFilter {
    status?: string[];
    task_type?: string[];
    limit?: number;
}
class TaskPoolManager {
    private tasks: Map<string, TaskInfo> = new Map();
    private listeners: Set<(tasks: TaskInfo[]) => void> = new Set();
    private statsListeners: Set<(stats: TaskPoolStats) => void> = new Set();
    private refreshInterval: NodeJS.Timeout | null = null;
    private autoRefresh: boolean = false;
    constructor() {
        this.setupAutoRefresh();
    }
    private setupAutoRefresh() {
        if (this.autoRefresh) {
            this.refreshInterval = setInterval(() => {
                this.refresh();
            }, 2000);
        }
    }
    startAutoRefresh(intervalMs: number = 2000) {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        this.autoRefresh = true;
        this.refreshInterval = setInterval(() => {
            this.refresh();
        }, intervalMs);
    }
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        this.autoRefresh = false;
    }
    async refresh(): Promise<void> {
        const tasks = await this.getAllTasks();
        this.tasks.clear();
        tasks.forEach(task => {
            this.tasks.set(task.task_id, task);
        });
        this.notifyListeners();
        const stats = await this.getStats();
        this.notifyStatsListeners(stats);
    }
    async getAllTasks(limit?: number): Promise<TaskInfo[]> {
        return await invoke('cmd_task_pool_get_all_tasks', { limit });
    }
    async getTask(taskId: string): Promise<TaskInfo | null> {
        return await invoke('cmd_task_pool_get_task', { taskId });
    }
    async getTaskStatus(taskId: string): Promise<string | null> {
        return await invoke('cmd_task_pool_get_task_status', { taskId });
    }
    async cancelTask(taskId: string): Promise<boolean> {
        const result = await invoke<boolean>('cmd_task_pool_cancel_task', { taskId });
        await this.refresh();
        return result;
    }
    async pauseTask(taskId: string): Promise<boolean> {
        const result = await invoke<boolean>('cmd_task_pool_pause_task', { taskId });
        await this.refresh();
        return result;
    }
    async resumeTask(taskId: string): Promise<boolean> {
        const result = await invoke<boolean>('cmd_task_pool_resume_task', { taskId });
        await this.refresh();
        return result;
    }
    async retryTask(taskId: string): Promise<boolean> {
        const result = await invoke<boolean>('cmd_task_pool_retry_task', { taskId });
        await this.refresh();
        return result;
    }
    async getStats(): Promise<TaskPoolStats> {
        return await invoke('cmd_task_pool_get_stats');
    }
    async setMaxConcurrent(max: number): Promise<void> {
        await invoke('cmd_task_pool_set_max_concurrent', { max });
        await this.refresh();
    }
    async getTasksBySession(sessionId: string): Promise<TaskInfo[]> {
        return await invoke('cmd_task_pool_get_tasks_by_session', { sessionId });
    }
    getTaskSync(taskId: string): TaskInfo | undefined {
        return this.tasks.get(taskId);
    }
    getAllTasksSync(): TaskInfo[] {
        return Array.from(this.tasks.values())
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    getRunningTasks(): TaskInfo[] {
        return this.getAllTasksSync().filter(t => t.status === TaskStatusEnum.Running);
    }
    getPendingTasks(): TaskInfo[] {
        return this.getAllTasksSync().filter(t => t.status === TaskStatusEnum.Pending);
    }
    getCompletedTasks(): TaskInfo[] {
        return this.getAllTasksSync().filter(t => t.status === TaskStatusEnum.Completed);
    }
    getFailedTasks(): TaskInfo[] {
        return this.getAllTasksSync().filter(t =>
            t.status === TaskStatusEnum.Failed ||
            t.status === TaskStatusEnum.Cancelled ||
            t.status === TaskStatusEnum.Timeout
        );
    }
    subscribe(listener: (tasks: TaskInfo[]) => void): () => void {
        this.listeners.add(listener);
        listener(this.getAllTasksSync());
        return () => this.listeners.delete(listener);
    }
    subscribeStats(listener: (stats: TaskPoolStats) => void): () => void {
        this.statsListeners.add(listener);
        this.getStats().then(stats => listener(stats));
        return () => this.statsListeners.delete(listener);
    }
    private notifyListeners() {
        const tasks = this.getAllTasksSync();
        this.listeners.forEach(listener => listener(tasks));
    }
    private notifyStatsListeners(stats: TaskPoolStats) {
        this.statsListeners.forEach(listener => listener(stats));
    }
    clearCache() {
        this.tasks.clear();
        this.notifyListeners();
    }
}
export const taskPoolManager = new TaskPoolManager();
export interface TaskPoolPersistResult {
    success: boolean;
    message: string;
    backup_file: string | null;
    timestamp?: string;
}
export interface BackupFileInfo {
    filename: string;
    path: string;
    size: number;
    modified: number | null;
}
export interface CleanupResult {
    success: boolean;
    deleted_count: number;
    message: string;
}
// Helper functions for easy access
export const taskPoolCommands = {
    getAllTasks: (limit?: number) => taskPoolManager.getAllTasks(limit),
    getTask: (taskId: string) => taskPoolManager.getTask(taskId),
    getTaskStatus: (taskId: string) => taskPoolManager.getTaskStatus(taskId),
    cancelTask: (taskId: string) => taskPoolManager.cancelTask(taskId),
    pauseTask: (taskId: string) => taskPoolManager.pauseTask(taskId),
    resumeTask: (taskId: string) => taskPoolManager.resumeTask(taskId),
    retryTask: (taskId: string) => taskPoolManager.retryTask(taskId),
    getStats: () => taskPoolManager.getStats(),
    setMaxConcurrent: (max: number) => taskPoolManager.setMaxConcurrent(max),
    getTasksBySession: (sessionId: string) => taskPoolManager.getTasksBySession(sessionId),
    refresh: () => taskPoolManager.refresh(),
    startAutoRefresh: (intervalMs?: number) => taskPoolManager.startAutoRefresh(intervalMs),
    stopAutoRefresh: () => taskPoolManager.stopAutoRefresh(),
    async persist(): Promise<TaskPoolPersistResult> {
        return await invoke('cmd_task_pool_persist');
    },
    async listBackups(): Promise<BackupFileInfo[]> {
        return await invoke('cmd_task_pool_list_backups');
    },
    async cleanupBackups(keepCount: number): Promise<CleanupResult> {
        return await invoke('cmd_task_pool_cleanup_backups', { keepCount });
    },
};
// React hook for using task pool
export function useTaskPool() {
    const [tasks, setTasks] = React.useState<TaskInfo[]>([]);
    const [stats, setStats] = React.useState<TaskPoolStats | null>(null);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
        const unsubscribeTasks = taskPoolManager.subscribe(setTasks);
        const unsubscribeStats = taskPoolManager.subscribeStats(setStats);
        taskPoolManager.refresh().finally(() => setLoading(false));
        taskPoolManager.startAutoRefresh(3000);
        return () => {
            unsubscribeTasks();
            unsubscribeStats();
            taskPoolManager.stopAutoRefresh();
        };
    }, []);
    return {
        tasks,
        stats,
        loading,
        cancelTask: taskPoolManager.cancelTask.bind(taskPoolManager),
        pauseTask: taskPoolManager.pauseTask.bind(taskPoolManager),
        resumeTask: taskPoolManager.resumeTask.bind(taskPoolManager),
        retryTask: taskPoolManager.retryTask.bind(taskPoolManager),
        refresh: taskPoolManager.refresh.bind(taskPoolManager),
        getTask: taskPoolManager.getTask.bind(taskPoolManager),
        getRunningTasks: () => tasks.filter(t => t.status === TaskStatusEnum.Running),
        getPendingTasks: () => tasks.filter(t => t.status === TaskStatusEnum.Pending),
        getCompletedTasks: () => tasks.filter(t => t.status === TaskStatusEnum.Completed),
        getFailedTasks: () => tasks.filter(t =>
            t.status === TaskStatusEnum.Failed ||
            t.status === TaskStatusEnum.Cancelled
        ),
    };
}