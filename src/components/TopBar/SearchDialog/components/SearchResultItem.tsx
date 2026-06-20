import React from "react";
import { SearchResult } from "../types";

interface SearchResultItemProps {
  result: SearchResult;
  index: number;
  onClick: (result: SearchResult) => void;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  index,
  onClick,
}) => {
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
  return (
    <div
      data-result-idx={index}
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        borderBottom: "1px solid var(--border-color)",
        background: "transparent",
        transition: "background 0.15s ease",
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
        }}
      >
        {result.title}
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
