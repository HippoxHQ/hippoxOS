import React from "react";
import { SearchResult, SUBSYSTEM_CONFIG } from "../types";
interface SearchResultItemProps {
  result: SearchResult;
  index: number;
  onClick: (result: SearchResult) => void;
}
/**
 * Individual search result item with subsystem icon
 */
export const SearchResultItem: React.FC<SearchResultItemProps> = ({ result, index, onClick }) => {
  /**
   * Format timestamp to localized string
   */
  const formatTimestamp = (timestamp?: string): string => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "";
      }
      return date.toLocaleString();
    } catch {
      return "";
    }
  };
  /**
   * Get subsystem icon for message results
   */
  const getSubsystemIcon = (): React.ReactNode => {
    // Only show icon for message category
    if (result.category !== "message" || !result.subsystem) {
      return null;
    }
    const config = SUBSYSTEM_CONFIG[result.subsystem];
    return config?.icon || null;
  };
  const subsystemIcon = getSubsystemIcon();
  return (
    <div
      data-result-idx={index}
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        borderBottom: "1px solid var(--border-color)",
        background: "transparent",
      }}
      onClick={() => onClick(result)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--hover-bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <div
        style={{
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--text-primary)",
          marginBottom: "2px",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {subsystemIcon && (
          <span
            style={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              color: "var(--text-muted)",
            }}
          >
            {subsystemIcon}
          </span>
        )}
        <span>{result.title}</span>
      </div>
      <div
        style={{
          fontSize: "11px",
          color: "var(--text-secondary)",
          wordBreak: "break-word",
          lineHeight: 1.3,
        }}
      >
        {result.highlight || result.description}
      </div>
      {result.timestamp && (
        <div
          style={{
            fontSize: "10px",
            color: "var(--text-muted)",
            marginTop: "2px",
          }}
        >
          {formatTimestamp(result.timestamp)}
        </div>
      )}
    </div>
  );
};
