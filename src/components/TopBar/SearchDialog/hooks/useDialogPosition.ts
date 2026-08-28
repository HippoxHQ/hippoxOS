import { useState, useCallback, useRef, useEffect } from "react";
/**
 * Hook for managing dialog position with drag support
 */
export const useDialogPosition = (isOpen: boolean) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dialogRef = useRef<HTMLDivElement>(null);
  /**
   * Open dialog at center position
   */
  const openDialog = useCallback(() => {
    const dialogWidth = 540;
    const x = (window.innerWidth - dialogWidth) / 2;
    const y = 80;
    setPosition({ x, y });
  }, []);
  useEffect(() => {
    if (isOpen) {
      openDialog();
    }
  }, [isOpen, openDialog]);
  /**
   * Start drag
   */
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  }, [position]);
  /**
   * Handle drag move
   */
  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && dialogRef.current) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const dialogWidth = dialogRef.current.offsetWidth;
        const dialogHeight = dialogRef.current.offsetHeight;
        setPosition({
          x: Math.min(windowWidth - dialogWidth, Math.max(0, newX)),
          y: Math.min(windowHeight - dialogHeight, Math.max(0, newY)),
        });
      }
    },
    [isDragging, dragStart]
  );
  /**
   * End drag
   */
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);
  return {
    position,
    isDragging,
    dialogRef,
    handleDragStart,
    setPosition,
  };
};