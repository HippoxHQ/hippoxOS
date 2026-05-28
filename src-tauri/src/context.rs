use memcontext::MemContext;

pub(crate) struct Context;

impl Context {
    pub async fn new() -> Result<MemContext, String> {
        use memcontext::{DatabaseType, MemContext, MemContextConfig, StorageType};
        let db_path = crate::commands::get_data_dir()
            .join("sessions.db")
            .to_string_lossy()
            .to_string();
        let config = MemContextConfig {
            storage_type: StorageType::DB,
            db_type: Some(DatabaseType::SQLite),
            sqlite_storage_path: Some(db_path),
            local_storage_path: None,
            lancedb_storage_path: None,
        };
        MemContext::new(config).await.map_err(|e| e.to_string())
    }
}
