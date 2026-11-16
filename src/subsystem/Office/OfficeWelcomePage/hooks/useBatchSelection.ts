import { useState, useCallback } from "react";
interface UseBatchSelectionReturn<T> {
  selectedIds: Set<string>;
  isBatchMode: boolean;
  setIsBatchMode: (value: boolean) => void;
  toggleSelection: (id: string) => void;
  toggleAll: (items: T[], getId: (item: T) => string) => void;
  clearSelection: () => void;
  getSelectedCount: () => number;
  isSelected: (id: string) => boolean;
}
export const useBatchSelection = <T>(): UseBatchSelectionReturn<T> => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchMode, setIsBatchMode] = useState(false);
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);
  const toggleAll = useCallback((items: T[], getId: (item: T) => string) => {
    setSelectedIds((prev) => {
      if (prev.size === items.length && items.length > 0) {
        return new Set();
      }
      return new Set(items.map(getId));
    });
  }, []);
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);
  const getSelectedCount = useCallback(() => {
    return selectedIds.size;
  }, [selectedIds]);
  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.has(id);
    },
    [selectedIds],
  );
  const handleSetBatchMode = useCallback((value: boolean) => {
    setIsBatchMode(value);
    if (!value) {
      setSelectedIds(new Set());
    }
  }, []);
  return {
    selectedIds,
    isBatchMode,
    setIsBatchMode: handleSetBatchMode,
    toggleSelection,
    toggleAll,
    clearSelection,
    getSelectedCount,
    isSelected,
  };
};