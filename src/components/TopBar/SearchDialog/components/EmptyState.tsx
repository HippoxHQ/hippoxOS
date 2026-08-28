import React from "react";
interface EmptyStateProps {
  language: "zh" | "en";
}
/**
 * Empty state component for search results
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ language }) => {
  return (
    <div
      style={{
        padding: "24px",
        textAlign: "center",
        color: "var(--text-muted)",
        fontSize: "12px",
      }}
    >
      {language === "zh" ? "没有找到相关结果" : "No results found"}
    </div>
  );
};
