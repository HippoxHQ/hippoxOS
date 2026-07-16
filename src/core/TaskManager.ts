import { chartSessionCommands } from "../command/session/chart";
import { codeEditorSessionCommands } from "../command/session/codeeditor";
import { sessionCommands } from "../command/session/general";
import { mapSessionCommands } from "../command/session/map";
import { sandbox3dSessionCommands } from "../command/session/sandbox3d";
import { videoSessionCommands } from "../command/session/videoeditor";
import { ChatMessage } from "../types/types";
import { notificationManager, NotificationType } from "./NotificationManager";
import { StepStatusEnum, TaskInfo, TaskStatusEnum, TaskStepInfo, SessionDomain } from "./types";
type TaskListener = () => void;
class TaskManager {
    private tasksBySession: Map<string, Map<string, TaskInfo>> = new Map();
    private userMessagesBySession: Map<string, Map<string, ChatMessage>> = new Map();
    private assistantMessagesBySession: Map<string, Map<string, ChatMessage>> = new Map();
    private listeners: Set<TaskListener> = new Set();
    private currentSessionId: string = "";
    private currentDomain: SessionDomain = SessionDomain.General;
    private version: number = 0;
    public getDomainFromSessionId(sessionId: string): SessionDomain {
        if (sessionId.startsWith("chart_session_")) return SessionDomain.Chart;
        if (sessionId.startsWith("map_session_")) return SessionDomain.Map;
        if (sessionId.startsWith("codeeditor_session_")) return SessionDomain.CodeEditor;
        if (sessionId.startsWith("video_session_")) return SessionDomain.Video;
        if (sessionId.startsWith("sandbox3d_session_")) return SessionDomain.SandBox3D;
        return SessionDomain.General;
    }
    private getSessionKey(domain: SessionDomain, sessionId: string): string {
        return `${domain}:${sessionId}`;
    }
    private ensureSessionExists(domain: SessionDomain, sessionId: string): void {
        const key = this.getSessionKey(domain, sessionId);
        if (!this.tasksBySession.has(key)) {
            this.tasksBySession.set(key, new Map());
        }
        if (!this.userMessagesBySession.has(key)) {
            this.userMessagesBySession.set(key, new Map());
        }
        if (!this.assistantMessagesBySession.has(key)) {
            this.assistantMessagesBySession.set(key, new Map());
        }
    }
    private getTasksSessionData(domain: SessionDomain, sessionId: string): Map<string, TaskInfo> | undefined {
        const key = this.getSessionKey(domain, sessionId);
        return this.tasksBySession.get(key);
    }
    private getOrCreateTasksSessionData(domain: SessionDomain, sessionId: string): Map<string, TaskInfo> {
        const key = this.getSessionKey(domain, sessionId);
        this.ensureSessionExists(domain, sessionId);
        return this.tasksBySession.get(key)!;
    }
    private getUserMessagesSessionData(domain: SessionDomain, sessionId: string): Map<string, ChatMessage> | undefined {
        const key = this.getSessionKey(domain, sessionId);
        return this.userMessagesBySession.get(key);
    }
    private getOrCreateUserMessagesSessionData(domain: SessionDomain, sessionId: string): Map<string, ChatMessage> {
        const key = this.getSessionKey(domain, sessionId);
        this.ensureSessionExists(domain, sessionId);
        return this.userMessagesBySession.get(key)!;
    }
    private getAssistantMessagesSessionData(domain: SessionDomain, sessionId: string): Map<string, ChatMessage> | undefined {
        const key = this.getSessionKey(domain, sessionId);
        return this.assistantMessagesBySession.get(key);
    }
    private getOrCreateAssistantMessagesSessionData(domain: SessionDomain, sessionId: string): Map<string, ChatMessage> {
        const key = this.getSessionKey(domain, sessionId);
        this.ensureSessionExists(domain, sessionId);
        return this.assistantMessagesBySession.get(key)!;
    }
    private validateDomainMatch(domain: SessionDomain, sessionId: string, operation: string): boolean {
        if (sessionId.startsWith("pending_")) {
            return true;
        }
        const actualDomain = this.getDomainFromSessionId(sessionId);
        if (domain !== actualDomain) {
            console.error(
                `[TaskManager] DOMAIN MISMATCH: ${operation} - ` +
                `Session "${sessionId}" belongs to "${actualDomain}", but "${domain}" was provided. ` +
                `This operation will be blocked to prevent data corruption!`
            );
            return false;
        }
        return true;
    }
    setCurrentDomain(domain: SessionDomain) {
        this.currentDomain = domain;
    }
    getCurrentDomain(): SessionDomain {
        return this.currentDomain;
    }
    subscribe(listener: TaskListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    public notify() {
        this.version++;
        this.listeners.forEach(listener => listener());
    }
    private async sendTaskNotification(
        type: NotificationType,
        titleKey: string,
        message: string,
        taskId?: string,
        sessionId?: string,
        data?: any
    ) {
        try {
            await notificationManager.add({
                title: titleKey,
                message,
                type,
                data: {
                    taskId,
                    sessionId: sessionId || this.currentSessionId,
                    ...data,
                },
            });
        } catch (error) {
            console.error("[TaskManager] Failed to send notification:", error);
        }
    }
    setCurrentSession(sessionId: string, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "setCurrentSession")) {
            return;
        }
        this.currentSessionId = sessionId;
        this.currentDomain = domain;
        this.ensureSessionExists(domain, sessionId);
        this.notify();
    }
    getCurrentSessionId(): string {
        return this.currentSessionId;
    }
    getTaskBySession(sessionId: string, taskId: string, domain: SessionDomain): TaskInfo | undefined {
        if (!this.validateDomainMatch(domain, sessionId, "getTaskBySession")) {
            return undefined;
        }
        const sessionData = this.getTasksSessionData(domain, sessionId);
        return sessionData?.get(taskId);
    }
    getTasksBySession(sessionId: string, domain: SessionDomain): Map<string, TaskInfo> | undefined {
        if (!this.validateDomainMatch(domain, sessionId, "getTasksBySession")) {
            return undefined;
        }
        return this.getTasksSessionData(domain, sessionId);
    }
    getAllTasksBySession(sessionId: string, domain: SessionDomain): TaskInfo[] {
        if (!this.validateDomainMatch(domain, sessionId, "getAllTasksBySession")) {
            return [];
        }
        const sessionData = this.getTasksSessionData(domain, sessionId);
        if (!sessionData) return [];
        const result: TaskInfo[] = [];
        sessionData.forEach((task) => {
            result.push(task);
        });
        return result.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }
    addTaskToSession(sessionId: string, task: TaskInfo, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "addTaskToSession")) {
            return;
        }
        const sessionData = this.getOrCreateTasksSessionData(domain, sessionId);
        sessionData.set(task.task_id, task);
        if (this.currentSessionId === sessionId && this.currentDomain === domain) {
            this.notify();
        }
    }
    updateTaskBySession(sessionId: string, taskId: string, updates: Partial<TaskInfo>, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "updateTaskBySession")) {
            return;
        }
        const sessionData = this.getTasksSessionData(domain, sessionId);
        const task = sessionData?.get(taskId);
        if (task && sessionData) {
            const updatedTask = { ...task, ...updates, updated_at: new Date().toISOString() };
            sessionData.set(taskId, updatedTask);
            if (updates.status && updates.status !== task.status) {
                if (updates.status === TaskStatusEnum.Completed) {
                    this.sendTaskNotification(
                        NotificationType.Success,
                        "notification.taskCompleted",
                        `Task "${task.user_input?.substring(0, 50) || taskId}" Executed Successfully`,
                        taskId,
                        sessionId,
                        { finalOutput: updatedTask.final_output }
                    );
                } else if (updates.status === TaskStatusEnum.Failed) {
                    this.sendTaskNotification(
                        NotificationType.Error,
                        "notification.taskFailed",
                        `Task "${task.user_input?.substring(0, 50) || taskId}" Execution Failed`,
                        taskId,
                        sessionId,
                        { error: updatedTask.final_output }
                    );
                }
            }
            if (this.currentSessionId === sessionId && this.currentDomain === domain) {
                this.notify();
            }
        }
    }
    removeTaskBySession(sessionId: string, taskId: string, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "removeTaskBySession")) {
            return;
        }
        const sessionData = this.getTasksSessionData(domain, sessionId);
        if (sessionData) {
            sessionData.delete(taskId);
            if (this.currentSessionId === sessionId && this.currentDomain === domain) {
                this.notify();
            }
        }
    }
    clearTasksBySession(sessionId: string, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "clearTasksBySession")) {
            return;
        }
        const key = this.getSessionKey(domain, sessionId);
        this.tasksBySession.delete(key);
        if (this.currentSessionId === sessionId && this.currentDomain === domain) {
            this.notify();
        }
    }
    setTasksBySession(sessionId: string, tasks: TaskInfo[], domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "setTasksBySession")) {
            return;
        }
        const sessionData = this.getOrCreateTasksSessionData(domain, sessionId);
        sessionData.clear();
        tasks.forEach(task => {
            if (task && task.task_id) {
                sessionData.set(task.task_id, task);
            }
        });
        if (this.currentSessionId === sessionId && this.currentDomain === domain) {
            this.notify();
        }
    }
    getUserMessagesBySession(sessionId: string, domain: SessionDomain): ChatMessage[] {
        if (!this.validateDomainMatch(domain, sessionId, "getUserMessagesBySession")) {
            return [];
        }
        const sessionData = this.getUserMessagesSessionData(domain, sessionId);
        if (!sessionData) return [];
        const result: ChatMessage[] = [];
        sessionData.forEach((msg) => {
            result.push(msg);
        });
        return result.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }
    getUserMessagesMapBySession(sessionId: string, domain: SessionDomain): Map<string, ChatMessage> | undefined {
        if (!this.validateDomainMatch(domain, sessionId, "getUserMessagesMapBySession")) {
            return undefined;
        }
        return this.getUserMessagesSessionData(domain, sessionId);
    }
    addUserMessageToSession(sessionId: string, message: ChatMessage, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "addUserMessageToSession")) {
            return;
        }
        const sessionData = this.getOrCreateUserMessagesSessionData(domain, sessionId);
        sessionData.set(message.id, message);
        if (this.currentSessionId === sessionId && this.currentDomain === domain) {
            this.notify();
        }
    }
    clearUserMessagesBySession(sessionId: string, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "clearUserMessagesBySession")) {
            return;
        }
        const key = this.getSessionKey(domain, sessionId);
        this.userMessagesBySession.delete(key);
        if (this.currentSessionId === sessionId && this.currentDomain === domain) {
            this.notify();
        }
    }
    getAssistantMessagesBySessionAsArray(sessionId: string, domain: SessionDomain): ChatMessage[] {
        if (!this.validateDomainMatch(domain, sessionId, "getAssistantMessagesBySessionAsArray")) {
            return [];
        }
        const sessionData = this.getAssistantMessagesSessionData(domain, sessionId);
        if (!sessionData) return [];
        const result: ChatMessage[] = [];
        sessionData.forEach((msg) => {
            result.push(msg);
        });
        return result.sort((a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }
    getAssistantMessagesMapBySession(sessionId: string, domain: SessionDomain): Map<string, ChatMessage> | undefined {
        if (!this.validateDomainMatch(domain, sessionId, "getAssistantMessagesMapBySession")) {
            return undefined;
        }
        return this.getAssistantMessagesSessionData(domain, sessionId);
    }
    addAssistantMessageToSession(sessionId: string, message: ChatMessage, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "addAssistantMessageToSession")) {
            return;
        }
        const sessionData = this.getOrCreateAssistantMessagesSessionData(domain, sessionId);
        sessionData.set(message.id, message);
        if (this.currentSessionId === sessionId && this.currentDomain === domain) {
            this.notify();
        }
    }
    updateAssistantMessageBySession(sessionId: string, messageId: string, updates: Partial<ChatMessage>, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "updateAssistantMessageBySession")) {
            return;
        }
        const sessionData = this.getAssistantMessagesSessionData(domain, sessionId);
        const message = sessionData?.get(messageId);
        if (message && sessionData) {
            sessionData.set(messageId, { ...message, ...updates });
            if (this.currentSessionId === sessionId && this.currentDomain === domain) {
                this.notify();
            }
        }
    }
    removeAssistantMessageBySession(sessionId: string, messageId: string, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "removeAssistantMessageBySession")) {
            return;
        }
        const sessionData = this.getAssistantMessagesSessionData(domain, sessionId);
        if (sessionData) {
            sessionData.delete(messageId);
            if (this.currentSessionId === sessionId && this.currentDomain === domain) {
                this.notify();
            }
        }
    }
    clearAssistantMessagesBySession(sessionId: string, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "clearAssistantMessagesBySession")) {
            return;
        }
        const key = this.getSessionKey(domain, sessionId);
        this.assistantMessagesBySession.delete(key);
        if (this.currentSessionId === sessionId && this.currentDomain === domain) {
            this.notify();
        }
    }
    getTask(taskId: string): TaskInfo | undefined {
        const domain = this.currentDomain;
        let result: TaskInfo | undefined = undefined;
        const prefix = `${domain}:`;
        this.tasksBySession.forEach((sessionData, key) => {
            if (result) return;
            if (key.startsWith(prefix)) {
                const task = sessionData.get(taskId);
                if (task) {
                    result = task;
                }
            }
        });
        return result;
    }
    getAllTasks(): TaskInfo[] {
        const domain = this.currentDomain;
        const allTasks: TaskInfo[] = [];
        const prefix = `${domain}:`;
        this.tasksBySession.forEach((sessionData, key) => {
            if (key.startsWith(prefix)) {
                sessionData.forEach((task) => {
                    allTasks.push(task);
                });
            }
        });
        return allTasks.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
    }
    addTask(task: TaskInfo) {
        const domain = this.currentDomain;
        const sessionId = this.currentSessionId;
        if (!sessionId) {
            console.error("[TaskManager] No current session set");
            return;
        }
        if (!this.validateDomainMatch(domain, sessionId, "addTask")) {
            return;
        }
        const sessionData = this.getOrCreateTasksSessionData(domain, sessionId);
        sessionData.set(task.task_id, task);
        this.notify();
    }
    updateTask(taskId: string, updates: Partial<TaskInfo>) {
        const domain = this.currentDomain;
        let found = false;
        const prefix = `${domain}:`;
        this.tasksBySession.forEach((sessionData, key) => {
            if (found) return;
            if (key.startsWith(prefix)) {
                const task = sessionData.get(taskId);
                if (task) {
                    const updatedTask = { ...task, ...updates, updated_at: new Date().toISOString() };
                    sessionData.set(taskId, updatedTask);
                    if (updates.status && updates.status !== task.status) {
                        if (updates.status === TaskStatusEnum.Completed) {
                            this.sendTaskNotification(
                                NotificationType.Success,
                                "notification.taskCompleted",
                                `Task "${task.user_input?.substring(0, 50) || taskId}" Executed Successfully`,
                                taskId,
                                task.session_id,
                                { finalOutput: updatedTask.final_output }
                            );
                        } else if (updates.status === TaskStatusEnum.Failed) {
                            this.sendTaskNotification(
                                NotificationType.Error,
                                "notification.taskFailed",
                                `Task "${task.user_input?.substring(0, 50) || taskId}" Execution Failed: ${updatedTask.final_output || "未知错误"}`,
                                taskId,
                                task.session_id,
                                { error: updatedTask.final_output }
                            );
                        } else if (updates.status === TaskStatusEnum.Running) {
                            this.sendTaskNotification(
                                NotificationType.Info,
                                "notification.taskStarted",
                                `Task "${task.user_input?.substring(0, 50) || taskId}" Start Execution`,
                                taskId,
                                task.session_id,
                                { status: "running" }
                            );
                        }
                    }
                    if (this.currentSessionId === task.session_id) {
                        this.notify();
                    }
                    found = true;
                }
            }
        });
        if (!found) {
            console.warn("[TaskManager] Task not found for update:", taskId);
        }
    }
    removeTask(taskId: string) {
        const domain = this.currentDomain;
        let removed = false;
        const prefix = `${domain}:`;
        this.tasksBySession.forEach((sessionData, key) => {
            if (removed) return;
            if (key.startsWith(prefix)) {
                if (sessionData.delete(taskId)) {
                    removed = true;
                    this.notify();
                }
            }
        });
    }
    clearTasks() {
        const domain = this.currentDomain;
        const keysToDelete: string[] = [];
        const prefix = `${domain}:`;
        this.tasksBySession.forEach((_, key) => {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.tasksBySession.delete(key));
        this.notify();
    }
    setTasks(tasks: TaskInfo[]) {
        const domain = this.currentDomain;
        const keysToDelete: string[] = [];
        const prefix = `${domain}:`;
        this.tasksBySession.forEach((_, key) => {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.tasksBySession.delete(key));
        tasks.forEach(task => {
            if (task && task.task_id) {
                const key = this.getSessionKey(domain, task.session_id);
                if (!this.tasksBySession.has(key)) {
                    this.tasksBySession.set(key, new Map());
                }
                this.tasksBySession.get(key)!.set(task.task_id, task);
            }
        });
        this.notify();
    }
    getTaskCount(): number {
        const domain = this.currentDomain;
        let count = 0;
        const prefix = `${domain}:`;
        this.tasksBySession.forEach((sessionData, key) => {
            if (key.startsWith(prefix)) {
                count += sessionData.size;
            }
        });
        return count;
    }
    addUserMessage(message: ChatMessage) {
        const domain = this.currentDomain;
        const sessionId = this.currentSessionId;
        if (!sessionId) {
            console.error("[TaskManager] No current session set");
            return;
        }
        if (!this.validateDomainMatch(domain, sessionId, "addUserMessage")) {
            return;
        }
        const sessionData = this.getOrCreateUserMessagesSessionData(domain, sessionId);
        sessionData.set(message.id, message);
        this.notify();
    }
    getUserMessages(): ChatMessage[] {
        const domain = this.currentDomain;
        const allMessages: ChatMessage[] = [];
        const prefix = `${domain}:`;
        this.userMessagesBySession.forEach((sessionData, key) => {
            if (key.startsWith(prefix)) {
                sessionData.forEach((msg) => {
                    allMessages.push(msg);
                });
            }
        });
        return allMessages.sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }
    clearUserMessages() {
        const domain = this.currentDomain;
        const keysToDelete: string[] = [];
        const prefix = `${domain}:`;
        this.userMessagesBySession.forEach((_, key) => {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.userMessagesBySession.delete(key));
        this.notify();
    }
    addAssistantMessage(message: ChatMessage) {
        const domain = this.currentDomain;
        const sessionId = this.currentSessionId;
        if (!sessionId) {
            console.error("[TaskManager] No current session set");
            return;
        }
        if (!this.validateDomainMatch(domain, sessionId, "addAssistantMessage")) {
            return;
        }
        const sessionData = this.getOrCreateAssistantMessagesSessionData(domain, sessionId);
        sessionData.set(message.id, message);
        this.notify();
    }
    getAssistantMessages(): ChatMessage[] {
        const domain = this.currentDomain;
        const allMessages: ChatMessage[] = [];
        const prefix = `${domain}:`;
        this.assistantMessagesBySession.forEach((sessionData, key) => {
            if (key.startsWith(prefix)) {
                sessionData.forEach((msg) => {
                    allMessages.push(msg);
                });
            }
        });
        return allMessages.sort(
            (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }
    clearAssistantMessages() {
        const domain = this.currentDomain;
        const keysToDelete: string[] = [];
        const prefix = `${domain}:`;
        this.assistantMessagesBySession.forEach((_, key) => {
            if (key.startsWith(prefix)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.assistantMessagesBySession.delete(key));
        this.notify();
    }
    hasWelcomeMessage(): boolean {
        const domain = this.currentDomain;
        const sessionId = this.currentSessionId;
        if (!sessionId) return false;
        const key = this.getSessionKey(domain, sessionId);
        const sessionData = this.assistantMessagesBySession.get(key);
        return sessionData?.has("welcome") || false;
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
        const domain = this.currentDomain;
        const sessionId = this.currentSessionId;
        if (!sessionId) {
            console.error("[TaskManager] No current session set");
            return;
        }
        if (!this.validateDomainMatch(domain, sessionId, "updateAssistantMessage")) {
            return;
        }
        const key = this.getSessionKey(domain, sessionId);
        const sessionData = this.assistantMessagesBySession.get(key);
        const message = sessionData?.get(messageId);
        if (message && sessionData) {
            sessionData.set(messageId, { ...message, ...updates });
            this.notify();
        }
    }
    removeAssistantMessage(messageId: string) {
        const domain = this.currentDomain;
        const sessionId = this.currentSessionId;
        if (!sessionId) {
            console.error("[TaskManager] No current session set");
            return;
        }
        if (!this.validateDomainMatch(domain, sessionId, "removeAssistantMessage")) {
            return;
        }
        const key = this.getSessionKey(domain, sessionId);
        const sessionData = this.assistantMessagesBySession.get(key);
        if (sessionData) {
            sessionData.delete(messageId);
            this.notify();
        }
    }
    clearAll() {
        const domain = this.currentDomain;
        const taskKeys: string[] = [];
        const userKeys: string[] = [];
        const assistantKeys: string[] = [];
        const prefix = `${domain}:`;
        this.tasksBySession.forEach((_, key) => {
            if (key.startsWith(prefix)) taskKeys.push(key);
        });
        this.userMessagesBySession.forEach((_, key) => {
            if (key.startsWith(prefix)) userKeys.push(key);
        });
        this.assistantMessagesBySession.forEach((_, key) => {
            if (key.startsWith(prefix)) assistantKeys.push(key);
        });
        taskKeys.forEach(key => this.tasksBySession.delete(key));
        userKeys.forEach(key => this.userMessagesBySession.delete(key));
        assistantKeys.forEach(key => this.assistantMessagesBySession.delete(key));
        this.notify();
    }
    clearAllBySession(sessionId: string, domain: SessionDomain) {
        if (!this.validateDomainMatch(domain, sessionId, "clearAllBySession")) {
            return;
        }
        const key = this.getSessionKey(domain, sessionId);
        this.tasksBySession.delete(key);
        this.userMessagesBySession.delete(key);
        this.assistantMessagesBySession.delete(key);
        if (this.currentSessionId === sessionId && this.currentDomain === domain) {
            this.currentSessionId = "";
        }
        this.notify();
    }
    loadSessionData(
        sessionId: string,
        tasks: TaskInfo[],
        userMessages: ChatMessage[],
        assistantMessages: ChatMessage[],
        domain: SessionDomain
    ) {
        if (!this.validateDomainMatch(domain, sessionId, "loadSessionData")) {
            console.error(
                `[TaskManager] ❌ BLOCKED: Cannot load session data - ` +
                `Session "${sessionId}" belongs to "${this.getDomainFromSessionId(sessionId)}", ` +
                `but "${domain}" was provided.`
            );
            return;
        }
        const key = this.getSessionKey(domain, sessionId);
        this.tasksBySession.delete(key);
        this.userMessagesBySession.delete(key);
        this.assistantMessagesBySession.delete(key);
        this.ensureSessionExists(domain, sessionId);
        const tasksSessionData = this.getOrCreateTasksSessionData(domain, sessionId);
        tasks.forEach(task => {
            if (task && task.task_id) tasksSessionData.set(task.task_id, task);
        });
        const userSessionData = this.getOrCreateUserMessagesSessionData(domain, sessionId);
        userMessages.forEach(msg => {
            if (msg && msg.id) userSessionData.set(msg.id, msg);
        });
        const assistantSessionData = this.getOrCreateAssistantMessagesSessionData(domain, sessionId);
        assistantMessages.forEach(msg => {
            if (msg && msg.id) assistantSessionData.set(msg.id, msg);
        });
        this.currentSessionId = sessionId;
        this.currentDomain = domain;
        this.notify();
    }
    switchToSession(sessionId: string, domain: SessionDomain) {
        if (this.currentSessionId === sessionId && this.currentDomain === domain) return;
        if (!this.validateDomainMatch(domain, sessionId, "switchToSession")) {
            return;
        }
        this.ensureSessionExists(domain, sessionId);
        this.currentSessionId = sessionId;
        this.currentDomain = domain;
        this.notify();
    }
    getSessionIdsInCurrentDomain(): string[] {
        const domain = this.currentDomain;
        const ids: string[] = [];
        const prefix = `${domain}:`;
        this.tasksBySession.forEach((_, key) => {
            if (key.startsWith(prefix)) {
                const sessionId = key.substring(prefix.length);
                if (!ids.includes(sessionId)) {
                    ids.push(sessionId);
                }
            }
        });
        return ids;
    }
    hasSessionData(sessionId: string, domain: SessionDomain): boolean {
        if (!this.validateDomainMatch(domain, sessionId, "hasSessionData")) {
            return false;
        }
        const key = this.getSessionKey(domain, sessionId);
        return this.tasksBySession.has(key) ||
            this.userMessagesBySession.has(key) ||
            this.assistantMessagesBySession.has(key);
    }
    hasSessionMessages(sessionId: string, domain: SessionDomain): boolean {
        if (!this.validateDomainMatch(domain, sessionId, "hasSessionMessages")) {
            return false;
        }
        const key = this.getSessionKey(domain, sessionId);
        const userCount = this.userMessagesBySession.get(key)?.size || 0;
        const assistantCount = this.assistantMessagesBySession.get(key)?.size || 0;
        return userCount > 0 || assistantCount > 0;
    }
    setupTaskEventListeners() {
        window.addEventListener("task_step_interrupted", ((event: CustomEvent) => {
            const { task_id, step_index, step_name, reason, checkpoint, session_id } = event.detail;
            const domain = this.getDomainFromSessionId(session_id);
            if (reason === "cancelled") {
                this.updateTaskBySession(session_id, task_id, {
                    status: TaskStatusEnum.Cancelled,
                    final_output: `Task cancelled at step: ${step_name}`
                }, domain);
            } else if (reason === "paused") {
                this.updateTaskBySession(session_id, task_id, {
                    status: TaskStatusEnum.Paused,
                    resume_data: checkpoint
                }, domain);
            }
        }) as EventListener);
        window.addEventListener("task_cancelled", ((event: CustomEvent) => {
            const { task_id, total_duration_ms, total_steps, session_id } = event.detail;
            const domain = this.getDomainFromSessionId(session_id);
            this.updateTaskBySession(session_id, task_id, {
                status: TaskStatusEnum.Cancelled,
                total_duration_ms
            }, domain);
            this.sendTaskNotification(
                NotificationType.Warning,
                "notification.taskCancelled",
                `Task cancelled after ${total_steps} steps`,
                task_id,
                session_id
            );
        }) as EventListener);
        window.addEventListener("task_paused", ((event: CustomEvent) => {
            const { task_id, checkpoint, total_duration_ms, total_steps, session_id } = event.detail;
            const domain = this.getDomainFromSessionId(session_id);
            this.updateTaskBySession(session_id, task_id, {
                status: TaskStatusEnum.Paused,
                total_duration_ms,
                resume_data: checkpoint
            }, domain);
            this.sendTaskNotification(
                NotificationType.Info,
                "notification.taskPaused",
                `Task paused at step ${total_steps}`,
                task_id,
                session_id,
                { checkpoint }
            );
        }) as EventListener);
    }
    async saveTasksToFile(sessionId: string, domain: SessionDomain): Promise<void> {
        if (!this.validateDomainMatch(domain, sessionId, "saveTasksToFile")) {
            return;
        }
        const tasks = this.getTasksSessionData(domain, sessionId);
        if (!tasks) return;
        const tasksArray: TaskInfo[] = [];
        tasks.forEach((task) => {
            tasksArray.push(task);
        });
        if (tasksArray.length === 0) return;
        try {
            if (domain === SessionDomain.Chart) {
                await chartSessionCommands.saveTaskContent(sessionId, tasksArray);
            } else if (domain === SessionDomain.Map) {
                await mapSessionCommands.saveTaskContent(sessionId, tasksArray);
            } else if (domain === SessionDomain.CodeEditor) {
                await codeEditorSessionCommands.saveTaskContent(sessionId, tasksArray);
            } else if (domain === SessionDomain.Video) {
                await videoSessionCommands.saveTaskContent(sessionId, tasksArray);
            } else if (domain === SessionDomain.SandBox3D) {
                await sandbox3dSessionCommands.saveTaskContent(sessionId, tasksArray);
            } else {
                await sessionCommands.saveTaskContent(sessionId, tasksArray);
            }
        } catch (error) {
            console.error("[TaskManager] Failed to save tasks:", error);
        }
    }
    async loadTasksFromFile(sessionId: string, domain: SessionDomain): Promise<void> {
        if (!this.validateDomainMatch(domain, sessionId, "loadTasksFromFile")) {
            return;
        }
        let tasksContent = null;
        try {
            if (domain === SessionDomain.Chart) {
                tasksContent = await chartSessionCommands.loadTaskContent(sessionId);
            } else if (domain === SessionDomain.Map) {
                tasksContent = await mapSessionCommands.loadTaskContent(sessionId);
            } else if (domain === SessionDomain.CodeEditor) {
                tasksContent = await codeEditorSessionCommands.loadTaskContent(sessionId);
            } else if (domain === SessionDomain.Video) {
                tasksContent = await videoSessionCommands.loadTaskContent(sessionId);
            } else if (domain === SessionDomain.SandBox3D) {
                tasksContent = await sandbox3dSessionCommands.loadTaskContent(sessionId);
            } else {
                tasksContent = await sessionCommands.loadTaskContent(sessionId);
            }
        } catch (error) {
            console.error("[TaskManager] Failed to load tasks:", error);
            return;
        }
        if (!tasksContent || !Array.isArray(tasksContent)) return;
        const sessionData = this.getOrCreateTasksSessionData(domain, sessionId);
        tasksContent.forEach(task => {
            if (task && task.task_id) sessionData.set(task.task_id, task);
        });
    }
    async saveCurrentSessionToFile(): Promise<void> {
        if (this.currentSessionId) {
            await this.saveTasksToFile(this.currentSessionId, this.currentDomain);
        }
    }
    deleteSession(sessionId: string, domain: SessionDomain): void {
        if (!this.validateDomainMatch(domain, sessionId, "deleteSession")) {
            return;
        }
        const key = this.getSessionKey(domain, sessionId);
        this.tasksBySession.delete(key);
        this.userMessagesBySession.delete(key);
        this.assistantMessagesBySession.delete(key);
        if (this.currentSessionId === sessionId && this.currentDomain === domain) {
            this.currentSessionId = "";
        }
        this.notify();
    }
}
export const taskManager = new TaskManager();