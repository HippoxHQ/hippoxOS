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
class TaskPoolManager {
    private tasks: Map<string, TaskInfo> = new Map();
    private listeners: Set<(tasks: TaskInfo[]) => void> = new Set();
    private statsListeners: Set<(stats: TaskPoolStats) => void> = new Set();
    private refreshInterval: NodeJS.Timeout | null = null;
    private autoRefresh: boolean = false;
    private persistInterval: NodeJS.Timeout | null = null;
    private autoPersistEnabled: boolean = false;
    private lastTasksHash: string = '';
    private isPersisting: boolean = false;
    constructor() {
        this.setupAutoRefresh();
        this.setupAutoPersist();
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
    private setupAutoPersist() {
        if (this.persistInterval) {
            clearInterval(this.persistInterval);
        }
        this.autoPersistEnabled = true;
        this.persistInterval = setInterval(() => {
            this.autoPersist();
        }, 60000); // 60 seconds
    }
    startAutoPersist(intervalMs: number = 60000) {
        if (this.persistInterval) {
            clearInterval(this.persistInterval);
        }
        this.autoPersistEnabled = true;
        this.persistInterval = setInterval(() => {
            this.autoPersist();
        }, intervalMs);
    }
    stopAutoPersist() {
        if (this.persistInterval) {
            clearInterval(this.persistInterval);
            this.persistInterval = null;
        }
        this.autoPersistEnabled = false;
    }
    /**
     * Auto persist task pool data when there are changes
     * Only persists if:
     * 1. There are terminal tasks (completed/failed/cancelled/timeout)
     * 2. Task data has changed since last persist
     */
    private async autoPersist() {
        console.log('[TaskPool] autoPersist triggered');
        if (this.isPersisting) return;
        if (!this.autoPersistEnabled) return;
        try {
            await this.refresh();
            const currentTasks = this.getAllTasksSync();
            console.log('[TaskPool] Current tasks count:', currentTasks.length);
            if (currentTasks.length === 0) {
                console.log('[TaskPool] No tasks, skip persist');
                return;
            }
            const currentHash = JSON.stringify(
                currentTasks.map(t => ({
                    task_id: t.task_id,
                    status: t.status,
                    updated_at: t.updated_at,
                }))
            );
            if (currentHash === this.lastTasksHash) {
                console.log('[TaskPool] No changes, skip persist');
                return;
            }
            // Check if there are any terminal tasks
            const hasTerminalTasks = currentTasks.some(t =>
                t.status === TaskStatusEnum.Completed ||
                t.status === TaskStatusEnum.Failed ||
                t.status === TaskStatusEnum.Cancelled ||
                t.status === TaskStatusEnum.Timeout
            );
            if (!hasTerminalTasks) {
                console.log('[TaskPool] No terminal tasks, skip persist');
                return;
            }
            this.isPersisting = true;
            console.log('[TaskPool] Auto persisting task pool data...');
            await this.calculateToken();
            this.lastTasksHash = currentHash;
            this.isPersisting = false;
        } catch (error) {
            console.error('[TaskPool] Auto persist failed:', error);
            this.isPersisting = false;
        }
    }
    /**
     * Force a persist operation (manual trigger)
     * Updates the hash after successful persist
     */
    async forcePersist(): Promise<TaskPoolPersistResult> {
        const result = await this.calculateToken();
        if (result.success) {
            // Update hash after successful persist
            const currentTasks = this.getAllTasksSync();
            this.lastTasksHash = JSON.stringify(
                currentTasks.map(t => ({
                    task_id: t.task_id,
                    status: t.status,
                    updated_at: t.updated_at,
                }))
            );
        }
        return result;
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
    async calculateToken(): Promise<TaskPoolPersistResult> {
        return await invoke('cmd_calculate_token');
    }
}
export const taskPoolManager = new TaskPoolManager();
export const taskPoolCommands = {
    // Query operations
    getAllTasks: (limit?: number) => taskPoolManager.getAllTasks(limit),
    getTask: (taskId: string) => taskPoolManager.getTask(taskId),
    getTaskStatus: (taskId: string) => taskPoolManager.getTaskStatus(taskId),
    getStats: () => taskPoolManager.getStats(),
    getTasksBySession: (sessionId: string) => taskPoolManager.getTasksBySession(sessionId),
    // Control operations
    cancelTask: (taskId: string) => taskPoolManager.cancelTask(taskId),
    pauseTask: (taskId: string) => taskPoolManager.pauseTask(taskId),
    resumeTask: (taskId: string) => taskPoolManager.resumeTask(taskId),
    retryTask: (taskId: string) => taskPoolManager.retryTask(taskId),
    setMaxConcurrent: (max: number) => taskPoolManager.setMaxConcurrent(max),
    // Refresh & Cache
    refresh: () => taskPoolManager.refresh(),
    clearCache: () => taskPoolManager.clearCache(),
    startAutoRefresh: (intervalMs?: number) => taskPoolManager.startAutoRefresh(intervalMs),
    stopAutoRefresh: () => taskPoolManager.stopAutoRefresh(),
    startAutoPersist: (intervalMs?: number) => taskPoolManager.startAutoPersist(intervalMs),
    stopAutoPersist: () => taskPoolManager.stopAutoPersist(),
    // Sync operations
    getAllTasksSync: () => taskPoolManager.getAllTasksSync(),
    getTaskSync: (taskId: string) => taskPoolManager.getTaskSync(taskId),
    getRunningTasks: () => taskPoolManager.getRunningTasks(),
    getPendingTasks: () => taskPoolManager.getPendingTasks(),
    getCompletedTasks: () => taskPoolManager.getCompletedTasks(),
    getFailedTasks: () => taskPoolManager.getFailedTasks(),
    // Persistence operations
    calculateToken: () => taskPoolManager.calculateToken(),
    forcePersist: () => taskPoolManager.forcePersist(),
    // Subscription
    subscribe: (listener: (tasks: TaskInfo[]) => void) => taskPoolManager.subscribe(listener),
    subscribeStats: (listener: (stats: TaskPoolStats) => void) => taskPoolManager.subscribeStats(listener),
};
export function useTaskPool() {
    const [tasks, setTasks] = React.useState<TaskInfo[]>([]);
    const [stats, setStats] = React.useState<TaskPoolStats | null>(null);
    const [loading, setLoading] = React.useState(true);
    React.useEffect(() => {
        const unsubscribeTasks = taskPoolManager.subscribe(setTasks);
        const unsubscribeStats = taskPoolManager.subscribeStats(setStats);
        taskPoolManager.refresh().finally(() => setLoading(false));
        taskPoolManager.startAutoRefresh(3000);
        taskPoolManager.startAutoPersist(60000);
        return () => {
            unsubscribeTasks();
            unsubscribeStats();
            taskPoolManager.stopAutoRefresh();
            taskPoolManager.stopAutoPersist();
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
        forcePersist: taskPoolManager.forcePersist.bind(taskPoolManager),
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