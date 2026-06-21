import React from "react";
import { UploadFile } from "../../../core/types";
import ImageFilePreview from "../GlobalFilePreview/ImageFilePreview";
import SkillFilePreview from "../GlobalFilePreview/SkillFilePreview";
import TextFilePreview from "../GlobalFilePreview/TextFilePreview";

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
  const isSkillFile =
    file.name?.endsWith(".md") || file.name?.endsWith(".skill.md");
  const isImageFile = file.type?.startsWith("image/");
  if (isSkillFile) {
    return (
      <SkillFilePreview
        key={file.id || file.path}
        file={file}
        onClose={onClose}
        onSendSkillMessage={onSendSkillMessage}
        t={t}
      />
    );
  }
  if (isImageFile) {
    return (
      <ImageFilePreview
        key={file.id || file.path}
        file={file}
        onClose={onClose}
        t={t}
      />
    );
  }
  return (
    <TextFilePreview
      key={file.id || file.path}
      file={file}
      onClose={onClose}
      t={t}
    />
  );
};

export default PreviewContent;
