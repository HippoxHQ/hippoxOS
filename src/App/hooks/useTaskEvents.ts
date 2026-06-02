import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useTranslation } from "../../hooks/useTranslation";
import { taskManager } from "../../TaskManager";
import { TaskStatusEnum, ChatMessage, RoleEnum, MessageStatus, TaskInfo, Language } from "../../types/type";

export function useTaskEvents(language: Language) {
    const { t } = useTranslation(language);

    useEffect(() => {
        const unlistenStep = listen("task_step_update", (event: any) => {
            const {
                task_id,
                step_name,
                step_index,
                status,
                output,
                error,
                duration_ms,
                parameters,
                session_id,
            } = event.payload;

            if (!session_id) {
                console.warn("task_step_update missing session_id");
                return;
            }
            const tasksMap = taskManager.getTasksBySession(session_id);
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
                        ...(parameters !== undefined && { parameters }),
                    };
                } else {
                    steps.push({
                        step_index,
                        step_name,
                        status,
                        output,
                        error,
                        duration_ms,
                        parameters,
                    });
                }
                steps.sort((a, b) => a.step_index - b.step_index);
                const hasFailure = steps.some((s) => s.status === "FAILURE");
                const taskStatus = hasFailure ? TaskStatusEnum.Failed : task.status;
                taskManager.updateTaskBySession(session_id, task_id, {
                    steps: steps,
                    status: taskStatus,
                });
            }
        });

        const unlistenComplete = listen("task_complete", (event: any) => {
            const {
                task_id,
                final_output,
                total_duration_ms,
                total_steps,
                session_id,
            } = event.payload;
            if (!session_id) return;
            const messageId = `llm_${task_id}`;
            const assistantMessagesMap =
                taskManager.getAssistantMessagesBySession(session_id);
            const existingMsg = assistantMessagesMap?.get(messageId);

            if (!existingMsg) {
                const successMsg: ChatMessage = {
                    id: messageId,
                    role: RoleEnum.LLM,
                    content: t("chat.taskCompleted"),
                    timestamp: new Date().toISOString(),
                    status: MessageStatus.Completed,
                };
                taskManager.addAssistantMessageToSession(session_id, successMsg);
            } else {
                taskManager.updateAssistantMessageBySession(session_id, messageId, {
                    content: t("chat.taskCompleted"),
                    timestamp: new Date().toISOString(),
                    status: MessageStatus.Completed,
                });
            }
            const task = taskManager.getTaskBySession(session_id, task_id);
            if (task) {
                taskManager.updateTaskBySession(session_id, task_id, {
                    status: TaskStatusEnum.Completed,
                    final_output,
                    total_duration_ms,
                    total_steps,
                });
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
                taskManager.addTaskToSession(session_id, newTask);
            }
        });

        const unlistenFailed = listen("task_failed", (event: any) => {
            const { task_id, error, total_duration_ms, total_steps, session_id } =
                event.payload;
            if (!session_id) return;
            const messageId = `llm_${task_id}`;
            const assistantMessagesMap =
                taskManager.getAssistantMessagesBySession(session_id);
            const existingMsg = assistantMessagesMap?.get(messageId);
            if (!existingMsg) {
                const errorMsg: ChatMessage = {
                    id: messageId,
                    role: RoleEnum.LLM,
                    content: `❌ ${error}`,
                    timestamp: new Date().toISOString(),
                    status: MessageStatus.Failed,
                };
                taskManager.addAssistantMessageToSession(session_id, errorMsg);
            } else {
                taskManager.updateAssistantMessageBySession(session_id, messageId, {
                    content: `❌ ${error}`,
                    timestamp: new Date().toISOString(),
                    status: MessageStatus.Failed,
                });
            }
            const task = taskManager.getTaskBySession(session_id, task_id);
            if (task) {
                taskManager.updateTaskBySession(session_id, task_id, {
                    status: TaskStatusEnum.Failed,
                    final_output: error,
                    total_duration_ms,
                    total_steps,
                });
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
                taskManager.addTaskToSession(session_id, newTask);
            }
        });

        const unlistenPaused = listen("task_paused", (event: any) => {
            console.log("task_paused event received:", event.payload);
            const { task_id, checkpoint, total_duration_ms, total_steps, session_id } = event.payload;
            if (session_id && task_id) {
                taskManager.updateTaskBySession(session_id, task_id, {
                    status: TaskStatusEnum.Paused,
                    total_duration_ms,
                    resume_data: checkpoint
                });
            }
        });

        const unlistenResumed = listen("task_resumed", (event: any) => {
            console.log("task_resumed event received:", event.payload);
            const { task_id, session_id } = event.payload;
            if (session_id && task_id) {
                taskManager.updateTaskBySession(session_id, task_id, {
                    status: TaskStatusEnum.Running
                });
            }
        });

        return () => {
            unlistenStep.then((fn) => fn());
            unlistenComplete.then((fn) => fn());
            unlistenFailed.then((fn) => fn());
            unlistenPaused.then((fn) => fn());
            unlistenResumed.then((fn) => fn());
        };
    }, [language, t]);
}