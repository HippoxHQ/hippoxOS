import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";

export function useDragAndDrop() {
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const [isDraggingOverInput, setIsDraggingOverInput] = useState(false);
  const [showDragCursor, setShowDragCursor] = useState(false);

  useEffect(() => {
    let unlistenDragEnter: (() => void) | undefined;
    let unlistenDragLeave: (() => void) | undefined;
    const setupDragListeners = async () => {
      unlistenDragEnter = await listen<any>("drag-enter", () => {
        setIsGlobalDragging(true);
        setShowDragCursor(true);
      });
      unlistenDragLeave = await listen<void>("drag-leave", () => {
        setIsGlobalDragging(false);
        setIsDraggingOverInput(false);
        setShowDragCursor(false);
      });
    };
    setupDragListeners();
    return () => {
      if (unlistenDragEnter) unlistenDragEnter();
      if (unlistenDragLeave) unlistenDragLeave();
    };
  }, []);

  useEffect(() => {
    let unlistenFileDrop: (() => void) | undefined;
    const setupFileDropListener = async () => {
      unlistenFileDrop = await listen<string[]>("file-drop", (event) => {
        if (event.payload && event.payload.length > 0) {
          const customEvent = new CustomEvent("files-dropped", {
            detail: { filePaths: event.payload },
          });
          window.dispatchEvent(customEvent);
        }
        setIsGlobalDragging(false);
        setIsDraggingOverInput(false);
        setShowDragCursor(false);
      });
    };
    setupFileDropListener();
    return () => {
      if (unlistenFileDrop) unlistenFileDrop();
    };
  }, []);

  useEffect(() => {
    let dragCounter = 0;
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (dragCounter === 1) {
        setIsGlobalDragging(true);
      }
    };
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    };
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) {
        setIsGlobalDragging(false);
        setIsDraggingOverInput(false);
      }
    };
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsGlobalDragging(false);
      setIsDraggingOverInput(false);
    };
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    document.addEventListener("dragenter", handleDragEnter);
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("dragleave", handleDragLeave);
    document.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      document.removeEventListener("dragenter", handleDragEnter);
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("dragleave", handleDragLeave);
      document.removeEventListener("drop", handleDrop);
    };
  }, []);

  return {
    isGlobalDragging,
    isDraggingOverInput,
    setIsDraggingOverInput,
    showDragCursor,
  };
}