use crate::commands::get_default_hippox;
use crate::state::AppState;
use crate::types::Role;
use memcontext::MemContext;
use tauri::State;

fn compress_history_to_natural_language(
    messages: &Vec<memcontext::Message>,
    session_name: &str,
) -> String {
    if messages.is_empty() {
        return format!("[Session '{}' has no conversation history]", session_name);
    }
    let user_messages: Vec<&memcontext::Message> = messages
        .iter()
        .filter(|msg| msg.role != Role::System.to_string())
        .collect();
    if user_messages.is_empty() {
        return format!(
            "[Session '{}' has no user conversation history]",
            session_name
        );
    }
    let mut result = format!(
        "Complete conversation history for session '{}':\n\n",
        session_name
    );
    result.push_str("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    for (idx, msg) in user_messages.iter().enumerate() {
        let role = if msg.role == Role::User.to_string() {
            format!("{}", Role::User)
        } else if msg.role == Role::LLM.to_string() {
            format!("{}", Role::LLM)
        } else {
            continue;
        };
        let time = msg.timestamp.format("%H:%M:%S").to_string();
        result.push_str(&format!("[{}] {}: {}\n\n", time, role, msg.content));
    }
    result.push_str("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    result.push_str("\nPlease remember the above conversation content and continue answering the user's questions based on this historical context.");
    result
}

pub async fn recall_and_compress_history(
    mem: &MemContext,
    session_id: &str,
    limit: Option<usize>,
) -> Result<String, String> {
    let limit = limit.unwrap_or(50);
    let all_msgs = mem
        .recall_time_series(session_id, 10000)
        .await
        .map_err(|e| e.to_string())?;
    let size = mem
        .session_size(session_id)
        .await
        .map_err(|e| format!("Failed to get session size: {}", e))?;
    if size == 0 {
        return Ok(format!("Session '{}' has no history", session_id));
    }
    let recall_result = mem
        .recall_time_series(session_id, limit)
        .await
        .map_err(|e| format!("Failed to recall session history: {}", e))?;
    if recall_result.messages.is_empty() {
        return Ok(format!("Session '{}' has no messages", session_id));
    }
    let compressed = compress_history_to_natural_language(&recall_result.messages, session_id);
    Ok(compressed)
}

pub async fn recall_session_context(
    mem: &MemContext,
    session_id: &str,
    limit: Option<usize>,
) -> Result<String, String> {
    let compressed_history = recall_and_compress_history(mem, session_id, limit).await?;
    let hippox = get_default_hippox().await?;
    let recall_prompt = format!(
        "[SYSTEM_CONTEXT_RECALL]\n\
         You are now restoring a previous conversation session.\n\
         Please carefully read and remember the following conversation history.\n\
         After reading, just reply with 'OK, I have recalled the conversation history.'\n\n\
         {}\n\n\
         [END_CONTEXT_RECALL]",
        compressed_history
    );
    let response = hippox
        .handle_natural_language(&recall_prompt, Some(session_id), None)
        .await;
    Ok(format!(
        "Session '{}' recalled. LLM response: {}",
        session_id,
        if response.len() > 100 {
            format!("{}...", &response[..100])
        } else {
            response
        }
    ))
}
