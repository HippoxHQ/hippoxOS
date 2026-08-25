use crate::commands::paths::{get_app_root_dir, get_settings_dir};
use crate::commons::files::FileUtils;
use log::error;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;
const MAX_NOTIFICATIONS: usize = 100;
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemNotification {
    pub id: String,
    pub title: String,
    pub message: String,
    #[serde(rename = "type")]
    pub notification_type: String,
    pub timestamp: String,
    pub read: bool,
    pub data: Option<serde_json::Value>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AddNotificationParams {
    pub title: String,
    pub message: String,
    #[serde(rename = "type")]
    pub notification_type: Option<String>,
    pub data: Option<serde_json::Value>,
}
/// Get the notifications directory path
pub fn get_notifications_dir() -> PathBuf {
    let dir = get_app_root_dir().join("notifications");
    // Ensure directory exists
    if !dir.exists() {
        let _ = FileUtils::ensure_dir(&dir);
    }
    dir
}
/// Get the file path for a specific notification
fn get_notification_file_path(notification_id: &str) -> PathBuf {
    get_notifications_dir().join(format!("{}.json", notification_id))
}
/// Save a notification to file using FileUtils
fn save_notification_to_file(notification: &SystemNotification) -> Result<(), String> {
    // Ensure directory exists
    let dir = get_notifications_dir();
    if let Err(e) = FileUtils::ensure_dir(&dir) {
        return Err(format!("Failed to ensure notifications directory: {:?}", e));
    }
    let file_path = get_notification_file_path(&notification.id);
    let content = serde_json::to_string_pretty(notification).map_err(|e| format!("Failed to serialize notification: {:?}", e))?;
    // Use FileUtils to write file
    FileUtils::write_file_string(&file_path, &content).map_err(|e| format!("Failed to save notification: {:?}", e))?;
    Ok(())
}
/// Delete a notification file using FileUtils
fn delete_notification_file(notification_id: &str) -> Result<(), String> {
    let file_path = get_notification_file_path(notification_id);
    if FileUtils::file_exists(&file_path) {
        FileUtils::remove_file(&file_path).map_err(|e| format!("Failed to delete notification file: {:?}", e))?;
    }
    Ok(())
}
/// Load a single notification from file using FileUtils
fn load_notification_from_file(notification_id: &str) -> Result<Option<SystemNotification>, String> {
    let file_path = get_notification_file_path(notification_id);
    if !FileUtils::file_exists(&file_path) {
        return Ok(None);
    }
    // Use FileUtils to read file
    let content = FileUtils::read_file_to_string(&file_path).map_err(|e| format!("Failed to read notification file: {:?}", e))?;
    let notification: SystemNotification = serde_json::from_str(&content).map_err(|e| format!("Failed to parse notification: {}", e))?;
    Ok(Some(notification))
}
/// Load all notifications from directory using FileUtils
/// Skips files that cannot be read (corrupted or in-use)
fn load_all_notifications() -> Result<Vec<SystemNotification>, String> {
    let dir = get_notifications_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut notifications = Vec::new();
    // Use FileUtils to read directory entries
    let entries = match FileUtils::read_dir_entries(&dir) {
        Ok(e) => e,
        Err(e) => {
            // If directory read fails, return empty list
            error!("[Notification] Failed to read directory: {:?}", e);
            return Ok(vec![]);
        }
    };
    for entry in entries {
        let path = entry.path();
        // Only process JSON files
        if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("json") {
            // Try to read and parse the file, skip if fails
            match FileUtils::read_file_to_string(&path) {
                Ok(content) => {
                    match serde_json::from_str::<SystemNotification>(&content) {
                        Ok(notification) => {
                            notifications.push(notification);
                        }
                        Err(e) => {
                            // Log parse error but continue with other files
                            error!("[Notification] Failed to parse {}: {}", path.display(), e);
                            continue;
                        }
                    }
                }
                Err(e) => {
                    // Log read error but continue with other files
                    error!("[Notification] Failed to read {}: {:?}", path.display(), e);
                    continue;
                }
            }
        }
    }
    // Sort by timestamp descending (newest first)
    notifications.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(notifications)
}
/// Add a new notification
#[tauri::command]
pub async fn cmd_notification_add(params: AddNotificationParams) -> Result<SystemNotification, String> {
    let notification = SystemNotification {
        id: Uuid::new_v4().to_string(),
        title: params.title,
        message: params.message,
        notification_type: params.notification_type.unwrap_or_else(|| "info".to_string()),
        timestamp: chrono::Local::now().to_rfc3339(),
        read: false,
        data: params.data,
    };
    // Save the notification
    save_notification_to_file(&notification)?;
    // Enforce maximum notification limit
    let all_notifications = load_all_notifications()?;
    if all_notifications.len() > MAX_NOTIFICATIONS {
        let to_delete = &all_notifications[MAX_NOTIFICATIONS..];
        for notif in to_delete {
            let _ = delete_notification_file(&notif.id);
        }
    }
    Ok(notification)
}
/// Get all notifications
#[tauri::command]
pub async fn cmd_notification_get_all() -> Result<Vec<SystemNotification>, String> {
    load_all_notifications()
}
/// Get notification by ID
#[tauri::command]
pub async fn cmd_notification_get_by_id(id: String) -> Result<Option<SystemNotification>, String> {
    load_notification_from_file(&id)
}
/// Get all unread notifications
#[tauri::command]
pub async fn cmd_notification_get_unread() -> Result<Vec<SystemNotification>, String> {
    let notifications = load_all_notifications()?;
    Ok(notifications.into_iter().filter(|n| !n.read).collect())
}
/// Get unread notification count
#[tauri::command]
pub async fn cmd_notification_get_unread_count() -> Result<usize, String> {
    let notifications = load_all_notifications()?;
    Ok(notifications.into_iter().filter(|n| !n.read).count())
}
/// Mark a notification as read
#[tauri::command]
pub async fn cmd_notification_mark_as_read(id: String) -> Result<bool, String> {
    if let Some(mut notification) = load_notification_from_file(&id)? {
        if !notification.read {
            notification.read = true;
            save_notification_to_file(&notification)?;
            Ok(true)
        } else {
            Ok(false)
        }
    } else {
        Ok(false)
    }
}
/// Mark all notifications as read
#[tauri::command]
pub async fn cmd_notification_mark_all_as_read() -> Result<usize, String> {
    let notifications = load_all_notifications()?;
    let mut count = 0;
    for mut notification in notifications {
        if !notification.read {
            notification.read = true;
            if let Err(e) = save_notification_to_file(&notification) {
                error!("[Notification] Failed to save notification {}: {}", notification.id, e);
                // Continue with others even if one fails
                continue;
            }
            count += 1;
        }
    }
    Ok(count)
}
/// Delete a notification
#[tauri::command]
pub async fn cmd_notification_delete(id: String) -> Result<bool, String> {
    delete_notification_file(&id)?;
    Ok(true)
}
/// Delete all read notifications
#[tauri::command]
pub async fn cmd_notification_delete_read() -> Result<usize, String> {
    let notifications = load_all_notifications()?;
    let mut count = 0;
    for notification in notifications {
        if notification.read {
            if let Err(e) = delete_notification_file(&notification.id) {
                error!("[Notification] Failed to delete {}: {}", notification.id, e);
                continue;
            }
            count += 1;
        }
    }
    Ok(count)
}
/// Delete notifications by type
#[tauri::command]
pub async fn cmd_notification_delete_by_type(notification_type: String) -> Result<usize, String> {
    let notifications = load_all_notifications()?;
    let mut count = 0;
    for notification in notifications {
        if notification.notification_type == notification_type {
            if let Err(e) = delete_notification_file(&notification.id) {
                error!("[Notification] Failed to delete {}: {}", notification.id, e);
                continue;
            }
            count += 1;
        }
    }
    Ok(count)
}
/// Clear all notifications
#[tauri::command]
pub async fn cmd_notification_clear_all() -> Result<usize, String> {
    let dir = get_notifications_dir();
    if !dir.exists() {
        return Ok(0);
    }
    let mut count = 0;
    // Use FileUtils to read directory
    let entries = match FileUtils::read_dir(&dir) {
        Ok(e) => e,
        Err(e) => {
            error!("[Notification] Failed to read directory: {:?}", e);
            return Ok(0);
        }
    };
    for path in entries {
        if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("json") {
            if let Err(e) = FileUtils::remove_file(&path) {
                error!("[Notification] Failed to delete {}: {:?}", path.display(), e);
                continue;
            }
            count += 1;
        }
    }
    Ok(count)
}
/// Get latest N notifications
#[tauri::command]
pub async fn cmd_notification_get_latest(limit: Option<usize>) -> Result<Vec<SystemNotification>, String> {
    let notifications = load_all_notifications()?;
    let limit = limit.unwrap_or(10);
    Ok(notifications.into_iter().take(limit).collect())
}
/// Get notifications by date range
#[tauri::command]
pub async fn cmd_notification_get_by_date_range(start_date: String, end_date: String) -> Result<Vec<SystemNotification>, String> {
    let notifications = load_all_notifications()?;
    let start = chrono::DateTime::parse_from_rfc3339(&start_date).map_err(|e| format!("Invalid start date: {}", e))?;
    let end = chrono::DateTime::parse_from_rfc3339(&end_date).map_err(|e| format!("Invalid end date: {}", e))?;
    Ok(notifications
        .into_iter()
        .filter(|n| if let Ok(ts) = chrono::DateTime::parse_from_rfc3339(&n.timestamp) { ts >= start && ts <= end } else { false })
        .collect())
}
/// Add info notification (convenience wrapper)
#[tauri::command]
pub async fn cmd_notification_info(title: String, message: String, data: Option<serde_json::Value>) -> Result<SystemNotification, String> {
    cmd_notification_add(AddNotificationParams { title, message, notification_type: Some("info".to_string()), data }).await
}
/// Add success notification (convenience wrapper)
#[tauri::command]
pub async fn cmd_notification_success(title: String, message: String, data: Option<serde_json::Value>) -> Result<SystemNotification, String> {
    cmd_notification_add(AddNotificationParams { title, message, notification_type: Some("success".to_string()), data }).await
}
/// Add warning notification (convenience wrapper)
#[tauri::command]
pub async fn cmd_notification_warning(title: String, message: String, data: Option<serde_json::Value>) -> Result<SystemNotification, String> {
    cmd_notification_add(AddNotificationParams { title, message, notification_type: Some("warning".to_string()), data }).await
}
/// Add error notification (convenience wrapper)
#[tauri::command]
pub async fn cmd_notification_error(title: String, message: String, data: Option<serde_json::Value>) -> Result<SystemNotification, String> {
    cmd_notification_add(AddNotificationParams { title, message, notification_type: Some("error".to_string()), data }).await
}
