import { sessionCommands } from "./api/session";
import { TaskInfo, ChatMessage } from "./type";

type TaskListener = () => void;

class TaskManager {
    private tasksBySession: Map<string, Map<string, TaskInfo>> = new Map();
    private userMessagesBySession: Map<string, Map<string, ChatMessage>> = new Map();
    private assistantMessagesBySession: Map<string, Map<string, ChatMessage>> = new Map();
    private listeners: Set<TaskListener> = new Set();
    private currentSessionId: string = "";
    private version: number = 0;

    subscribe(listener: TaskListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.version++;
        this.listeners.forEach(listener => listener());
    }

    setCurrentSession(sessionId: string) {
        this.currentSessionId = sessionId;
        this.notify();
    }

    getCurrentSessionId(): string {
        return this.currentSessionId;
    }

    getTask(taskId: string): TaskInfo | undefined {
        const tasks = this.tasksBySession.get(this.currentSessionId);
        return tasks?.get(taskId);
    }

    getAllTasks(): TaskInfo[] {
        const tasks = this.tasksBySession.get(this.currentSessionId);
        if (!tasks) return [];
        return Array.from(tasks.values()).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }

    addTask(task: TaskInfo) {
        if (!this.tasksBySession.has(this.currentSessionId)) {
            this.tasksBySession.set(this.currentSessionId, new Map());
        }
        this.tasksBySession.get(this.currentSessionId)!.set(task.task_id, task);
        this.notify();
    }

    updateTask(taskId: string, updates: Partial<TaskInfo>) {
        const tasks = this.tasksBySession.get(this.currentSessionId);
        const task = tasks?.get(taskId);
        if (task && tasks) {
            const updatedTask = {
                ...task,
                ...updates,
                updated_at: new Date().toISOString(),
            };
            tasks.set(taskId, updatedTask);
            this.notify();
        } else {
            console.warn("[TaskManager] Task not found for update:", taskId);
        }
    }

    removeTask(taskId: string) {
        const tasks = this.tasksBySession.get(this.currentSessionId);
        if (tasks) {
            tasks.delete(taskId);
            this.notify();
        }
    }

    clearTasks() {
        this.tasksBySession.delete(this.currentSessionId);
        this.notify();
    }

    setTasks(tasks: TaskInfo[]) {
        if (!this.tasksBySession.has(this.currentSessionId)) {
            this.tasksBySession.set(this.currentSessionId, new Map());
        }
        const taskMap = this.tasksBySession.get(this.currentSessionId)!;
        taskMap.clear();
        tasks.forEach(task => {
            if (task && task.task_id) {
                taskMap.set(task.task_id, task);
            }
        });
        this.notify();
    }

    getTaskCount(): number {
        const tasks = this.tasksBySession.get(this.currentSessionId);
        return tasks?.size || 0;
    }

    addUserMessage(message: ChatMessage) {
        if (!this.userMessagesBySession.has(this.currentSessionId)) {
            this.userMessagesBySession.set(this.currentSessionId, new Map());
        }
        this.userMessagesBySession.get(this.currentSessionId)!.set(message.id, message);
        this.notify();
    }

    getUserMessages(): ChatMessage[] {
        const messages = this.userMessagesBySession.get(this.currentSessionId);
        if (!messages) return [];
        return Array.from(messages.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }

    clearUserMessages() {
        this.userMessagesBySession.delete(this.currentSessionId);
        this.notify();
    }

    addAssistantMessage(message: ChatMessage) {
        if (!this.assistantMessagesBySession.has(this.currentSessionId)) {
            this.assistantMessagesBySession.set(this.currentSessionId, new Map());
        }
        this.assistantMessagesBySession.get(this.currentSessionId)!.set(message.id, message);
        this.notify();
    }

    getAssistantMessages(): ChatMessage[] {
        const messages = this.assistantMessagesBySession.get(this.currentSessionId);
        if (!messages) return [];
        return Array.from(messages.values()).sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }

    clearAssistantMessages() {
        this.assistantMessagesBySession.delete(this.currentSessionId);
        this.notify();
    }

    hasWelcomeMessage(): boolean {
        const messages = this.assistantMessagesBySession.get(this.currentSessionId);
        return messages?.has("welcome") || false;
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
        return all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }

    updateAssistantMessage(messageId: string, updates: Partial<ChatMessage>) {
        const messages = this.assistantMessagesBySession.get(this.currentSessionId);
        const message = messages?.get(messageId);
        if (message && messages) {
            const updatedMessage = { ...message, ...updates };
            messages.set(messageId, updatedMessage);
            this.notify();
        }
    }

    removeAssistantMessage(messageId: string) {
        const messages = this.assistantMessagesBySession.get(this.currentSessionId);
        if (messages) {
            messages.delete(messageId);
            this.notify();
        }
    }

    clearAll() {
        this.tasksBySession.delete(this.currentSessionId);
        this.userMessagesBySession.delete(this.currentSessionId);
        this.assistantMessagesBySession.delete(this.currentSessionId);
        this.notify();
    }

    loadSessionData(sessionId: string, tasks: TaskInfo[], userMessages: ChatMessage[], assistantMessages: ChatMessage[]) {
        if (!this.tasksBySession.has(sessionId)) {
            this.tasksBySession.set(sessionId, new Map());
        }
        const taskMap = this.tasksBySession.get(sessionId)!;
        taskMap.clear();
        tasks.forEach(task => {
            if (task && task.task_id) taskMap.set(task.task_id, task);
        });

        if (!this.userMessagesBySession.has(sessionId)) {
            this.userMessagesBySession.set(sessionId, new Map());
        }
        const userMap = this.userMessagesBySession.get(sessionId)!;
        userMap.clear();
        userMessages.forEach(msg => {
            if (msg && msg.id) userMap.set(msg.id, msg);
        });

        if (!this.assistantMessagesBySession.has(sessionId)) {
            this.assistantMessagesBySession.set(sessionId, new Map());
        }
        const assistantMap = this.assistantMessagesBySession.get(sessionId)!;
        assistantMap.clear();
        assistantMessages.forEach(msg => {
            if (msg && msg.id) assistantMap.set(msg.id, msg);
        });
        this.currentSessionId = sessionId;
        this.notify();
    }

    getTasksBySession(sessionId: string): Map<string, TaskInfo> | undefined {
        return this.tasksBySession.get(sessionId);
    }

    updateTaskBySession(sessionId: string, taskId: string, updates: Partial<TaskInfo>) {
        const tasks = this.tasksBySession.get(sessionId);
        const task = tasks?.get(taskId);
        if (task && tasks) {
            const updatedTask = { ...task, ...updates, updated_at: new Date().toISOString() };
            tasks.set(taskId, updatedTask);
            if (this.currentSessionId === sessionId) this.notify();
        }
    }

    addAssistantMessageToSession(sessionId: string, message: ChatMessage) {
        if (!this.assistantMessagesBySession.has(sessionId)) {
            this.assistantMessagesBySession.set(sessionId, new Map());
        }
        this.assistantMessagesBySession.get(sessionId)!.set(message.id, message);
        if (this.currentSessionId === sessionId) this.notify();
    }

    updateAssistantMessageBySession(sessionId: string, messageId: string, updates: Partial<ChatMessage>) {
        const messages = this.assistantMessagesBySession.get(sessionId);
        const message = messages?.get(messageId);
        if (message && messages) {
            messages.set(messageId, { ...message, ...updates });
            if (this.currentSessionId === sessionId) this.notify();
        }
    }

    getAssistantMessagesBySession(sessionId: string): Map<string, ChatMessage> | undefined {
        return this.assistantMessagesBySession.get(sessionId);
    }

    getTaskBySession(sessionId: string, taskId: string): TaskInfo | undefined {
        const tasks = this.tasksBySession.get(sessionId);
        return tasks?.get(taskId);
    }

    addTaskToSession(sessionId: string, task: TaskInfo) {
        if (!this.tasksBySession.has(sessionId)) {
            this.tasksBySession.set(sessionId, new Map());
        }
        this.tasksBySession.get(sessionId)!.set(task.task_id, task);
        if (this.currentSessionId === sessionId) this.notify();
    }

    addUserMessageToSession(sessionId: string, message: ChatMessage) {
        if (!this.userMessagesBySession.has(sessionId)) {
            this.userMessagesBySession.set(sessionId, new Map());
        }
        this.userMessagesBySession.get(sessionId)!.set(message.id, message);
        if (this.currentSessionId === sessionId) this.notify();
    }

    getUserMessagesBySession(sessionId: string): ChatMessage[] {
        const messages = this.userMessagesBySession.get(sessionId);
        if (!messages) return [];
        return Array.from(messages.values()).sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }

    getAssistantMessagesBySessionAsArray(sessionId: string): ChatMessage[] {
        const messages = this.assistantMessagesBySession.get(sessionId);
        if (!messages) return [];
        return Array.from(messages.values()).sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }

    switchToSession(sessionId: string) {
        if (this.currentSessionId === sessionId) return;
        if (!this.tasksBySession.has(sessionId)) {
            this.tasksBySession.set(sessionId, new Map());
            this.userMessagesBySession.set(sessionId, new Map());
            this.assistantMessagesBySession.set(sessionId, new Map());
        }
        this.currentSessionId = sessionId;
        this.notify();
    }

    async saveTasksToFile(sessionId: string): Promise<void> {
        const tasks = this.tasksBySession.get(sessionId);
        if (!tasks) return;
        const tasksArray = Array.from(tasks.values());
        await sessionCommands.saveTaskContent(sessionId, tasksArray).catch(console.error);
    }

    async saveCurrentSessionToFile(): Promise<void> {
        if (this.currentSessionId) {
            await this.saveTasksToFile(this.currentSessionId);
        }
    }

    async loadTasksFromFile(sessionId: string): Promise<void> {
        const tasksContent = await sessionCommands.loadTaskContent(sessionId).catch(() => null);
        if (!tasksContent || !Array.isArray(tasksContent)) return;

        if (!this.tasksBySession.has(sessionId)) {
            this.tasksBySession.set(sessionId, new Map());
        }
        const taskMap = this.tasksBySession.get(sessionId)!;
        tasksContent.forEach(task => {
            if (task && task.task_id) taskMap.set(task.task_id, task);
        });
    }
}

export const taskManager = new TaskManager();