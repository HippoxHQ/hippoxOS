import { listen } from "@tauri-apps/api/event";
import { ChatMessage, RoleEnum, MessageStatus } from "../types/types";
import { taskManager } from "./TaskManager";
import { SessionDomain, TaskInfo, TaskStatusEnum } from "./types";

export interface TaskEventHandlers {
    onTranslation: (key: string) => string;
}

// Task step update handler
export const handleTaskStepUpdate = (
    event: any,
    t: (key: string) => string
) => {
    const {
        task_id,
        step_name,
        step_index,
        status,
        output,
        error,
        duration_ms,
        input,
        session_id,
    } = event.payload;
    if (!session_id) {
        console.warn("task_step_update missing session_id");
        return;
    }
    const domain = taskManager.getDomainFromSessionId(session_id);
    const tasksMap = taskManager.getTasksBySession(session_id, domain);
    const task = tasksMap?.get(task_id);
    if (task && task.status !== TaskStatusEnum.Failed) {
        const currentSteps = task.steps || [];
        const steps = [...currentSteps];
        const existingIndex = steps.findIndex(
            (s) => s.step_index === step_index,
        );
        if (existingIndex !== -1) {
            steps[existingIndex] = {
                ...steps[existingIndex],
                status,
                ...(output !== undefined && { output }),
                ...(error !== undefined && { error }),
                ...(duration_ms !== undefined && { duration_ms }),
                ...(input !== undefined && { input }),
            };
        } else {
            steps.push({
                step_index,
                step_name,
                status,
                error,
                duration_ms,
                input,
                output,
            });
        }
        steps.sort((a, b) => a.step_index - b.step_index);
        const hasFailure = steps.some((s) => s.status === "FAILURE");
        const taskStatus = hasFailure ? TaskStatusEnum.Failed : task.status;
        taskManager.updateTaskBySession(session_id, task_id, {
            steps: steps,
            status: taskStatus,
        }, domain);
    }
};

export const handleTaskComplete = (
    event: any,
    t: (key: string) => string
) => {
    const {
        task_id,
        final_output,
        total_duration_ms,
        total_steps,
        session_id,
    } = event.payload;
    if (!session_id) return;
    const domain = taskManager.getDomainFromSessionId(session_id);
    const messageId = `llm_${task_id}`;
    const assistantMessagesMap = taskManager.getAssistantMessagesMapBySession(session_id, domain);
    const existingMsg = assistantMessagesMap?.get(messageId);
    if (!existingMsg) {
        const successMsg: ChatMessage = {
            id: messageId,
            role: RoleEnum.LLM,
            content: final_output || t("chat.taskCompleted"),
            timestamp: new Date().toISOString(),
            status: MessageStatus.Completed,
        };
        taskManager.addAssistantMessageToSession(session_id, successMsg, domain);
    } else {
        taskManager.updateAssistantMessageBySession(session_id, messageId, {
            content: final_output || t("chat.taskCompleted"),
            timestamp: new Date().toISOString(),
            status: MessageStatus.Completed,
        }, domain);
    }
    const task = taskManager.getTaskBySession(session_id, task_id, domain);
    if (task) {
        taskManager.updateTaskBySession(session_id, task_id, {
            status: TaskStatusEnum.Completed,
            final_output: final_output,
            total_duration_ms,
            total_steps,
        }, domain);
    } else {
        const newTask: TaskInfo = {
            task_id: task_id,
            session_id: session_id,
            user_input: "Processing...",
            status: TaskStatusEnum.Completed,
            steps: [],
            final_output: final_output,
            total_duration_ms,
            total_steps,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        taskManager.addTaskToSession(session_id, newTask, domain);
    }
};

export const handleTaskFailed = (
    event: any,
    t: (key: string) => string
) => {
    const { task_id, error, total_duration_ms, total_steps, session_id } = event.payload;
    if (!session_id) return;
    const domain = taskManager.getDomainFromSessionId(session_id);
    const messageId = `llm_${task_id}`;
    const assistantMessagesMap = taskManager.getAssistantMessagesMapBySession(session_id, domain);
    const existingMsg = assistantMessagesMap?.get(messageId);
    const isTimeout = error?.toLowerCase().includes("timeout");
    const errorContent = isTimeout
        ? `⏰ ${error}`
        : `❌ ${error}`;
    if (!existingMsg) {
        const errorMsg: ChatMessage = {
            id: messageId,
            role: RoleEnum.LLM,
            content: errorContent,
            timestamp: new Date().toISOString(),
            status: MessageStatus.Failed,
        };
        taskManager.addAssistantMessageToSession(session_id, errorMsg, domain);
    } else {
        taskManager.updateAssistantMessageBySession(session_id, messageId, {
            content: errorContent,
            timestamp: new Date().toISOString(),
            status: MessageStatus.Failed,
        }, domain);
    }
    const task = taskManager.getTaskBySession(session_id, task_id, domain);
    if (task) {
        taskManager.updateTaskBySession(session_id, task_id, {
            status: TaskStatusEnum.Failed,
            final_output: error,
            total_duration_ms,
            total_steps,
        }, domain);
    } else {
        const newTask: TaskInfo = {
            task_id: task_id,
            session_id: session_id,
            user_input: "Processing...",
            status: TaskStatusEnum.Failed,
            steps: [],
            final_output: error,
            total_duration_ms,
            total_steps,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        taskManager.addTaskToSession(session_id, newTask, domain);
    }
};

export const handleTaskPaused = (
    event: any,
    t: (key: string) => string
) => {
    const { task_id, checkpoint, total_duration_ms, total_steps, session_id } = event.payload;
    if (!session_id || !task_id) return;
    const domain = taskManager.getDomainFromSessionId(session_id);
    taskManager.updateTaskBySession(session_id, task_id, {
        status: TaskStatusEnum.Paused,
        total_duration_ms,
        resume_data: checkpoint,
    }, domain);
    const messageId = `llm_${task_id}`;
    taskManager.updateAssistantMessageBySession(session_id, messageId, {
        status: MessageStatus.Paused,
        content: `⏸️ ${t("terminal.taskPaused")}`,
    }, domain);
};

export const handleTaskCancelled = (
    event: any,
    t: (key: string) => string
) => {
    const { task_id, total_duration_ms, total_steps, session_id } = event.payload;
    if (!session_id || !task_id) return;
    const domain = taskManager.getDomainFromSessionId(session_id);
    taskManager.updateTaskBySession(session_id, task_id, {
        status: TaskStatusEnum.Cancelled,
        total_duration_ms,
    }, domain);
    const messageId = `llm_${task_id}`;
    taskManager.updateAssistantMessageBySession(session_id, messageId, {
        status: MessageStatus.Cancelled,
        content: `⏹️ ${t("terminal.cancelled")}`,
    }, domain);
};

export const handleTaskResumed = (
    event: any,
    t: (key: string) => string
) => {
    const { task_id, session_id } = event.payload;
    if (!session_id || !task_id) return;
    const domain = taskManager.getDomainFromSessionId(session_id);
    taskManager.updateTaskBySession(session_id, task_id, {
        status: TaskStatusEnum.Running,
    }, domain);
    const messageId = `llm_${task_id}`;
    taskManager.updateAssistantMessageBySession(session_id, messageId, {
        status: MessageStatus.Pending,
        content: `🔄 ${t("terminal.taskResumed")}`,
    }, domain);
};

export const setupTaskEventListeners = async (
    t: (key: string) => string
): Promise<Array<() => void>> => {
    const unlistenFunctions: Array<() => void> = [];

    const unlistenStep = await listen("task_step_update", (event: any) => {
        handleTaskStepUpdate(event, t);
    });
    unlistenFunctions.push(unlistenStep);

    const unlistenComplete = await listen("task_complete", (event: any) => {
        handleTaskComplete(event, t);
    });
    unlistenFunctions.push(unlistenComplete);

    const unlistenFailed = await listen("task_failed", (event: any) => {
        handleTaskFailed(event, t);
    });
    unlistenFunctions.push(unlistenFailed);

    const unlistenPaused = await listen("task_paused", (event: any) => {
        handleTaskPaused(event, t);
    });
    unlistenFunctions.push(unlistenPaused);

    const unlistenCancelled = await listen("task_cancelled", (event: any) => {
        handleTaskCancelled(event, t);
    });
    unlistenFunctions.push(unlistenCancelled);

    const unlistenResumed = await listen("task_resumed", (event: any) => {
        handleTaskResumed(event, t);
    });
    unlistenFunctions.push(unlistenResumed);

    return unlistenFunctions;
};