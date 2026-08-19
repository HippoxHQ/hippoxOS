import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
interface UseCodeEditorKeyboardProps {
  onCopy: () => void;
  onPaste: () => void;
  onSave: () => void;
  isEditing: boolean;
  editorRef?: React.RefObject<monaco.editor.IStandaloneCodeEditor | null>;
}
export const useCodeEditorKeyboard = ({
  onCopy,
  onPaste,
  onSave,
  isEditing,
  editorRef,
}: UseCodeEditorKeyboardProps) => {
  const callbacksRef = useRef({
    onCopy,
    onPaste,
    onSave,
  });
  useEffect(() => {
    callbacksRef.current = {
      onCopy,
      onPaste,
      onSave,
    };
  }, [onCopy, onPaste, onSave]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInMonaco = target.closest?.(".monaco-editor") !== undefined;
      const isInInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const callbacks = callbacksRef.current;
      if (isCtrlOrCmd && e.key === "s") {
        e.preventDefault();
        e.stopPropagation();
        callbacks.onSave();
        return;
      }
      if (isEditing) return;
      if (!isInMonaco && !isInInput) {
        if (isCtrlOrCmd && e.key === "c") {
          e.preventDefault();
          e.stopPropagation();
          callbacks.onCopy();
          return;
        }
        if (isCtrlOrCmd && e.key === "v") {
          e.preventDefault();
          e.stopPropagation();
          callbacks.onPaste();
          return;
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isEditing]);
};