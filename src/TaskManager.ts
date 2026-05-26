import { TaskInfo, ChatMessage } from "./type";

type TaskListener = () => void;

class TaskManager {
    private tasks: Map<string, TaskInfo> = new Map();
    private userMessages: Map<string, ChatMessage> = new Map();
    private assistantMessages: Map<string, ChatMessage> = new Map();
    private listeners: Set<TaskListener> = new Set();
    private sessionId: string = "";
    private version: number = 0;

    subscribe(listener: TaskListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.version++;
        this.listeners.forEach(listener => listener());
    }

    setSessionId(sessionId: string) {
        this.sessionId = sessionId;
    }

    getVersion(): number {
        return this.version;
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

    addAssistantMessage(message: ChatMessage) {
        this.assistantMessages.set(message.id, message);
        this.notify();
    }

    getAssistantMessages(): ChatMessage[] {
        return Array.from(this.assistantMessages.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }

    clearAssistantMessages() {
        this.assistantMessages.clear();
        this.notify();
    }

    hasWelcomeMessage(): boolean {
        return this.assistantMessages.has("welcome");
    }

    setTasksAndMessages(tasks: TaskInfo[], userMessages: ChatMessage[], assistantMessages: ChatMessage[] = []) {
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
        this.assistantMessages.clear();
        if (Array.isArray(assistantMessages)) {
            assistantMessages.forEach(msg => {
                if (msg && msg.id) {
                    this.assistantMessages.set(msg.id, msg);
                }
            });
        }
        this.notify();
    }

    getAllData(): { tasks: TaskInfo[]; userMessages: ChatMessage[]; assistantMessages: ChatMessage[] } {
        return {
            tasks: this.getAllTasks(),
            userMessages: this.getUserMessages(),
            assistantMessages: this.getAssistantMessages(),
        };
    }

    getAllMessages(): ChatMessage[] {
        const all = [...this.getUserMessages(), ...this.getAssistantMessages()];
        return all.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }

    updateAssistantMessage(messageId: string, updates: Partial<ChatMessage>) {
        const message = this.assistantMessages.get(messageId);
        if (message) {
            const updatedMessage = {
                ...message,
                ...updates,
            };
            this.assistantMessages.set(messageId, updatedMessage);
            this.notify();
        } else {
            console.warn('[TaskManager] Message not found:', messageId);
        }
    }

    removeAssistantMessage(messageId: string) {
        this.assistantMessages.delete(messageId);
        this.notify();
    }

    clearAll() {
        this.tasks.clear();
        this.userMessages.clear();
        this.assistantMessages.clear();
        this.notify();
    }
}

export const taskManager = new TaskManager();