//! Scheduled task executor for user-defined cron tasks
//!
//! This module provides a unified abstraction for executing user-defined scheduled tasks.
//! It supports two types of tasks:
//! - Natural language tasks: read from natural_language.json
//! - Skill file tasks: read from SKILL.md
use crate::commands::cmd_get_disabled_drivers;
use crate::commands::scheduled_tasks::{get_task_dir, load_natural_language_content, load_skill_md_content, load_task_config, ScheduledTask};
use crate::hippox_core::get_default_hippox;
use hippox::HippoxResult;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
/// Represents a single scheduled task execution result
///
/// This struct mirrors the Task struct structure for consistency.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScheduledTaskExecutionResult {
    /// Task ID
    pub id: String,
    /// Task name
    pub name: String,
    /// Task type (natural_language or skill_file)
    pub task_type: String,
    /// Input content sent to LLM
    pub input: String,
    /// Execution status
    pub status: String,
    /// Final output from LLM
    pub final_output: Option<String>,
    /// Error message if execution failed
    pub error: Option<String>,
    /// Creation timestamp (when execution started)
    pub created_at: u64,
    /// Start timestamp
    pub started_at: Option<u64>,
    /// Completion timestamp
    pub completed_at: Option<u64>,
    /// Duration in milliseconds
    pub duration_ms: Option<u64>,
    /// Input token count
    pub input_token_count: u64,
    /// Output token count
    pub output_token_count: u64,
}
impl ScheduledTaskExecutionResult {
    /// Create a new execution result from a task
    pub fn new(task: &ScheduledTask, input: String) -> Self {
        let now = chrono::Utc::now().timestamp() as u64;
        Self {
            id: task.id.clone(),
            name: task.name.clone(),
            task_type: format!("{:?}", task.action_type).to_lowercase(),
            input,
            status: "running".to_string(),
            final_output: None,
            error: None,
            created_at: now,
            started_at: Some(now),
            completed_at: None,
            duration_ms: None,
            input_token_count: 0,
            output_token_count: 0,
        }
    }
    /// Mark the execution as completed successfully
    pub fn complete(&mut self, output: String, input_tokens: u64, output_tokens: u64) {
        self.status = "completed".to_string();
        self.final_output = Some(output);
        self.completed_at = Some(chrono::Utc::now().timestamp() as u64);
        self.duration_ms = Some(self.completed_at.unwrap() - self.started_at.unwrap_or(0));
        self.input_token_count = input_tokens;
        self.output_token_count = output_tokens;
    }
    /// Mark the execution as failed
    pub fn fail(&mut self, error: String, input_tokens: u64, output_tokens: u64) {
        self.status = "failed".to_string();
        self.error = Some(error);
        self.completed_at = Some(chrono::Utc::now().timestamp() as u64);
        self.duration_ms = Some(self.completed_at.unwrap() - self.started_at.unwrap_or(0));
        self.input_token_count = input_tokens;
        self.output_token_count = output_tokens;
    }
}
/// Represents a user-defined scheduled task
///
/// This struct encapsulates all data needed to execute a scheduled task.
/// It can be created from a task ID and provides methods to execute the task
/// and save the result.
#[derive(Debug, Clone)]
pub struct ScheduledTaskExecutor {
    /// The underlying scheduled task configuration
    pub task: ScheduledTask,
    /// Task directory path
    pub task_dir: PathBuf,
    /// Natural language content (if action type is NaturalLanguage)
    pub natural_language_content: Option<String>,
    /// Skill markdown content (if action type is SkillFile)
    pub skill_md_content: Option<String>,
}
impl ScheduledTaskExecutor {
    /// Create a new task executor from task ID
    ///
    /// # Arguments
    /// * `task_id` - The ID of the scheduled task
    ///
    /// # Returns
    /// * `Ok(ScheduledTaskExecutor)` if task exists and data can be loaded
    /// * `Err(String)` if task not found or data cannot be loaded
    pub async fn from_task_id(task_id: &str) -> Result<Self, String> {
        let task_dir = get_task_dir(task_id);
        if !task_dir.exists() {
            return Err(format!("Task directory not found: {}", task_id));
        }
        let task = load_task_config(task_id)?.ok_or_else(|| format!("Task config not found: {}", task_id))?;
        let natural_language_content = if task.action_type == crate::commands::scheduled_tasks::ActionType::NaturalLanguage {
            load_natural_language_content(task_id)?.map(|n| n.content)
        } else {
            None
        };
        let skill_md_content =
            if task.action_type == crate::commands::scheduled_tasks::ActionType::SkillFile { load_skill_md_content(task_id)? } else { None };
        Ok(Self { task, task_dir, natural_language_content, skill_md_content })
    }
    /// Get the content to be executed
    ///
    /// # Returns
    /// * The natural language content or skill markdown content
    pub fn get_content(&self) -> Option<String> {
        match self.task.action_type {
            crate::commands::scheduled_tasks::ActionType::NaturalLanguage => self.natural_language_content.clone(),
            crate::commands::scheduled_tasks::ActionType::SkillFile => self.skill_md_content.clone(),
        }
    }
    /// Execute the scheduled task and return the result
    ///
    /// This method sends the task content to the LLM and waits for completion.
    /// The result is saved to result.json in the task directory.
    ///
    /// # Returns
    /// * `Ok(ScheduledTaskExecutionResult)` if execution completed (even if LLM returned error)
    /// * `Err(String)` if task cannot be executed (no content, no hippox instance)
    pub async fn execute(&self) -> Result<ScheduledTaskExecutionResult, String> {
        let start_time = std::time::Instant::now();
        let content =
            self.get_content().ok_or_else(|| format!("No content found for task: {} (action_type: {:?})", self.task.id, self.task.action_type))?;
        let hippox = get_default_hippox().await?;
        let prompt = format!(
            "[Scheduled Task]\nTask Name: {}\nTask ID: {}\n\nContent:\n{}\n\nPlease execute this task and provide the result.",
            self.task.name,
            self.task.id,
            content.clone()
        );
        // Create result object
        let mut result = ScheduledTaskExecutionResult::new(&self.task, content.clone());
        // disabled drivers
        let disabled_drivers = cmd_get_disabled_drivers().await.ok();
        let disable_drivers_refs = disabled_drivers.as_ref().map(|v| v.iter().map(|s| s.as_str()).collect::<Vec<_>>());
        let workflow_mode = self.task.workflow_mode.clone().unwrap_or_else(|| "ReAct".to_string());
        let mode = match workflow_mode.as_str() {
            "ReAct" => hippox::WorkflowMode::ReAct,
            "Batch" => hippox::WorkflowMode::Batch,
            "Chain" => hippox::WorkflowMode::Chain,
            "PlanAndExecute" => hippox::WorkflowMode::PlanAndExecute,
            _ => hippox::WorkflowMode::ReAct,
        };
        // Execute the task and wait for completion
        let exec_result = hippox.execute(&prompt, mode, None, None, disable_drivers_refs).await;
        match exec_result {
            HippoxResult { data: Some(output), input_tokens, output_tokens, .. } => {
                result.complete(output, input_tokens, output_tokens);
            }
            HippoxResult { error: Some(err), input_tokens, output_tokens, .. } => {
                result.fail(err, input_tokens, output_tokens);
            }
            _ => {
                result.fail("Unknown error".to_string(), 0, 0);
            }
        }
        // Save result to result.json (overwrite, only keep latest)
        if let Err(e) = self.save_execution_result(&result).await {
            log::error!("Failed to save execution result for task {}: {}", self.task.id, e);
        }
        // Update task config with last execution info
        self.update_task_after_execution(&result).await?;
        Ok(result)
    }
    /// Save execution result to result.json (only keep latest)
    async fn save_execution_result(&self, result: &ScheduledTaskExecutionResult) -> Result<(), String> {
        let result_path = self.task_dir.join("result.json");
        let content = serde_json::to_string_pretty(result).map_err(|e| format!("Failed to serialize result: {}", e))?;
        fs::write(&result_path, content).map_err(|e| format!("Failed to write result file: {}", e))?;
        Ok(())
    }
    /// Update task configuration after execution
    async fn update_task_after_execution(&self, result: &ScheduledTaskExecutionResult) -> Result<(), String> {
        let mut task = self.task.clone();
        task.last_executed_at = Some(chrono::Local::now().to_rfc3339());
        task.execution_count += 1;
        task.last_status = if result.status == "completed" { Some("success".to_string()) } else { Some("failed".to_string()) };
        task.updated_at = chrono::Local::now().to_rfc3339();
        crate::commands::scheduled_tasks::save_task_config(&task)?;
        Ok(())
    }
    /// Get the latest execution result
    pub async fn get_latest_result(&self) -> Result<Option<ScheduledTaskExecutionResult>, String> {
        let result_path = self.task_dir.join("result.json");
        if !result_path.exists() {
            return Ok(None);
        }
        let content = fs::read_to_string(&result_path).map_err(|e| format!("Failed to read result file: {}", e))?;
        let result: ScheduledTaskExecutionResult = serde_json::from_str(&content).map_err(|e| format!("Failed to parse result file: {}", e))?;
        Ok(Some(result))
    }
}
