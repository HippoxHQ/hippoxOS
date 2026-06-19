import React from "react";
import { SearchResult, CATEGORY_CONFIG } from "../types";
import { CategoryHeader } from "./CategoryHeader";
import { SearchResultItem } from "./SearchResultItem";

interface SearchResultsProps {
  results: SearchResult[];
  selectedIndex: number;
  onResultClick: (result: SearchResult) => void;
  currentLanguage: "zh" | "en";
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  selectedIndex,
  onResultClick,
  currentLanguage,
}) => {
  const groupedResults = new Map<string, SearchResult[]>();
  for (const result of results) {
    if (!groupedResults.has(result.category)) {
      groupedResults.set(result.category, []);
    }
    groupedResults.get(result.category)!.push(result);
  }
  const allResults = results;
  return (
    <div
      style={{
        maxHeight: "340px",
        overflowY: "auto",
        background: "var(--bg-primary)",
        borderRadius: "5px",
      }}
    >
      {Array.from(groupedResults.entries()).map(([category, categoryResults]) => {
        const config = CATEGORY_CONFIG[category];
        const label = config
          ? currentLanguage === "zh"
            ? config.zh
            : config.en
          : category;
        const icon = config?.icon || "🔍";
        return (
          <div key={category}>
            <CategoryHeader
              icon={icon}
              label={label}
              count={categoryResults.length}
            />
            {categoryResults.map((result) => {
              const globalIdx = allResults.findIndex((r) => r.id === result.id);
              return (
                <SearchResultItem
                  key={result.id}
                  result={result}
                  index={globalIdx}
                  isSelected={selectedIndex === globalIdx}
                  onClick={onResultClick}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
};