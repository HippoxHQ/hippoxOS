import { listen } from "@tauri-apps/api/event";
import { taskManager } from "./TaskManager";
import { SessionDomain, StepStatusEnum, TaskStepInfo } from "./types";
export interface DriverEventHandlers {
    onTranslation: (key: string) => string;
}
export interface DriverProgressEvent {
    task_id: string | null;
    step_index: number | null;
    progress: number;
    message: string;
    session_id: string;
}
export interface DriverStartEvent {
    task_id: string | null;
    step_index: number | null;
    driver_name: string;
    session_id: string;
}
export interface DriverCompleteEvent {
    task_id: string | null;
    step_index: number | null;
    driver_name: string;
    output: string;
    session_id: string;
}
export interface DriverErrorEvent {
    task_id: string | null;
    step_index: number | null;
    driver_name: string;
    error: string;
    session_id: string;
}
export interface DriverLogEvent {
    task_id: string | null;
    step_index: number | null;
    msg: string;
    session_id: string;
}
const updateTaskStepByGeneralSession = (
    sessionId: string,
    taskId: string,
    stepIndex: number,
    updates: Partial<TaskStepInfo>
): void => {
    const tasks = taskManager.getTasksBySession(sessionId, SessionDomain.General);
    if (!tasks) return;
    const task = tasks.get(taskId);
    if (!task) return;
    const steps = [...task.steps];
    const existingIndex = steps.findIndex((s) => s.step_index === stepIndex);
    if (existingIndex !== -1) {
        steps[existingIndex] = {
            ...steps[existingIndex],
            ...updates,
            logs: updates.logs
                ? [...(steps[existingIndex].logs || []), ...updates.logs]
                : steps[existingIndex].logs,
        };
    } else {
        const newStep: TaskStepInfo = {
            step_index: stepIndex,
            step_name: `Step ${stepIndex}`,
            status: updates.status || StepStatusEnum.Running,
            error: updates.error,
            duration_ms: updates.duration_ms,
            input: updates.input,
            output: updates.output,
            progress: updates.progress,
            progress_message: updates.progress_message,
            started_at: updates.started_at,
            completed_at: updates.completed_at,
            logs: updates.logs || [],
        };
        steps.push(newStep);
        steps.sort((a, b) => a.step_index - b.step_index);
    }
    tasks.set(taskId, {
        ...task,
        steps,
        updated_at: new Date().toISOString(),
    });
    taskManager.notify();
};
// Driver start handler
export const handleDriverStart = (event: any, t: (key: string) => string) => {
    const { task_id, step_index, driver_name, session_id } = event.payload;
    if (!session_id || !task_id || step_index === null) {
        console.warn("driver_callback_start missing required fields");
        return;
    }
    updateTaskStepByGeneralSession(session_id, task_id, step_index, {
        status: StepStatusEnum.Running,
        started_at: new Date().toISOString(),
    });
};
// Driver progress handler
export const handleDriverProgress = (event: any, t: (key: string) => string) => {
    const { task_id, step_index, progress, message, session_id } = event.payload;
    if (!session_id || !task_id || step_index === null) {
        console.warn("driver_callback_progress missing required fields");
        return;
    }
    updateTaskStepByGeneralSession(session_id, task_id, step_index, {
        progress: progress,
        progress_message: message,
    });
};
// Driver complete handler
export const handleDriverComplete = (event: any, t: (key: string) => string) => {
    const { task_id, step_index, driver_name, output, session_id } = event.payload;
    if (!session_id || !task_id || step_index === null) {
        console.warn("driver_callback_complete missing required fields");
        return;
    }
    updateTaskStepByGeneralSession(session_id, task_id, step_index, {
        status: StepStatusEnum.Success,
        output: output,
        completed_at: new Date().toISOString(),
    });
};
// Driver error handler
export const handleDriverError = (event: any, t: (key: string) => string) => {
    const { task_id, step_index, driver_name, error, session_id } = event.payload;
    if (!session_id || !task_id || step_index === null) {
        console.warn("driver_callback_error missing required fields");
        return;
    }
    updateTaskStepByGeneralSession(session_id, task_id, step_index, {
        status: StepStatusEnum.Failure,
        error: error,
        completed_at: new Date().toISOString(),
    });
};
// Driver log handler 
export const handleDriverLog = (event: any, t: (key: string) => string) => {
    const { task_id, step_index, driver_name, session_id, msg } = event.payload;
    if (!session_id || !task_id || step_index === null) {
        console.warn("driver_callback_log missing required fields");
        return;
    }
    const tasks = taskManager.getTasksBySession(session_id, SessionDomain.General);
    const task = tasks?.get(task_id);
    if (task) {
        const steps = [...task.steps];
        const existingIndex = steps.findIndex((s) => s.step_index === step_index);
        if (existingIndex !== -1) {
            const currentLogs = steps[existingIndex].logs || [];
            if (currentLogs.includes(msg)) {
                return;
            }
        }
    }
    updateTaskStepByGeneralSession(session_id, task_id, step_index, {
        logs: [msg],
    });
};
// Setup driver event listeners 
export const setupDriverEventListeners = async (
    t: (key: string) => string
): Promise<Array<() => void>> => {
    const unlistenFunctions: Array<() => void> = [];
    const unlistenStart = await listen("driver_callback_start", (event: any) => {
        handleDriverStart(event, t);
    });
    unlistenFunctions.push(unlistenStart);
    const unlistenProgress = await listen("driver_callback_progress", (event: any) => {
        handleDriverProgress(event, t);
    });
    unlistenFunctions.push(unlistenProgress);
    const unlistenComplete = await listen("driver_callback_complete", (event: any) => {
        handleDriverComplete(event, t);
    });
    unlistenFunctions.push(unlistenComplete);
    const unlistenError = await listen("driver_callback_error", (event: any) => {
        handleDriverError(event, t);
    });
    unlistenFunctions.push(unlistenError);
    const unlistenLog = await listen("driver_callback_log", (event: any) => {
        handleDriverLog(event, t);
    });
    unlistenFunctions.push(unlistenLog);
    return unlistenFunctions;
};
export const driverEventHandlers = {
    onStart: handleDriverStart,
    onProgress: handleDriverProgress,
    onComplete: handleDriverComplete,
    onError: handleDriverError,
    onLog: handleDriverLog,
};