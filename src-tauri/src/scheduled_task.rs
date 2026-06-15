use tokio::time::{interval, Duration};

pub async fn scheduled_task_persist_task_pool() {
    tokio::spawn(async {
        let mut interval = interval(Duration::from_secs(30 * 60));
        match crate::commands::task_pool::cmd_task_pool_persist().await {
            Ok(result) => {
                println!(
                    "[Auto Persist] Task pool persisted successfully at: {}",
                    chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
                );
            }
            Err(e) => {
                eprintln!("[Auto Persist] Failed to persist task pool: {}", e);
            }
        }
        loop {
            interval.tick().await;
            match crate::commands::task_pool::cmd_task_pool_persist().await {
                Ok(result) => {
                    println!(
                        "[Auto Persist] Task pool persisted successfully at: {}",
                        chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
                    );
                }
                Err(e) => {
                    eprintln!("[Auto Persist] Failed to persist task pool: {}", e);
                }
            }
        }
    });
}
