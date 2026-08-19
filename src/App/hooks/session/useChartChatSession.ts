import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import { hippoxCommands } from "../../../command/chat";
import { taskManager } from "../../../core/TaskManager";
import { TaskInfo, UploadFile, TaskStatusEnum, SessionDomain } from "../../../core/types";
import { Language, ChatMessage, RoleEnum, MessageStatus } from "../../../types/types";
import { workspaceCommands } from "../../../command/workspace";
import { chartSessionCommands } from "../../../command/session/chart";
import { getChartsSystemPrompt } from "../../../subsystem/Charts/llm/prompts/basis";
export function useChartSession(
    language: Language,
    isConfigLoaded: boolean,
) {
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [currentWorkflowMode, setCurrentWorkflowMode] = useState<string>("ReAct");
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
        if (
            !isLoading &&
            currentSessionId &&
            !currentSessionId.startsWith("temp_") &&
            !currentSessionId.startsWith("pending_")
        ) {
            const currentDomain = taskManager.getCurrentDomain();
            if (currentDomain !== SessionDomain.Chart) {
                console.debug(
                    `[useChartSession] Skipping save - current domain is "${currentDomain}", not "Chart"`
                );
                return;
            }
            const saveTimer = setTimeout(() => {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.Chart);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.Chart);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.Chart);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                if (userMessages.length === 0 && assistantMessages.length === 0) {
                    return;
                }
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                chartSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                chartSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            }, 500);
            return () => clearTimeout(saveTimer);
        }
    }, [currentSessionId, isLoading, taskManagerVersion]);
    useEffect(() => {
        if (isConfigLoaded) {
            chartSessionCommands.listChartSessions()
                .then(list => {
                    if (list.length > 0) {
                        const sorted = list.sort((a, b) => {
                            const aTs = parseInt(a.session_id.replace("chart_session_", "")) || 0;
                            const bTs = parseInt(b.session_id.replace("chart_session_", "")) || 0;
                            return bTs - aTs;
                        });
                        const sessionId = sorted[0].session_id;
                        setCurrentSessionId(sessionId);
                        Promise.all([
                            chartSessionCommands.loadChatContent(sessionId),
                            chartSessionCommands.loadTerminalContent(sessionId)
                        ]).then(([chatContent, terminalContent]) => {
                            const userMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.User);
                            const assistantMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.LLM);
                            taskManager.loadSessionData(sessionId, terminalContent || [], userMessages, assistantMessages, SessionDomain.Chart);
                            setIsLoading(false);
                        }).catch(() => {
                            setIsLoading(false);
                        });
                    } else {
                        const pendingId = `pending_${Date.now()}`;
                        taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.Chart);
                        setCurrentSessionId(pendingId);
                        setPendingNewSession(true);
                        setIsLoading(false);
                    }
                })
                .catch(() => {
                    const pendingId = `pending_${Date.now()}`;
                    taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.Chart);
                    setCurrentSessionId(pendingId);
                    setPendingNewSession(true);
                    setIsLoading(false);
                });
        }
    }, [isConfigLoaded]);
    const handleSendMessage = useCallback(async (
        userMessage: string,
        sessionId: string,
        files?: UploadFile[],
        workflowMode?: string,
    ) => {
        const now = new Date();
        let finalSessionId = sessionId || currentSessionId;
        if (finalSessionId && !finalSessionId.startsWith("pending_") &&
            !finalSessionId.startsWith("chart_session_") && !finalSessionId.startsWith("temp_")) {
            console.error(
                `[useChartSession] Invalid session ID "${finalSessionId}" - does not belong to Chart domain`
            );
            return;
        }
        if (finalSessionId && finalSessionId.startsWith("pending_")) {
            const newSessionId = `chart_session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;
            const tempUserMessages = taskManager.getUserMessagesBySession(finalSessionId, SessionDomain.Chart);
            const tempAssistantMessages = taskManager.getAssistantMessagesBySessionAsArray(finalSessionId, SessionDomain.Chart);
            const tempTasksMap = taskManager.getTasksBySession(finalSessionId, SessionDomain.Chart);
            const tempTasks = tempTasksMap ? Array.from(tempTasksMap.values()) : [];
            await chartSessionCommands.createChartSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],
                [],
                workflowMode || currentWorkflowMode,
            );
            taskManager.loadSessionData(newSessionId, tempTasks, tempUserMessages, tempAssistantMessages, SessionDomain.Chart);
            taskManager.deleteSession(finalSessionId, SessionDomain.Chart);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("chart-session-created"));
            setPendingNewSession(false);
        } else if (!finalSessionId) {
            const newSessionId = `chart_session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;
            await chartSessionCommands.createChartSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],
                [],
                workflowMode || currentWorkflowMode,
            );
            taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.Chart);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("chart-session-created"));
        }
        const userMsg: ChatMessage = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: RoleEnum.User,
            content: userMessage,
            timestamp: now.toISOString(),
            files: files,
        };
        taskManager.addUserMessageToSession(finalSessionId, userMsg, SessionDomain.Chart);
        try {
            const workspace = await workspaceCommands.getDefaultWorkspace();
            const workspacePath = workspace?.workspace_path;
            const systemPrompt = getChartsSystemPrompt(language as 'zh' | 'en', workspacePath);
            const fullMessage = `${systemPrompt}\n\n User: ${userMessage}`;
            const mode = workflowMode || currentWorkflowMode;
            const taskId = await hippoxCommands.sendMessageAsync(
                userMessage,
                fullMessage,
                finalSessionId,
                mode,
            );
            const messageId = `llm_${taskId}`;
            const assistantMsg: ChatMessage = {
                id: messageId,
                role: RoleEnum.LLM,
                content: `${t("chat.taskSubmitted")} ${taskId.slice(0, 8)}...`,
                timestamp: now.toISOString(),
                status: MessageStatus.Pending,
            };
            taskManager.addAssistantMessageToSession(finalSessionId, assistantMsg, SessionDomain.Chart);
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
                workflow_mode: mode,
            };
            taskManager.addTaskToSession(finalSessionId, newTask, SessionDomain.Chart);
        } catch (error) {
            console.error("send message error:", error);
            const errorMsg: ChatMessage = {
                id: `error_${Date.now()}`,
                role: RoleEnum.LLM,
                content: `${error}`,
                timestamp: now.toISOString(),
            };
            taskManager.addAssistantMessageToSession(finalSessionId, errorMsg, SessionDomain.Chart);
        }
    }, [currentSessionId, t, language, currentWorkflowMode]);
    const handleNewSession = useCallback(async () => {
        const pendingId = `pending_${Date.now()}`;
        taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.Chart);
        setCurrentSessionId(pendingId);
        setPendingNewSession(true);
    }, []);
    const handleSwitchSession = useCallback(async (sessionId: string) => {
        if (sessionId === currentSessionId) return;
        if (!sessionId.startsWith("chart_session_") && !sessionId.startsWith("pending_")) {
            console.warn(
                `[useChartSession] Cannot switch to session "${sessionId}" - it does not belong to Chart domain`
            );
            return;
        }
        const hasData = taskManager.hasSessionMessages(currentSessionId, SessionDomain.Chart);
        if (currentSessionId && !currentSessionId.startsWith("pending_") && !currentSessionId.startsWith("temp_") && hasData) {
            try {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.Chart);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.Chart);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.Chart);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                await chartSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                await chartSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            } catch (error) {
                console.error("Failed to save current session:", error);
            }
        }
        const hasTargetData = taskManager.getTasksBySession(sessionId, SessionDomain.Chart) !== undefined;
        if (!hasTargetData) {
            const chatContent = await chartSessionCommands.loadChatContent(sessionId);
            const terminalContent = await chartSessionCommands.loadTerminalContent(sessionId);
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
            taskManager.loadSessionData(sessionId, tasks, userMessages, assistantMessages, SessionDomain.Chart);
        } else {
            taskManager.switchToSession(sessionId, SessionDomain.Chart);
        }
        setCurrentSessionId(sessionId);
        window.dispatchEvent(new CustomEvent("chart-session-created"));
    }, [currentSessionId]);
    const shouldShowWelcome = useCallback(() => {
        if (isLoading) return true;
        if (!currentSessionId) return true;
        if (currentSessionId.startsWith("pending_")) {
            const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.Chart);
            const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.Chart);
            return userMessages.length === 0 && assistantMessages.length === 0;
        }
        const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.Chart);
        const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.Chart);
        return userMessages.length === 0 && assistantMessages.length === 0;
    }, [isLoading, currentSessionId]);
    const resetSession = useCallback(async () => {
        if (!currentSessionId || currentSessionId.startsWith("pending_")) return;
        try {
            await hippoxCommands.resetSession();
            taskManager.loadSessionData(currentSessionId, [], [], [], SessionDomain.Chart);
        } catch (error) {
            console.error("reset session error:", error);
        }
    }, [currentSessionId]);
    return {
        currentSessionId,
        isLoading,
        taskManagerVersion,
        currentWorkflowMode,
        setCurrentWorkflowMode,
        handleNewSession,
        handleSwitchSession,
        handleSendMessage,
        resetSession,
        shouldShowWelcome,
    };
}