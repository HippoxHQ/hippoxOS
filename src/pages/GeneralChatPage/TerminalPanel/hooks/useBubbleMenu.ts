import { useRef, useState, useCallback } from "react";

export const useBubbleMenu = () => {
  const [showBubble, setShowBubble] = useState(false);
  const bubbleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLDivElement | null>(null);

  const updateBubblePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelRect = buttonRef.current
        .closest(".terminal-panel")
        ?.getBoundingClientRect();
      if (panelRect) {
        return {
          right: panelRect.right - rect.right,
          top: rect.bottom - panelRect.top + 4,
        };
      }
    }
    return { right: 0, top: 0 };
  }, []);

  const handleButtonMouseEnter = () => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
    setShowBubble(true);
  };

  const handleButtonMouseLeave = () => {
    bubbleTimerRef.current = setTimeout(() => {
      setShowBubble(false);
    }, 200);
  };

  const handleBubbleMouseEnter = () => {
    if (bubbleTimerRef.current) {
      clearTimeout(bubbleTimerRef.current);
    }
  };

  const handleBubbleMouseLeave = () => {
    setShowBubble(false);
  };

  return {
    showBubble,
    buttonRef,
    updateBubblePosition,
    handleButtonMouseEnter,
    handleButtonMouseLeave,
    handleBubbleMouseEnter,
    handleBubbleMouseLeave,
  };
};