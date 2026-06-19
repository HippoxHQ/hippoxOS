import React from "react";
import { SearchResult } from "../types";

interface SearchResultItemProps {
  result: SearchResult;
  index: number;
  isSelected: boolean;
  onClick: (result: SearchResult) => void;
}

export const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  index,
  isSelected,
  onClick,
}) => {
  const isMessage = result.category === "message";

  return (
    <div
      data-result-idx={index}
      style={{
        padding: "8px 12px",
        cursor: "pointer",
        borderBottom: "1px solid var(--border-color)",
        background: isSelected ? "var(--hover-bg)" : "transparent",
      }}
      onClick={() => onClick(result)}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "var(--hover-bg)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.background = "transparent";
        }
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
        {isMessage && (
          <span
            style={{
              fontSize: "10px",
              background: "var(--bg-tertiary)",
              padding: "1px 6px",
              borderRadius: "10px",
              color: "var(--text-secondary)",
              flexShrink: 0,
            }}
          >
            {result.sessionTitle || result.title}
          </span>
        )}
        {!isMessage && result.title}
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
          {new Date(parseInt(result.timestamp) * 1000).toLocaleString()}
        </div>
      )}
    </div>
  );
};