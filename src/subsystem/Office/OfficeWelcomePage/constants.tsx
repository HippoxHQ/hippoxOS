import React from "react";
import { FileImage, FileText, File } from "lucide-react";
import { CategoryType, SupportedFileType } from "./types";
// File type configuration (image editor only supports image / text)
export const FILE_TYPE_CONFIG: Record<
  SupportedFileType,
  { label: Record<"zh" | "en", string>; extensions: string[]; icon: React.ReactNode }
> = {
  image: {
    label: { zh: "图片文件", en: "Image Files" },
    extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff", "ico"],
    icon: <FileImage size={14} />,
  },
  text: {
    label: { zh: "文本文件", en: "Text Files" },
    extensions: ["txt", "md", "json", "xml", "csv", "log", "ini", "cfg", "conf"],
    icon: <FileText size={14} />,
  },
};
// All supported extensions
export const ALL_EXTENSIONS = [...FILE_TYPE_CONFIG.image.extensions, ...FILE_TYPE_CONFIG.text.extensions];
// Category definitions
export const categories: CategoryType[] = ["pinned", "today", "yesterday", "last7days", "last30days", "older"];
export const categoryLabels: Record<CategoryType, Record<"zh" | "en", string>> = {
  pinned: { zh: "已置顶", en: "Pinned" },
  today: { zh: "今天", en: "Today" },
  yesterday: { zh: "昨天", en: "Yesterday" },
  last7days: { zh: "最近7天", en: "Last 7 Days" },
  last30days: { zh: "最近30天", en: "Last 30 Days" },
  older: { zh: "更早", en: "Older" },
};
// Default expanded categories state
export const DEFAULT_EXPANDED_CATEGORIES: Record<CategoryType, boolean> = {
  pinned: true,
  today: true,
  yesterday: true,
  last7days: true,
  last30days: true,
  older: true,
};
// File type icon mapping
export const getFileTypeIcon = (path: string): React.ReactNode => {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (FILE_TYPE_CONFIG.image.extensions.includes(ext)) return <FileImage size={14} />;
  if (FILE_TYPE_CONFIG.text.extensions.includes(ext)) return <FileText size={14} />;
  return <File size={14} />;
};
// Check file type
export const isImageFile = (filePath: string): boolean => {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return FILE_TYPE_CONFIG.image.extensions.includes(ext);
};
export const isSupportedFile = (filePath: string): boolean => {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  return ALL_EXTENSIONS.includes(ext);
};