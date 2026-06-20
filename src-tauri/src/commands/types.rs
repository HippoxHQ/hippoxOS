use hippox::Task;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskInfo {
    pub id: String,
    pub task_type: String,
    pub input: String,
    pub status: String,
    pub steps: Vec<StepInfo>,
    pub final_output: Option<String>,
    pub error: Option<String>,
    pub created_at: u64,
    pub started_at: Option<u64>,
    pub completed_at: Option<u64>,
    pub duration_ms: Option<u64>,
    pub progress: u8,
}

impl From<Task> for TaskInfo {
    fn from(task: Task) -> Self {
        let progress = task.progress();
        let steps = task
            .steps
            .iter()
            .map(|s| StepInfo {
                step_index: s.step_index,
                driver_name: s.driver_name.clone(),
                status: format!("{:?}", s.status).to_lowercase(),
                output: s.output.clone(),
                error: s.error.clone(),
                duration_ms: s.duration_ms,
            })
            .collect();
        TaskInfo {
            id: task.id,
            task_type: task.task_type,
            input: task.input,
            status: format!("{:?}", task.status).to_lowercase(),
            steps,
            final_output: task.final_output,
            error: task.error,
            created_at: task.created_at,
            started_at: task.started_at,
            completed_at: task.completed_at,
            duration_ms: task.duration_ms,
            progress,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StepInfo {
    pub step_index: usize,
    pub driver_name: String,
    pub status: String,
    pub output: Option<String>,
    pub error: Option<String>,
    pub duration_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskPoolStats {
    pub running_count: usize,
    pub pending_count: usize,
    pub total_count: usize,
    pub max_concurrent: usize,
}
