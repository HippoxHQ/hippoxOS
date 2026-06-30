import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import { getSystemPrompt } from "../../../llm/prompts/basis";
import { hippoxCommands } from "../../../command/chat";
import { taskManager } from "../../../core/TaskManager";
import { TaskInfo, UploadFile, TaskStatusEnum, SessionDomain } from "../../../core/types";
import { Language, ChatMessage, RoleEnum, MessageStatus } from "../../../types/types";
import { workspaceCommands } from "../../../command/workspace";
import { videoSessionCommands } from "../../../command/session/videoeditor";

export function useVideoSession(
    language: Language,
    isConfigLoaded: boolean,
) {
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [currentWorkflowMode, setCurrentWorkflowMode] = useState<string>("ReAct");
    const [isLoading, setIsLoading] = useState(true);
    const [taskManagerVersion, setTaskManagerVersion] = useState(0);
    const [pendingNewSession, setPendingNewSession] = useState(false);
    const [pendingVideoUrl, setPendingVideoUrl] = useState<string>("");
    const [pendingVideoTitle, setPendingVideoTitle] = useState<string>("");
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
            if (currentDomain !== SessionDomain.Video) {
                console.debug(
                    `[useVideoSession] Skipping save - current domain is "${currentDomain}", not "Video"`
                );
                return;
            }
            const saveTimer = setTimeout(() => {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.Video);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.Video);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.Video);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];

                if (userMessages.length === 0 && assistantMessages.length === 0) {
                    return;
                }
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                videoSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                videoSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            }, 500);
            return () => clearTimeout(saveTimer);
        }
    }, [currentSessionId, isLoading, taskManagerVersion]);

    useEffect(() => {
        if (isConfigLoaded) {
            videoSessionCommands.listVideoSessions()
                .then(list => {
                    if (list.length > 0) {
                        const sorted = list.sort((a, b) => {
                            const aTs = parseInt(a.session_id.replace("video_session_", "")) || 0;
                            const bTs = parseInt(b.session_id.replace("video_session_", "")) || 0;
                            return bTs - aTs;
                        });
                        const sessionId = sorted[0].session_id;
                        setCurrentSessionId(sessionId);
                        Promise.all([
                            videoSessionCommands.loadChatContent(sessionId),
                            videoSessionCommands.loadTerminalContent(sessionId)
                        ]).then(([chatContent, terminalContent]) => {
                            const userMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.User);
                            const assistantMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.LLM);
                            taskManager.loadSessionData(sessionId, terminalContent || [], userMessages, assistantMessages, SessionDomain.Video);
                            setIsLoading(false);
                        }).catch(() => {
                            setIsLoading(false);
                        });
                    } else {
                        const pendingId = `pending_${Date.now()}`;
                        taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.Video);
                        setCurrentSessionId(pendingId);
                        setPendingNewSession(true);
                        setIsLoading(false);
                    }
                })
                .catch(() => {
                    const pendingId = `pending_${Date.now()}`;
                    taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.Video);
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
            !finalSessionId.startsWith("video_session_") && !finalSessionId.startsWith("temp_")) {
            console.error(
                `[useVideoSession] Invalid session ID "${finalSessionId}" - does not belong to Video domain`
            );
            return;
        }

        if (finalSessionId && finalSessionId.startsWith("pending_")) {
            const newSessionId = `video_session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;

            const tempUserMessages = taskManager.getUserMessagesBySession(finalSessionId, SessionDomain.Video);
            const tempAssistantMessages = taskManager.getAssistantMessagesBySessionAsArray(finalSessionId, SessionDomain.Video);
            const tempTasksMap = taskManager.getTasksBySession(finalSessionId, SessionDomain.Video);
            const tempTasks = tempTasksMap ? Array.from(tempTasksMap.values()) : [];

            await videoSessionCommands.createVideoSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],
                [],
                workflowMode || currentWorkflowMode,
                pendingVideoUrl || undefined,
                pendingVideoTitle || undefined,
            );

            taskManager.loadSessionData(newSessionId, tempTasks, tempUserMessages, tempAssistantMessages, SessionDomain.Video);
            taskManager.deleteSession(finalSessionId, SessionDomain.Video);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("video-session-created"));
            setPendingNewSession(false);
            setPendingVideoUrl("");
            setPendingVideoTitle("");

            if (pendingVideoUrl) {
                window.dispatchEvent(new CustomEvent("video-loaded", {
                    detail: { url: pendingVideoUrl, title: pendingVideoTitle }
                }));
            }

        } else if (!finalSessionId) {
            const newSessionId = `video_session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;

            await videoSessionCommands.createVideoSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],
                [],
                workflowMode || currentWorkflowMode,
                pendingVideoUrl || undefined,
                pendingVideoTitle || undefined,
            );

            taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.Video);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("video-session-created"));
            setPendingVideoUrl("");
            setPendingVideoTitle("");

            if (pendingVideoUrl) {
                window.dispatchEvent(new CustomEvent("video-loaded", {
                    detail: { url: pendingVideoUrl, title: pendingVideoTitle }
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
        taskManager.addUserMessageToSession(finalSessionId, userMsg, SessionDomain.Video);

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
            taskManager.addAssistantMessageToSession(finalSessionId, assistantMsg, SessionDomain.Video);

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
            taskManager.addTaskToSession(finalSessionId, newTask, SessionDomain.Video);
        } catch (error) {
            console.error("send message error:", error);
            const errorMsg: ChatMessage = {
                id: `error_${Date.now()}`,
                role: RoleEnum.LLM,
                content: `${error}`,
                timestamp: now.toISOString(),
            };
            taskManager.addAssistantMessageToSession(finalSessionId, errorMsg, SessionDomain.Video);
        }
    }, [currentSessionId, t, language, currentWorkflowMode, pendingVideoUrl, pendingVideoTitle]);

    const handleNewSession = useCallback(async (videoUrl?: string, videoTitle?: string) => {
        const pendingId = `pending_${Date.now()}`;
        taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.Video);
        setCurrentSessionId(pendingId);
        setPendingNewSession(true);
        if (videoUrl) {
            setPendingVideoUrl(videoUrl);
            setPendingVideoTitle(videoTitle || "");
        } else {
            setPendingVideoUrl("");
            setPendingVideoTitle("");
        }
    }, []);

    const handleSwitchSession = useCallback(async (sessionId: string) => {
        if (sessionId === currentSessionId) return;

        if (!sessionId.startsWith("video_session_") && !sessionId.startsWith("pending_")) {
            console.warn(
                `[useVideoSession] Cannot switch to session "${sessionId}" - it does not belong to Video domain`
            );
            return;
        }

        const hasData = taskManager.hasSessionMessages(currentSessionId, SessionDomain.Video);
        if (currentSessionId && !currentSessionId.startsWith("pending_") && !currentSessionId.startsWith("temp_") && hasData) {
            try {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.Video);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.Video);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.Video);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                await videoSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                await videoSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            } catch (error) {
                console.error("Failed to save current session:", error);
            }
        }

        const hasTargetData = taskManager.getTasksBySession(sessionId, SessionDomain.Video) !== undefined;
        if (!hasTargetData) {
            const chatContent = await videoSessionCommands.loadChatContent(sessionId);
            const terminalContent = await videoSessionCommands.loadTerminalContent(sessionId);
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
            taskManager.loadSessionData(sessionId, tasks, userMessages, assistantMessages, SessionDomain.Video);
        } else {
            taskManager.switchToSession(sessionId, SessionDomain.Video);
        }

        setCurrentSessionId(sessionId);
        try {
            const config = await videoSessionCommands.loadVideoSessionConfig(sessionId);
            if (config && config.video_url) {
                window.dispatchEvent(new CustomEvent("video-loaded", {
                    detail: { url: config.video_url, title: config.video_title || "" }
                }));
            }
        } catch (error) {
            console.error("Failed to load video config:", error);
        }
    }, [currentSessionId]);

    const shouldShowWelcome = useCallback(() => {
        if (isLoading) return true;
        if (!currentSessionId) return true;

        if (currentSessionId.startsWith("pending_")) {
            const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.Video);
            const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.Video);
            return userMessages.length === 0 && assistantMessages.length === 0;
        }

        const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.Video);
        const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.Video);
        return userMessages.length === 0 && assistantMessages.length === 0;
    }, [isLoading, currentSessionId]);

    const resetSession = useCallback(async () => {
        if (!currentSessionId || currentSessionId.startsWith("pending_")) return;

        try {
            await hippoxCommands.resetSession();
            taskManager.loadSessionData(currentSessionId, [], [], [], SessionDomain.Video);
        } catch (error) {
            console.error("reset session error:", error);
        }
    }, [currentSessionId]);

    const createSessionWithVideo = useCallback(async (
        videoUrl: string,
        videoTitle: string
    ) => {
        const newSessionId = `video_session_${Date.now()}`;
        const title = videoTitle || "Video Session";

        await videoSessionCommands.createVideoSession(
            newSessionId,
            title,
            `Video: ${videoTitle || videoUrl}`,
            [],
            [],
            "ReAct",
            videoUrl,
            videoTitle,
        );

        taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.Video);
        setCurrentSessionId(newSessionId);
        setPendingNewSession(false);
        setPendingVideoUrl("");
        setPendingVideoTitle("");
        window.dispatchEvent(new CustomEvent("video-session-created"));
        window.dispatchEvent(new CustomEvent("video-loaded", {
            detail: { url: videoUrl, title: videoTitle }
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
        createSessionWithVideo,
        pendingVideoUrl,
        pendingVideoTitle,
    };
}