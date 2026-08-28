import { useEffect } from "react";
import { SearchResult } from "../types";
interface UseKeyboardNavigationProps {
  isOpen: boolean;
  searchQuery: string;
  searchResults: SearchResult[];
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  onResultClick: (result: SearchResult) => void;
  onClose: () => void;
}
/**
 * Hook for keyboard navigation in search dialog
 */
export const useKeyboardNavigation = ({
  isOpen,
  searchQuery,
  searchResults,
  selectedIndex,
  onSelectedIndexChange,
  onResultClick,
  onClose,
}: UseKeyboardNavigationProps) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default Cmd+K / Ctrl+K behavior
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        return;
      }
      // Close on Escape
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
        return;
      }
      // Navigate results with arrow keys
      if (isOpen && searchQuery.trim() && searchResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const newIndex = selectedIndex < searchResults.length - 1
            ? selectedIndex + 1
            : selectedIndex;
          onSelectedIndexChange(newIndex);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const newIndex = selectedIndex > 0 ? selectedIndex - 1 : -1;
          onSelectedIndexChange(newIndex);
        } else if (e.key === "Enter" && selectedIndex >= 0) {
          const result = searchResults[selectedIndex];
          if (result) {
            e.preventDefault();
            onResultClick(result);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchQuery, searchResults, selectedIndex, onSelectedIndexChange, onResultClick, onClose]);
  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && searchResults[selectedIndex]) {
      const selectedElement = document.querySelector(
        `[data-result-idx="${selectedIndex}"]`,
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex, searchResults]);
};