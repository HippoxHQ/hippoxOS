import { useState } from "react";

export const useStepParams = () => {
  const [expandedStepParams, setExpandedStepParams] = useState<Set<string>>(new Set());

  const toggleStepParams = (stepKey: string) => {
    setExpandedStepParams((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepKey)) {
        newSet.delete(stepKey);
      } else {
        newSet.add(stepKey);
      }
      return newSet;
    });
  };

  return {
    expandedStepParams,
    toggleStepParams,
  };
};