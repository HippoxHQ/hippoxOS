use serde_json::json;
use tauri::Emitter;
use tauri::{DragDropEvent, Window, WindowEvent};

pub fn handle_window_event(window: &Window, event: &WindowEvent) {
    match event {
        WindowEvent::DragDrop(drag_drop_event) => {
            handle_drag_drop_event(window, drag_drop_event);
        }
        _ => {}
    }
}

fn handle_drag_drop_event(window: &Window, event: &DragDropEvent) {
    match event {
        DragDropEvent::Enter { paths, position: _ } => {
            let file_count = paths.len();
            let _ = window.emit("drag-enter", json!({ "fileCount": file_count }));
        }
        DragDropEvent::Over { position: _ } => {}
        DragDropEvent::Leave => {
            let _ = window.emit("drag-leave", ());
        }
        DragDropEvent::Drop { paths, position: _ } => {
            let paths_json: Vec<String> = paths
                .iter()
                .filter(|p| !p.as_os_str().is_empty())
                .map(|p| p.to_string_lossy().to_string())
                .collect();

            if !paths_json.is_empty() {
                let _ = window.emit("file-drop", paths_json.clone());
            }
            let _ = window.emit("drag-leave", ());
        }
        _ => {}
    }
}
