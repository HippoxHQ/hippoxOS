use crate::commands::scheduled_tasks::{load_task_config, ScheduledTask};
use crate::commands::{Frequency, IntervalUnit, ScheduleConfig};
use crate::scheduled_task::ScheduledTaskExecutor;
use chrono::{Offset, Timelike};
use cron::Schedule;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;
use tokio::time;

pub type TaskPool = Arc<Mutex<HashMap<String, TaskScheduler>>>;

#[derive(Debug)]
pub struct TaskScheduler {
    pub task_id: String,
    pub task: ScheduledTask,
    handle: Arc<Mutex<Option<JoinHandle<()>>>>,
}

impl TaskScheduler {
    pub fn new(task: ScheduledTask) -> Self {
        Self {
            task_id: task.id.clone(),
            task,
            handle: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn start(&mut self, pool: TaskPool) -> Result<(), String> {
        let mut handle_lock = self.handle.lock().await;
        if handle_lock.is_some() {
            return Ok(());
        }

        if !self.task.enabled || self.task.completed {
            return Ok(());
        }

        let task = self.task.clone();
        let pool_clone = pool.clone();

        let handle = tokio::spawn(async move {
            match parse_schedule(&task) {
                Ok(ScheduleOrInterval::Cron(schedule)) => {
                    let mut interval = time::interval(Duration::from_secs(1));
                    let mut upcoming = schedule.upcoming(chrono::Utc);
                    if let Some(next) = upcoming.next() {
                    } else {
                    }
                    loop {
                        interval.tick().await;
                        if let Some(next_time) = upcoming.next() {
                            let now = chrono::Utc::now();
                            if now >= next_time {
                                if let Err(e) = execute_scheduled_task(&task).await {}
                                let _ = update_task_execution_time(&task.id).await;
                            }
                        }
                        let should_stop = {
                            let pool_guard = pool_clone.lock().await;
                            pool_guard
                                .get(&task.id)
                                .map(|s| !s.task.enabled || s.task.completed)
                                .unwrap_or(true)
                        };
                        if should_stop {
                            break;
                        }
                    }
                }
                Ok(ScheduleOrInterval::Interval {
                    duration,
                    value,
                    unit,
                }) => {
                    let mut interval_timer = time::interval(duration);
                    interval_timer.tick().await;
                    if let Err(e) = execute_scheduled_task(&task).await {}
                    let _ = update_task_execution_time(&task.id).await;
                    let mut tick_count = 0;
                    loop {
                        interval_timer.tick().await;
                        tick_count += 1;
                        if let Err(e) = execute_scheduled_task(&task).await {}
                        let _ = update_task_execution_time(&task.id).await;
                        let should_stop = {
                            let pool_guard = pool_clone.lock().await;
                            let task_in_pool = pool_guard.get(&task.id);
                            match task_in_pool {
                                Some(s) => !s.task.enabled || s.task.completed,
                                None => false,
                            }
                        };
                        if should_stop {
                            break;
                        } else {
                        }
                    }
                }
                Ok(ScheduleOrInterval::Fixed { hour, minute }) => {
                    let now = chrono::Local::now();
                    let mut next = now
                        .with_hour(hour)
                        .unwrap()
                        .with_minute(minute)
                        .unwrap()
                        .with_second(0)
                        .unwrap()
                        .with_nanosecond(0)
                        .unwrap();
                    if next <= now {
                        next = next + chrono::Duration::days(1);
                    }
                    let duration = (next - now).to_std().unwrap();
                    tokio::time::sleep(duration).await;
                    loop {
                        if let Err(e) = execute_scheduled_task(&task).await {}
                        let _ = update_task_execution_time(&task.id).await;
                        tokio::time::sleep(Duration::from_secs(24 * 3600)).await;
                    }
                }
                Err(e) => {
                    return;
                }
            }
        });
        *handle_lock = Some(handle);
        Ok(())
    }

    pub async fn stop(&mut self) {
        let mut handle_lock = self.handle.lock().await;
        if let Some(handle) = handle_lock.take() {
            handle.abort();
        }
    }

    pub async fn update_task(&mut self, new_task: ScheduledTask) {
        self.stop().await;
        self.task = new_task;
    }
}

pub enum ScheduleOrInterval {
    Cron(Schedule),
    Interval {
        duration: Duration,
        value: u32,
        unit: IntervalUnit,
    },
    Fixed {
        hour: u32,
        minute: u32,
    },
}

fn parse_schedule(task: &ScheduledTask) -> Result<ScheduleOrInterval, String> {
    match &task.schedule_config {
        ScheduleConfig::Fixed(fixed) => {
            let time_parts: Vec<&str> = fixed.time.split(':').collect();
            let hour: u32 = time_parts.get(0).unwrap_or(&"0").parse().unwrap_or(0);
            let minute: u32 = time_parts.get(1).unwrap_or(&"0").parse().unwrap_or(0);
            Ok(ScheduleOrInterval::Fixed { hour, minute })
        }
        ScheduleConfig::Interval(interval) => {
            let duration = match interval.unit {
                IntervalUnit::Second => Duration::from_secs(interval.value as u64),
                IntervalUnit::Minute => Duration::from_secs(interval.value as u64 * 60),
                IntervalUnit::Hour => Duration::from_secs(interval.value as u64 * 3600),
                IntervalUnit::Day => Duration::from_secs(interval.value as u64 * 86400),
            };
            Ok(ScheduleOrInterval::Interval {
                duration,
                value: interval.value,
                unit: interval.unit.clone(),
            })
        }
    }
}

async fn update_task_execution_time(task_id: &str) -> Result<(), String> {
    if let Ok(Some(mut task)) = load_task_config(task_id) {
        task.last_executed_at = Some(chrono::Local::now().to_rfc3339());
        task.execution_count += 1;
        crate::commands::scheduled_tasks::save_task_config(&task)?;
    }
    Ok(())
}

pub async fn init_task_pool() -> TaskPool {
    let pool = Arc::new(Mutex::new(HashMap::new()));
    load_all_tasks_to_pool(pool.clone()).await;
    pool
}

async fn load_all_tasks_to_pool(pool: TaskPool) {
    let tasks_dir = crate::commands::scheduled_tasks::get_scheduled_tasks_root_dir();
    if !tasks_dir.exists() {
        return;
    }
    let mut pool_guard = pool.lock().await;
    if let Ok(entries) = std::fs::read_dir(&tasks_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let task_id = path
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                if let Ok(Some(task)) = load_task_config(&task_id) {
                    if task.enabled && !task.completed {
                        let mut scheduler = TaskScheduler::new(task);
                        if let Err(e) = scheduler.start(pool.clone()).await {}
                        pool_guard.insert(task_id, scheduler);
                    }
                }
            }
        }
    }
}

pub async fn add_task_to_pool(pool: TaskPool, task: ScheduledTask) -> Result<(), String> {
    let mut pool_guard = pool.lock().await;
    if let Some(existing) = pool_guard.get_mut(&task.id) {
        existing.stop().await;
        existing.update_task(task.clone()).await;
        if task.enabled && !task.completed {
            existing.start(pool.clone()).await?;
        }
    } else {
        let mut scheduler = TaskScheduler::new(task.clone());
        if task.enabled && !task.completed {
            scheduler.start(pool.clone()).await?;
        }
        pool_guard.insert(task.id.clone(), scheduler);
    }
    Ok(())
}

pub async fn remove_task_from_pool(pool: TaskPool, task_id: &str) {
    let mut pool_guard = pool.lock().await;
    if let Some(mut scheduler) = pool_guard.remove(task_id) {
        scheduler.stop().await;
    }
}

pub async fn toggle_task_in_pool(
    pool: TaskPool,
    task_id: &str,
    enabled: bool,
) -> Result<(), String> {
    let mut pool_guard = pool.lock().await;
    if let Some(scheduler) = pool_guard.get_mut(task_id) {
        if enabled && !scheduler.task.completed {
            scheduler.stop().await;
            scheduler.task.enabled = enabled;
            scheduler.start(pool.clone()).await?;
        } else {
            scheduler.stop().await;
            scheduler.task.enabled = enabled;
        }
    } else if enabled {
        if let Ok(Some(task)) = load_task_config(task_id) {
            if task.enabled && !task.completed {
                let mut scheduler = TaskScheduler::new(task.clone());
                scheduler.start(pool.clone()).await?;
                pool_guard.insert(task_id.to_string(), scheduler);
            } else {
                let scheduler = TaskScheduler::new(task);
                pool_guard.insert(task_id.to_string(), scheduler);
            }
        } else {
            return Err(format!("Task {} not found on disk", task_id));
        }
    }
    Ok(())
}

pub async fn update_task_in_pool(pool: TaskPool, task: ScheduledTask) -> Result<(), String> {
    add_task_to_pool(pool, task).await
}

#[derive(Clone)]
pub struct CronJob {
    pub id: String,
    pub name: String,
    pub cron_expr: String,
    pub callback: Arc<dyn Fn() + Send + Sync>,
}

impl CronJob {
    pub fn new(
        id: &str,
        name: &str,
        cron_expr: &str,
        callback: Arc<dyn Fn() + Send + Sync>,
    ) -> Self {
        Self {
            id: id.to_string(),
            name: name.to_string(),
            cron_expr: cron_expr.to_string(),
            callback,
        }
    }
}

pub struct CronScheduler {
    pub job_id: String,
    pub job: CronJob,
    handle: Arc<Mutex<Option<JoinHandle<()>>>>,
}

impl CronScheduler {
    pub fn new(job: CronJob) -> Self {
        Self {
            job_id: job.id.clone(),
            job,
            handle: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn start(&mut self, pool: TaskPool) -> Result<(), String> {
        self.stop().await;
        let mut handle_lock = self.handle.lock().await;
        if handle_lock.is_some() {
            return Ok(());
        }
        let job = self.job.clone();
        let job_id = job.id.clone();
        let pool_clone = pool.clone();
        let schedule = match Schedule::from_str(&job.cron_expr) {
            Ok(s) => s,
            Err(e) => return Err(format!("Invalid cron expression: {}", e)),
        };
        let handle = tokio::spawn(async move {
            let mut interval = time::interval(Duration::from_secs(1));
            let mut upcoming = schedule.upcoming(chrono::Utc);
            loop {
                interval.tick().await;
                if let Some(next_time) = upcoming.next() {
                    let now = chrono::Utc::now();
                    if now >= next_time {
                        (job.callback)();
                    }
                }
                let should_stop = {
                    let pool_guard = pool_clone.lock().await;
                    pool_guard.get(&job_id).is_none()
                };
                if should_stop {
                    break;
                }
            }
        });
        *handle_lock = Some(handle);
        Ok(())
    }

    pub async fn stop(&mut self) {
        let mut handle_lock = self.handle.lock().await;
        if let Some(handle) = handle_lock.take() {
            handle.abort();
        }
    }
}

pub async fn add_cron_job_to_pool(pool: TaskPool, job: CronJob) -> Result<(), String> {
    let mut pool_guard = pool.lock().await;
    if let Some(existing) = pool_guard.get_mut(&job.id) {
        existing.stop().await;
    }
    let mut scheduler = CronScheduler::new(job);
    let virtual_task = ScheduledTask {
        id: scheduler.job_id.clone(),
        name: scheduler.job.name.clone(),
        schedule_type: crate::commands::scheduled_tasks::ScheduleType::Fixed,
        schedule_config: crate::commands::scheduled_tasks::ScheduleConfig::Fixed(
            crate::commands::scheduled_tasks::FixedScheduleConfig {
                frequency: crate::commands::scheduled_tasks::Frequency::Daily,
                time: "00:00".to_string(),
                day_of_week: None,
                day_of_month: None,
                date: None,
            },
        ),
        enabled: true,
        action_type: crate::commands::scheduled_tasks::ActionType::NaturalLanguage,
        created_at: chrono::Local::now().to_rfc3339(),
        updated_at: chrono::Local::now().to_rfc3339(),
        last_executed_at: None,
        next_execution_at: None,
        completed: false,
        execution_count: 0,
        last_status: None,
    };
    let mut task_scheduler = TaskScheduler::new(virtual_task);
    if let Err(e) = scheduler.start(pool.clone()).await {
        return Err(e);
    }
    pool_guard.insert(scheduler.job_id.clone(), task_scheduler);
    Ok(())
}

pub async fn remove_cron_job_from_pool(pool: TaskPool, job_id: &str) {
    remove_task_from_pool(pool, job_id).await;
}

// Modify the execute_scheduled_task function to use the new executor
async fn execute_scheduled_task(task: &ScheduledTask) -> Result<(), String> {
    let executor = ScheduledTaskExecutor::from_task_id(&task.id).await?;
    let result = executor.execute().await?;
    Ok(())
}
