import { TaskInfo, ChatMessage } from "./type";

type TaskListener = () => void;

class TaskManager {
    private tasks: Map<string, TaskInfo> = new Map();
    private userMessages: Map<string, ChatMessage> = new Map();
    private listeners: Set<TaskListener> = new Set();
    private sessionId: string = "";

    subscribe(listener: TaskListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener());
    }

    setSessionId(sessionId: string) {
        this.sessionId = sessionId;
    }

    getSessionId(): string {
        return this.sessionId;
    }

    getTask(taskId: string): TaskInfo | undefined {
        return this.tasks.get(taskId);
    }

    getAllTasks(): TaskInfo[] {
        return Array.from(this.tasks.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }

    addTask(task: TaskInfo) {
        this.tasks.set(task.task_id, task);
        this.notify();
    }

    updateTask(taskId: string, updates: Partial<TaskInfo>) {
        const task = this.tasks.get(taskId);
        if (task) {
            const updatedTask = {
                ...task,
                ...updates,
                updated_at: new Date().toISOString(),
            };
            this.tasks.set(taskId, updatedTask);
            this.notify();
        } else {
            console.warn("[TaskManager] Task not found for update:", taskId);
        }
    }

    removeTask(taskId: string) {
        this.tasks.delete(taskId);
        this.notify();
    }

    clearTasks() {
        this.tasks.clear();
        this.userMessages.clear();
        this.notify();
    }

    setTasks(tasks: TaskInfo[]) {
        this.tasks.clear();
        if (Array.isArray(tasks)) {
            tasks.forEach(task => {
                if (task && task.task_id) {
                    this.tasks.set(task.task_id, task);
                }
            });
        }
        this.notify();
    }

    getTaskCount(): number {
        return this.tasks.size;
    }

    addUserMessage(message: ChatMessage) {
        this.userMessages.set(message.id, message);
        this.notify();
    }

    getUserMessages(): ChatMessage[] {
        return Array.from(this.userMessages.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }

    clearUserMessages() {
        this.userMessages.clear();
        this.notify();
    }

    setTasksAndMessages(tasks: TaskInfo[], userMessages: ChatMessage[]) {
        this.tasks.clear();
        if (Array.isArray(tasks)) {
            tasks.forEach(task => {
                if (task && task.task_id) {
                    this.tasks.set(task.task_id, task);
                }
            });
        }
        this.userMessages.clear();
        if (Array.isArray(userMessages)) {
            userMessages.forEach(msg => {
                if (msg && msg.id) {
                    this.userMessages.set(msg.id, msg);
                }
            });
        }
        this.notify();
    }

    getAllData(): { tasks: TaskInfo[]; userMessages: ChatMessage[] } {
        return {
            tasks: this.getAllTasks(),
            userMessages: this.getUserMessages(),
        };
    }
}

export const taskManager = new TaskManager();