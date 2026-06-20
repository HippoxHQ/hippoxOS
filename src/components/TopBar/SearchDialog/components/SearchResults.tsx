import React, { useState } from "react";
import { SearchResult, CATEGORY_CONFIG } from "../types";
import { CategoryHeader } from "./CategoryHeader";
import { SearchResultItem } from "./SearchResultItem";

interface SearchResultsProps {
  results: SearchResult[];
  selectedIndex: number;
  onResultClick: (result: SearchResult) => void;
  currentLanguage: "zh" | "en";
}

const MESSAGE_DISPLAY_LIMIT = 5;

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  selectedIndex,
  onResultClick,
  currentLanguage,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const groupedResults = new Map<string, SearchResult[]>();
  for (const result of results) {
    if (!groupedResults.has(result.category)) {
      groupedResults.set(result.category, []);
    }
    groupedResults.get(result.category)!.push(result);
  }
  const allResults = results;
  const toggleExpand = (category: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };
  return (
    <div
      style={{
        maxHeight: "340px",
        overflowY: "auto",
        background: "var(--bg-primary)",
        borderRadius: "5px",
      }}
    >
      {Array.from(groupedResults.entries()).map(
        ([category, categoryResults]) => {
          const config = CATEGORY_CONFIG[category];
          const label = config
            ? currentLanguage === "zh"
              ? config.zh
              : config.en
            : category;
          const icon = config?.icon || "🔍";
          let displayResults = categoryResults;
          let showMore = false;
          let hiddenCount = 0;
          if (
            category === "message" &&
            categoryResults.length > MESSAGE_DISPLAY_LIMIT
          ) {
            const isExpanded = expandedCategories.has(category);
            if (isExpanded) {
              displayResults = categoryResults;
            } else {
              displayResults = categoryResults.slice(0, MESSAGE_DISPLAY_LIMIT);
              hiddenCount = categoryResults.length - MESSAGE_DISPLAY_LIMIT;
              showMore = true;
            }
          }
          return (
            <div key={category}>
              <CategoryHeader
                icon={icon}
                label={label}
                count={categoryResults.length}
              />
              {displayResults.map((result) => {
                const globalIdx = allResults.findIndex(
                  (r) => r.id === result.id,
                );
                return (
                  <SearchResultItem
                    key={result.id}
                    result={result}
                    index={globalIdx}
                    onClick={onResultClick}
                  />
                );
              })}
              {showMore && hiddenCount > 0 && (
                <div
                  style={{
                    padding: "6px 12px",
                    textAlign: "center",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    cursor: "pointer",
                    borderBottom: "1px solid var(--border-color)",
                    background: "var(--bg-secondary)",
                    transition: "background 0.15s ease",
                  }}
                  onClick={() => toggleExpand(category)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--hover-bg)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--bg-secondary)";
                  }}
                >
                  {currentLanguage === "zh"
                    ? `还有 ${hiddenCount} 条对话记录，点击展开`
                    : `${hiddenCount} more messages, click to expand`}
                </div>
              )}
              {category === "message" &&
                expandedCategories.has(category) &&
                categoryResults.length > MESSAGE_DISPLAY_LIMIT && (
                  <div
                    style={{
                      padding: "6px 12px",
                      textAlign: "center",
                      fontSize: "11px",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border-color)",
                      background: "var(--bg-secondary)",
                      transition: "background 0.15s ease",
                    }}
                    onClick={() => toggleExpand(category)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--hover-bg)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--bg-secondary)";
                    }}
                  >
                    {currentLanguage === "zh" ? "收起" : "Collapse"}
                  </div>
                )}
            </div>
          );
        },
      )}
    </div>
  );
};
