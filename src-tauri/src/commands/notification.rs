use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;

use crate::commands::paths::{get_app_root_dir, get_settings_dir};

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

pub fn get_notifications_dir() -> PathBuf {
    get_app_root_dir().join("notifications")
}

fn ensure_notifications_dir() -> Result<(), String> {
    let dir = get_notifications_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create notifications directory: {}", e))?;
    }
    Ok(())
}

fn get_notification_file_path(notification_id: &str) -> PathBuf {
    get_notifications_dir().join(format!("{}.json", notification_id))
}

fn save_notification_to_file(notification: &SystemNotification) -> Result<(), String> {
    ensure_notifications_dir()?;
    let file_path = get_notification_file_path(&notification.id);
    let content = serde_json::to_string_pretty(notification)
        .map_err(|e| format!("Failed to serialize notification: {}", e))?;
    fs::write(&file_path, content).map_err(|e| format!("Failed to save notification: {}", e))?;
    Ok(())
}

fn delete_notification_file(notification_id: &str) -> Result<(), String> {
    let file_path = get_notification_file_path(notification_id);
    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("Failed to delete notification file: {}", e))?;
    }
    Ok(())
}

fn load_notification_from_file(
    notification_id: &str,
) -> Result<Option<SystemNotification>, String> {
    let file_path = get_notification_file_path(notification_id);
    if file_path.exists() {
        let content = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read notification file: {}", e))?;
        let notification: SystemNotification = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse notification: {}", e))?;
        Ok(Some(notification))
    } else {
        Ok(None)
    }
}

fn load_all_notifications() -> Result<Vec<SystemNotification>, String> {
    let dir = get_notifications_dir();
    if !dir.exists() {
        return Ok(vec![]);
    }

    let mut notifications = Vec::new();
    for entry in
        fs::read_dir(&dir).map_err(|e| format!("Failed to read notifications directory: {}", e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("json") {
            let content =
                fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))?;
            if let Ok(notification) = serde_json::from_str::<SystemNotification>(&content) {
                notifications.push(notification);
            }
        }
    }

    notifications.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(notifications)
}

#[tauri::command]
pub async fn cmd_notification_add(
    params: AddNotificationParams,
) -> Result<SystemNotification, String> {
    let notification = SystemNotification {
        id: Uuid::new_v4().to_string(),
        title: params.title,
        message: params.message,
        notification_type: params
            .notification_type
            .unwrap_or_else(|| "info".to_string()),
        timestamp: chrono::Local::now().to_rfc3339(),
        read: false,
        data: params.data,
    };

    save_notification_to_file(&notification)?;

    let all_notifications = load_all_notifications()?;
    if all_notifications.len() > MAX_NOTIFICATIONS {
        let to_delete = &all_notifications[MAX_NOTIFICATIONS..];
        for notification in to_delete {
            let _ = delete_notification_file(&notification.id);
        }
    }

    Ok(notification)
}

#[tauri::command]
pub async fn cmd_notification_get_all() -> Result<Vec<SystemNotification>, String> {
    load_all_notifications()
}

#[tauri::command]
pub async fn cmd_notification_get_by_id(id: String) -> Result<Option<SystemNotification>, String> {
    load_notification_from_file(&id)
}

#[tauri::command]
pub async fn cmd_notification_get_unread() -> Result<Vec<SystemNotification>, String> {
    let notifications = load_all_notifications()?;
    Ok(notifications.into_iter().filter(|n| !n.read).collect())
}

#[tauri::command]
pub async fn cmd_notification_get_unread_count() -> Result<usize, String> {
    let notifications = load_all_notifications()?;
    Ok(notifications.into_iter().filter(|n| !n.read).count())
}

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

#[tauri::command]
pub async fn cmd_notification_mark_all_as_read() -> Result<usize, String> {
    let notifications = load_all_notifications()?;
    let mut count = 0;
    for mut notification in notifications {
        if !notification.read {
            notification.read = true;
            save_notification_to_file(&notification)?;
            count += 1;
        }
    }
    Ok(count)
}

#[tauri::command]
pub async fn cmd_notification_delete(id: String) -> Result<bool, String> {
    delete_notification_file(&id)?;
    Ok(true)
}

#[tauri::command]
pub async fn cmd_notification_delete_read() -> Result<usize, String> {
    let notifications = load_all_notifications()?;
    let mut count = 0;
    for notification in notifications {
        if notification.read {
            let _ = delete_notification_file(&notification.id);
            count += 1;
        }
    }
    Ok(count)
}

#[tauri::command]
pub async fn cmd_notification_delete_by_type(notification_type: String) -> Result<usize, String> {
    let notifications = load_all_notifications()?;
    let mut count = 0;
    for notification in notifications {
        if notification.notification_type == notification_type {
            let _ = delete_notification_file(&notification.id);
            count += 1;
        }
    }
    Ok(count)
}

#[tauri::command]
pub async fn cmd_notification_clear_all() -> Result<usize, String> {
    let dir = get_notifications_dir();
    if !dir.exists() {
        return Ok(0);
    }

    let mut count = 0;
    for entry in fs::read_dir(&dir).map_err(|e| format!("Failed to read directory: {}", e))? {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        if path.is_file() && path.extension().and_then(|e| e.to_str()) == Some("json") {
            fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))?;
            count += 1;
        }
    }
    Ok(count)
}

#[tauri::command]
pub async fn cmd_notification_get_latest(
    limit: Option<usize>,
) -> Result<Vec<SystemNotification>, String> {
    let notifications = load_all_notifications()?;
    let limit = limit.unwrap_or(10);
    Ok(notifications.into_iter().take(limit).collect())
}

#[tauri::command]
pub async fn cmd_notification_get_by_date_range(
    start_date: String,
    end_date: String,
) -> Result<Vec<SystemNotification>, String> {
    let notifications = load_all_notifications()?;
    let start = chrono::DateTime::parse_from_rfc3339(&start_date)
        .map_err(|e| format!("Invalid start date: {}", e))?;
    let end = chrono::DateTime::parse_from_rfc3339(&end_date)
        .map_err(|e| format!("Invalid end date: {}", e))?;

    Ok(notifications
        .into_iter()
        .filter(|n| {
            if let Ok(ts) = chrono::DateTime::parse_from_rfc3339(&n.timestamp) {
                ts >= start && ts <= end
            } else {
                false
            }
        })
        .collect())
}

#[tauri::command]
pub async fn cmd_notification_info(
    title: String,
    message: String,
    data: Option<serde_json::Value>,
) -> Result<SystemNotification, String> {
    cmd_notification_add(AddNotificationParams {
        title,
        message,
        notification_type: Some("info".to_string()),
        data,
    })
    .await
}

#[tauri::command]
pub async fn cmd_notification_success(
    title: String,
    message: String,
    data: Option<serde_json::Value>,
) -> Result<SystemNotification, String> {
    cmd_notification_add(AddNotificationParams {
        title,
        message,
        notification_type: Some("success".to_string()),
        data,
    })
    .await
}

#[tauri::command]
pub async fn cmd_notification_warning(
    title: String,
    message: String,
    data: Option<serde_json::Value>,
) -> Result<SystemNotification, String> {
    cmd_notification_add(AddNotificationParams {
        title,
        message,
        notification_type: Some("warning".to_string()),
        data,
    })
    .await
}

#[tauri::command]
pub async fn cmd_notification_error(
    title: String,
    message: String,
    data: Option<serde_json::Value>,
) -> Result<SystemNotification, String> {
    cmd_notification_add(AddNotificationParams {
        title,
        message,
        notification_type: Some("error".to_string()),
        data,
    })
    .await
}
