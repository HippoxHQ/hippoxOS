import React, { useState, useRef, useEffect } from 'react';

interface ResizablePanelsProps {
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

const ResizablePanels: React.FC<ResizablePanelsProps> = ({ leftPanel, rightPanel }) => {
  const [leftWidth, setLeftWidth] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidthPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const clamped = Math.min(70, Math.max(30, newWidthPercent));
    setLeftWidth(clamped);
  };
  const handleMouseUp = () => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  return (
    <div className="panels-container" ref={containerRef}>
      <div className="panel-left" style={{ width: `${leftWidth}%` }}>
        {leftPanel}
      </div>
      <div className="resize-handle" onMouseDown={handleMouseDown}>
        <div className="handle-line"></div>
      </div>
      <div className="panel-right" style={{ width: `${100 - leftWidth}%` }}>
        {rightPanel}
      </div>
    </div>
  );
};

export default ResizablePanels;