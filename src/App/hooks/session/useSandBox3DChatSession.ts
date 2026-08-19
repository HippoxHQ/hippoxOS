import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import { hippoxCommands } from "../../../command/chat";
import { taskManager } from "../../../core/TaskManager";
import { TaskInfo, UploadFile, TaskStatusEnum, SessionDomain } from "../../../core/types";
import { Language, ChatMessage, RoleEnum, MessageStatus } from "../../../types/types";
import { workspaceCommands } from "../../../command/workspace";
import { sandbox3dSessionCommands } from "../../../command/session/sandbox3d";
import { getSandBox3DSystemPrompt } from "../../../subsystem/SandBox3D/llm/prompts/basis";
export function useSandBox3DSession(
    language: Language,
    isConfigLoaded: boolean,
) {
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [currentWorkflowMode, setCurrentWorkflowMode] = useState<string>("ReAct");
    const [isLoading, setIsLoading] = useState(true);
    const [taskManagerVersion, setTaskManagerVersion] = useState(0);
    const [pendingNewSession, setPendingNewSession] = useState(false);
    const [pendingScenePath, setPendingScenePath] = useState<string>("");
    const [pendingSceneName, setPendingSceneName] = useState<string>("");
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
            if (currentDomain !== SessionDomain.SandBox3D) {
                console.debug(
                    `[useSandBox3DSession] Skipping save - current domain is "${currentDomain}", not "SandBox3D"`
                );
                return;
            }
            const saveTimer = setTimeout(() => {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.SandBox3D);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.SandBox3D);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.SandBox3D);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                if (userMessages.length === 0 && assistantMessages.length === 0) {
                    return;
                }
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                sandbox3dSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                sandbox3dSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            }, 500);
            return () => clearTimeout(saveTimer);
        }
    }, [currentSessionId, isLoading, taskManagerVersion]);
    useEffect(() => {
        if (isConfigLoaded) {
            sandbox3dSessionCommands.listSandBox3DSessions()
                .then(list => {
                    if (list.length > 0) {
                        const sorted = list.sort((a, b) => {
                            const aTs = parseInt(a.session_id.replace("sandbox3d_session_", "")) || 0;
                            const bTs = parseInt(b.session_id.replace("sandbox3d_session_", "")) || 0;
                            return bTs - aTs;
                        });
                        const sessionId = sorted[0].session_id;
                        setCurrentSessionId(sessionId);
                        Promise.all([
                            sandbox3dSessionCommands.loadChatContent(sessionId),
                            sandbox3dSessionCommands.loadTerminalContent(sessionId)
                        ]).then(([chatContent, terminalContent]) => {
                            const userMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.User);
                            const assistantMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.LLM);
                            taskManager.loadSessionData(sessionId, terminalContent || [], userMessages, assistantMessages, SessionDomain.SandBox3D);
                            setIsLoading(false);
                        }).catch(() => {
                            setIsLoading(false);
                        });
                    } else {
                        const pendingId = `pending_${Date.now()}`;
                        taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.SandBox3D);
                        setCurrentSessionId(pendingId);
                        setPendingNewSession(true);
                        setIsLoading(false);
                    }
                })
                .catch(() => {
                    const pendingId = `pending_${Date.now()}`;
                    taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.SandBox3D);
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
            !finalSessionId.startsWith("sandbox3d_session_") && !finalSessionId.startsWith("temp_")) {
            console.error(
                `[useSandBox3DSession] Invalid session ID "${finalSessionId}" - does not belong to SandBox3D domain`
            );
            return;
        }
        if (finalSessionId && finalSessionId.startsWith("pending_")) {
            const newSessionId = `sandbox3d_session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;
            const tempUserMessages = taskManager.getUserMessagesBySession(finalSessionId, SessionDomain.SandBox3D);
            const tempAssistantMessages = taskManager.getAssistantMessagesBySessionAsArray(finalSessionId, SessionDomain.SandBox3D);
            const tempTasksMap = taskManager.getTasksBySession(finalSessionId, SessionDomain.SandBox3D);
            const tempTasks = tempTasksMap ? Array.from(tempTasksMap.values()) : [];
            await sandbox3dSessionCommands.createSandBox3DSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],
                [],
                workflowMode || currentWorkflowMode,
                pendingScenePath || undefined,
                pendingSceneName || undefined,
            );
            taskManager.loadSessionData(newSessionId, tempTasks, tempUserMessages, tempAssistantMessages, SessionDomain.SandBox3D);
            taskManager.deleteSession(finalSessionId, SessionDomain.SandBox3D);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("sandbox3d-session-created"));
            setPendingNewSession(false);
            setPendingScenePath("");
            setPendingSceneName("");
            if (pendingScenePath) {
                window.dispatchEvent(new CustomEvent("scene-loaded", {
                    detail: { path: pendingScenePath, name: pendingSceneName }
                }));
            }
        } else if (!finalSessionId) {
            const newSessionId = `sandbox3d_session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;
            await sandbox3dSessionCommands.createSandBox3DSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],
                [],
                workflowMode || currentWorkflowMode,
                pendingScenePath || undefined,
                pendingSceneName || undefined,
            );
            taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.SandBox3D);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("sandbox3d-session-created"));
            setPendingScenePath("");
            setPendingSceneName("");
            if (pendingScenePath) {
                window.dispatchEvent(new CustomEvent("scene-loaded", {
                    detail: { path: pendingScenePath, name: pendingSceneName }
                }));
            }
        }
        const userMsg: ChatMessage = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: RoleEnum.User,
            content: userMessage,
            timestamp: now.toISOString(),
            files: files,
        };
        taskManager.addUserMessageToSession(finalSessionId, userMsg, SessionDomain.SandBox3D);
        try {
            const workspace = await workspaceCommands.getDefaultWorkspace();
            const workspacePath = workspace?.workspace_path;
            const systemPrompt = getSandBox3DSystemPrompt(language as 'zh' | 'en', workspacePath);
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
            taskManager.addAssistantMessageToSession(finalSessionId, assistantMsg, SessionDomain.SandBox3D);
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
            taskManager.addTaskToSession(finalSessionId, newTask, SessionDomain.SandBox3D);
        } catch (error) {
            console.error("send message error:", error);
            const errorMsg: ChatMessage = {
                id: `error_${Date.now()}`,
                role: RoleEnum.LLM,
                content: `${error}`,
                timestamp: now.toISOString(),
            };
            taskManager.addAssistantMessageToSession(finalSessionId, errorMsg, SessionDomain.SandBox3D);
        }
    }, [currentSessionId, t, language, currentWorkflowMode, pendingScenePath, pendingSceneName]);
    const handleNewSession = useCallback(async (scenePath?: string, sceneName?: string) => {
        const pendingId = `pending_${Date.now()}`;
        taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.SandBox3D);
        setCurrentSessionId(pendingId);
        setPendingNewSession(true);
        if (scenePath) {
            setPendingScenePath(scenePath);
            setPendingSceneName(sceneName || "");
        } else {
            setPendingScenePath("");
            setPendingSceneName("");
        }
    }, []);
    const handleSwitchSession = useCallback(async (sessionId: string) => {
        if (sessionId === currentSessionId) return;
        if (!sessionId.startsWith("sandbox3d_session_") && !sessionId.startsWith("pending_")) {
            console.warn(
                `[useSandBox3DSession] Cannot switch to session "${sessionId}" - it does not belong to SandBox3D domain`
            );
            return;
        }
        const hasData = taskManager.hasSessionMessages(currentSessionId, SessionDomain.SandBox3D);
        if (currentSessionId && !currentSessionId.startsWith("pending_") && !currentSessionId.startsWith("temp_") && hasData) {
            try {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.SandBox3D);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.SandBox3D);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.SandBox3D);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                await sandbox3dSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                await sandbox3dSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            } catch (error) {
                console.error("Failed to save current session:", error);
            }
        }
        const hasTargetData = taskManager.getTasksBySession(sessionId, SessionDomain.SandBox3D) !== undefined;
        if (!hasTargetData) {
            const chatContent = await sandbox3dSessionCommands.loadChatContent(sessionId);
            const terminalContent = await sandbox3dSessionCommands.loadTerminalContent(sessionId);
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
            taskManager.loadSessionData(sessionId, tasks, userMessages, assistantMessages, SessionDomain.SandBox3D);
        } else {
            taskManager.switchToSession(sessionId, SessionDomain.SandBox3D);
        }
        setCurrentSessionId(sessionId);
        try {
            const config = await sandbox3dSessionCommands.loadSandBox3DSessionConfig(sessionId);
            if (config && config.scene_path) {
                window.dispatchEvent(new CustomEvent("scene-loaded", {
                    detail: { path: config.scene_path, name: config.scene_name || "" }
                }));
            }
        } catch (error) {
            console.error("Failed to load scene config:", error);
        }
    }, [currentSessionId]);
    const shouldShowWelcome = useCallback(() => {
        if (isLoading) return true;
        if (!currentSessionId) return true;
        if (currentSessionId.startsWith("pending_")) {
            const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.SandBox3D);
            const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.SandBox3D);
            return userMessages.length === 0 && assistantMessages.length === 0;
        }
        const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.SandBox3D);
        const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.SandBox3D);
        return userMessages.length === 0 && assistantMessages.length === 0;
    }, [isLoading, currentSessionId]);
    const resetSession = useCallback(async () => {
        if (!currentSessionId || currentSessionId.startsWith("pending_")) return;
        try {
            await hippoxCommands.resetSession();
            taskManager.loadSessionData(currentSessionId, [], [], [], SessionDomain.SandBox3D);
        } catch (error) {
            console.error("reset session error:", error);
        }
    }, [currentSessionId]);
    const createSessionWithScene = useCallback(async (
        scenePath: string,
        sceneName: string
    ) => {
        const newSessionId = `sandbox3d_session_${Date.now()}`;
        const title = sceneName || "3D Scene";
        await sandbox3dSessionCommands.createSandBox3DSession(
            newSessionId,
            title,
            `Scene: ${sceneName || scenePath}`,
            [],
            [],
            "ReAct",
            scenePath,
            sceneName,
        );
        taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.SandBox3D);
        setCurrentSessionId(newSessionId);
        setPendingNewSession(false);
        setPendingScenePath("");
        setPendingSceneName("");
        window.dispatchEvent(new CustomEvent("sandbox3d-session-created"));
        window.dispatchEvent(new CustomEvent("scene-loaded", {
            detail: { path: scenePath, name: sceneName }
        }));
        return newSessionId;
    }, []);
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
        createSessionWithScene,
        pendingScenePath,
        pendingSceneName,
    };
}