import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import { hippoxCommands } from "../../../command/chat";
import { taskManager } from "../../../core/TaskManager";
import { TaskInfo, UploadFile, TaskStatusEnum, SessionDomain } from "../../../core/types";
import { Language, ChatMessage, RoleEnum, MessageStatus } from "../../../types/types";
import { workspaceCommands } from "../../../command/workspace";
import { videoSessionCommands } from "../../../command/session/videoeditor";
import { basename } from "@tauri-apps/api/path";
import { showToast, ToastType } from "../../../components/Toast";
import { getVideoEditorSystemPrompt } from "../../../subsystem/VideoEditor/llm/prompts";
const getFileType = (filePath: string): "video" | "audio" | "image" | "text" | null => {
    const ext = filePath.split(".").pop()?.toLowerCase() || "";
    const videoExts = ["mp4", "mov", "mkv", "avi", "webm", "flv", "wmv", "m4v"];
    const audioExts = ["mp3", "wav", "flac", "aac", "ogg", "m4a", "wma"];
    const imageExts = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "ico"];
    const textExts = ["txt", "md", "json", "xml", "csv", "log", "ini", "cfg", "conf"];
    if (videoExts.includes(ext)) return "video";
    if (audioExts.includes(ext)) return "audio";
    if (imageExts.includes(ext)) return "image";
    if (textExts.includes(ext)) return "text";
    return null;
};
export function useVideoSession(
    language: Language,
    isConfigLoaded: boolean,
) {
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    const [currentWorkflowMode, setCurrentWorkflowMode] = useState<string>("ReAct");
    const [isLoading, setIsLoading] = useState(true);
    const [taskManagerVersion, setTaskManagerVersion] = useState(0);
    const [pendingNewSession, setPendingNewSession] = useState(false);
    const [pendingVideoPath, setPendingVideoPath] = useState<string>("");
    const [pendingVideoTitle, setPendingVideoTitle] = useState<string>("");
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
    const createVideoSessionWithPath = useCallback(async (
        sessionId: string,
        title: string,
        description: string,
        videoSourcePath?: string,
        audioSourcePaths?: string[],
        imageSourcePaths?: string[],
        textSourcePaths?: string[],
        workflowMode?: string,
    ) => {
        return await videoSessionCommands.createVideoSession(
            sessionId,
            title,
            description,
            [],
            [],
            workflowMode || currentWorkflowMode,
            undefined,
            undefined,
            videoSourcePath,
            audioSourcePaths,
            imageSourcePaths,
            textSourcePaths,
        );
    }, [currentWorkflowMode]);
    /**
     * Create a new video session
     *
     * Supports three creation methods:
     * 1. file - Import from local file
     * 2. download - Import from downloaded file (same logic as file)
     * 3. empty - Create an empty project
     *
     * For file and download types, automatically detects the file type
     * (video/audio/image/text) and creates the corresponding session,
     * loading the file onto the timeline.
     *
     * For empty type, creates an empty project without loading any files.
     *
     * @param filePath - File path (optional)
     * @param fileType - File type: "file" | "empty" | "download"
     */
    const handleNewSession = useCallback(
        async (filePath?: string, fileType?: "file" | "empty" | "download") => {
            // Handle file or download types - both use the same logic
            if (filePath && (fileType === "file" || fileType === "download")) {
                setIsCreatingSession(true);
                try {
                    const newSessionId = `video_session_${Date.now()}`;
                    const fileName = await basename(filePath);
                    const title = fileName || "Video Project";
                    // Detect file type and assign to the appropriate material array
                    const fileTypeStr = getFileType(filePath);
                    let videoSourcePath: string | undefined = undefined;
                    let audioSourcePaths: string[] | undefined = undefined;
                    let imageSourcePaths: string[] | undefined = undefined;
                    let textSourcePaths: string[] | undefined = undefined;
                    if (fileTypeStr === "video") {
                        videoSourcePath = filePath;
                    } else if (fileTypeStr === "audio") {
                        audioSourcePaths = [filePath];
                    } else if (fileTypeStr === "image") {
                        imageSourcePaths = [filePath];
                    } else if (fileTypeStr === "text") {
                        textSourcePaths = [filePath];
                    } else {
                        // Unknown type, treat as video
                        videoSourcePath = filePath;
                    }
                    await createVideoSessionWithPath(
                        newSessionId,
                        title,
                        `File: ${fileName}`,
                        videoSourcePath,
                        audioSourcePaths,
                        imageSourcePaths,
                        textSourcePaths,
                        currentWorkflowMode,
                    );
                    taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.Video);
                    setCurrentSessionId(newSessionId);
                    setPendingNewSession(false);
                    setPendingVideoPath("");
                    setPendingVideoTitle("");
                    window.dispatchEvent(new CustomEvent("video-session-created"));
                    window.dispatchEvent(
                        new CustomEvent("video-loaded", {
                            detail: { path: filePath, title: fileName },
                        })
                    );
                } catch (error) {
                    console.error("Failed to create video session:", error);
                    showToast(
                        ToastType.ERROR,
                        language === "zh" ? "创建视频会话失败" : "Failed to create video session"
                    );
                } finally {
                    setIsCreatingSession(false);
                }
            } else if (fileType === "empty" || !filePath) {
                // Create an empty project
                setIsCreatingSession(true);
                try {
                    const newSessionId = `video_session_${Date.now()}`;
                    const title = "Empty Project";
                    await createVideoSessionWithPath(
                        newSessionId,
                        title,
                        "Empty video project",
                        undefined,
                        undefined,
                        undefined,
                        undefined,
                        currentWorkflowMode,
                    );
                    taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.Video);
                    setCurrentSessionId(newSessionId);
                    setPendingNewSession(false);
                    setPendingVideoPath("");
                    setPendingVideoTitle("");
                    window.dispatchEvent(new CustomEvent("video-session-created"));
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
        [currentWorkflowMode, createVideoSessionWithPath, language]
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
            // 判断 pending 时是否有文件
            const fileTypeStr = pendingVideoPath ? getFileType(pendingVideoPath) : null;
            let videoSourcePath: string | undefined = undefined;
            let audioSourcePaths: string[] | undefined = undefined;
            let imageSourcePaths: string[] | undefined = undefined;
            let textSourcePaths: string[] | undefined = undefined;
            if (pendingVideoPath && fileTypeStr === "video") {
                videoSourcePath = pendingVideoPath;
            } else if (pendingVideoPath && fileTypeStr === "audio") {
                audioSourcePaths = [pendingVideoPath];
            } else if (pendingVideoPath && fileTypeStr === "image") {
                imageSourcePaths = [pendingVideoPath];
            } else if (pendingVideoPath && fileTypeStr === "text") {
                textSourcePaths = [pendingVideoPath];
            } else if (pendingVideoPath) {
                videoSourcePath = pendingVideoPath;
            }
            await createVideoSessionWithPath(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                videoSourcePath,
                audioSourcePaths,
                imageSourcePaths,
                textSourcePaths,
                workflowMode || currentWorkflowMode,
            );
            taskManager.loadSessionData(newSessionId, tempTasks, tempUserMessages, tempAssistantMessages, SessionDomain.Video);
            taskManager.deleteSession(finalSessionId, SessionDomain.Video);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("video-session-created"));
            setPendingNewSession(false);
            setPendingVideoPath("");
            setPendingVideoTitle("");
            if (pendingVideoPath) {
                window.dispatchEvent(new CustomEvent("video-loaded", {
                    detail: { path: pendingVideoPath, title: pendingVideoTitle }
                }));
            }
        } else if (!finalSessionId) {
            const newSessionId = `video_session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;
            const fileTypeStr = pendingVideoPath ? getFileType(pendingVideoPath) : null;
            let videoSourcePath: string | undefined = undefined;
            let audioSourcePaths: string[] | undefined = undefined;
            let imageSourcePaths: string[] | undefined = undefined;
            let textSourcePaths: string[] | undefined = undefined;
            if (pendingVideoPath && fileTypeStr === "video") {
                videoSourcePath = pendingVideoPath;
            } else if (pendingVideoPath && fileTypeStr === "audio") {
                audioSourcePaths = [pendingVideoPath];
            } else if (pendingVideoPath && fileTypeStr === "image") {
                imageSourcePaths = [pendingVideoPath];
            } else if (pendingVideoPath && fileTypeStr === "text") {
                textSourcePaths = [pendingVideoPath];
            } else if (pendingVideoPath) {
                videoSourcePath = pendingVideoPath;
            }
            await createVideoSessionWithPath(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                videoSourcePath,
                audioSourcePaths,
                imageSourcePaths,
                textSourcePaths,
                workflowMode || currentWorkflowMode,
            );
            taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.Video);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            window.dispatchEvent(new CustomEvent("video-session-created"));
            setPendingVideoPath("");
            setPendingVideoTitle("");
            if (pendingVideoPath) {
                window.dispatchEvent(new CustomEvent("video-loaded", {
                    detail: { path: pendingVideoPath, title: pendingVideoTitle }
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
            const systemPrompt = await getVideoEditorSystemPrompt(
                language as 'zh' | 'en',
                finalSessionId,
                workspacePath
            );
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
    }, [currentSessionId, t, language, currentWorkflowMode, pendingVideoPath, pendingVideoTitle, createVideoSessionWithPath]);
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
            if (config && config.video_file) {
                window.dispatchEvent(new CustomEvent("video-loaded", {
                    detail: { path: config.video_file, title: config.title || "" }
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
        filePath: string,
        fileTitle: string
    ) => {
        const newSessionId = `video_session_${Date.now()}`;
        const title = fileTitle || "Video Session";
        const fileTypeStr = getFileType(filePath);
        let videoSourcePath: string | undefined = undefined;
        let audioSourcePaths: string[] | undefined = undefined;
        let imageSourcePaths: string[] | undefined = undefined;
        let textSourcePaths: string[] | undefined = undefined;
        if (fileTypeStr === "video") {
            videoSourcePath = filePath;
        } else if (fileTypeStr === "audio") {
            audioSourcePaths = [filePath];
        } else if (fileTypeStr === "image") {
            imageSourcePaths = [filePath];
        } else if (fileTypeStr === "text") {
            textSourcePaths = [filePath];
        } else {
            videoSourcePath = filePath;
        }
        await createVideoSessionWithPath(
            newSessionId,
            title,
            `File: ${fileTitle || filePath}`,
            videoSourcePath,
            audioSourcePaths,
            imageSourcePaths,
            textSourcePaths,
            currentWorkflowMode,
        );
        taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.Video);
        setCurrentSessionId(newSessionId);
        setPendingNewSession(false);
        setPendingVideoPath("");
        setPendingVideoTitle("");
        window.dispatchEvent(new CustomEvent("video-session-created"));
        window.dispatchEvent(new CustomEvent("video-loaded", {
            detail: { path: filePath, title: fileTitle }
        }));
        return newSessionId;
    }, [currentWorkflowMode, createVideoSessionWithPath]);
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
        pendingVideoPath,
        pendingVideoTitle,
        isCreatingSession,
        setIsCreatingSession,
    };
}