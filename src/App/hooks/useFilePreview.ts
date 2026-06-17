import { useState } from "react";
import { UploadFile } from "../../core/types";

export function useFilePreview() {
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadFile | null>(null);
  const [filePreviewWidth, setFilePreviewWidth] = useState(320);

  const handleFilePreview = (file: UploadFile) => {
    setPreviewFile(file);
    setIsFilePreviewOpen(true);
  };

  const handleCloseFilePreview = () => {
    setIsFilePreviewOpen(false);
    setPreviewFile(null);
  };

  return {
    isFilePreviewOpen,
    previewFile,
    filePreviewWidth,
    setFilePreviewWidth,
    handleFilePreview,
    handleCloseFilePreview,
  };
}