import { useState, useCallback, useRef, useEffect } from "react";
import { SearchResult } from "../types";
import { searchService } from "../../../../command/search";
interface UseSearchProps {
  searchQuery: string;
  sessionTitlesMap?: Map<string, string>;
  onResultsChange: (results: SearchResult[]) => void;
  onLoadingChange: (loading: boolean) => void;
}
export const useSearch = ({
  searchQuery,
  sessionTitlesMap,
  onResultsChange,
  onLoadingChange,
}: UseSearchProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousQueryRef = useRef<string>("");
  const isMountedRef = useRef<boolean>(true);
  const performSearch = useCallback(
    async (keyword: string) => {
      if (!isMountedRef.current) return;
      if (previousQueryRef.current === keyword && keyword.trim() === "") {
        return;
      }
      if (!keyword.trim()) {
        previousQueryRef.current = keyword;
        onResultsChange([]);
        onLoadingChange(false);
        setIsLoading(false);
        return;
      }
      if (previousQueryRef.current === keyword) {
        return;
      }
      previousQueryRef.current = keyword;
      setIsLoading(true);
      onLoadingChange(true);
      try {
        const results = await searchService.search(keyword, 30);
        if (isMountedRef.current) {
          onResultsChange(results);
        }
      } catch (error) {
        console.error("Search failed:", error);
        if (isMountedRef.current) {
          onResultsChange([]);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
          onLoadingChange(false);
        }
      }
    },
    [onResultsChange, onLoadingChange]
  );
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);
  useEffect(() => {
    if (!searchQuery.trim()) {
      previousQueryRef.current = "";
      onResultsChange([]);
      onLoadingChange(false);
      setIsLoading(false);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      return;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchQuery, performSearch, onResultsChange, onLoadingChange]);
  return {
    isLoading,
    performSearch,
  };
};