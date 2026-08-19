import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import { hippoxCommands } from "../../../command/chat";
import { taskManager } from "../../../core/TaskManager";
import { TaskInfo, UploadFile, TaskStatusEnum, SessionDomain } from "../../../core/types";
import { Language, ChatMessage, RoleEnum, MessageStatus } from "../../../types/types";
import { workspaceCommands } from "../../../command/workspace";
import { sessionCommands } from "../../../command/session/general";
import { getGeneralChatSystemPrompt } from "../../../subsystem/GeneralChat/llm/prompts/basis";
/**
* Custom hook that manages the current session state and all session-related operations.
* 
* This hook is the central piece for session management, handling:
* - Creating new sessions
* - Switching between sessions
* - Sending messages within a session
* - Auto-saving session data to disk
* - Determining whether to show the welcome page
* 
* The hook works with three key components:
* 1. `taskManager` - In-memory data store for sessions, messages, and tasks
* 2. `sessionCommands` - Backend API for reading/writing session data to disk
* 3. `hippoxCommands` - Backend API for LLM operations
* 
* @param language - Current application language ('zh' | 'en')
* @param isConfigLoaded - Whether the app configuration has been loaded
* @param onCloseSkillsManager - Optional callback to close the skills manager panel
* @returns Session management state and handlers
*/
export function useSession(
    language: Language,
    isConfigLoaded: boolean,
    onCloseSkillsManager?: () => void,
) {
    /**
     * ID of the currently active session.
     * - Format: "session_<timestamp>" for real sessions
     * - Format: "pending_<timestamp>" for temporary sessions (not yet created)
     * - Empty string when no session is active (welcome page should be shown)
     */
    const [currentSessionId, setCurrentSessionId] = useState<string>("");
    /**
     * Current workflow mode for the session
     */
    const [currentWorkflowMode, setCurrentWorkflowMode] = useState<string>("ReAct");
    /**
     * Whether session data is still being loaded on app startup.
     * Used to prevent premature rendering and auto-save operations.
     */
    const [isLoading, setIsLoading] = useState(true);
    /**
     * Version counter that increments whenever taskManager data changes.
     * Used as a dependency in useEffect to trigger auto-save.
     * This creates a reactive data flow: taskManager changes → auto-save fires.
     */
    const [taskManagerVersion, setTaskManagerVersion] = useState(0);
    /**
     * Whether a new session is pending creation.
     * Set to true when a user creates a new session (pending_* ID),
     * and false when the session is actually persisted to disk.
     */
    const [pendingNewSession, setPendingNewSession] = useState(false);
    /** Translation function for i18n support */
    const { t } = useTranslation(language);
    /**
    * Subscribe to taskManager changes.
    * When any data in taskManager changes, increment the version counter,
    * which triggers the auto-save effect below.
    */
    useEffect(() => {
        const unsubscribe = taskManager.subscribe(() => {
            setTaskManagerVersion((prev) => prev + 1);
        });
        return unsubscribe;
    }, []);
    /**
    * Auto-save effect: Periodically persists session data to disk.
    * 
    * This is the primary data persistence mechanism. It triggers whenever:
    * - The current session ID changes
    * - Loading completes (isLoading becomes false)
    * - taskManager data changes (via taskManagerVersion)
    * 
    * Important safeguards:
    * - Only runs when not loading, session is valid (not pending/temp)
    * - Uses 500ms debounce to avoid excessive disk writes
    * - Saves both chat messages and terminal tasks
    * 
    * CRITICAL: Only saves when there is actual data in memory.
    * This prevents empty data from overwriting valid data on disk
    * (e.g., after F5 refresh when memory is empty but disk has data).
    */
    useEffect(() => {
        if (
            !isLoading &&
            currentSessionId &&
            !currentSessionId.startsWith("temp_") &&
            !currentSessionId.startsWith("pending_")
        ) {
            const currentDomain = taskManager.getCurrentDomain();
            if (currentDomain !== SessionDomain.General) {
                return;
            }
            const saveTimer = setTimeout(() => {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.General);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.General);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.General);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                if (userMessages.length === 0 && assistantMessages.length === 0) {
                    // !important, security checks to prevent empty data from overwriting valid data on the disk.
                    return;
                }
                // Merge and sort all messages by timestamp for consistent ordering
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                // Persist to disk (errors are caught and logged, not thrown)
                sessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                sessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            }, 500);
            // Cleanup: clear the timer if dependencies change before it fires
            return () => clearTimeout(saveTimer);
        }
    }, [currentSessionId, isLoading, taskManagerVersion]);
    useEffect(() => {
        if (isConfigLoaded) {
            setCurrentSessionId("");
            localStorage.removeItem("hippox-current-session");
            setIsLoading(false);
        }
    }, [isConfigLoaded]);
    /**
    * Send a message in the current session.
    * 
    * This handler orchestrates the entire message sending flow:
    * 1. Resolves the session ID (creates new session if needed)
    * 2. Adds user message to taskManager
    * 3. Sends message to backend LLM with workflow mode
    * 4. Creates a pending assistant message
    * 5. Creates a task for tracking execution
    * 
    * Session creation scenarios:
    * - pending_* session → Convert to real session, preserve existing data
    * - No session → Create brand new session
    * - Existing session → Use as-is
    * 
    * @param userMessage - The user's message text
    * @param sessionId - The session ID to send in (optional, uses current if not provided)
    * @param files - Optional files attached to the message
    * @param workflowMode - Optional workflow mode for this message
    */
    const handleSendMessage = useCallback(async (
        userMessage: string,
        sessionId: string,
        files?: UploadFile[],
        workflowMode?: string,
    ) => {
        const now = new Date();
        let finalSessionId = sessionId || currentSessionId;
        // Case 1: Pending session → convert to real session
        if (finalSessionId && finalSessionId.startsWith("pending_")) {
            const newSessionId = `session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;
            // Retrieve existing data from the pending session
            const tempUserMessages = taskManager.getUserMessagesBySession(finalSessionId, SessionDomain.General);
            const tempAssistantMessages = taskManager.getAssistantMessagesBySessionAsArray(finalSessionId, SessionDomain.General);
            const tempTasksMap = taskManager.getTasksBySession(finalSessionId, SessionDomain.General);
            const tempTasks = tempTasksMap ? Array.from(tempTasksMap.values()) : [];
            // Create the real session on disk with workflow mode
            await sessionCommands.createSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],  // No initial chat content (will be saved later)
                [],   // No initial terminal content
                workflowMode || currentWorkflowMode,  // Save workflow mode to config
            );
            // Move pending data to the new session
            taskManager.loadSessionData(newSessionId, tempTasks, tempUserMessages, tempAssistantMessages, SessionDomain.General);
            taskManager.deleteSession(finalSessionId, SessionDomain.General);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            localStorage.setItem("hippox-current-session", newSessionId);
            window.dispatchEvent(new CustomEvent("session-created"));
            setPendingNewSession(false);
            // Save workflow mode to localStorage for this session
            if (workflowMode || currentWorkflowMode) {
                localStorage.setItem(`workflow_mode_${newSessionId}`, workflowMode || currentWorkflowMode);
            }
        }
        // Case 2: No session → create brand new session
        else if (!finalSessionId) {
            const newSessionId = `session_${Date.now()}`;
            const sessionTitle = userMessage.length > 30
                ? userMessage.slice(0, 30) + "..."
                : userMessage;
            await sessionCommands.createSession(
                newSessionId,
                sessionTitle,
                t("app.newSessionDesc"),
                [],
                [],
                workflowMode || currentWorkflowMode,  // Save workflow mode to config
            );
            taskManager.loadSessionData(newSessionId, [], [], [], SessionDomain.General);
            finalSessionId = newSessionId;
            setCurrentSessionId(newSessionId);
            localStorage.setItem("hippox-current-session", newSessionId);
            window.dispatchEvent(new CustomEvent("session-created"));
            if (workflowMode || currentWorkflowMode) {
                localStorage.setItem(`workflow_mode_${newSessionId}`, workflowMode || currentWorkflowMode);
            }
        }
        // Create and add user message
        const userMsg: ChatMessage = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: RoleEnum.User,
            content: userMessage,
            timestamp: now.toISOString(),
            files: files,
        };
        taskManager.addUserMessageToSession(finalSessionId, userMsg, SessionDomain.General);
        // Send to backend and handle response
        try {
            const workspace = await workspaceCommands.getDefaultWorkspace();
            const workspacePath = workspace?.workspace_path;
            const systemPrompt = getGeneralChatSystemPrompt(language as 'zh' | 'en', workspacePath);
            const fullMessage = `${systemPrompt}\n\n User: ${userMessage}`;
            // Submit to LLM backend with workflow mode
            const mode = workflowMode || currentWorkflowMode;
            const taskId = await hippoxCommands.sendMessageAsync(
                userMessage,
                fullMessage,
                finalSessionId,
                mode,  // Pass workflow mode to backend
            );
            const messageId = `llm_${taskId}`;
            // Create pending assistant message (will be updated when task completes)
            const assistantMsg: ChatMessage = {
                id: messageId,
                role: RoleEnum.LLM,
                content: `${t("chat.taskSubmitted")} ${taskId.slice(0, 8)}...`,
                timestamp: now.toISOString(),
                status: MessageStatus.Pending,
            };
            taskManager.addAssistantMessageToSession(finalSessionId, assistantMsg, SessionDomain.General);
            // Create task for tracking execution progress
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
                workflow_mode: mode,  // Store workflow mode in task
            };
            taskManager.addTaskToSession(finalSessionId, newTask, SessionDomain.General);
        } catch (error) {
            // Handle send errors
            console.error("send message error:", error);
            const errorMsg: ChatMessage = {
                id: `error_${Date.now()}`,
                role: RoleEnum.LLM,
                content: `${error}`,
                timestamp: now.toISOString(),
            };
            taskManager.addAssistantMessageToSession(finalSessionId, errorMsg, SessionDomain.General);
        }
    }, [currentSessionId, t, language, currentWorkflowMode]);
    /**
    * Create a new session.
    * 
    * Creates a temporary session with a "pending_" prefix.
    * The session will be converted to a real session when the user sends their first message
    * (see handleSendMessage above).
    * 
    * This approach allows the user to start typing immediately without
    * creating a session directory on disk prematurely.
    */
    const handleNewSession = useCallback(async () => {
        const pendingId = `pending_${Date.now()}`;
        taskManager.loadSessionData(pendingId, [], [], [], SessionDomain.General);
        setCurrentSessionId(pendingId);
        localStorage.setItem("hippox-current-session", pendingId);
        setPendingNewSession(true);
        onCloseSkillsManager?.();
    }, [onCloseSkillsManager]);
    /**
    * Switch to a different session.
    * 
    * This is the core lazy-loading mechanism:
    * 1. Check if the current session has data before saving (prevents empty data from corrupting disk)
    * 2. If current session has data, save it to disk before switching
    * 3. Check if target session data is already in memory
    * 4. If not, load it from disk
    * 5. If yes, just switch to it
    * 
    * This lazy-loading strategy is critical for performance and data safety:
    * - Only loads data that the user actually views
    * - Handles malformed JSON gracefully (loads as empty, doesn't corrupt disk)
    * - Prevents empty data from overwriting valid data on disk (e.g., after F5 refresh)
    * 
    * @param sessionId - The ID of the session to switch to
    */
    const handleSwitchSession = useCallback(async (sessionId: string) => {
        // No-op if already on this session
        if (sessionId === currentSessionId) return;
        if (sessionId.startsWith("chart_session_") ||
            sessionId.startsWith("map_session_") ||
            sessionId.startsWith("codeeditor_session_") ||
            sessionId.startsWith("video_session_") ||
            sessionId.startsWith("sandbox3d_session_")) {
            return;
        }
        const hasData = taskManager.hasSessionMessages(currentSessionId, SessionDomain.General);
        // Save current session data to disk before switching away
        // Only saves when there is actual data to prevent empty data overwriting disk
        if (currentSessionId && !currentSessionId.startsWith("pending_") && !currentSessionId.startsWith("temp_") && hasData) {
            try {
                const tasksMap = taskManager.getTasksBySession(currentSessionId, SessionDomain.General);
                const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.General);
                const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.General);
                const tasksArray: TaskInfo[] = tasksMap ? Array.from(tasksMap.values()) : [];
                // Merge and sort messages
                const allMessages = [...userMessages, ...assistantMessages].sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );
                await sessionCommands.saveChatContent(currentSessionId, allMessages).catch(console.error);
                await sessionCommands.saveTerminalContent(currentSessionId, tasksArray).catch(console.error);
            } catch (error) {
                console.error("Failed to save current session:", error);
                // Continue even if save fails (error is logged, not thrown)
            }
        }
        // Check if target session is already in memory
        const hasTargetData = taskManager.getTasksBySession(sessionId, SessionDomain.General) !== undefined;
        if (!hasTargetData) {
            // Lazy load: read from disk and load into memory
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
            // Load data into taskManager memory
            taskManager.loadSessionData(sessionId, tasks, userMessages, assistantMessages, SessionDomain.General);
        } else {
            // Already in memory, just switch
            taskManager.switchToSession(sessionId, SessionDomain.General);
        }
        setCurrentSessionId(sessionId);
        localStorage.setItem("hippox-current-session", sessionId);
        window.dispatchEvent(new CustomEvent("session-created"));
    }, [currentSessionId]);
    /**
    * Determine whether the welcome page should be shown.
    * 
    * The welcome page is shown when:
    * - Still loading session data
    * - No session is active (currentSessionId is empty)
    * - The current session is empty (no user or assistant messages)
    * 
    * Note: Pending sessions are considered empty by default.
    * 
    * @returns true if the welcome page should be displayed
    */
    const shouldShowWelcome = useCallback(() => {
        // Show loading state while session data is being loaded
        if (isLoading) return true;
        // No session active
        if (!currentSessionId) return true;
        // Pending sessions have no data yet
        if (currentSessionId.startsWith("pending_")) {
            const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.General);
            const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.General);
            return userMessages.length === 0 && assistantMessages.length === 0;
        }
        // Real session: check if it has any messages
        const userMessages = taskManager.getUserMessagesBySession(currentSessionId, SessionDomain.General);
        const assistantMessages = taskManager.getAssistantMessagesBySessionAsArray(currentSessionId, SessionDomain.General);
        return userMessages.length === 0 && assistantMessages.length === 0;
    }, [isLoading, currentSessionId]);
    /**
    * Reset the current session.
    * 
    * Clears all data in the current session (messages and tasks).
    * After reset, the session will be empty and the welcome page will be shown.
    * 
    * @note Only works for real sessions (not pending or temp)
    */
    const resetSession = useCallback(async () => {
        // Cannot reset pending or temp sessions
        if (!currentSessionId || currentSessionId.startsWith("pending_")) return;
        try {
            await hippoxCommands.resetSession();
            // Clear all data for this session in taskManager
            taskManager.loadSessionData(currentSessionId, [], [], [], SessionDomain.General);
        } catch (error) {
            console.error("reset session error:", error);
        }
    }, [currentSessionId]);
    /**
    * Return session state and handlers for use in components.
    */
    return {
        /** ID of the currently active session, or empty string if none */
        currentSessionId,
        /** Whether session data is still loading on startup */
        isLoading,
        /** Version counter for triggering auto-save effects */
        taskManagerVersion,
        /** Current workflow mode for the session */
        currentWorkflowMode,
        /** Set current workflow mode */
        setCurrentWorkflowMode,
        /** Create a new pending session */
        handleNewSession,
        /** Switch to an existing session by ID */
        handleSwitchSession,
        /** Send a message in the current session */
        handleSendMessage,
        /** Reset the current session (clear all data) */
        resetSession,
        /** Determine whether to show the welcome page */
        shouldShowWelcome,
    };
}