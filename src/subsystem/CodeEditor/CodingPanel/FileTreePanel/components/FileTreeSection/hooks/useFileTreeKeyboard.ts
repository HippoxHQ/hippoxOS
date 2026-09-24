import { useEffect, useRef, useState } from "react";
import { FileNode } from "../../../types";
interface UseFileTreeKeyboardProps {
  selectedFiles: FileNode[];
  onDelete: (nodes: FileNode[]) => void;
  onPaste: (nodes: FileNode[]) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  isEditing: boolean;
}
export const useFileTreeKeyboard = ({
  selectedFiles,
  onDelete,
  onPaste,
  onSelectAll,
  onClearSelection,
  isEditing,
}: UseFileTreeKeyboardProps) => {
  const [clipboardNodes, setClipboardNodes] = useState<FileNode[]>([]);
  const callbacksRef = useRef({
    onDelete,
    onPaste,
    onSelectAll,
    onClearSelection,
  });
  useEffect(() => {
    callbacksRef.current = {
      onDelete,
      onPaste,
      onSelectAll,
      onClearSelection,
    };
  }, [onDelete, onPaste, onSelectAll, onClearSelection]);
  const selectedFilesRef = useRef(selectedFiles);
  useEffect(() => {
    selectedFilesRef.current = selectedFiles;
  }, [selectedFiles]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditing) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const currentSelectedFiles = selectedFilesRef.current;
      const callbacks = callbacksRef.current;
      // Delete / Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && currentSelectedFiles.length > 0) {
        e.preventDefault();
        callbacks.onDelete(currentSelectedFiles);
        return;
      }
      // Ctrl + C 
      if (isCtrlOrCmd && e.key === "c") {
        e.preventDefault();
        if (currentSelectedFiles.length > 0) {
          setClipboardNodes(currentSelectedFiles);
        }
        return;
      }
      // Ctrl + V 
      if (isCtrlOrCmd && e.key === "v") {
        e.preventDefault();
        if (clipboardNodes.length > 0) {
          callbacks.onPaste(clipboardNodes);
        }
        return;
      }
      // Ctrl + A
      if (isCtrlOrCmd && e.key === "a") {
        e.preventDefault();
        callbacks.onSelectAll();
        return;
      }
      // Escape
      if (e.key === "Escape") {
        callbacks.onClearSelection();
        return;
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditing, clipboardNodes]);
  return {
    clipboardNodes,
    setClipboardNodes,
  };
};