import { useState, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { ALL_EXTENSIONS, FILE_TYPE_CONFIG } from "../constants";
import { showToast, ToastType } from "../../../../components/Toast";
interface UseFileManagementProps {
  t: (key: string, params?: any) => string;
  onSelectImage: (imagePath: string, imageType: "file" | "empty" | "download") => Promise<void>;
}
interface UseFileManagementReturn {
  selectedPath: string;
  isDragOver: boolean;
  setIsDragOver: (value: boolean) => void;
  handleSelectImageFile: () => Promise<void>;
  handleDrop: (e: React.DragEvent) => void;
}
export const useFileManagement = ({ t, onSelectImage }: UseFileManagementProps): UseFileManagementReturn => {
  const [selectedPath, setSelectedPath] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const isZh = t("i18n") === "zh";
  // Handle file selection via dialog
  const handleSelectImageFile = useCallback(async () => {
    try {
      const allExtensions = [...FILE_TYPE_CONFIG.image.extensions, ...FILE_TYPE_CONFIG.text.extensions];
      const selected = await open({
        directory: false,
        multiple: false,
        title: isZh ? "选择文件" : "Select File",
        filters: [
          { name: isZh ? "支持的文件" : "Supported Files", extensions: allExtensions },
          { name: isZh ? "图片文件" : "Image Files", extensions: FILE_TYPE_CONFIG.image.extensions },
          { name: isZh ? "文本文件" : "Text Files", extensions: FILE_TYPE_CONFIG.text.extensions },
          { name: isZh ? "所有文件" : "All Files", extensions: ["*"] },
        ],
      });
      if (selected && typeof selected === "string") {
        setSelectedPath(selected);
        await onSelectImage(selected, "file");
      }
    } catch (error) {
      showToast(ToastType.ERROR, isZh ? "选择文件失败" : "Failed to select file");
    }
  }, [isZh, onSelectImage]);
  // Handle drop event
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        const filePath = (file as any).path || file.name;
        if (filePath) {
          const ext = filePath.split(".").pop()?.toLowerCase() || "";
          if (ALL_EXTENSIONS.includes(ext)) {
            onSelectImage(filePath, "file");
          } else {
            showToast(ToastType.WARNING, isZh ? "不支持的文件类型" : "Unsupported file type");
          }
        }
      }
    },
    [isZh, onSelectImage],
  );
  return {
    selectedPath,
    isDragOver,
    setIsDragOver,
    handleSelectImageFile,
    handleDrop,
  };
};