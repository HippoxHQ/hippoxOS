use crate::types::Role;
use memcontext::MemContext;
pub(crate) struct Context;
impl Context {
    pub async fn new() -> Result<MemContext, String> {
        use memcontext::{DatabaseType, MemContext, MemContextConfig, StorageType};
        let db_path = crate::commands::get_data_dir().join("sessions.db").to_string_lossy().to_string();
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
/// Get conversation history for a session (excluding system messages)
pub async fn get_conversation_history(mem: &MemContext, session_id: &str, limit: usize) -> Result<String, String> {
    match mem.recall_time_series(session_id, limit).await {
        Ok(result) => {
            let filtered: Vec<memcontext::Message> = result.messages.into_iter().filter(|msg| msg.role != Role::System.to_string()).collect();
            if filtered.is_empty() {
                return Ok(String::new());
            }
            let mut history = String::from("## Previous conversation history\n\n");
            for msg in filtered {
                let role = if msg.role == Role::User.to_string() {
                    "User"
                } else if msg.role == Role::LLM.to_string() {
                    "Assistant"
                } else {
                    continue;
                };
                history.push_str(&format!("{}: {}\n\n", role, msg.content));
            }
            Ok(history)
        }
        Err(e) => {
            log::error!("Failed to recall history: {}", e);
            Ok(String::new())
        }
    }
}
/// Store a user message in conversation history
pub async fn store_user_message(mem: &MemContext, session_id: &str, content: &str) -> Result<(), String> {
    mem.store_message(session_id.to_string(), Role::User.to_string(), content.to_string()).await.map_err(|e| e.to_string())
}
/// Store an assistant message in conversation history
pub async fn store_assistant_message(mem: &MemContext, session_id: &str, content: &str) -> Result<(), String> {
    mem.store_message(session_id.to_string(), Role::LLM.to_string(), content.to_string()).await.map_err(|e| e.to_string())
}
