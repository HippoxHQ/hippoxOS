use crate::scheduled_task_pool::{add_cron_job_to_pool, CronJob, TaskPool};
use std::sync::Arc;
 pub async fn scheduled_task_persist_task_pool(pool: TaskPool) {
    let persist_job = CronJob::new(
        "system.task_pool_persist",
        "Task Pool Persist",
        "0 */30 * * * *",
        Arc::new(|| {
            let rt = tokio::runtime::Runtime::new().unwrap();
            match rt.block_on(crate::commands::task_pool::cmd_task_pool_persist()) {
                Ok(result) => {
                    eprintln!("[Cron Job] Task pool persisted successfully");
                }
                Err(e) => {
                    eprintln!("[Cron Job] Failed to persist task pool: {}", e);
                }
            }
        }),
    );
    if let Err(e) = add_cron_job_to_pool(pool, persist_job).await {
        eprintln!("[Cron Job] Failed to register persist task: {}", e);
    } else {
        println!("[Cron Job] Registered task pool persist task to scheduler");
    }
}
 