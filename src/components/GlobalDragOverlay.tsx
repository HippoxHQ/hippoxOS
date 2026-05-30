import React from "react";

interface GlobalDragOverlayProps {
  isDragging: boolean;
}

const GlobalDragOverlay: React.FC<GlobalDragOverlayProps> = ({
  isDragging,
}) => {
  if (!isDragging) return null;

  return (
    <>
      <style>{`
        .global-drag-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.1);
          backdrop-filter: blur(2px);
          z-index: 9998;
          pointer-events: none;
          transition: all 0.2s ease;
          animation: fadeIn 0.15s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        [data-theme="light"] .global-drag-overlay {
          background: rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(1px);
        }
      `}</style>
      <div className="global-drag-overlay" />
    </>
  );
};

export default GlobalDragOverlay;
