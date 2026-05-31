import React from "react";
import {
  FileTextIcon,
  FileImageIcon,
  FileVideoIcon,
  FilePdfIcon,
  FileCodeIcon,
  FileZipIcon,
  FileMusicIcon,
  FileDefaultIcon,
} from "./icons";
import { UploadFile } from "./type";

export const getFileIcon = (
  file: UploadFile,
  size: number = 18,
): React.ReactNode => {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type?.startsWith("image/")) {
    return <FileImageIcon size={size} />;
  }

  if (type?.startsWith("video/")) {
    return <FileVideoIcon size={size} />;
  }

  if (type === "application/pdf") {
    return <FilePdfIcon size={size} />;
  }

  if (type?.startsWith("text/") || name.match(/\.(txt|md|readme)$/)) {
    return <FileTextIcon size={size} />;
  }

  if (
    name.match(
      /\.(js|ts|jsx|tsx|py|java|go|rs|cpp|c|h|hpp|cs|rb|php|swift|kt|scala|sql)$/,
    )
  ) {
    return <FileCodeIcon size={size} />;
  }

  if (name.match(/\.(json|xml|yaml|yml|toml|ini|cfg|conf|config)$/)) {
    return <FileCodeIcon size={size} />;
  }

  if (name.match(/\.(zip|rar|7z|tar|gz|bz2|xz|tgz)$/)) {
    return <FileZipIcon size={size} />;
  }

  if (name.match(/\.(mp3|wav|flac|aac|ogg|m4a|wma)$/)) {
    return <FileMusicIcon size={size} />;
  }

  if (name.match(/\.(doc|docx)$/)) {
    return <FileTextIcon size={size} />;
  }

  if (name.match(/\.(xls|xlsx)$/)) {
    return <FileTextIcon size={size} />;
  }

  if (name.match(/\.(ppt|pptx)$/)) {
    return <FileTextIcon size={size} />;
  }

  return <FileDefaultIcon size={size} />;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

export const getFileExtension = (fileName: string): string => {
  return fileName.split(".").pop()?.toLowerCase() || "";
};

export const isImageFile = (file: UploadFile): boolean => {
  return (
    file.type?.startsWith("image/") ||
    !!getFileExtension(file.name).match(/^(jpg|jpeg|png|gif|webp|bmp|svg)$/)
  );
};

export const isVideoFile = (file: UploadFile): boolean => {
  return (
    file.type?.startsWith("video/") ||
    !!getFileExtension(file.name).match(/^(mp4|webm|mov|avi|mkv|flv)$/)
  );
};

export const isAudioFile = (file: UploadFile): boolean => {
  return (
    file.type?.startsWith("audio/") ||
    !!getFileExtension(file.name).match(/^(mp3|wav|flac|aac|ogg)$/)
  );
};

export const isTextFile = (file: UploadFile): boolean => {
  return (
    file.type?.startsWith("text/") ||
    !!getFileExtension(file.name).match(
      /^(txt|md|json|xml|yaml|yml|toml|ini|cfg|conf)$/,
    )
  );
};

export const isCodeFile = (file: UploadFile): boolean => {
  return !!getFileExtension(file.name).match(
    /^(js|ts|jsx|tsx|py|java|go|rs|cpp|c|h|hpp|cs|rb|php|swift|kt|scala|sql)$/,
  );
};
