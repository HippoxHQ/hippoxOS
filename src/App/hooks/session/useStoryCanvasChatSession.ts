import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import { hippoxCommands, SubSystemEnum } from "../../../command/chat";
import { taskManager } from "../../../core/TaskManager";
import { TaskInfo, UploadFile, TaskStatusEnum, SessionDomain } from "../../../core/types";
import { Language, ChatMessage, RoleEnum, MessageStatus } from "../../../types/types";
import { workspaceCommands } from "../../../command/workspace";
import { storyCanvasSessionCommands } from "../../../command/session/storycanvas";
import { basename } from "@tauri-apps/api/path";
import { showToast, ToastType } from "../../../components/Toast";
import { getStoryCanvasSystemPrompt } from "../../../subsystem/StoryCanvas/llm/prompts";
import { v4 } from "uuid";
/**
 * Detect the broad category of a file based on its extension.
 */
const getFileType = (filePath: string): "image" | "text" | null => {
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "ico"];
    const textExts = ["txt", "md", "json", "xml", "csv", "log", "ini", "cfg", "conf"];
    if (imageExts.includes(ext)) return "image";
    if (textExts.includes(ext)) return "text";
    return null;
};
export function useStoryCanvasChatSession(
    language: Language,
    isConfigLoaded: boolean,
) {
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [currentWorkflowMode, setCurrentWorkflowMode] = useState<string>("ReAct");
    const [isLoading, setIsLoading] = useState(true);
    const [taskManagerVersion, setTaskManagerVersion] = useState(0);
    const [pendingNewSession, setPendingNewSession] = useState(false);
    // Pending source paths recorded when the user picks a file before a session exists. 
    const [pendingImagePath, setPendingImagePath] = useState<string>("");
    const [pendingImageTitle, setPendingImageTitle] = useState<string>("");
    // Whether a session is currently being created on disk.
    const [isCreatingSession, setIsCreatingSession] = useState<boolean>(false);
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
            if (currentDomain !== SessionDomain.StoryCanvas) {
                console.debug(
                    `[useStoryCanvasChatSession] Skipping save - current domain is "${currentDomain}", not "StoryCanvas"`
                );
                return;
            }
            const saveTimer = setTimeout(() => {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.StoryCanvas);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.StoryCanvas);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.StoryCanvas);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                if (userMessages.length === 0 && assistantMessages.length === 0) {
                    return;
                }
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                storyCanvasSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                storyCanvasSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            }, 500);
            return () => clearTimeout(saveTimer);
        }
    }, [currentSessionId, isLoading, taskManagerVersion]);
    useEffect(() => {
        if (isConfigLoaded) {
            storyCanvasSessionCommands.listStoryCanvasSessions()
                .then(list => {
                    if (list.length > 0) {
                        const sorted = list.sort((a, b) => {
                            const aTs = parseInt(a.session_id.replace("storycanvas_session_", "")) || 0;
                            const bTs = parseInt(b.session_id.replace("storycanvas_session_", "")) || 0;
                            return bTs - aTs;
                        });
                        const sessionId = sorted[0].session_id;
                        setCurrentSessionId(sessionId);
                        Promise.all([
                            storyCanvasSessionCommands.loadChatContent(sessionId),
                            storyCanvasSessionCommands.loadTerminalContent(sessionId)
                        ]).then(([chatContent, terminalContent]) => {
                            const userMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.User);
                            const assistantMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.LLM);
                            taskManager.loadSessionData(sessionId, terminalContent || [], userMessages, assistantMessages, SessionDomain.StoryCanvas);
                            setIsLoading(false);
                        }).catch(() => {
                            setIsLoading(false);
                        });
                    } else {
                        const pendingId = `pending_${Date.now()}`;
                        taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.StoryCanvas);
                        setCurrentSessionId(pendingId);
                        setPendingNewSession(true);
                        setIsLoading(false);
                    }
                })
                .catch(() => {
                    const pendingId = `pending_${Date.now()}`;
                    taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.StoryCanvas);
                    setCurrentSessionId(pendingId);
                    setPendingNewSession(true);
                    setIsLoading(false);
                });
        }
    }, [isConfigLoaded]);
    /**
     * Create a Story Canvas session on disk.
     */
    const createStoryCanvasSessionWithPath = useCallback(async (
        sessionId: string,
        title: string,
        description: string,
        imageSourcePath?: string,
        textSourcePaths?: string[],
        workflowMode?: string,
    ) => {
        // create the bare session.
        const created = await storyCanvasSessionCommands.createStoryCanvasSession(
            sessionId,
            title,
            description,
            [],
            [],
            workflowMode || currentWorkflowMode,
        );
        try {
            const updates: Record<string, any> = {};
            if (imageSourcePath) updates.image_file = imageSourcePath;
            if (textSourcePaths && textSourcePaths.length > 0) updates.text_files = textSourcePaths;
            if (Object.keys(updates).length > 0) {
                await storyCanvasSessionCommands.updateStoryCanvasSessionConfig(sessionId, updates);
            }
        } catch (err) {
            console.warn("[useStoryCanvasChatSession] Failed to persist source paths:", err);
        }
        return created;
    }, [currentWorkflowMode]);
    /**
     * Create a new Story Canvas session.
     *
     * @param filePath - Optional file path
     * @param fileType - File type: "file" | "empty" | "download"
     */
    const handleNewSession = useCallback(
        async (filePath?: string, fileType?: "file" | "empty" | "download") => {
            // Handle file or download types - both use the same logic
            if (filePath && (fileType === "file" || fileType === "download")) {
                setIsCreatingSession(true);
                try {
                    const newSessionId = `storycanvas_session_${v4()}_${Date.now()}`;
                    const fileName = await basename(filePath);
                    const title = fileName || "Story Canvas Project";
                    // Detect file type and assign to the appropriate source array.
                    const fileTypeStr = getFileType(filePath);
                    let imageSourcePath: string | undefined = undefined;
                    let textSourcePaths: string[] | undefined = undefined;
                    if (fileTypeStr === "image") {
                        imageSourcePath = filePath;
                    } else if (fileTypeStr === "text") {
                        textSourcePaths = [filePath];
                    } else {
                        // Unknown type, treat as image
                        imageSourcePath = filePath;
                    }
                    await createStoryCanvasSessionWithPath(
                        newSessionId,
                        title,
                        `File: ${fileName}`,
                        imageSourcePath,
                        textSourcePaths,
                        currentWorkflowMode,
                    );
                    taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.StoryCanvas);
                    setCurrentSessionId(newSessionId);
                    setPendingNewSession(false);
                    setPendingImagePath("");
                    setPendingImageTitle("");
                    window.dispatchEvent(new CustomEvent("storycanvas-session-created"));
                    window.dispatchEvent(
                        new CustomEvent("image-loaded", {
                            detail: { path: filePath, title: fileName },
                        })
                    );
                } catch (error) {
                    console.error("Failed to create story canvas session:", error);
                    showToast(
                        ToastType.ERROR,
                        language === "zh" ? "创建剧本画布会话失败" : "Failed to create story canvas session"
                    );
                } finally {
                    setIsCreatingSession(false);
                }
            } else if (fileType === "empty" || !filePath) {
                // Create an empty project
                setIsCreatingSession(true);
                try {
                    const newSessionId = `storycanvas_session_${v4()}_${Date.now()}`;
                    const title = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                    await createStoryCanvasSessionWithPath(
                        newSessionId,
                        title,
                        "Empty story canvas project",
                        undefined,
                        undefined,
                        currentWorkflowMode,
                    );
                    taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.StoryCanvas);
                    setCurrentSessionId(newSessionId);
                    setPendingNewSession(false);
                    setPendingImagePath("");
                    setPendingImageTitle("");
                    window.dispatchEvent(new CustomEvent("storycanvas-session-created"));
                } catch (error) {
                    console.error("Failed to create empty project:", error);
                    showToast(
                        ToastType.ERROR,
                        language === "zh" ? "创建项目失败" : "Failed to create project"
                    );
                } finally {
                    setIsCreatingSession(false);
                }
            }
        },
        [currentWorkflowMode, createStoryCanvasSessionWithPath, language]
    );
    const handleSendMessage = useCallback(async (
        userMessage: string,
        sessionId: string,
        files?: UploadFile[],
        workflowMode?: string,
    ) => {
        const now = new Date();
        let finalSessionId = sessionId || currentSessionId;
        if (finalSessionId && !finalSessionId.startsWith("pending_") &&
            !finalSessionId.startsWith("storycanvas_session_") && !finalSessionId.startsWith("temp_")) {
            console.error(
                `[useStoryCanvasChatSession] Invalid session ID "${finalSessionId}" - does not belong to StoryCanvas domain`
            );
            return;
        }
        if (finalSessionId && finalSessionId.startsWith("pending_")) {
            const newSessionId = `storycanvas_session_${v4()}_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;
            const tempUserMessages = taskManager.getUserMessagesBySession(finalSessionId, SessionDomain.StoryCanvas);
            const tempAssistantMessages = taskManager.getAssistantMessagesBySessionAsArray(finalSessionId, SessionDomain.StoryCanvas);
            const tempTasksMap = taskManager.getTasksBySession(finalSessionId, SessionDomain.StoryCanvas);
            const tempTasks = tempTasksMap ? Array.from(tempTasksMap.values()) : [];
            // If a pending image is recorded, attach it to the new session.
            const fileTypeStr = pendingImagePath ? getFileType(pendingImagePath) : null;
            let imageSourcePath: string | undefined = undefined;
            let textSourcePaths: string[] | undefined = undefined;
            if (pendingImagePath && fileTypeStr === "image") {
                imageSourcePath = pendingImagePath;
            } else if (pendingImagePath && fileTypeStr === "text") {
                textSourcePaths = [pendingImagePath];
            } else if (pendingImagePath) {
                imageSourcePath = pendingImagePath;
            }
            await createStoryCanvasSessionWithPath(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                imageSourcePath,
                textSourcePaths,
                workflowMode || currentWorkflowMode,
            );
            taskManager.loadSessionData(newSessionId, tempTasks, tempUserMessages, tempAssistantMessages, SessionDomain.StoryCanvas);
            taskManager.deleteSession(finalSessionId, SessionDomain.StoryCanvas);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("storycanvas-session-created"));
            setPendingNewSession(false);
            setPendingImagePath("");
            setPendingImageTitle("");
            if (pendingImagePath) {
                window.dispatchEvent(new CustomEvent("image-loaded", {
                    detail: { path: pendingImagePath, title: pendingImageTitle }
                }));
            }
        } else if (!finalSessionId) {
            const newSessionId = `storycanvas_session_${v4()}_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;
            const fileTypeStr = pendingImagePath ? getFileType(pendingImagePath) : null;
            let imageSourcePath: string | undefined = undefined;
            let textSourcePaths: string[] | undefined = undefined;
            if (pendingImagePath && fileTypeStr === "image") {
                imageSourcePath = pendingImagePath;
            } else if (pendingImagePath && fileTypeStr === "text") {
                textSourcePaths = [pendingImagePath];
            } else if (pendingImagePath) {
                imageSourcePath = pendingImagePath;
            }
            await createStoryCanvasSessionWithPath(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                imageSourcePath,
                textSourcePaths,
                workflowMode || currentWorkflowMode,
            );
            taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.StoryCanvas);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("storycanvas-session-created"));
            setPendingImagePath("");
            setPendingImageTitle("");
            if (pendingImagePath) {
                window.dispatchEvent(new CustomEvent("image-loaded", {
                    detail: { path: pendingImagePath, title: pendingImageTitle }
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
        taskManager.addUserMessageToSession(finalSessionId, userMsg, SessionDomain.StoryCanvas);
        try {
            const workspace = await workspaceCommands.getDefaultWorkspace();
            const workspacePath = workspace?.workspace_path;
            const systemPrompt = getStoryCanvasSystemPrompt(language as 'zh' | 'en', workspacePath);
            const fullMessage = `${systemPrompt}\n\n User: ${userMessage}`;
            const mode = workflowMode || currentWorkflowMode;
            const taskId = await hippoxCommands.sendMessageAsync(
                userMessage,
                fullMessage,
                SubSystemEnum.StoryCanvas,
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
            taskManager.addAssistantMessageToSession(finalSessionId, assistantMsg, SessionDomain.StoryCanvas);
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
            taskManager.addTaskToSession(finalSessionId, newTask, SessionDomain.StoryCanvas);
        } catch (error) {
            console.error("send message error:", error);
            const errorMsg: ChatMessage = {
                id: `error_${Date.now()}`,
                role: RoleEnum.LLM,
                content: `${error}`,
                timestamp: now.toISOString(),
            };
            taskManager.addAssistantMessageToSession(finalSessionId, errorMsg, SessionDomain.StoryCanvas);
        }
    }, [currentSessionId, t, language, currentWorkflowMode, pendingImagePath, pendingImageTitle, createStoryCanvasSessionWithPath]);
    const handleSwitchSession = useCallback(async (sessionId: string) => {
        if (sessionId === currentSessionId) return;
        if (!sessionId.startsWith("storycanvas_session_") && !sessionId.startsWith("pending_")) {
            console.warn(
                `[useStoryCanvasChatSession] Cannot switch to session "${sessionId}" - it does not belong to StoryCanvas domain`
            );
            return;
        }
        const hasData = taskManager.hasSessionMessages(currentSessionId, SessionDomain.StoryCanvas);
        if (currentSessionId && !currentSessionId.startsWith("pending_") && !currentSessionId.startsWith("temp_") && hasData) {
            try {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.StoryCanvas);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.StoryCanvas);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.StoryCanvas);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                await storyCanvasSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                await storyCanvasSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            } catch (error) {
                console.error("Failed to save current session:", error);
            }
        }
        const hasTargetData = taskManager.getTasksBySession(sessionId, SessionDomain.StoryCanvas) !== undefined;
        if (!hasTargetData) {
            const chatContent = await storyCanvasSessionCommands.loadChatContent(sessionId);
            const terminalContent = await storyCanvasSessionCommands.loadTerminalContent(sessionId);
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
            taskManager.loadSessionData(sessionId, tasks, userMessages, assistantMessages, SessionDomain.StoryCanvas);
        } else {
            taskManager.switchToSession(sessionId, SessionDomain.StoryCanvas);
        }
        setCurrentSessionId(sessionId);
        try {
            const config = await storyCanvasSessionCommands.loadStoryCanvasSessionConfig(sessionId);
            if (config && config.image_file) {
                window.dispatchEvent(new CustomEvent("image-loaded", {
                    detail: { path: config.image_file, title: config.title || "" }
                }));
            }
        } catch (error) {
            console.error("Failed to load story canvas config:", error);
        }
    }, [currentSessionId]);
    const shouldShowWelcome = useCallback(() => {
        if (isLoading) return true;
        if (!currentSessionId) return true;
        if (currentSessionId.startsWith("pending_")) {
            const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.StoryCanvas);
            const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.StoryCanvas);
            return userMessages.length === 0 && assistantMessages.length === 0;
        }
        const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.StoryCanvas);
        const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.StoryCanvas);
        return userMessages.length === 0 && assistantMessages.length === 0;
    }, [isLoading, currentSessionId]);
    const resetSession = useCallback(async () => {
        if (!currentSessionId || currentSessionId.startsWith("pending_")) return;
        try {
            await hippoxCommands.resetSession();
            taskManager.loadSessionData(currentSessionId, [], [], [], SessionDomain.StoryCanvas);
        } catch (error) {
            console.error("reset session error:", error);
        }
    }, [currentSessionId]);
    /**
     * Create a new story canvas session from an external file path.
     */
    const createSessionWithImage = useCallback(async (
        filePath: string,
        fileTitle: string
    ) => {
        const newSessionId = `storycanvas_session_${v4()}_${Date.now()}`;
        const title = fileTitle || "Story Canvas Session";
        const fileTypeStr = getFileType(filePath);
        let imageSourcePath: string | undefined = undefined;
        let textSourcePaths: string[] | undefined = undefined;
        if (fileTypeStr === "image") {
            imageSourcePath = filePath;
        } else if (fileTypeStr === "text") {
            textSourcePaths = [filePath];
        } else {
            imageSourcePath = filePath;
        }
        await createStoryCanvasSessionWithPath(
            newSessionId,
            title,
            `File: ${fileTitle || filePath}`,
            imageSourcePath,
            textSourcePaths,
            currentWorkflowMode,
        );
        taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.StoryCanvas);
        setCurrentSessionId(newSessionId);
        setPendingNewSession(false);
        setPendingImagePath("");
        setPendingImageTitle("");
        window.dispatchEvent(new CustomEvent("storycanvas-session-created"));
        window.dispatchEvent(new CustomEvent("image-loaded", {
            detail: { path: filePath, title: fileTitle }
        }));
        return newSessionId;
    }, [currentWorkflowMode, createStoryCanvasSessionWithPath]);
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
        createSessionWithImage,
        pendingImagePath,
        pendingImageTitle,
        isCreatingSession,
        setIsCreatingSession,
    };
}