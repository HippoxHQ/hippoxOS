import React, { useState, useMemo } from "react";
import { SearchResult, CATEGORY_CONFIG, SUBSYSTEM_CONFIG } from "../types";
import { CategoryHeader } from "./CategoryHeader";
import { SearchResultItem } from "./SearchResultItem";
import { MessagesSquare, Search } from "lucide-react";
interface SearchResultsProps {
  results: SearchResult[];
  selectedIndex: number;
  onResultClick: (result: SearchResult) => void;
  currentLanguage: "zh" | "en";
}
const MESSAGE_DISPLAY_LIMIT = 5;
/**
 * Search results component with category and subsystem grouping
 */
export const SearchResults: React.FC<SearchResultsProps> = ({ results, selectedIndex, onResultClick, currentLanguage }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  // Group results by category first, then by subsystem for messages
  const groupedResults = useMemo(() => {
    const groups = new Map<string, SearchResult[]>();
    for (const result of results) {
      let groupKey: string = result.category;
      // For messages, group by subsystem if available
      if (result.category === "message" && result.subsystem) {
        groupKey = `message_${result.subsystem}`;
      }
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(result);
    }
    return groups;
  }, [results]);
  /**
   * Get display label for a group
   */
  const getGroupLabel = (groupKey: string): string => {
    if (groupKey.startsWith("message_")) {
      const subsystem = groupKey.replace("message_", "");
      const config = SUBSYSTEM_CONFIG[subsystem];
      if (config) {
        return currentLanguage === "zh" ? config.zh : config.en;
      }
      return currentLanguage === "zh" ? "对话记录" : "Messages";
    }
    const config = CATEGORY_CONFIG[groupKey];
    if (config) {
      return currentLanguage === "zh" ? config.zh : config.en;
    }
    return groupKey;
  };
  /**
   * Get icon for a group
   */
  const getGroupIcon = (groupKey: string): React.ReactNode => {
    if (groupKey.startsWith("message_")) {
      const subsystem = groupKey.replace("message_", "");
      const config = SUBSYSTEM_CONFIG[subsystem];
      // Return the icon directly, don't use || operator that might cause issues
      if (config && config.icon) {
        return config.icon;
      }
      return <MessagesSquare size={14} />;
    }
    const config = CATEGORY_CONFIG[groupKey];
    if (config && config.icon) {
      return config.icon;
    }
    return <Search size={16} />;
  };
  /**
   * Toggle category expansion
   */
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
  /**
   * Check if a group should be expanded
   */
  const isGroupExpanded = (groupKey: string): boolean => {
    if (groupKey.startsWith("message_")) {
      return expandedCategories.has("message") || expandedCategories.has(groupKey);
    }
    return expandedCategories.has(groupKey);
  };
  /**
   * Get display results for a group (with limit for message groups)
   */
  const getDisplayResults = (groupKey: string, allResults: SearchResult[]): { display: SearchResult[]; hiddenCount: number; showMore: boolean } => {
    if (!groupKey.startsWith("message_")) {
      return { display: allResults, hiddenCount: 0, showMore: false };
    }
    const isExpanded = isGroupExpanded(groupKey);
    if (isExpanded) {
      return { display: allResults, hiddenCount: 0, showMore: false };
    }
    if (allResults.length > MESSAGE_DISPLAY_LIMIT) {
      return {
        display: allResults.slice(0, MESSAGE_DISPLAY_LIMIT),
        hiddenCount: allResults.length - MESSAGE_DISPLAY_LIMIT,
        showMore: true,
      };
    }
    return { display: allResults, hiddenCount: 0, showMore: false };
  };
  const allResults = results;
  // Debug: log the SUBSYSTEM_CONFIG to verify it's loaded
  console.log("SUBSYSTEM_CONFIG:", SUBSYSTEM_CONFIG);
  return (
    <div
      style={{
        maxHeight: "340px",
        overflowY: "auto",
        background: "var(--bg-primary)",
        borderRadius: "5px",
      }}
    >
      {Array.from(groupedResults.entries()).map(([groupKey, groupResults]) => {
        const { display, hiddenCount, showMore } = getDisplayResults(groupKey, groupResults);
        const label = getGroupLabel(groupKey);
        const icon = getGroupIcon(groupKey);
        // Debug: log the icon for each group
        console.log(`Group: ${groupKey}, Icon:`, icon);
        return (
          <div key={groupKey}>
            <CategoryHeader icon={icon} label={label} count={groupResults.length} />
            {display.map((result) => {
              const globalIdx = allResults.findIndex((r) => r.id === result.id);
              return <SearchResultItem key={result.id} result={result} index={globalIdx} onClick={onResultClick} />;
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
                }}
                onClick={() => toggleExpand(groupKey)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--hover-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-secondary)";
                }}
              >
                {currentLanguage === "zh" ? `还有 ${hiddenCount} 条对话记录，点击展开` : `${hiddenCount} more messages, click to expand`}
              </div>
            )}
            {groupKey.startsWith("message_") && isGroupExpanded(groupKey) && groupResults.length > MESSAGE_DISPLAY_LIMIT && (
              <div
                style={{
                  padding: "6px 12px",
                  textAlign: "center",
                  fontSize: "11px",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--border-color)",
                  background: "var(--bg-secondary)",
                }}
                onClick={() => toggleExpand(groupKey)}
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
      })}
    </div>
  );
};
