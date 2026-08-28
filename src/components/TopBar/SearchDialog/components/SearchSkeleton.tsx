import React from "react";
interface SearchSkeletonProps {
  language: "zh" | "en";
}
/**
 * Loading skeleton for search
 */
export const SearchSkeleton: React.FC<SearchSkeletonProps> = ({ language }) => {
  return (
    <div
      style={{
        padding: "24px",
        textAlign: "center",
        color: "var(--text-secondary)",
        fontSize: "12px",
      }}
    >
      {language === "zh" ? "搜索中..." : "Searching..."}
    </div>
  );
};
