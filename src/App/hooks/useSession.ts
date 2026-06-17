import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { getSystemPrompt } from "../../llm/prompts/basis";
import { hippoxCommands } from "../../command/chat";
import { sessionCommands } from "../../command/session";
import { taskManager } from "../../core/TaskManager";
import { TaskInfo, UploadFile, TaskStatusEnum } from "../../core/types";
import { Language, ChatMessage, RoleEnum, MessageStatus } from "../../types/types";

export function useSession(language: Language, isConfigLoaded: boolean, onCloseSkillsManager?: () => void) {
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [taskManagerVersion, setTaskManagerVersion] = useState(0);
    const [pendingNewSession, setPendingNewSession] = useState(false);
    const { t } = useTranslation(language);
    useEffect(() => {
        const unsubscribe = taskManager.subscribe(() => {
            setTaskManagerVersion((prev) => prev + 1);
        });
        return unsubscribe;
    }, []);
    useEffect(() => {
        if (!isLoading && currentSessionId && !currentSessionId.startsWith("temp_") && !currentSessionId.startsWith("pending_")) {
            const saveTimer = setTimeout(() => {
                const allData = taskManager.getAllData();
                const userMessages = (allData?.userMessages || []) as ChatMessage[];
                const assistantMessages = (allData?.assistantMessages || []) as ChatMessage[];
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                sessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                sessionCommands.saveTerminalContent(currentSessionId, allData?.tasks || []).catch(console.error);
            }, 500);
            return () => clearTimeout(saveTimer);
        }
    }, [currentSessionId, isLoading, taskManagerVersion]);
    useEffect(() => {
        const loadSessions = async () => {
            if (!isConfigLoaded) return;
            try {
                const sessions = await sessionCommands.listSessions();
                if (sessions.length > 0) {
                    for (const session of sessions) {
                        const chatContent = await sessionCommands.loadChatContent(session.session_id);
                        const terminalContent = await sessionCommands.loadTerminalContent(session.session_id);
                        let userMessages: ChatMessage[] = [];
                        let assistantMessages: ChatMessage[] = [];
                        let tasks: TaskInfo[] = [];
                        if (chatContent) {
                            const allMessages = chatContent as ChatMessage[];
                            userMessages = allMessages.filter(msg => msg.role === RoleEnum.User);
                            assistantMessages = allMessages.filter(msg => msg.role === RoleEnum.LLM);
                        }
                        if (terminalContent) {
                            tasks = terminalContent as TaskInfo[];
                        }
                        if (!taskManager.getTasksBySession(session.session_id)) {
                            taskManager.loadSessionData(session.session_id, tasks, userMessages, assistantMessages);
                        }
                    }
                    const firstSession = sessions[0];
                    setCurrentSessionId(firstSession.session_id);
                    localStorage.setItem("hippox-current-session", firstSession.session_id);
                    setPendingNewSession(false);
                } else {
                    setCurrentSessionId("");
                    localStorage.removeItem("hippox-current-session");
                    setPendingNewSession(false);
                }
            } catch (error) {
                console.error("Failed to load sessions:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSessions();
    }, [isConfigLoaded]);
    const handleSendMessage = useCallback(async (
        userMessage: string,
        sessionId: string,
        files?: UploadFile[],
    ) => {
        const now = new Date();
        let finalSessionId = sessionId || currentSessionId;
        if (finalSessionId && finalSessionId.startsWith("pending_")) {
            const newSessionId = `session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30 ? userMessage.slice(0, 30) + "..." : userMessage;
            const tempUserMessages = taskManager.getUserMessagesBySession(finalSessionId);
            const tempAssistantMessages = taskManager.getAssistantMessagesBySessionAsArray(finalSessionId);
            const tempTasksMap = taskManager.getTasksBySession(finalSessionId);
            const tempTasks = tempTasksMap ? Array.from(tempTasksMap.values()) : [];
            await sessionCommands.createSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],
                []
            );
            taskManager.loadSessionData(newSessionId, tempTasks, tempUserMessages, tempAssistantMessages);
            taskManager.deleteSession(finalSessionId);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            localStorage.setItem("hippox-current-session", newSessionId);
            window.dispatchEvent(new CustomEvent("session-created"));
            setPendingNewSession(false);
        } else if (!finalSessionId) {
            const newSessionId = `session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30 ? userMessage.slice(0, 30) + "..." : userMessage;
            await sessionCommands.createSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],
                []
            );
            taskManager.loadSessionData(newSessionId, [], [], []);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            localStorage.setItem("hippox-current-session", newSessionId);
            window.dispatchEvent(new CustomEvent("session-created"));
        }
        const userMsg: ChatMessage = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: RoleEnum.User,
            content: userMessage,
            timestamp: now.toISOString(),
            files: files,
        };
        taskManager.addUserMessageToSession(finalSessionId, userMsg);
        try {
            const systemPrompt = getSystemPrompt(language as 'zh' | 'en');
            const fullMessage = `${systemPrompt}\n\n User: ${userMessage}`;
            const taskId = await hippoxCommands.sendMessageAsync(userMessage, fullMessage, finalSessionId);
            const messageId = `llm_${taskId}`;
            const assistantMsg: ChatMessage = {
                id: messageId,
                role: RoleEnum.LLM,
                content: `⏳ ${t("chat.taskSubmitted")} ${taskId.slice(0, 8)}...`,
                timestamp: now.toISOString(),
                status: MessageStatus.Pending,
            };
            taskManager.addAssistantMessageToSession(finalSessionId, assistantMsg);
            const newTask: TaskInfo = {
                task_id: taskId,
                session_id: finalSessionId,
                user_input: userMessage,
                status: TaskStatusEnum.Pending,
                steps: [],
                final_output: undefined,
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                files: files,
            };
            taskManager.addTaskToSession(finalSessionId, newTask);
        } catch (error) {
            console.error("send message error:", error);
            const errorMsg: ChatMessage = {
                id: `error_${Date.now()}`,
                role: RoleEnum.LLM,
                content: `❌ ${error}`,
                timestamp: now.toISOString(),
            };
            taskManager.addAssistantMessageToSession(finalSessionId, errorMsg);
        }
    }, [currentSessionId, t, language]);
    const handleNewSession = useCallback(async () => {
        const pendingId = `pending_${Date.now()}`;
        taskManager.loadSessionData(pendingId, [], [], []);
        setCurrentSessionId(pendingId);
        localStorage.setItem("hippox-current-session", pendingId);
        setPendingNewSession(true);
        onCloseSkillsManager?.();
    }, [onCloseSkillsManager]);
    const handleSwitchSession = useCallback(async (sessionId: string) => {
        if (sessionId === currentSessionId) return;
        if (currentSessionId && !currentSessionId.startsWith("pending_") && !currentSessionId.startsWith("temp_")) {
            try {
                const allData = taskManager.getAllData();
                const userMessages = (allData?.userMessages || []) as ChatMessage[];
                const assistantMessages = (allData?.assistantMessages || []) as ChatMessage[];
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                await sessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                await sessionCommands.saveTerminalContent(currentSessionId, allData?.tasks || []).catch(console.error);
            } catch (error) {
                console.error("Failed to save current session:", error);
            }
        }
        const hasData = taskManager.getTasksBySession(sessionId) !== undefined;
        if (!hasData) {
            const chatContent = await sessionCommands.loadChatContent(sessionId);
            const terminalContent = await sessionCommands.loadTerminalContent(sessionId);
            let userMessages: ChatMessage[] = [];
            let assistantMessages: ChatMessage[] = [];
            let tasks: TaskInfo[] = [];
            if (chatContent) {
                const allMessages = chatContent as ChatMessage[];
                userMessages = allMessages.filter(msg => msg.role === RoleEnum.User);
                assistantMessages = allMessages.filter(msg => msg.role === RoleEnum.LLM);
            }
            if (terminalContent) {
                tasks = terminalContent as TaskInfo[];
            }
            taskManager.loadSessionData(sessionId, tasks, userMessages, assistantMessages);
        } else {
            taskManager.switchToSession(sessionId);
        }
        setCurrentSessionId(sessionId);
        localStorage.setItem("hippox-current-session", sessionId);
        window.dispatchEvent(new CustomEvent("session-created"));
    }, [currentSessionId]);
    const shouldShowWelcome = useCallback(() => {
        if (isLoading) return true;
        if (!currentSessionId) return true;
        if (currentSessionId.startsWith("pending_")) {
            const userMessages = taskManager.getUserMessagesBySession(currentSessionId);
            const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId);
            return userMessages.length === 0 && assistantMessages.length === 0;
        }
        const userMessages = taskManager.getUserMessagesBySession(currentSessionId);
        const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId);
        return userMessages.length === 0 && assistantMessages.length === 0;
    }, [isLoading, currentSessionId]);
    const resetSession = useCallback(async () => {
        if (!currentSessionId || currentSessionId.startsWith("pending_")) return;
        try {
            await hippoxCommands.resetSession();
            taskManager.loadSessionData(currentSessionId, [], [], []);
        } catch (error) {
            console.error("reset session error:", error);
        }
    }, [currentSessionId]);
    return {
        currentSessionId,
        isLoading,
        taskManagerVersion,
        handleNewSession,
        handleSwitchSession,
        handleSendMessage,
        resetSession,
        shouldShowWelcome,
    };
}