import React, { useState } from "react";
import { Download, Check, Loader2 } from "lucide-react";
import { filesCommands } from "../../../../../command/files";
import { showToast, ToastType } from "../../../../../components/Toast";
interface ExportButtonProps {
  /** File name to save as */
  fileName: string;
  /** Content to save - can be string, Blob, or async function that returns string or Blob */
  content: string | Blob | (() => string | Blob) | (() => Promise<string | Blob>);
  /** Content type: text or binary */
  contentType?: "text" | "blob";
  /** File extension */
  extension?: string;
  /** MIME type */
  mimeType?: string;
  /** Callback after save */
  onSaved?: (path: string) => void;
  /** i18n translate function */
  t: (key: string) => string;
  /** Size of the icon */
  iconSize?: number;
  /** Button label */
  label?: string;
}
const ExportButton: React.FC<ExportButtonProps> = ({ fileName, content, contentType = "text", extension = "txt", mimeType = "text/plain", onSaved, t, iconSize = 16, label }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  // Detect language
  const isZh = t("i18n") === "zh";
  // Resolve content - handles string, Blob, function, or async function
  const resolveContent = async (): Promise<string | Blob> => {
    if (typeof content === "function") {
      const result = content();
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    }
    return content;
  };
  const handleSave = async (e: React.MouseEvent) => {
    // Prevent event bubbling to parent elements
    e.stopPropagation();
    e.preventDefault();
    setIsSaving(true);
    try {
      // Resolve content (handle async functions)
      const resolvedContent = await resolveContent();
      // Open save dialog
      const result = await filesCommands.saveFileDialog({
        title: isZh ? "保存文件" : "Save File",
        fileName: fileName,
        extension: extension,
      });
      // Check if dialog was cancelled or no file path
      if (result.canceled || !result.file_path) {
        setIsSaving(false);
        return;
      }
      const filePath = result.file_path;
      // Write content to file
      if (resolvedContent instanceof Blob) {
        const arrayBuffer = await resolvedContent.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        await filesCommands.writeBinaryFile(filePath, uint8Array);
      } else {
        await filesCommands.writeTextFile(filePath, resolvedContent as string);
      }
      setIsSaved(true);
      setIsSaving(false);
      showToast(ToastType.SUCCESS, isZh ? "保存成功" : "Saved successfully");
      onSaved?.(filePath);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save file:", error);
      setIsSaving(false);
      showToast(ToastType.ERROR, isZh ? "保存失败" : "Save failed");
    }
  };
  const buttonStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: isSaved ? "#10b981" : "var(--text-tertiary)",
    padding: "4px",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
    fontSize: "12px",
    gap: "4px",
  };
  const getLabel = (): string => {
    if (isSaved) return isZh ? "已保存" : "Saved";
    if (isSaving) return isZh ? "保存中..." : "Saving...";
    return label || (isZh ? "保存" : "Save");
  };
  return (
    <button
      onClick={handleSave}
      disabled={isSaving}
      style={{
        ...buttonStyle,
        opacity: isSaving ? 0.5 : 1,
        color: isSaved ? "#10b981" : isSaving ? "var(--text-tertiary)" : "var(--text-tertiary)",
      }}
      onMouseEnter={(e) => {
        if (!isSaving && !isSaved) {
          e.currentTarget.style.background = "var(--hover-bg)";
          e.currentTarget.style.color = "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSaving && !isSaved) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-tertiary)";
        }
      }}
      title={isZh ? "保存" : "Save"}
    >
      {isSaving ? <Loader2 size={iconSize} className="animate-spin" /> : isSaved ? <Check size={iconSize} /> : <Download size={iconSize} />}
      <span style={{ fontSize: "11px" }}>{getLabel()}</span>
    </button>
  );
};
export default ExportButton;
