import React from "react";
import { DialogSession } from "../../../types/types";
import { CategoryType } from "./types";
// Format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
};
// Format date from timestamp
export const formatDate = (timestamp: number, locale: "zh" | "en" = "en"): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
// Format session date from string
export const formatSessionDate = (dateStr: string, locale: "zh" | "en" = "en"): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
// Get session category based on creation date
export const getSessionCategory = (session: DialogSession): CategoryType => {
  if (session.is_pinned) return "pinned";
  const now = new Date();
  const createdDate = new Date(session.created_at);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (createdDate >= today) return "today";
  if (createdDate >= yesterday) return "yesterday";
  if (createdDate >= weekAgo) return "last7days";
  if (createdDate >= monthAgo) return "last30days";
  return "older";
};
// Group sessions by category
export const groupSessionsByCategory = (sessions: DialogSession[]): Record<CategoryType, DialogSession[]> => {
  const grouped: Record<CategoryType, DialogSession[]> = {
    pinned: [],
    today: [],
    yesterday: [],
    last7days: [],
    last30days: [],
    older: [],
  };
  sessions.forEach((session) => {
    const category = getSessionCategory(session);
    grouped[category].push(session);
  });
  return grouped;
};
// Filter sessions by search query
export const filterSessionsByQuery = (sessions: DialogSession[], query: string): DialogSession[] => {
  if (!query.trim()) return sessions;
  const q = query.toLowerCase().trim();
  return sessions.filter((s) => (s.title || "").toLowerCase().includes(q));
};