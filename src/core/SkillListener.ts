import { listen } from "@tauri-apps/api/event";

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

// Skill progress handler
export const handleSkillProgress = (
    event: any,
    t: (key: string) => string
) => {
    const {
        task_id,
        step_index,
        progress,
        message,
        session_id,
    } = event.payload;
    if (!session_id) {
        console.warn("skill_callback_progress missing session_id");
        return;
    }
};

// Skill start handler
export const handleSkillStart = (
    event: any,
    t: (key: string) => string
) => {
    const {
        task_id,
        step_index,
        skill_name,
        session_id,
    } = event.payload;
    if (!session_id) {
        console.warn("skill_callback_start missing session_id");
        return;
    }
};

// Skill complete handler
export const handleSkillComplete = (
    event: any,
    t: (key: string) => string
) => {
    const {
        task_id,
        step_index,
        skill_name,
        result,
        session_id,
    } = event.payload;
    if (!session_id) {
        console.warn("skill_callback_complete missing session_id");
        return;
    }
};

// Skill error handler
export const handleSkillError = (
    event: any,
    t: (key: string) => string
) => {
    const {
        task_id,
        step_index,
        skill_name,
        error,
        session_id,
    } = event.payload;
    if (!session_id) {
        console.warn("skill_callback_error missing session_id");
        return;
    }
};

// Setup skill event listeners
export const setupSkillEventListeners = async (
    t: (key: string) => string
): Promise<Array<() => void>> => {
    const unlistenFunctions: Array<() => void> = [];

    // Listen for skill progress events
    const unlistenProgress = await listen("skill_callback_progress", (event: any) => {
        handleSkillProgress(event, t);
    });
    unlistenFunctions.push(unlistenProgress);

    // Listen for skill start events
    const unlistenStart = await listen("skill_callback_start", (event: any) => {
        handleSkillStart(event, t);
    });
    unlistenFunctions.push(unlistenStart);

    // Listen for skill complete events
    const unlistenComplete = await listen("skill_callback_complete", (event: any) => {
        handleSkillComplete(event, t);
    });
    unlistenFunctions.push(unlistenComplete);

    // Listen for skill error events
    const unlistenError = await listen("skill_callback_error", (event: any) => {
        handleSkillError(event, t);
    });
    unlistenFunctions.push(unlistenError);

    return unlistenFunctions;
};

// Export individual handlers for manual use
export const skillEventHandlers = {
    onProgress: handleSkillProgress,
    onStart: handleSkillStart,
    onComplete: handleSkillComplete,
    onError: handleSkillError,
};