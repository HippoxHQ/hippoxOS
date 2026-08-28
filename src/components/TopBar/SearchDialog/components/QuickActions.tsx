import React from "react";
import { SearchSuggestion } from "../types";
interface QuickActionsProps {
  suggestions: SearchSuggestion[];
  onActionClick: (action: () => void) => void;
  language: "zh" | "en";
}
/**
 * Quick actions component for common actions
 */
export const QuickActions: React.FC<QuickActionsProps> = ({ suggestions, onActionClick, language }) => {
  return (
    <div style={{ padding: "6px 0" }}>
      <div
        style={{
          padding: "6px 12px",
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          color: "var(--text-muted)",
          letterSpacing: "0.5px",
        }}
      >
        {language === "zh" ? "快速操作" : "Quick Actions"}
      </div>
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 12px",
            cursor: "pointer",
          }}
          onClick={() => onActionClick(suggestion.action)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--hover-bg)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <span
            style={{
              fontSize: "14px",
              width: "20px",
              textAlign: "center",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {suggestion.icon}
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-primary)",
              }}
            >
              {suggestion.title}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                marginTop: "1px",
              }}
            >
              {suggestion.description}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
