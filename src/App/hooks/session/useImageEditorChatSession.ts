import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import { hippoxCommands, SubSystemEnum } from "../../../command/chat";
import { taskManager } from "../../../core/TaskManager";
import { TaskInfo, UploadFile, TaskStatusEnum, SessionDomain } from "../../../core/types";
import { Language, ChatMessage, RoleEnum, MessageStatus } from "../../../types/types";
import { workspaceCommands } from "../../../command/workspace";
import { imageEditorSessionCommands } from "../../../command/session/imageeditor";
import { basename } from "@tauri-apps/api/path";
import { showToast, ToastType } from "../../../components/Toast";
import { getImageEditorSystemPrompt } from "../../../subsystem/ImageEditor/llm/prompts";
/**
 * Detect the broad category of a file based on its extension.
 * Image editor only handles image / text sources.
 */
const getFileType = (filePath: string): "image" | "text" | null => {
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "ico"];
    const textExts = ["txt", "md", "json", "xml", "csv", "log", "ini", "cfg", "conf"];
    if (imageExts.includes(ext)) return "image";
    if (textExts.includes(ext)) return "text";
    return null;
};
export function useImageEditorSession(
    language: Language,
    isConfigLoaded: boolean,
) {
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [currentWorkflowMode, setCurrentWorkflowMode] = useState<string>("ReAct");
    const [isLoading, setIsLoading] = useState(true);
    const [taskManagerVersion, setTaskManagerVersion] = useState(0);
    const [pendingNewSession, setPendingNewSession] = useState(false);
    // Pending source paths recorded when the user picks a file before a
    // session exists. They are consumed when the pending session is
    // materialized on the first outbound message.
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
            if (currentDomain !== SessionDomain.ImageEditor) {
                console.debug(
                    `[useImageEditorSession] Skipping save - current domain is "${currentDomain}", not "ImageEditor"`
                );
                return;
            }
            const saveTimer = setTimeout(() => {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.ImageEditor);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.ImageEditor);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.ImageEditor);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                if (userMessages.length === 0 && assistantMessages.length === 0) {
                    return;
                }
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                imageEditorSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                imageEditorSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            }, 500);
            return () => clearTimeout(saveTimer);
        }
    }, [currentSessionId, isLoading, taskManagerVersion]);
    useEffect(() => {
        if (isConfigLoaded) {
            imageEditorSessionCommands.listImageEditorSessions()
                .then(list => {
                    if (list.length > 0) {
                        const sorted = list.sort((a, b) => {
                            const aTs = parseInt(a.session_id.replace("imageeditor_session_", "")) || 0;
                            const bTs = parseInt(b.session_id.replace("imageeditor_session_", "")) || 0;
                            return bTs - aTs;
                        });
                        const sessionId = sorted[0].session_id;
                        setCurrentSessionId(sessionId);
                        Promise.all([
                            imageEditorSessionCommands.loadChatContent(sessionId),
                            imageEditorSessionCommands.loadTerminalContent(sessionId)
                        ]).then(([chatContent, terminalContent]) => {
                            const userMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.User);
                            const assistantMessages = (chatContent || []).filter(msg => msg.role === RoleEnum.LLM);
                            taskManager.loadSessionData(sessionId, terminalContent || [], userMessages, assistantMessages, SessionDomain.ImageEditor);
                            setIsLoading(false);
                        }).catch(() => {
                            setIsLoading(false);
                        });
                    } else {
                        const pendingId = `pending_${Date.now()}`;
                        taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.ImageEditor);
                        setCurrentSessionId(pendingId);
                        setPendingNewSession(true);
                        setIsLoading(false);
                    }
                })
                .catch(() => {
                    const pendingId = `pending_${Date.now()}`;
                    taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.ImageEditor);
                    setCurrentSessionId(pendingId);
                    setPendingNewSession(true);
                    setIsLoading(false);
                });
        }
    }, [isConfigLoaded]);
    /**
     * Create an image editor session on disk.
     *
     * `createImageEditorSession` only accepts 6 arguments, so the source
     * file path is persisted separately via `updateImageEditorSessionConfig`
     * after the session has been created.
     */
    const createImageSessionWithPath = useCallback(async (
        sessionId: string,
        title: string,
        description: string,
        imageSourcePath?: string,
        textSourcePaths?: string[],
        workflowMode?: string,
    ) => {
        // create the bare session.
        const created = await imageEditorSessionCommands.createImageEditorSession(
            sessionId,
            title,
            description,
            [],
            [],
            workflowMode || currentWorkflowMode,
        );
        // persist the source paths into the session config so the
        // editor can retrieve them when the session is later reopened.
        try {
            const updates: Record<string, any> = {};
            if (imageSourcePath) updates.image_file = imageSourcePath;
            if (textSourcePaths && textSourcePaths.length > 0) updates.text_files = textSourcePaths;
            if (Object.keys(updates).length > 0) {
                await imageEditorSessionCommands.updateImageEditorSessionConfig(sessionId, updates);
            }
        } catch (err) {
            console.warn("[useImageEditorSession] Failed to persist source paths:", err);
        }
        return created;
    }, [currentWorkflowMode]);
    /**
     * Create a new image editor session.
     *
     * Supports three creation methods:
     * 1. file - Import from a local image file
     * 2. download - Import from a downloaded file (same logic as file)
     * 3. empty - Create an empty project
     *
     * For file / download types, the file is attached to the session
     * so that it can be shown on the canvas when the editor opens.
     *
     * For empty type, creates an empty project without loading any files.
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
                    const newSessionId = `imageeditor_session_${Date.now()}`;
                    const fileName = await basename(filePath);
                    const title = fileName || "Image Project";
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
                    await createImageSessionWithPath(
                        newSessionId,
                        title,
                        `File: ${fileName}`,
                        imageSourcePath,
                        textSourcePaths,
                        currentWorkflowMode,
                    );
                    taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.ImageEditor);
                    setCurrentSessionId(newSessionId);
                    setPendingNewSession(false);
                    setPendingImagePath("");
                    setPendingImageTitle("");
                    window.dispatchEvent(new CustomEvent("imageeditor-session-created"));
                    window.dispatchEvent(
                        new CustomEvent("image-loaded", {
                            detail: { path: filePath, title: fileName },
                        })
                    );
                } catch (error) {
                    console.error("Failed to create image session:", error);
                    showToast(
                        ToastType.ERROR,
                        language === "zh" ? "创建图片会话失败" : "Failed to create image session"
                    );
                } finally {
                    setIsCreatingSession(false);
                }
            } else if (fileType === "empty" || !filePath) {
                // Create an empty project
                setIsCreatingSession(true);
                try {
                    const newSessionId = `imageeditor_session_${Date.now()}`;
                    const title = "Empty Project";
                    await createImageSessionWithPath(
                        newSessionId,
                        title,
                        "Empty image project",
                        undefined,
                        undefined,
                        currentWorkflowMode,
                    );
                    taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.ImageEditor);
                    setCurrentSessionId(newSessionId);
                    setPendingNewSession(false);
                    setPendingImagePath("");
                    setPendingImageTitle("");
                    window.dispatchEvent(new CustomEvent("imageeditor-session-created"));
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
        [currentWorkflowMode, createImageSessionWithPath, language]
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
            !finalSessionId.startsWith("imageeditor_session_") && !finalSessionId.startsWith("temp_")) {
            console.error(
                `[useImageEditorSession] Invalid session ID "${finalSessionId}" - does not belong to ImageEditor domain`
            );
            return;
        }
        if (finalSessionId && finalSessionId.startsWith("pending_")) {
            const newSessionId = `imageeditor_session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;
            const tempUserMessages = taskManager.getUserMessagesBySession(finalSessionId, SessionDomain.ImageEditor);
            const tempAssistantMessages = taskManager.getAssistantMessagesBySessionAsArray(finalSessionId, SessionDomain.ImageEditor);
            const tempTasksMap = taskManager.getTasksBySession(finalSessionId, SessionDomain.ImageEditor);
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
            await createImageSessionWithPath(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                imageSourcePath,
                textSourcePaths,
                workflowMode || currentWorkflowMode,
            );
            taskManager.loadSessionData(newSessionId, tempTasks, tempUserMessages, tempAssistantMessages, SessionDomain.ImageEditor);
            taskManager.deleteSession(finalSessionId, SessionDomain.ImageEditor);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("imageeditor-session-created"));
            setPendingNewSession(false);
            setPendingImagePath("");
            setPendingImageTitle("");
            if (pendingImagePath) {
                window.dispatchEvent(new CustomEvent("image-loaded", {
                    detail: { path: pendingImagePath, title: pendingImageTitle }
                }));
            }
        } else if (!finalSessionId) {
            const newSessionId = `imageeditor_session_${Date.now()}`;
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
            await createImageSessionWithPath(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                imageSourcePath,
                textSourcePaths,
                workflowMode || currentWorkflowMode,
            );
            taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.ImageEditor);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("imageeditor-session-created"));
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
        taskManager.addUserMessageToSession(finalSessionId, userMsg, SessionDomain.ImageEditor);
        try {
            const workspace = await workspaceCommands.getDefaultWorkspace();
            const workspacePath = workspace?.workspace_path;
            const systemPrompt = getImageEditorSystemPrompt(language as 'zh' | 'en', workspacePath);
            const fullMessage = `${systemPrompt}\n\n User: ${userMessage}`;
            const mode = workflowMode || currentWorkflowMode;
            const taskId = await hippoxCommands.sendMessageAsync(
                userMessage,
                fullMessage,
                SubSystemEnum.ImageEditor,
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
            taskManager.addAssistantMessageToSession(finalSessionId, assistantMsg, SessionDomain.ImageEditor);
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
            taskManager.addTaskToSession(finalSessionId, newTask, SessionDomain.ImageEditor);
        } catch (error) {
            console.error("send message error:", error);
            const errorMsg: ChatMessage = {
                id: `error_${Date.now()}`,
                role: RoleEnum.LLM,
                content: `${error}`,
                timestamp: now.toISOString(),
            };
            taskManager.addAssistantMessageToSession(finalSessionId, errorMsg, SessionDomain.ImageEditor);
        }
    }, [currentSessionId, t, language, currentWorkflowMode, pendingImagePath, pendingImageTitle, createImageSessionWithPath]);
    const handleSwitchSession = useCallback(async (sessionId: string) => {
        if (sessionId === currentSessionId) return;
        if (!sessionId.startsWith("imageeditor_session_") && !sessionId.startsWith("pending_")) {
            console.warn(
                `[useImageEditorSession] Cannot switch to session "${sessionId}" - it does not belong to ImageEditor domain`
            );
            return;
        }
        const hasData = taskManager.hasSessionMessages(currentSessionId, SessionDomain.ImageEditor);
        if (currentSessionId && !currentSessionId.startsWith("pending_") && !currentSessionId.startsWith("temp_") && hasData) {
            try {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.ImageEditor);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.ImageEditor);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.ImageEditor);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                await imageEditorSessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                await imageEditorSessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            } catch (error) {
                console.error("Failed to save current session:", error);
            }
        }
        const hasTargetData = taskManager.getTasksBySession(sessionId, SessionDomain.ImageEditor) !== undefined;
        if (!hasTargetData) {
            const chatContent = await imageEditorSessionCommands.loadChatContent(sessionId);
            const terminalContent = await imageEditorSessionCommands.loadTerminalContent(sessionId);
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
            taskManager.loadSessionData(sessionId, tasks, userMessages, assistantMessages, SessionDomain.ImageEditor);
        } else {
            taskManager.switchToSession(sessionId, SessionDomain.ImageEditor);
        }
        setCurrentSessionId(sessionId);
        try {
            const config = await imageEditorSessionCommands.loadImageEditorSessionConfig(sessionId);
            if (config && config.image_file) {
                window.dispatchEvent(new CustomEvent("image-loaded", {
                    detail: { path: config.image_file, title: config.title || "" }
                }));
            }
        } catch (error) {
            console.error("Failed to load image config:", error);
        }
    }, [currentSessionId]);
    const shouldShowWelcome = useCallback(() => {
        if (isLoading) return true;
        if (!currentSessionId) return true;
        if (currentSessionId.startsWith("pending_")) {
            const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.ImageEditor);
            const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.ImageEditor);
            return userMessages.length === 0 && assistantMessages.length === 0;
        }
        const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.ImageEditor);
        const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.ImageEditor);
        return userMessages.length === 0 && assistantMessages.length === 0;
    }, [isLoading, currentSessionId]);
    const resetSession = useCallback(async () => {
        if (!currentSessionId || currentSessionId.startsWith("pending_")) return;
        try {
            await hippoxCommands.resetSession();
            taskManager.loadSessionData(currentSessionId, [], [], [], SessionDomain.ImageEditor);
        } catch (error) {
            console.error("reset session error:", error);
        }
    }, [currentSessionId]);
    /**
     * Create a new image session from an external file path.
     * Used by the welcome page when the user picks an image directly.
     */
    const createSessionWithImage = useCallback(async (
        filePath: string,
        fileTitle: string
    ) => {
        const newSessionId = `imageeditor_session_${Date.now()}`;
        const title = fileTitle || "Image Session";
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
        await createImageSessionWithPath(
            newSessionId,
            title,
            `File: ${fileTitle || filePath}`,
            imageSourcePath,
            textSourcePaths,
            currentWorkflowMode,
        );
        taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.ImageEditor);
        setCurrentSessionId(newSessionId);
        setPendingNewSession(false);
        setPendingImagePath("");
        setPendingImageTitle("");
        window.dispatchEvent(new CustomEvent("imageeditor-session-created"));
        window.dispatchEvent(new CustomEvent("image-loaded", {
            detail: { path: filePath, title: fileTitle }
        }));
        return newSessionId;
    }, [currentWorkflowMode, createImageSessionWithPath]);
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