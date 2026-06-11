import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { ChatMessage, TaskInfo, UploadFile, RoleEnum, MessageStatus, TaskStatusEnum, Language } from "../../types/type";
import { getSystemPrompt } from "../../llm/prompts/basis";
import { hippoxCommands } from "../../command/chat";
import { sessionCommands } from "../../command/session";
import { taskManager } from "../../core/TaskManager";

export function useSession(language: Language, isConfigLoaded: boolean, onCloseSkillsManager?: () => void) {
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);
    const [taskManagerVersion, setTaskManagerVersion] = useState(0);
    const { t } = useTranslation(language);
    useEffect(() => {
        const unsubscribe = taskManager.subscribe(() => {
            setTaskManagerVersion((prev) => prev + 1);
        });
        return unsubscribe;
    }, []);
    useEffect(() => {
        if (!isLoading && currentSessionId) {
            const saveTimer = setTimeout(() => {
                const allData = taskManager.getAllData();
                (sessionCommands.saveChatContent as any)(
                    currentSessionId,
                    JSON.stringify({
                        userMessages: allData.userMessages,
                        assistantMessages: allData.assistantMessages,
                    }),
                ).catch(console.error);
                (sessionCommands.saveTerminalContent as any)(
                    currentSessionId,
                    JSON.stringify(allData.tasks),
                ).catch(console.error);
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
                        const chatContent = await sessionCommands.loadChatContent(
                            session.session_id,
                        );
                        const terminalContent = await sessionCommands.loadTerminalContent(
                            session.session_id,
                        );
                        let userMessages: ChatMessage[] = [];
                        let assistantMessages: ChatMessage[] = [];
                        let tasks: TaskInfo[] = [];
                        if (chatContent) {
                            try {
                                const parsed =
                                    typeof chatContent === "string"
                                        ? JSON.parse(chatContent)
                                        : chatContent;
                                userMessages = parsed?.userMessages || [];
                                assistantMessages = parsed?.assistantMessages || [];
                            } catch { }
                        }
                        if (terminalContent) {
                            try {
                                const parsed =
                                    typeof terminalContent === "string"
                                        ? JSON.parse(terminalContent)
                                        : terminalContent;
                                tasks = Array.isArray(parsed) ? parsed : [];
                            } catch { }
                        }
                        if (!taskManager.getTasksBySession(session.session_id)) {
                            taskManager.loadSessionData(
                                session.session_id,
                                tasks,
                                userMessages,
                                assistantMessages,
                            );
                        }
                    }
                }
                const tempSessionId = `temp_${Date.now()}`;
                taskManager.loadSessionData(tempSessionId, [], [], []);
                setCurrentSessionId(tempSessionId);
                localStorage.setItem("hippox-current-session", tempSessionId);
            } catch (error) {
                console.error("Failed to load sessions:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadSessions();
    }, [isConfigLoaded]);

    useEffect(() => {
        if (!isLoading && currentSessionId) {
            const saveTimer = setTimeout(async () => {
                const allData = taskManager.getAllData();
                (sessionCommands.saveChatContent as any)(
                    currentSessionId,
                    JSON.stringify({
                        userMessages: allData.userMessages,
                        assistantMessages: allData.assistantMessages,
                    }),
                ).catch(console.error);
                (sessionCommands.saveTerminalContent as any)(
                    currentSessionId,
                    JSON.stringify(allData.tasks),
                ).catch(console.error);
            }, 1000);
            return () => clearTimeout(saveTimer);
        }
    }, [currentSessionId, isLoading]);

    useEffect(() => {
        if (!isLoading && currentSessionId) {
            const saveTimer = setTimeout(async () => {
                const allData = taskManager.getAllData();
                (sessionCommands.saveChatContent as any)(
                    currentSessionId,
                    JSON.stringify({
                        userMessages: allData.userMessages,
                        assistantMessages: allData.assistantMessages,
                    }),
                ).catch(console.error);
                (sessionCommands.saveTerminalContent as any)(
                    currentSessionId,
                    JSON.stringify(allData.tasks),
                ).catch(console.error);
            }, 500);
            return () => clearTimeout(saveTimer);
        }
    }, [currentSessionId, isLoading, taskManager.getAllData()]);

    const handleNewSession = useCallback(async () => {
        const tempSessionId = `temp_${Date.now()}`;
        taskManager.loadSessionData(tempSessionId, [], [], []);
        setCurrentSessionId(tempSessionId);
        localStorage.setItem("hippox-current-session", tempSessionId);
        onCloseSkillsManager?.();
    }, [onCloseSkillsManager]);

    const handleSwitchSession = useCallback(async (sessionId: string) => {
        if (sessionId === currentSessionId) return;
        if (sessionId.startsWith("temp_")) return;
        try {
            if (currentSessionId && !currentSessionId.startsWith("temp_")) {
                const allData = taskManager.getAllData();
                await (sessionCommands.saveChatContent as any)(
                    currentSessionId,
                    JSON.stringify({
                        userMessages: allData.userMessages,
                        assistantMessages: allData.assistantMessages,
                    }),
                ).catch(console.error);
                await (sessionCommands.saveTerminalContent as any)(
                    currentSessionId,
                    JSON.stringify(allData.tasks),
                ).catch(console.error);
            }
            const hasData = taskManager.getTasksBySession(sessionId) !== undefined;
            if (!hasData) {
                const chatContent = await sessionCommands.loadChatContent(sessionId);
                const terminalContent =
                    await sessionCommands.loadTerminalContent(sessionId);
                let userMessages: ChatMessage[] = [];
                let assistantMessages: ChatMessage[] = [];
                let tasks: TaskInfo[] = [];
                if (chatContent) {
                    try {
                        const parsed =
                            typeof chatContent === "string"
                                ? JSON.parse(chatContent)
                                : chatContent;
                        userMessages = parsed?.userMessages || [];
                        assistantMessages = parsed?.assistantMessages || [];
                    } catch { }
                }
                if (terminalContent) {
                    try {
                        const parsed =
                            typeof terminalContent === "string"
                                ? JSON.parse(terminalContent)
                                : terminalContent;
                        tasks = Array.isArray(parsed) ? parsed : [];
                    } catch { }
                }
                taskManager.loadSessionData(
                    sessionId,
                    tasks,
                    userMessages,
                    assistantMessages,
                );
            } else {
                taskManager.switchToSession(sessionId);
            }
            setCurrentSessionId(sessionId);
            localStorage.setItem("hippox-current-session", sessionId);
            window.dispatchEvent(new CustomEvent("session-created"));
        } catch (error) {
            console.error("Failed to switch session:", error);
        }
    }, [currentSessionId]);

    const handleSendMessage = useCallback(async (
        userMessage: string,
        sessionId: string,
        files?: UploadFile[],
    ) => {
        const now = new Date();
        let finalSessionId = sessionId || currentSessionId;
        const isTempSession = finalSessionId.startsWith("temp_");

        if (isTempSession) {
            const newSessionId = `session_${Date.now()}`;
            const sessionTitle =
                userMessage.length > 30
                    ? userMessage.slice(0, 30) + "..."
                    : userMessage;
            const tempUserMessages =
                taskManager.getUserMessagesBySession(finalSessionId);
            const tempAssistantMessages =
                taskManager.getAssistantMessagesBySessionAsArray(finalSessionId);
            const tempTasksMap = taskManager.getTasksBySession(finalSessionId);
            const tempTasks = tempTasksMap ? Array.from(tempTasksMap.values()) : [];
            try {
                await (sessionCommands.createSession as any)(
                    newSessionId,
                    sessionTitle,
                    t("app.newSessionDesc"),
                    JSON.stringify({
                        userMessages: tempUserMessages,
                        assistantMessages: tempAssistantMessages,
                    }),
                    JSON.stringify(tempTasks),
                );
                taskManager.loadSessionData(
                    newSessionId,
                    tempTasks,
                    tempUserMessages,
                    tempAssistantMessages,
                );
                taskManager.deleteSession(finalSessionId);
                finalSessionId = newSessionId;
                setCurrentSessionId(newSessionId);
                localStorage.setItem("hippox-current-session", newSessionId);
                window.dispatchEvent(new CustomEvent("session-created"));
            } catch (error) {
                console.error("Failed to create session:", error);
            }
        }

        const existingMessages =
            taskManager.getUserMessagesBySession(finalSessionId);
        const lastMessage = existingMessages[existingMessages.length - 1];
        const shouldAddUserMessage =
            !lastMessage ||
            lastMessage.content !== userMessage ||
            Date.now() - new Date(lastMessage.timestamp).getTime() > 1000;

        if (shouldAddUserMessage) {
            const userMsg: ChatMessage = {
                id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                role: RoleEnum.User,
                content: userMessage,
                timestamp: now.toISOString(),
                files: files,
            };
            taskManager.addUserMessageToSession(finalSessionId, userMsg);
        }
        try {
            const systemPrompt = getSystemPrompt(language as 'zh' | 'en');
            const fullMessage = `${systemPrompt}\n\n User: ${userMessage}`;
            const taskId = await hippoxCommands.sendMessageAsync(
                userMessage,
                fullMessage,
                finalSessionId,
            );
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

    const resetSession = useCallback(async () => {
        try {
            await hippoxCommands.resetSession();
            const welcomeMsg: ChatMessage = {
                id: "welcome",
                role: RoleEnum.LLM,
                content: t("session.reset"),
                timestamp: new Date().toISOString(),
            };
            taskManager.loadSessionData(currentSessionId, [], [], [welcomeMsg]);
        } catch (error) {
            console.error("reset session error:", error);
        }
    }, [currentSessionId, t]);

    const shouldShowWelcome = useCallback(() => {
        if (isLoading) return true;
        if (currentSessionId?.startsWith("temp_")) {
            const userMessages =
                taskManager.getUserMessagesBySession(currentSessionId);
            const assistantMessages =
                taskManager.getAssistantMessagesBySessionAsArray(currentSessionId);
            return userMessages.length === 0 && assistantMessages.length === 0;
        }
        return false;
    }, [isLoading, currentSessionId]);

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