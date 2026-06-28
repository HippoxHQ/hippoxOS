import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import { getSystemPrompt } from "../../../llm/prompts/basis";
import { hippoxCommands } from "../../../command/chat";
import { taskManager } from "../../../core/TaskManager";
import { TaskInfo, UploadFile, TaskStatusEnum, SessionDomain } from "../../../core/types";
import { Language, ChatMessage, RoleEnum, MessageStatus } from "../../../types/types";
import { workspaceCommands } from "../../../command/workspace";
import { codeEditorSessionCommands } from "../../../command/session/codeeditor";
import { codeEditorCommands } from "../../../command/CodeEditor";

export function useCodeEditorSession(
    language: Language,
    isConfigLoaded: boolean,
    onCloseSkillsManager?: () => void,
) {
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [currentWorkflowMode, setCurrentWorkflowMode] = useState<string>("ReAct");
    const [isLoading, setIsLoading] = useState(true);
    const [taskManagerVersion, setTaskManagerVersion] = useState(0);
    const [pendingNewSession, setPendingNewSession] = useState(false);
    const [pendingWorkspacePath, setPendingWorkspacePath] = useState<string>("");
    const [pendingWorkspaceType, setPendingWorkspaceType] = useState<"directory" | "file">("directory");
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
            if (currentDomain !== SessionDomain.CodeEditor) {
                console.debug(
                    `[useCodeEditorSession] Skipping save - current domain is "${currentDomain}", not "CodeEditor"`
                );
                return;
            }
            const saveTimer = setTimeout(() => {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.CodeEditor);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.CodeEditor);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.CodeEditor);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];

                if (userMessages.length === 0 && assistantMessages.length === 0) {
                    return;
                }
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                codeEditorSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                codeEditorSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            }, 500);
            return () => clearTimeout(saveTimer);
        }
    }, [currentSessionId, isLoading, taskManagerVersion]);

    useEffect(() => {
        if (isConfigLoaded) {
            codeEditorSessionCommands.listCodeEditorSessions()
                .then(list => {
                    if (list.length > 0) {
                        const sorted = list.sort((a, b) => {
                            const aTs = parseInt(a.session_id.replace("codeeditor_session_", "")) || 0;
                            const bTs = parseInt(b.session_id.replace("codeeditor_session_", "")) || 0;
                            return bTs - aTs;
                        });
                        const sessionId = sorted[0].session_id;
                        setCurrentSessionId(sessionId);
                        Promise.all([
                            codeEditorSessionCommands.loadChatContent(sessionId),
                            codeEditorSessionCommands.loadTerminalContent(sessionId)
                        ]).then(([chatContent, terminalContent]) => {
                            const userMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.User);
                            const assistantMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.LLM);
                            taskManager.loadSessionData(sessionId, terminalContent || [], userMessages, assistantMessages, SessionDomain.CodeEditor);
                            setIsLoading(false);
                        }).catch(() => {
                            setIsLoading(false);
                        });
                    } else {
                        const pendingId = `pending_${Date.now()}`;
                        taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.CodeEditor);
                        setCurrentSessionId(pendingId);
                        setPendingNewSession(true);
                        setIsLoading(false);
                    }
                })
                .catch(() => {
                    const pendingId = `pending_${Date.now()}`;
                    taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.CodeEditor);
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
            !finalSessionId.startsWith("codeeditor_session_") && !finalSessionId.startsWith("temp_")) {
            console.error(
                `[useCodeEditorSession] Invalid session ID "${finalSessionId}" - does not belong to CodeEditor domain`
            );
            return;
        }

        if (finalSessionId && finalSessionId.startsWith("pending_")) {
            const newSessionId = `codeeditor_session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;

            const tempUserMessages = taskManager.getUserMessagesBySession(finalSessionId, SessionDomain.CodeEditor);
            const tempAssistantMessages = taskManager.getAssistantMessagesBySessionAsArray(finalSessionId, SessionDomain.CodeEditor);
            const tempTasksMap = taskManager.getTasksBySession(finalSessionId, SessionDomain.CodeEditor);
            const tempTasks = tempTasksMap ? Array.from(tempTasksMap.values()) : [];

            await codeEditorSessionCommands.createCodeEditorSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],
                [],
                workflowMode || currentWorkflowMode,
                pendingWorkspacePath || undefined,
                pendingWorkspaceType,
            );
            taskManager.loadSessionData(newSessionId, tempTasks, tempUserMessages, tempAssistantMessages, SessionDomain.CodeEditor);
            taskManager.deleteSession(finalSessionId, SessionDomain.CodeEditor);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("codeeditor-session-created"));
            setPendingNewSession(false);
            setPendingWorkspacePath("");
            setPendingWorkspaceType("directory");
            if (pendingWorkspacePath) {
                window.dispatchEvent(new CustomEvent("workspace-loaded", {
                    detail: { path: pendingWorkspacePath, type: pendingWorkspaceType }
                }));
            }
        } else if (!finalSessionId) {
            const newSessionId = `codeeditor_session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;

            await codeEditorSessionCommands.createCodeEditorSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],
                [],
                workflowMode || currentWorkflowMode,
                pendingWorkspacePath || undefined,
                pendingWorkspaceType,
            );

            taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.CodeEditor);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("codeeditor-session-created"));
            setPendingWorkspacePath("");
            setPendingWorkspaceType("directory");

            if (pendingWorkspacePath) {
                window.dispatchEvent(new CustomEvent("workspace-loaded", {
                    detail: { path: pendingWorkspacePath, type: pendingWorkspaceType }
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
        taskManager.addUserMessageToSession(finalSessionId, userMsg, SessionDomain.CodeEditor);

        try {
            const workspace = await workspaceCommands.getDefaultWorkspace();
            const workspacePath = workspace?.workspace_path;
            const systemPrompt = getSystemPrompt(language as 'zh' | 'en', workspacePath);
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
            taskManager.addAssistantMessageToSession(finalSessionId, assistantMsg, SessionDomain.CodeEditor);

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
            taskManager.addTaskToSession(finalSessionId, newTask, SessionDomain.CodeEditor);
        } catch (error) {
            console.error("send message error:", error);
            const errorMsg: ChatMessage = {
                id: `error_${Date.now()}`,
                role: RoleEnum.LLM,
                content: `${error}`,
                timestamp: now.toISOString(),
            };
            taskManager.addAssistantMessageToSession(finalSessionId, errorMsg, SessionDomain.CodeEditor);
        }
    }, [currentSessionId, t, language, currentWorkflowMode, pendingWorkspacePath, pendingWorkspaceType]);

    const handleNewSession = useCallback(async (workspacePath?: string, workspaceType?: "directory" | "file") => {
        const pendingId = `pending_${Date.now()}`;
        taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.CodeEditor);
        setCurrentSessionId(pendingId);
        setPendingNewSession(true);
        if (workspacePath) {
            setPendingWorkspacePath(workspacePath);
            setPendingWorkspaceType(workspaceType || "directory");
        } else {
            setPendingWorkspacePath("");
            setPendingWorkspaceType("directory");
        }
    }, []);

    const handleSwitchSession = useCallback(async (sessionId: string) => {
        if (sessionId === currentSessionId) return;

        if (!sessionId.startsWith("codeeditor_session_") && !sessionId.startsWith("pending_")) {
            console.warn(
                `[useCodeEditorSession] Cannot switch to session "${sessionId}" - it does not belong to CodeEditor domain`
            );
            return;
        }

        const hasData = taskManager.hasSessionMessages(currentSessionId, SessionDomain.CodeEditor);
        if (currentSessionId && !currentSessionId.startsWith("pending_") && !currentSessionId.startsWith("temp_") && hasData) {
            try {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.CodeEditor);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.CodeEditor);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.CodeEditor);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                await codeEditorSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                await codeEditorSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            } catch (error) {
                console.error("Failed to save current session:", error);
            }
        }

        const hasTargetData = taskManager.getTasksBySession(sessionId, SessionDomain.CodeEditor) !== undefined;
        if (!hasTargetData) {
            const chatContent = await codeEditorSessionCommands.loadChatContent(sessionId);
            const terminalContent = await codeEditorSessionCommands.loadTerminalContent(sessionId);
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
            taskManager.loadSessionData(sessionId, tasks, userMessages, assistantMessages, SessionDomain.CodeEditor);
        } else {
            taskManager.switchToSession(sessionId, SessionDomain.CodeEditor);
        }
        setCurrentSessionId(sessionId);
        window.dispatchEvent(new CustomEvent("codeeditor-session-created"));
        try {
            const config = await codeEditorSessionCommands.loadCodeEditorSessionConfig(sessionId);
            if (config && config.workspace_path) {
                const workspaceType = config.workspace_type || "directory";
                window.dispatchEvent(new CustomEvent("workspace-loaded", {
                    detail: { path: config.workspace_path, type: workspaceType }
                }));
            }
        } catch (error) {
            console.error("Failed to load workspace config:", error);
        }
    }, [currentSessionId]);

    const shouldShowWelcome = useCallback(() => {
        if (isLoading) return true;
        if (!currentSessionId) return true;

        if (currentSessionId.startsWith("pending_")) {
            const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.CodeEditor);
            const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.CodeEditor);
            return userMessages.length === 0 && assistantMessages.length === 0;
        }

        const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.CodeEditor);
        const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.CodeEditor);
        return userMessages.length === 0 && assistantMessages.length === 0;
    }, [isLoading, currentSessionId]);

    const resetSession = useCallback(async () => {
        if (!currentSessionId || currentSessionId.startsWith("pending_")) return;

        try {
            await hippoxCommands.resetSession();
            taskManager.loadSessionData(currentSessionId, [], [], [], SessionDomain.CodeEditor);
        } catch (error) {
            console.error("reset session error:", error);
        }
    }, [currentSessionId]);

    const createSessionWithWorkspace = useCallback(async (
        workspacePath: string,
        workspaceType: "directory" | "file"
    ) => {
        const newSessionId = `codeeditor_session_${Date.now()}`;
        const pathParts = workspacePath.split(/[\\/]/);
        const title = pathParts[pathParts.length - 1] || "Code Editor";
        // Create the ./.hippox directory during the initial phase of session creation.
        await codeEditorCommands.ensureStatusDir(workspacePath);
        await codeEditorSessionCommands.createCodeEditorSession(
            newSessionId,
            title,
            `Workspace: ${workspacePath}`,
            [],
            [],
            "ReAct",
            workspacePath,
            workspaceType,
        );
        taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.CodeEditor);
        setCurrentSessionId(newSessionId);
        setPendingNewSession(false);
        setPendingWorkspacePath("");
        setPendingWorkspaceType("directory");
        window.dispatchEvent(new CustomEvent("codeeditor-session-created"));
        window.dispatchEvent(new CustomEvent("workspace-loaded", {
            detail: { path: workspacePath, type: workspaceType }
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
        createSessionWithWorkspace,
        pendingWorkspacePath,
        pendingWorkspaceType,
    };
}