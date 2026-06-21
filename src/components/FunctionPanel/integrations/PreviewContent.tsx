import React, { useMemo } from "react";
import { UploadFile } from "../../../core/types";
import ImageFilePreview from "./GlobalFilePreview/ImageFilePreview";
import SkillFilePreview from "./GlobalFilePreview/SkillFilePreview";
import TextFilePreview from "./GlobalFilePreview/TextFilePreview";

interface PreviewContentProps {
  file: UploadFile | null | undefined;
  onClose: () => void;
  onSendSkillMessage?: (message: string, files?: UploadFile[]) => void;
  t: (key: string, params?: any) => string;
}

export const PreviewContent: React.FC<PreviewContentProps> = ({
  file,
  onClose,
  onSendSkillMessage,
  t,
}) => {
  const isSkillFile =
    file?.name?.endsWith(".md") || file?.name?.endsWith(".skill.md") || false;
  const isImageFile =
    file?.type?.startsWith("image/") ||
    /\.(png|jpg|jpeg|gif|webp|bmp|svg|ico)$/i.test(file?.name || "") ||
    false;
  const content = useMemo(() => {
    if (!file) {
      return null;
    }
    const key = file.id || file.path || file.name || "file";
    if (isSkillFile) {
      return (
        <SkillFilePreview
          key={key}
          file={file}
          onClose={onClose}
          onSendSkillMessage={onSendSkillMessage}
          t={t}
        />
      );
    }
    if (isImageFile) {
      return <ImageFilePreview key={key} file={file} onClose={onClose} t={t} />;
    }
    return <TextFilePreview key={key} file={file} onClose={onClose} t={t} />;
  }, [file, isSkillFile, isImageFile, onClose, onSendSkillMessage, t]);

  if (!file) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--text-tertiary)",
          fontSize: "14px",
        }}
      >
        No file selected
      </div>
    );
  }

  return content;
};

export default PreviewContent;
