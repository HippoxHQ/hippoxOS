
export interface TaskInfo {
    task_id: string;
    session_id: string;
    user_input: string;
    status: TaskStatusEnum;
    steps: TaskStepInfo[];
    final_output?: string;
    rawOutput?: string;
    error?: string;
    total_duration_ms?: number;
    total_steps?: number;
    created_at: string;
    updated_at: string;
    started_at?: string;
    completed_at?: string;
    duration_ms?: number;
    progress?: number;
    resume_data?: string | null;
    files?: UploadFile[];
}

export enum TaskStatusEnum {
    Pending = "pending",
    Running = "running",
    Paused = "paused",
    Completed = "completed",
    Cancelled = "cancelled",
    Failed = "failed",
    Timeout = "timeout",
}

export interface TaskStepInfo {
    step_index: number;
    step_name: string;
    status: StepStatusEnum;
    output?: string;
    error?: string;
    duration_ms?: number;
    parameters?: string;
}

export enum StepStatusEnum {
    Waiting = "WAITING",
    Running = "RUNNING",
    Success = "SUCCESS",
    Failure = "FAILURE",
    Skipped = "skipped",
    Paused = "paused",
    Cancelled = "cancelled",
}

export interface UploadFile {
    id: string;
    file: File;
    name: string;
    size: number;
    type: string;
    preview?: string;
    status: "uploading" | "success" | "error";
    progress?: number;
    path?: string;
}

