import { listen } from "@tauri-apps/api/event";
import { taskManager } from "./TaskManager";
import { StepStatusEnum, TaskStepInfo } from "./types";

export interface SkillEventHandlers {
    onTranslation: (key: string) => string;
}

export interface SkillProgressEvent {
    task_id: string | null;
    step_index: number | null;
    progress: number;
    message: string;
    session_id: string;
}

export interface SkillStartEvent {
    task_id: string | null;
    step_index: number | null;
    skill_name: string;
    session_id: string;
}

export interface SkillCompleteEvent {
    task_id: string | null;
    step_index: number | null;
    skill_name: string;
    result: string;
    session_id: string;
}

export interface SkillErrorEvent {
    task_id: string | null;
    step_index: number | null;
    skill_name: string;
    error: string;
    session_id: string;
}

const updateTaskStepBySession = (
    sessionId: string,
    taskId: string,
    stepIndex: number,
    updates: Partial<TaskStepInfo>
): void => {
    const tasks = taskManager.getTasksBySession(sessionId);
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

// Skill start handler
export const handleSkillStart = (event: any, t: (key: string) => string) => {
    const { task_id, step_index, skill_name, session_id } = event.payload;

    if (!session_id || !task_id || step_index === null) {
        console.warn("skill_callback_start missing required fields");
        return;
    }

    updateTaskStepBySession(session_id, task_id, step_index, {
        status: StepStatusEnum.Running,
        started_at: new Date().toISOString(),
        logs: [`▶️ ${t("skill.starting") || "Starting"}: ${skill_name}`],
    });
};

// Skill progress handler
export const handleSkillProgress = (event: any, t: (key: string) => string) => {
    const { task_id, step_index, progress, message, session_id } = event.payload;

    if (!session_id || !task_id || step_index === null) {
        console.warn("skill_callback_progress missing required fields");
        return;
    }

    updateTaskStepBySession(session_id, task_id, step_index, {
        progress: progress,
        progress_message: message,
        logs: [`📊 ${message} (${progress}%)`],
    });
};

// Skill complete handler
export const handleSkillComplete = (event: any, t: (key: string) => string) => {
    const { task_id, step_index, skill_name, result, session_id } = event.payload;

    if (!session_id || !task_id || step_index === null) {
        console.warn("skill_callback_complete missing required fields");
        return;
    }

    updateTaskStepBySession(session_id, task_id, step_index, {
        status: StepStatusEnum.Success,
        output: result,
        completed_at: new Date().toISOString(),
        logs: [`✅ ${t("skill.completed") || "Completed"}: ${skill_name}`],
    });
};

// Skill error handler
export const handleSkillError = (event: any, t: (key: string) => string) => {
    const { task_id, step_index, skill_name, error, session_id } = event.payload;

    if (!session_id || !task_id || step_index === null) {
        console.warn("skill_callback_error missing required fields");
        return;
    }

    updateTaskStepBySession(session_id, task_id, step_index, {
        status: StepStatusEnum.Failure,
        error: error,
        completed_at: new Date().toISOString(),
        logs: [`❌ ${t("skill.failed") || "Failed"}: ${skill_name} - ${error}`],
    });
};

// Setup skill event listeners
export const setupSkillEventListeners = async (
    t: (key: string) => string
): Promise<Array<() => void>> => {
    const unlistenFunctions: Array<() => void> = [];

    const unlistenStart = await listen("skill_callback_start", (event: any) => {
        handleSkillStart(event, t);
    });
    unlistenFunctions.push(unlistenStart);

    const unlistenProgress = await listen("skill_callback_progress", (event: any) => {
        handleSkillProgress(event, t);
    });
    unlistenFunctions.push(unlistenProgress);

    const unlistenComplete = await listen("skill_callback_complete", (event: any) => {
        handleSkillComplete(event, t);
    });
    unlistenFunctions.push(unlistenComplete);

    const unlistenError = await listen("skill_callback_error", (event: any) => {
        handleSkillError(event, t);
    });
    unlistenFunctions.push(unlistenError);

    return unlistenFunctions;
};

export const skillEventHandlers = {
    onStart: handleSkillStart,
    onProgress: handleSkillProgress,
    onComplete: handleSkillComplete,
    onError: handleSkillError,
};